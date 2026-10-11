/*
 * End-to-end test of the first gameplay section (the cave + tutorial).
 *
 *   node tools/test-game.js            (Node 22+, Chrome or Edge)
 *   node tools/test-game.js --shots    (saves screenshots to tools/screenshots)
 *
 * Plays through the whole sequence with real key presses: wake up, walk,
 * jump, read a sign, enter the arena, talk to the Voice, do every tutorial
 * task, open the gates and reach the end of the current content.
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp.js');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html?scene=sky&seed=2';
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(__dirname, 'screenshots');
if (SHOTS) fs.mkdirSync(SHOT_DIR, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (!ok && detail !== undefined ? '  -> ' + JSON.stringify(detail) : ''));
}

(async () => {
  console.log('ELEMENTAL RETRIBUTION X — gameplay test\n');
  const b = await launch({ width: 1920, height: 1080 });
  const ev = (e) => b.eval(e);
  const G = 'ERX.Scenes.find("game")';
  const waitFor = async (expr, ms = 5000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await sleep(80); }
    return false;
  };
  const shot = async (n) => { if (SHOTS) await b.screenshot(path.join(SHOT_DIR, 'game-' + n + '.png')); };
  /** Click through dialogue until a choice appears (or the dialogue ends). */
  const advance = async (maxSteps = 60) => {
    for (let i = 0; i < maxSteps; i++) {
      const st = await ev(`(() => { const d = ${G}.dialogue; return d.active ? d.mode : (${G}.script ? 'busy' : 'none'); })()`);
      if (st === 'choose') return 'choose';
      if (st === 'none') return 'none';
      if (st === 'say') { await b.key('Enter', { wait: 30 }); }
      else if (await ev(`!!(${G}.objective && ${G}.objective.doneT === 0 && ${G}.player.controls)`)) return 'task';
      await sleep(120);
    }
    return 'timeout';
  };
  const pick = async (i) => {
    for (let k = 0; k < i; k++) await b.key('ArrowDown', { wait: 40 });
    await sleep(300);
    await b.key('Enter');
    await sleep(200);
  };

  try {
    await b.viewport(1920, 1080);
    await b.goto(URL);
    await waitFor('!!(window.ERX && ERX.Game && ERX.Game.ready)');
    await ev("localStorage.clear(); ERX.Saves.load(); ERX.Saves.create('Hero', {gender:1,skin:1,hair:3,hairColor:7,eyes:2,outfit:0,outfitColor:2,pants:3}); true");
    await sleep(1500);
    await b.key('Enter');
    await waitFor("ERX.Scenes.top().state === 'menu' && ERX.Scenes.top().buttonsT > 0.6");
    await b.key('Enter');
    await waitFor("ERX.Scenes.top().id === 'characters' && ERX.Scenes.top().appearT >= 1");
    await b.key('Enter');
    console.log('[waking up]');
    check('PLAY on a character starts the game', await waitFor(`ERX.Scenes.top().id === 'game'`, 4000));
    check('the menu world stops rendering behind the game', await ev('ERX.Scenes.worldHidden'));
    check('the game starts with the player lying down', await ev(`${G}.player.lying === true && ${G}.state === 'intro'`));
    await waitFor(`${G}.state === 'waking'`, 4000);
    await shot('01-wake');
    check('controls are locked while asleep', await ev(`${G}.player.controls === false`));
    for (let i = 0; i < 100 && (await ev(`${G}.state`)) === 'waking'; i++) await b.key('Space', { wait: 15 });
    check('mashing the key wakes the player up (bounce!)', await ev(`${G}.state === 'bounce' || ${G}.state === 'play'`));
    check('gameplay begins after landing', await waitFor(`${G}.state === 'play' && ${G}.player.controls`, 3000));
    await shot('02-awake');

    console.log('[movement]');
    const x0 = await ev(`${G}.player.x`);
    await b.hold('KeyD', 700);
    check('walking right moves the player', (await ev(`${G}.player.x`)) > x0 + 30);
    await b.down('Space'); await sleep(120);
    check('jumping leaves the ground', await ev(`${G}.player.vy < 0 && !${G}.player.onGround`));
    await b.up('Space');
    await waitFor(`${G}.player.onGround`, 2000);
    const dx0 = await ev(`${G}.player.x`);
    await b.key('ShiftLeft', { wait: 250 });
    check('dashing bursts forward', (await ev(`${G}.player.x`)) > dx0 + 25);
    await sleep(300);

    console.log('[signs]');
    await ev(`${G}.player.placeAt(16 * 16 + 8, 19 * 16); true`);
    await sleep(300);
    check('standing at a sign shows a read prompt', await ev(`!!${G}.prompt`));
    await b.key('KeyE');
    check('USE reads the sign', await waitFor(`${G}.dialogue.active && ${G}.dialogue.speaker.name === 'SIGN'`, 2000));
    await shot('03-sign');
    await advance(5);
    check('the sign closes and control returns', await waitFor(`!${G}.dialogue.active && ${G}.player.controls`, 2000));

    console.log('[darkness]');
    const d0 = await ev(`${G}.level.darknessAt(10 * 16, false)`);
    const d1 = await ev(`${G}.level.darknessAt(100 * 16, false)`);
    check('the cave starts bright and gets darker', d0 < 0.15 && d1 > 0.6, { d0, d1 });
    await ev(`${G}.player.placeAt(100 * 16, 19 * 16); true`);
    await sleep(1500);
    await shot('04-dark');

    console.log('[platforms]');
    await ev(`${G}.player.placeAt(81 * 16, 21 * 16); ${G}.player.facing = 1; true`);
    await sleep(250);
    await b.down('KeyD'); await sleep(80); await b.down('Space'); await sleep(380); await b.up('Space'); await sleep(250); await b.up('KeyD');
    await waitFor(`${G}.player.onGround`, 2000);
    check('the first cave platform is reachable from the hollow floor', await ev(`${G}.player.onPlatform || ${G}.player.feet < 21 * 16`), await ev(`[${G}.player.x, ${G}.player.feet]`));
    await ev(`${G}.player.placeAt(84 * 16, 19 * 16); ${G}.player.facing = 1; true`);
    await sleep(300);
    await b.down('KeyD'); await sleep(60); await b.down('Space'); await sleep(380); await b.up('Space'); await sleep(250); await b.up('KeyD');
    await waitFor(`${G}.player.onGround`, 2000);
    check('...and the next one is reachable from there', await ev(`${G}.player.feet <= 17 * 16 + 0.5`), await ev(`[${G}.player.x, ${G}.player.feet]`));

    console.log('[arena]');
    await ev(`${G}.player.placeAt(124 * 16, 19 * 16); true`);
    await b.hold('KeyD', 900);
    check('entering the arena starts the cutscene', await waitFor(`${G}.stageName === 'arena' && !!${G}.script`, 2000));
    check('controls lock during the cutscene', await ev(`${G}.player.controls === false`));
    check('the metal gates slam shut', await waitFor(`${G}.gates.left.amount === 1 && ${G}.gates.right.amount === 1`, 3000));
    check('the arena lights up', await waitFor(`${G}.arenaLit`, 3000));
    check('the fake boss warning appears', await waitFor(`${G}.warning`, 4000));
    await shot('05-warning');
    check('a training dummy spawns (with confetti)', await waitFor(`!!${G}.dummy && ${G}.confetti.count > 20`, 7000));
    await sleep(500);
    await shot('06-dummy');
    check('the Voice starts talking', await waitFor(`${G}.dialogue.active && ${G}.dialogue.speaker.name === '???'`, 6000));
    check('goofy music plays for the Voice', await ev("ERX.Audio.music.wanted === 'voice'"));
    check('first choice appears', (await advance()) === 'choose');
    await shot('07-choice');
    check('there are three answers', (await ev(`${G}.dialogue.choices.length`)) === 3);
    await pick(1); // "I think you brought me here."
    await advance();
    check('the Voice snaps, then offers the follow-up line', await ev(`${G}.dialogue.mode === 'choose' && /Who else/.test(${G}.dialogue.choices[0])`));
    await pick(0);

    console.log('[tutorial]');
    check('tutorial: walking task', (await advance()) === 'task' && /WALK/.test(await ev(`${G}.objective.label`)));
    await shot('08-task');
    await b.hold('KeyA', 700); await b.hold('KeyD', 700);
    check('tutorial: jump task', (await advance()) === 'task' && /JUMP/.test(await ev(`${G}.objective.label`)));
    for (let i = 0; i < 3; i++) { await b.key('Space', { wait: 30 }); await waitFor(`${G}.player.onGround`, 2000); await sleep(150); }
    check('tutorial: platform task', (await advance()) === 'task' && /PLATFORM/.test(await ev(`${G}.objective.label`)));
    // jump onto the platform for real (no teleporting onto it)
    await ev(`(() => { const g = ${G}; g.player.placeAt(126 * 16, g.level.arena.floorY); g.player.facing = 1; return true; })()`);
    await sleep(200);
    await b.down('KeyD'); await sleep(150); await b.down('Space'); await sleep(380); await b.up('Space'); await sleep(450); await b.up('KeyD');
    await sleep(300);
    check('a real jump reaches the arena platform', await ev(`${G}.player.stats.platform === true`), await ev(`[${G}.player.x, ${G}.player.feet]`));
    check('tutorial: dash task', (await advance()) === 'task' && /DASH/.test(await ev(`${G}.objective.label`)));
    for (let i = 0; i < 2; i++) { await b.key('ShiftLeft', { wait: 30 }); await sleep(700); }
    check('tutorial: attack task', (await advance()) === 'task' && /HIT/.test(await ev(`${G}.objective.label`)));
    await ev(`(() => { const g = ${G}; g.player.placeAt(g.dummy.x - 16, g.level.arena.floorY); g.player.facing = 1; return true; })()`);
    await sleep(300);
    for (let i = 0; i < 7; i++) { await b.key('KeyJ', { wait: 30 }); await sleep(330); }
    check('punching the dummy registers hits', (await ev(`${G}.dummy.hits`)) >= 6);
    await shot('09-punch');
    check('tutorial: block task', (await advance()) === 'task' && /BLOCK/.test(await ev(`${G}.objective.label`)));
    check('the dummy throws bolts', await waitFor(`${G}.bolts.length > 0`, 3000));
    await ev(`(() => { const g = ${G}; g.player.placeAt(g.dummy.x - 50, g.level.arena.floorY); g.player.facing = 1; return true; })()`);
    await b.down('KeyK');
    await waitFor(`${G}.player.stats.blocks >= 3`, 9000);
    await shot('10-block');
    await b.up('KeyK');
    check('blocking deflects bolts', (await ev(`${G}.player.stats.blocks`)) >= 3);
    await waitFor(`!${G}.objective || ${G}.objective.doneT > 0 || !/BLOCK/.test(${G}.objective.label)`, 3000);   // let the BLOCK task finish first
    check('tutorial: skill tree task', (await advance()) === 'task' && /SKILL/.test(await ev(`${G}.objective.label`)));
    check('the Voice gave a skill point', (await ev(`${G}.character.skillPoints`)) === 1);
    await b.key('KeyT');
    check('the skill tree opens', await waitFor("ERX.Scenes.top().id === 'skills' && ERX.Scenes.top().appearT >= 1", 2000));
    check('the element branch is locked', await ev("ERX.Scenes.top().elementRect !== undefined"));
    await shot('11-skills');
    await b.key('Enter');
    check('spending the point learns VITALITY 1 (+10 max HP)', await ev(`${G}.character.skills.vitality === 1 && ${G}.player.maxHp === 110 && ${G}.character.skillPoints === 0`));
    await b.key('Escape');
    await waitFor("ERX.Scenes.top().id === 'game'", 2000);
    check('final choice: Bet / What if I die', (await advance()) === 'choose' && /die/.test(await ev(`${G}.dialogue.choices[1]`)));
    await pick(1);
    let sawStone = false, sawGame = false;
    for (let i = 0; i < 40 && !(sawStone && sawGame); i++) {
      const txt = await ev(`${G}.dialogue.active ? (${G}.dialogue.text || '') : ''`);
      if (/IMMORTALITY STONE/.test(txt)) sawStone = true;
      if (/VIDEO GAME/.test(txt)) sawGame = true;
      await b.key('Enter', { wait: 30 });
      await sleep(150);
    }
    check('the Voice explains the Immortality Stone', sawStone);
    check('...then breaks the fourth wall (you are in a video game)', sawGame);
    await advance(30);
    check('the gates open', await waitFor(`${G}.gates.left.target === 0 && ${G}.gates.right.target === 0`, 6000));
    await advance(10);
    check('progress is saved after the tutorial', await waitFor("ERX.Saves.characters[0].progress.stage === 'tutorialDone'", 4000));
    check('the "go fight enemies" objective shows', await waitFor(`!!${G}.objective && /ENEMIES/.test(${G}.objective.label)`, 3000));
    check('upbeat music after the gates open', await ev("ERX.Audio.music.wanted === 'onward'"));
    await shot('12-gates-open');

    console.log('[pause]');
    await b.key('Escape');
    check('ESC pauses the game', await waitFor("ERX.Scenes.top().id === 'pause'", 2000));
    await shot('13-pause');
    await b.key('Enter');
    check('RESUME returns to the game', await waitFor("ERX.Scenes.top().id === 'game'", 2000));

    console.log('[monsters]');
    check('six monsters wait past the arena (slimes + bats)', await ev(`${G}.enemies.filter(e => e.zone === 'gauntlet').length === 6 && ${G}.enemies.some(e => e instanceof ERX.Enemies.Bat) && ${G}.enemies.some(e => e instanceof ERX.Enemies.Slime)`));
    check('the way deeper is sealed until they are beaten', await ev(`${G}.gates.gauntlet.target === 1`));
    // fight one slime for real
    await ev(`(() => { const g = ${G}; const s = g.enemies.find(e => e instanceof ERX.Enemies.Slime); g.enemies.forEach(e => { if (e !== s) e.x += 0; }); g.player.placeAt(s.cx - 14, g.level._groundBelow(Math.floor(s.cx / 16), 2) * 16); g.player.facing = 1; window.__slime = s; return true; })()`);
    const xp0 = await ev(`${G}.player.xp + ${G}.player.level * 1000`);
    for (let i = 0; i < 14 && !(await ev('window.__slime.dead')); i++) {
      await ev(`(() => { const g = ${G}; const s = window.__slime; g.player.facing = s.cx > g.player.cx ? 1 : -1; if (Math.abs(s.cx - g.player.cx) > 16) g.player.placeAt(s.cx - 12 * g.player.facing, g.player.feet); return true; })()`);
      await b.key('KeyJ', { wait: 30 });
      await sleep(320);
    }
    check('punching a slime kills it', await ev('window.__slime.dead'));
    check('killing monsters gives XP', (await ev(`${G}.player.xp + ${G}.player.level * 1000`)) > xp0);
    await shot('13-fight');
    // monsters fight back
    const hp0 = await ev(`${G}.player.hp`);
    await ev(`(() => { const g = ${G}; const s = g.enemies.find(e => e instanceof ERX.Enemies.Slime && !e.dead); g.player.invulnT = 0; g.player.placeAt(s.cx, s.y + s.h); return true; })()`);
    await sleep(400);
    check('monsters hurt you on contact', (await ev(`${G}.player.hp`)) < hp0);
    // bats wake up and swoop
    await ev(`(() => { const g = ${G}; const bat = g.enemies.find(e => e instanceof ERX.Enemies.Bat); g.player.placeAt(bat.cx + 20, g.level._groundBelow(Math.floor(bat.cx / 16), 2) * 16); window.__bat = bat; return true; })()`);
    check('bats wake up when you come close', await waitFor("window.__bat.state !== 'hang'", 3000));
    // finish the rest quickly
    await ev(`(() => { const g = ${G}; g.player.placeAt(g.level.gauntlet.x0 + 40, 19 * 16); g.enemies.filter(e => e.zone === 'gauntlet').forEach(e => e.hurt(999, 1, false)); return true; })()`);

    check('monsters drop gold', await waitFor('ERX.Saves.characters[0].gold > 0', 2000), await ev('ERX.Saves.characters[0].gold'));

    console.log('[the Voice returns]');
    check('clearing the monsters brings the Voice back', await waitFor(`!!${G}.script && ${G}.player.controls === false`, 4000));
    let sawSarcasm = false, sawThought = false;
    for (let i = 0; i < 40; i++) {
      const st = await ev(`(() => { const d = ${G}.dialogue; return d.active ? d.mode + '|' + (d.speaker ? d.speaker.name : '') + '|' + (d.text || '') : 'none'; })()`);
      if (/songs/.test(st)) sawSarcasm = true;
      if (/^say\|\(YOU\)/.test(st)) sawThought = true;
      if (st.startsWith('choose')) break;
      await b.key('Enter', { wait: 30 }); await sleep(140);
    }
    check('the Voice sarcastically applauds', sawSarcasm);
    check('...and you see right through it', sawThought);
    check('choices: Ok / Why is there an elevator in a cave?', await ev(`${G}.dialogue.mode === 'choose' && /elevator in a cave/.test(${G}.dialogue.choices[1])`));
    await pick(1);
    let sawNoIdea = false, sawOddFeeling = false;
    for (let i = 0; i < 40; i++) {
      const info = await ev(`(() => { const d = ${G}.dialogue; return d.active ? JSON.stringify({ t: d.text, c: d.textColor }) : 'none'; })()`);
      if (/NO idea/.test(info)) sawNoIdea = true;
      if (/odd feeling/.test(info) && /7af0e0/.test(info)) { sawOddFeeling = true; await shot('14-odd-feeling'); }
      if (info === 'none' && !(await ev(`!!${G}.script`))) break;
      await b.key('Enter', { wait: 30 }); await sleep(140);
    }
    check('the Voice has no idea why there is an elevator', sawNoIdea);
    check('your "odd feeling" line is in its own colour', sawOddFeeling);
    check('the way deeper opens', await waitFor(`${G}.gates.gauntlet.target === 0`, 3000));
    check('progress saved (enemies cleared)', (await ev('ERX.Saves.characters[0].progress.stage')) === 'enemiesCleared');

    console.log('[the Deep Ends]');
    await ev(`${G}.player.placeAt(${G}.level.transitionX - 30, 21 * 16); true`);
    await b.hold('KeyD', 700);
    check('heading deeper loads the Deep Ends', await waitFor(`${G}.levelId === 'deep' && !ERX.Scenes.busy`, 5000));
    check('Deep Ends banner + bright music', await ev(`!!${G}.banner && /DEEP ENDS/.test(${G}.banner.title) && ERX.Audio.music.wanted === 'deepends'`));
    check('progress saved (deep ends)', (await ev('ERX.Saves.characters[0].progress.stage')) === 'deepEnds');
    check('the Deep Ends are full of monsters', (await ev(`${G}.enemies.length`)) >= 12);
    await sleep(800);
    await shot('15-deep-ends');
    // talk to a miner
    await ev(`(() => { const g = ${G}; const n = g.npcs.find(n => n.id === 'gus'); g.player.placeAt(n.x - 12, n.y); return true; })()`);
    await sleep(300);
    check('miners can be talked to', await ev(`!!${G}.prompt && /TALK/.test(${G}.prompt.text)`));
    await b.key('KeyE');
    check('Miner Gus talks about how bright the cave is', await waitFor(`${G}.dialogue.active && ${G}.dialogue.speaker.name === 'MINER GUS' && /BEAUTIFUL|colour|lighting/.test(${G}.dialogue.text)`, 2000));
    await shot('16-miner');
    await advance(6);
    check('the camp has three miners', (await ev(`${G}.npcs.length`)) === 3);

    console.log('[death & the Immortality Stone]');
    await waitFor(`!${G}.script`, 3000);
    await ev(`(() => { const g = ${G}; g.player.invulnT = 0; g.player.blocking = false; g.player.takeHit(9999, g.player.cx + 10); return true; })()`);
    check('you can actually die now', await waitFor(`${G}.state === 'dead'`, 1500));
    await shot('17-dead');
    check('...and the Immortality Stone revives you', await waitFor(`${G}.state === 'play' && ${G}.player.hp === ${G}.player.maxHp && !ERX.Scenes.busy`, 6000));

    console.log('[mining camp platforms]');
    await waitFor(`!${G}.script`, 3000);
    await ev(`${G}.player.placeAt(66 * 16, 26 * 16); ${G}.player.facing = 1; true`);
    await sleep(300);
    await b.down('Space'); await sleep(380); await b.up('Space');
    await sleep(200); await waitFor(`${G}.player.onGround`, 2000);
    check('the low camp scaffold is reachable from the floor', await ev(`${G}.player.feet <= 24 * 16 + 0.5`), await ev(`[${G}.player.x, ${G}.player.feet]`));
    await ev(`${G}.player.placeAt(70.5 * 16, 24 * 16); true`);
    await sleep(300);
    await b.down('Space'); await sleep(380); await b.up('Space');
    await sleep(200); await waitFor(`${G}.player.onGround`, 2000);
    check('...and Old Marge\'s top scaffold is reachable from there', await ev(`${G}.player.feet <= 22 * 16 + 0.5`), await ev(`[${G}.player.x, ${G}.player.feet]`));
    check('Old Marge sits on her (lowered) scaffold', await ev(`${G}.npcs.find(n => n.id === 'marge').y === 22 * 16`));

    console.log('[dash = intangible]');
    const dodge = await ev(`(() => { const p = ${G}.player; p.invulnT = 0; p.dashT = 0.1; const hp = p.hp; const r = p.takeHit(25, p.cx + 10); const ok = r === 'ignored' && p.hp === hp; p.dashT = 0; p.dashGrace = 0; return ok; })()`);
    check('nothing can hit you mid-dash', dodge);
    const contact = await ev(`(() => { const g = ${G}; const s = g.enemies.find(e => e instanceof ERX.Enemies.Slime && !e.dead); const p = g.player; p.invulnT = 0; p.placeAt(s.cx, s.y + s.h); p.dashT = 0.1; const hp = p.hp; s.contact && s.contact(); const ok = p.hp === hp; p.dashT = 0; return ok; })()`);
    check('dashing straight through a monster does not hurt', contact);
    const bolt = await ev(`(() => { const g = ${G}; const p = g.player; p.invulnT = 0; p.dashT = 0.1; const hp = p.hp; const B = new ERX.Props.Bolt(p.cx, p.y + 10, 0); B.update(0.016, g); const ok = p.hp === hp && !B.dead; p.dashT = 0; return ok; })()`);
    check('bolts pass straight through a dashing player', bolt);

    console.log('[the elevator]');
    await ev(`(() => { const g = ${G}; g.enemies.length = 0; const E = g.level.elevator; g.player.placeAt(E.x, E.floorY); return true; })()`);
    await sleep(300);
    check('the elevator can be ridden', await ev(`!!${G}.prompt && /ELEVATOR/.test(${G}.prompt.text)`));
    await b.key('KeyE');
    check('riding it starts the elevator scene', await waitFor(`${G}.state === 'elevator'`, 2000));
    check('elevator music plays', await waitFor("ERX.Audio.music.wanted === 'elevator'", 3000));
    await sleep(2500);
    await shot('18-elevator');
    check('the elevator goes all the way up (no slime crash this time)', await waitFor(`${G}.levelId === 'vault' && !ERX.Scenes.busy`, 14000));
    check('no element before the reveal', await ev("!('element' in ERX.Saves.characters[0])"));

    console.log('[the sealed chamber]');
    check('arriving plays a cutscene', await waitFor(`!!${G}.script && ${G}.player.controls === false`, 3000));
    check('a glowing rainbow orb sits in a sealed container', await ev(`!!${G}.orb && ${G}.orb.state === 'sealed' && !${G}.orb.broken`));
    let sawPan = false;
    for (let i = 0; i < 80 && (await ev(`!!${G}.script`)); i++) {
      if (!sawPan && (await ev(`!!${G}.camera.focus`))) { sawPan = true; await sleep(800); await shot('19-orb-reveal'); }
      if (await ev(`${G}.dialogue.active`)) await b.key('Enter', { wait: 30 });
      await sleep(150);
    }
    check('...where the camera shows you the orb', sawPan);
    check('control returns after the cutscene', await waitFor(`!${G}.script && ${G}.player.controls`, 3000));
    check('you can walk towards it', await ev(`/ORB/.test(${G}.objective && ${G}.objective.label)`));
    await b.down('KeyD');
    await waitFor(`!!${G}.prompt && /ORB/.test(${G}.prompt.text)`, 9000);
    await b.up('KeyD');
    check('getting close lets you interact with it', await ev(`!!${G}.prompt && /TOUCH THE ORB/.test(${G}.prompt.text)`), await ev(`[${G}.player.cx, ${G}.orb.x]`));
    await shot('20-orb-close');
    if (process.env.FORCE_EL) await ev(`ERX.Saves.characters[0].element = '${process.env.FORCE_EL}'; true`);   // screenshots of a specific roll
    await b.key('KeyE');
    check('touching it starts the awakening', await waitFor(`!!${G}.script && ${G}.player.controls === false`, 2000));
    for (let i = 0; i < 30 && (await ev(`${G}.orb.state`)) === 'sealed'; i++) { if (await ev(`${G}.dialogue.active`)) await b.key('Enter', { wait: 30 }); await sleep(200); }
    check('the orb shakes and the glass cracks', await waitFor(`${G}.orb.shake > 0 && ${G}.orb.crack > 0`, 4000));
    check('it breaks out of the container', await waitFor(`${G}.orb.broken && ${G}.orb.state === 'free'`, 5000));
    check('...with a massive shockwave', await ev(`${G}.shockwaves.length > 0`));
    await sleep(150);
    await shot('21-shockwave');
    check('which sends you flying', await ev(`Math.abs(${G}.player.vx) > 100 && ${G}.player.flungT > 0`));
    for (let i = 0; i < 60 && (await ev(`${G}.state`)) !== 'nebula'; i++) { if (await ev(`${G}.dialogue.active`)) await b.key('Enter', { wait: 30 }); await sleep(150); }
    check('the orb dashes into your body', await ev(`${G}.orb.state === 'gone' && ${G}.orb.hit === true`));
    check('you shake violently in a nebula galaxy', await ev(`${G}.state === 'nebula'`));
    await sleep(1500);
    await shot('22-nebula');
    check('then you pass out', await waitFor(`${G}.neb && ${G}.neb.lying`, 5000));
    check('...and the screen slowly cuts to black', await waitFor(`${G}.neb && ${G}.neb.black > 0.5`, 5000));

    console.log('[THE REVEAL]');
    check('the reveal begins in silence and darkness', await waitFor(`${G}.state === 'reveal'`, 5000) && await ev("ERX.Audio.music.wanted === null && ERX.Audio.ambience.wanted === null"));
    const el = await ev("ERX.Saves.characters[0].element || null");
    check('an element is assigned (at random) at the reveal', !!el && (await ev(`!!ERX.Elements.get('${el}')`)), el);
    check('progress saved (awakened)', (await ev('ERX.Saves.characters[0].progress.stage')) === 'awakened');
    await sleep(2500);
    check('5 seconds of nothing first', await ev(`${G}.rev.you === null`));
    check('"YOU" appears', await waitFor(`${G}.rev.you !== null`, 4000));
    check('...then "GOT" a second later', await waitFor(`${G}.rev.got !== null`, 2000) && (await ev(`${G}.rev.you >= 0.8`)));
    check('...then the drumroll', await waitFor(`${G}.rev.roll !== null`, 2000));
    check('...then the element appears', await waitFor(`${G}.rev.elem !== null`, 4000));
    check('the element art is loaded (or has its fallback title)', await ev(`(() => { const e = ${G}.element(); return e.art ? !!ERX.Assets.image('element_' + e.id) : e.id === 'darkness'; })()`), el);
    check('every element has a signature sound + the guitar riff exists', await ev("ERX.Elements.list.every(e => typeof ERX.SfxBank['element_' + e.id] === 'function') && typeof ERX.SfxBank.guitarRiff === 'function' && typeof ERX.SfxBank.drumroll === 'function'"));
    await sleep(800);
    await shot('23-you-got');
    check('...then how rare it is', await waitFor(`${G}.rev.rarity !== null`, 3000));
    check('every rarity tier has a sting', await ev("typeof ERX.SfxBank.raritySting === 'function'"));
    await sleep(1200);
    await shot('23b-rarity');
    console.log('[the void]');
    check('right after the reveal, the screen cuts to black', await waitFor(`${G}.state === 'black'`, 8000));
    check('...and you are floating in a space-like void', await waitFor(`${G}.levelId === 'void' && ${G}.state === 'float' && ${G}.player.lying`, 5000));
    await sleep(800);
    await shot('24-void-float');
    check('you wake up and bounce right to your feet', await waitFor(`${G}.state === 'play' && !${G}.player.lying && ${G}.player.onGround`, 8000));
    check('there is no (visible) floor', await ev(`(() => { const g = ${G}; const c = g.tilesCanvas.getContext('2d'); const d = c.getImageData(0, g.level.floorY, g.level.pw, 16).data; for (let k = 3; k < d.length; k += 4) if (d[k]) return false; return true; })()`));
    check('...but you can walk on it anyway', await ev(`!!${G}.level.isSolid(10, 18)`));
    check('someone stands out there, looking towards the horizon', await ev(`!!${G}.figure && ${G}.figure.facing === 1 && !${G}.figure.met && ${G}.figure.x > ${G}.player.cx`));
    await waitFor(`!${G}.script && ${G}.player.controls`, 6000);
    const vx0 = await ev(`${G}.player.x`);
    await b.down('KeyD');
    await sleep(500);
    check('you can walk around', (await ev(`${G}.player.x`)) > vx0 + 20);
    check('the invisible floor ripples where you step', await waitFor(`${G}.ripples.length > 0`, 1500));
    await waitFor(`!!${G}.script`, 15000);
    await b.up('KeyD');
    check('the figure turns around... slowly', await waitFor(`${G}.figure.front === true`, 4000));
    check('...and gets a comedically shocked expression', await waitFor(`${G}.figure.expr === 'shock' && ${G}.figure.bubble === 'bang'`, 4000));
    check('the confusing music plays again', await waitFor("ERX.Audio.music.wanted === 'voice'", 3000));
    await shot('25-figure-shock');
    // talk to him, choosing the answers named below
    const seenV = [];
    const answers = [
      [/Idk\./, 1],                                   // "You probably brought me here."
      [/^Yes\. \/ No\.$/, 1],                        // "No."
      [/Unknown Being/, 1],                            // "Who is this Unknown Being?"
      [/tutorial guide/, 1],                           // "What type of tutorial guide are you?"
    ];
    let sawAngryDomain = false, sawLying = false, sawScan = false, sawKey = false, worldsWhenShown = null;
    for (let k = 0; k < 500 && (await ev(`!!${G}.script`)); k++) {
      const st = await ev(`(() => { const d = ${G}.dialogue; return d.active ? (d.mode === 'say' ? 'say|' + d.speaker.name + '|' + d.plain : 'choose|' + d.choices.join(' / ')) : 'busy'; })()`);
      if (st !== 'busy' && seenV[seenV.length - 1] !== st) seenV.push(st);
      if (/domain/.test(st) && (await ev(`${G}.figure.expr === 'angry'`))) { if (!sawAngryDomain) await shot('26-figure-angry'); sawAngryDomain = true; }
      if (/lying/.test(st) && (await ev(`${G}.figure.expr === 'unamused'`))) sawLying = true;
      if (!sawScan && (await ev(`!!${G}.scan`))) { sawScan = true; await sleep(500); await shot('27-scan'); }
      if (!worldsWhenShown && (await ev(`!!${G}.worlds && ${G}.worlds.t > 3`))) { worldsWhenShown = await ev(`${G}.worlds.unlocked.slice()`); await shot('28-worlds'); }
      if (!sawKey && (await ev(`!!${G}.energyKey && ${G}.energyKey.phase === 'fly'`))) { sawKey = true; await shot('29-energy-key'); }
      if (st.startsWith('choose|')) {
        const a = answers.find(([re]) => re.test(st.slice(7)));
        const idx = a ? a[1] : 0;
        for (let q = 0; q < idx; q++) await b.key('ArrowDown', { wait: 40 });
        await sleep(280);
        await b.key('Enter', { wait: 40 });
      } else if (st.startsWith('say|')) await b.key('Enter', { wait: 30 });
      await sleep(120);
    }
    const said = (re) => seenV.some((x) => re.test(x));
    check('he stutters about how you got here', said(/H-h-how did you g-g-get HERE/));
    check('three answers: Idk / you brought me / are you the Voice?', said(/^choose\|Idk\. \/ You probably brought me here\. \/ Are you the Voice that helped me through that tutorial\?$/));
    check('"You probably brought me here" -> he snaps: this is HIS domain', sawAngryDomain && said(/RANDOM VISITORS/));
    check('every answer leads to: this is what he really looks like', said(/what I really look like/));
    check('...and he was the one who helped you through the tutorial', said(/helped you through that whole tutorial/));
    check('he asks if you got your element yet', said(/Did you get your element yet/));
    check('"No." -> visibly unamused: he knows you are lying', sawLying && said(/ONLY way you could have gotten here/));
    check('he scans you', sawScan);
    const elName = await ev(`${G}.element().name.toUpperCase()`);
    check('...and says something about YOUR element', said(new RegExp('THE VOICE\\|' + elName)) && (await ev(`!!ERX.Story.void.ELEMENT_LINES[${G}.element().id]`)), elName);
    check('every element has its own lines', await ev('ERX.Elements.list.every(e => !!ERX.Story.void.ELEMENT_LINES[e.id])'));
    check('the Julforic Pillars + the Unknown Being (nobody knows who)', said(/JULFORIC PILLARS/) && said(/don't even know who it is/));
    check('"What type of tutorial guide are you?" -> he can\'t just use any element, he\'s like you', said(/I'm just like you/));
    check('seven locked worlds appear', !!worldsWhenShown && worldsWhenShown.length === 7 && worldsWhenShown.every((u) => !u));
    check('the worlds depend on your element', await ev("(() => { const a = ERX.Worlds.build(ERX.Elements.get('fire')), b = ERX.Worlds.build(ERX.Elements.get('ice')); return a.length === 7 && a.some((w, i) => w.surface !== b[i].surface); })()") && said(/depend on what element you have/));
    check('you ask how many elements there are: he doesn\'t know', said(new RegExp(await ev(`${G}.character.name.toUpperCase()`) + '\\|How many elements are there')) && said(/^say\|THE VOICE\|I don't know\.$/));
    check('he shoots an energy key at the first world\'s lock', sawKey || (await ev(`!!${G}.energyKey && ${G}.energyKey.done && !!${G}.energyKey.from`)));
    check('...which breaks it (world 1 unlocked, the rest still locked)', await ev(`${G}.worlds.unlocked[0] && ${G}.worlds.unlocked.slice(1).every(u => !u)`));
    check('he says he\'ll be at his HQ (go ahead, or stay a bit)', said(/I'll be at my HQ/) && said(/stay for a bit/));
    check('progress saved (worldUnlocked)', (await ev('ERX.Saves.characters[0].progress.stage')) === 'worldUnlocked');
    check('then he walks away', await ev(`${G}.figure.walkTo !== null`) && await waitFor(`${G}.figure.gone`, 12000));
    await shot('30-free');

    console.log('[jump into world 1]');
    await ev(`(() => { const g = ${G}; g.player.placeAt(g.level.jumpX, g.level.floorY); return true; })()`);
    await sleep(300);
    check('you can jump into the world', await ev(`!!${G}.prompt && /JUMP INTO WORLD 1/.test(${G}.prompt.text)`));
    await b.key('KeyE');
    check('...up you go', await waitFor(`${G}.state === 'launch'`, 3000));
    await sleep(1300);
    await shot('31-launch');
    check('...and the slime is there. Of course.', await waitFor(`${G}.state === 'reveal' && !!${G}.rev.slime && ${G}.rev.slime.landed`, 8000));
    let sawPatient = false;
    for (let k = 0; k < 60 && (await ev("ERX.Scenes.top().id")) === 'game'; k++) {
      if (/be patient/.test(await ev(`${G}.dialogue.text || ''`))) sawPatient = true;
      await b.key('Enter', { wait: 30 }); await sleep(250);
    }
    check('"Not here yet, be patient >:("', sawPatient);
    check('world 1 is coming soon', await waitFor("ERX.Scenes.top().id === 'demoEnd' && /WORLD 1/.test(ERX.Scenes.top().p.title)", 6000));
    await waitFor('ERX.Scenes.top().appearT >= 1 && !ERX.Scenes.busy', 3000);
    await b.key('Enter');
    check('...back to the void', await waitFor(`ERX.Scenes.top().id === 'game' && ${G}.levelId === 'void' && !ERX.Scenes.busy`, 5000));

    console.log('[the HQ]');
    await ev(`(() => { const g = ${G}; g.player.placeAt(g.hqDoor.x, g.level.floorY); return true; })()`);
    await sleep(300);
    check('or you can go explore his HQ', await ev(`!!${G}.prompt && /ENTER THE HQ/.test(${G}.prompt.text)`));
    await b.key('KeyE');
    check('...which is a real place', await waitFor(`${G}.levelId === 'hq' && !ERX.Scenes.busy`, 5000));
    check('it has a bunch of people in it (and him)', await ev(`${G}.npcs.length >= 6 && ${G}.npcs.some(n => n.id === 'guide')`));
    await shot('32-hq');
    const goldBefore = 40;
    await ev(`(() => { const g = ${G}; g.character.gold = ${goldBefore}; g.player.placeAt(g.npcs.find(n => n.id === 'brenda').x - 6, g.level.floorY); g.player.facing = 1; return true; })()`);
    await sleep(300);
    await b.key('KeyE');
    check('Brenda sells armor', await waitFor(`${G}.dialogue.active && /Brenda/.test(${G}.dialogue.plain)`, 2000));
    // buy the cardboard armor, then try the golden one, then leave
    const shopPlan = [0, 4, 5];
    let shopStep = 0, sawBroke = false;
    for (let k = 0; k < 80 && (await ev(`!!${G}.script`)); k++) {
      const st = await ev(`(() => { const d = ${G}.dialogue; return d.active ? d.mode + '|' + (d.mode === 'say' ? d.plain : d.choices.join(' / ')) : 'busy'; })()`);
      if (/realistic|math isn't mathing/.test(st)) sawBroke = true;
      if (st.startsWith('choose|')) {
        if (/^choose\|Buy it/.test(st)) { await b.key('Enter', { wait: 40 }); }
        else {
          if (shopStep === 0) await shot('33-shop');
          const idx = shopPlan[Math.min(shopStep++, shopPlan.length - 1)];
          for (let q = 0; q < idx; q++) await b.key('ArrowDown', { wait: 40 });
          await sleep(280);
          await b.key('Enter', { wait: 40 });
        }
      } else if (st.startsWith('say|')) await b.key('Enter', { wait: 30 });
      await sleep(120);
    }
    const ch = await ev('JSON.stringify((({ gold, armor, armorOwned }) => ({ gold, armor, armorOwned }))(ERX.Saves.characters[0]))');
    check('you can buy armor if you have the money', await ev("(() => { const c = ERX.Saves.characters[0]; return c.armor === 'cardboard' && c.armorOwned.indexOf('cardboard') !== -1 && c.gold === 30; })()"), ch);
    check('...and can\'t if you don\'t', sawBroke && await ev("ERX.Saves.characters[0].armorOwned.indexOf('golden') === -1"));
    check('armor shows on you and soaks damage', await ev(`(() => { const p = ${G}.player; p.invulnT = 0; p.dashT = 0; p.dashGrace = 0; p.blocking = false; const hp = p.hp; p.takeHit(10, p.cx + 30); const ok = hp - p.hp === 9 && p.look.armor === ERX.Armor.get('cardboard').color; p.hp = p.maxHp; p.invulnT = 0; return ok; })()`));
    await shot('34-armor');
    await ev(`(() => { const g = ${G}; g.player.placeAt(g.level.exit.x, g.level.floorY); return true; })()`);
    await sleep(400);
    check('the HQ door leads back to the void', await ev(`!!${G}.prompt && /BACK TO THE VOID/.test(${G}.prompt.text)`));
    await b.key('KeyE');
    check('...and it does', await waitFor(`${G}.levelId === 'void' && !ERX.Scenes.busy`, 5000));
    await waitFor(`!${G}.script`, 2000);
    await b.key('Escape');
    await waitFor("ERX.Scenes.top().id === 'pause'", 2000);
    await ev("(() => { const s = ERX.Scenes.stack; ERX.Scenes.transition('dissolve', 0.3, () => { while (s.length > 1) { const x = s.pop(); x.exit(); } ERX.Scenes.top().resume(); }); return true; })()");
    check('back to the title screen', await waitFor("ERX.Scenes.stack.length === 1 && ERX.Scenes.top().id === 'mainMenu'", 4000));

    console.log('[returning player]');
    await waitFor("ERX.Scenes.top().id === 'mainMenu' && ERX.Scenes.top().appearT >= 1 && !ERX.Scenes.busy");
    await sleep(800);
    await b.key('Enter');
    await waitFor("ERX.Scenes.top().id === 'characters' && ERX.Scenes.top().appearT >= 1");
    await b.key('Enter');
    check('a returning player resumes in the void (world 1 unlocked, he is at his HQ)', await waitFor(`ERX.Scenes.top().id === 'game' && ${G}.levelId === 'void' && ${G}.worlds && ${G}.worlds.unlocked[0] && !${G}.figure && !!${G}.hqDoor`, 5000));
    check('your armor and gold were saved', await ev("ERX.Saves.characters[0].armor === 'cardboard' && ERX.Saves.characters[0].gold === 30"));
    check('your level was saved', (await ev('ERX.Saves.characters[0].level')) >= 1 && (await ev(`${G}.player.level`)) === (await ev('ERX.Saves.characters[0].level')));
    check('the element never rerolls', (await ev('ERX.Saves.characters[0].element')) === el);
    console.log('[bats never spawn stuck]');
    const stuckBats = await ev(`(() => { const P = ERX.GameEngine.Physics; let bad = 0; for (const L0 of [ERX.CaveLevel, ERX.DeepEndsLevel]) for (let s = 1; s <= 150; s++) { const L = new L0(s * 7919); for (const sp of L.enemySpawns.filter(e => e.type === 'bat')) { const bt = new ERX.Enemies.Bat({ level: L, player: { cx: 0, y: 0 } }, sp); if (P.overlapsSolid(L, bt.x, bt.y, bt.w, bt.h)) bad++; } } return bad; })()`);
    check('no bat ever starts inside the ceiling (150 random caves each)', stuckBats === 0, stuckBats);
    const freed = await ev(`(() => { const L = new ERX.CaveLevel(15838); const g = { level: L, player: { cx: 188 * 16, x: 188 * 16, y: 17 * 16, w: 10, h: 22, invulnT: 9, intangible: true, takeHit() {} } }; const sp = L.enemySpawns.find(e => e.type === 'bat'); const bt = new ERX.Enemies.Bat(g, sp); bt.y -= 40; const P = ERX.GameEngine.Physics; const was = P.overlapsSolid(L, bt.x, bt.y, bt.w, bt.h); bt.state = 'fly'; bt.update(1 / 60); return was && !P.overlapsSolid(L, bt.x, bt.y, bt.w, bt.h); })()`);
    check('a bat shoved into rock frees itself', freed);

    console.log('[rarity]');
    check('six tiers: common > uncommon > rare > epic > legendary > MYTHIC', await ev("ERX.Elements.rarities.map(r => r.id).join() === 'common,uncommon,rare,epic,legendary,mythic' && ERX.Elements.rarities.every((r, i, a) => !i || r.weight < a[i - 1].weight)"));
    check('every element has a rarity', await ev("ERX.Elements.list.every(e => !!ERX.Elements.rarityOf(e))"));
    check('Chaos is the one and only MYTHIC', await ev("ERX.Elements.list.filter(e => e.rarity === 'mythic').map(e => e.id).join() === 'chaos'"));
    check('Chaos is the rarest roll', await ev("(() => { const E = ERX.Elements, c = E.chance(E.get('chaos')); return E.list.every(e => e.id === 'chaos' || E.chance(e) > c); })()"));
    const dist = await ev("(() => { const n = {}; for (let i = 0; i < 100000; i++) { const r = ERX.Elements.random().rarity; n[r] = (n[r] || 0) + 1; } return n; })()");
    check('the roll is weighted (commons common, mythic very rare)', dist.common > dist.uncommon && dist.uncommon > dist.rare && dist.rare > dist.epic && dist.epic > dist.legendary && (dist.mythic || 0) < dist.legendary && (dist.mythic || 0) < 600, dist);
    check('nobody chose it: no element setting exists', await ev("!JSON.stringify(ERX.Settings.data).match(/element/i)"));

    console.log('[restart = full reset]');
    await waitFor(`!ERX.Scenes.busy`, 3000);
    await b.key('Escape');
    check('pause opens', await waitFor("ERX.Scenes.top().id === 'pause'", 2000));
    await ev("(() => { const p = ERX.Scenes.top(); p.buttons.find(x => x.label === 'RESTART').onActivate(); return true; })()");
    check('restart asks first', await waitFor("ERX.Scenes.top().id === 'confirm'", 2000));
    await ev("ERX.Scenes.top().p.onYes(); true");
    check('restart lands back in the cave', await waitFor(`ERX.Scenes.top().id === 'game' && ${G}.levelId === 'cave' && !ERX.Scenes.busy`, 5000));
    check('restart wipes all progress (stage, level, xp, skills, element, gold, armor)', await ev("(() => { const c = ERX.Saves.characters[0]; return c.progress.stage === 'new' && c.level === 1 && !c.xp && c.skillPoints === 0 && Object.values(c.skills).every(v => v === 0) && !('element' in c) && c.gold === 0 && c.armor === null && c.armorOwned.length === 0; })()"), await ev("JSON.stringify(ERX.Saves.characters[0])"));
    check('...and it stays wiped after a reload', await ev("(() => { ERX.Saves.load(); const c = ERX.Saves.characters[0]; return c.progress.stage === 'new' && !('element' in c); })()"));

    check('no console errors', b.errors.length === 0, b.errors);
  } catch (e) {
    check('test run crashed', false, String(e && e.stack || e)); console.log('ERRORS', JSON.stringify(b.errors));
  } finally {
    await b.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed.');
  process.exit(failed.length ? 1 : 0);
})();
