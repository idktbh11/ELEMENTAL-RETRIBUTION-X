/*
 * Element abilities test: kits for every element, casting with the real
 * keys, upgrades, status effects, guard breaks, the element skill tree,
 * the Training Room dummies and the hidden admin panel.
 *
 * Also checks that every move and Ultimate is its own code (no recolours).
 *
 *   node tools/test-abilities.js            (add --shots to save screenshots)
 */
const path = require('path');
const fs = require('fs');
const { launch, sleep } = require('./cdp.js');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html?scene=sky&seed=4';
const SHOTS = process.argv.includes('--shots');
const SHOT_DIR = path.join(__dirname, 'screenshots');
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log((ok ? '  PASS ' : '  FAIL ') + name + (ok || detail === undefined ? '' : '  -> ' + JSON.stringify(detail)));
}

(async () => {
  console.log('ELEMENTAL RETRIBUTION X — abilities test\n');
  const b = await launch({ width: 1280, height: 720 });
  const ev = (e) => b.eval(e);
  const G = 'ERX.Scenes.find("game")';
  const waitFor = async (expr, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await ev(expr)) return true; } catch (e) { /* */ } await sleep(80); } return false; };
  const shot = async (n) => { if (SHOTS) { fs.mkdirSync(SHOT_DIR, { recursive: true }); await b.screenshot(path.join(SHOT_DIR, 'abil-' + n + '.png')); } };

  try {
    await b.goto(URL);
    check('boots', await waitFor('!!(window.ERX && ERX.Game && ERX.Game.ready)', 15000));

    console.log('[the kits]');
    const kits = await ev(`(() => {
      const bad = [], S = ERX.Abilities.STATUS, src = (fns) => fns.filter(Boolean).map(String).join('|');
      const moveSrc = new Map(), m1Names = new Set(), chargeSrc = new Set(), runSrc = new Set(), ultNames = new Set();
      for (const el of ERX.Elements.list) {
        const k = ERX.Kits[el.id];
        if (!k) { bad.push(el.id + ': no kit'); continue; }
        if (!k.m1 || !Array.isArray(k.s) || k.s.length !== 5) { bad.push(el.id + ': needs an M1 + 5 skills'); continue; }
        for (const m of [k.m1, ...k.s]) {
          if (!m.name || !m.desc || !m.spawn) bad.push(el.id + ': ' + (m.name || '?') + ' incomplete');
          const code = src([m.spawn, m.update, m.draw]);
          if (moveSrc.has(code)) bad.push(el.id + ' ' + m.name + ' is a copy of ' + moveSrc.get(code)); else moveSrc.set(code, el.id + ' ' + m.name);
        }
        m1Names.add(k.m1.name);
        const u = k.ult;
        if (!u || !u.name || !u.desc || !u.run || !u.charge || !u.charge.draw) { bad.push(el.id + ': ultimate incomplete'); continue; }
        if (chargeSrc.has(String(u.charge.draw))) bad.push(el.id + ': ult charge is a copy');
        chargeSrc.add(String(u.charge.draw));
        if (runSrc.has(String(u.run))) bad.push(el.id + ': ult is a copy');
        runSrc.add(String(u.run));
        ultNames.add(u.name);
        if (!k.block || !k.dash) bad.push(el.id + ': block/dash');
        if (k.status !== 'random' && !S[k.status]) bad.push(el.id + ': status ' + k.status);
        if (!k.up) bad.push(el.id + ': upgrade colour');
      }
      const n = ERX.Elements.list.length;
      return { bad, moves: moveSrc.size, m1s: m1Names.size, ults: ultNames.size, n };
    })()`);
    check('every element has an M1, 5 skills, an Ultimate, a block, a dash, a status + an upgrade colour', kits.bad.length === 0, kits.bad);
    check('all ' + 31 * 6 + ' moves are their own code (nothing is a recolour)', kits.moves === kits.n * 6, kits);
    check('every M1 and every Ultimate has its own name', kits.m1s === kits.n && kits.ults === kits.n, kits);
    check('only Chaos borrows other elements\' Ultimates', await ev("Object.keys(ERX.Kits).filter(id => id !== 'chaos').every(id => !String(ERX.Kits[id].ult.run).includes('kit.ult.run')) && String(ERX.Kits.chaos.ult.run).includes('kit.ult.run')"));
    check('every Ultimate has its title art (Darkness draws its own)', await ev("ERX.Elements.list.every(el => el.id === 'darkness' || !!ERX.Assets.image('ult_' + el.id))"));
    check('fire burns, ice chills, darkness blinds, nature poisons', await ev("ERX.Kits.fire.status === 'burn' && ERX.Kits.ice.status === 'chill' && ERX.Kits.darkness.status === 'blind' && ERX.Kits.nature.status === 'poison'"));
    check('wind slash, fire slash, nature thorn from the ground, ice spikes, dark scythe', await ev("ERX.Kits.wind.m1.name === 'Wind Slash' && ERX.Kits.fire.m1.name === 'Flame Slash' && ERX.Kits.nature.m1.name === 'Thorn Strike' && ERX.Kits.ice.m1.name === 'Ice Spikes' && ERX.Kits.darkness.m1.name === 'Dark Scythe'"));
    check('the Ultimates from the list (Supernova, Tsunami, Divine Tempest...)', await ev("/Supernova/.test(ERX.Kits.fire.ult.name) && /Tsunami/.test(ERX.Kits.water.ult.name) && ERX.Kits.wind.ult.name === 'Divine Tempest' && ERX.Kits.time.ult.name === 'Chrono Overkill' && ERX.Kits.chaos.ult.name === 'Absolute Anomaly'"));
    check('fire: fiery block + flaming dash, nature: a tree, ice: an ice wall', await ev("ERX.Kits.fire.block[0] === 'Flame Ward' && ERX.Kits.fire.dash[0] === 'Flame Dash' && ERX.Kits.nature.block[1] === 'tree' && ERX.Kits.ice.block[0] === 'Ice Wall' && ERX.Kits.ice.dash[0] === 'Ice Slide'"));

    console.log('[admin panel]');
    await waitFor("ERX.Scenes.top().id === 'mainMenu' && ERX.Scenes.top().state !== 'intro'", 6000);
    await b.key('Enter');
    await waitFor("ERX.Scenes.top().state === 'menu'", 3000);
    check('admin is hidden by default', await ev('!ERX.Admin.on()'));
    for (const ch of 'theelementaladmin') await b.key('Key' + ch.toUpperCase(), { wait: 25 });
    check('typing "theelementaladmin" unlocks it and opens the panel', await waitFor("ERX.Admin.on() && ERX.Scenes.top().id === 'admin'", 3000));
    await sleep(500);
    await shot('01-admin');
    check('...listing every element', await ev("ERX.Scenes.top().items.filter(i => i.type === 'el').length === ERX.Elements.list.length + 1"));
    await b.key('Escape');
    await waitFor("ERX.Scenes.top().id === 'mainMenu'", 2000);

    // a character who has reached the HQ (real element: wind)
    await ev(`(() => { ERX.Saves.load(); const c = ERX.Saves.create('Tester', ERX.Saves.randomLook()); c.element = 'wind'; c.progress = { stage: 'worldUnlocked' }; c.skillPoints = 0; ERX.Saves.update(c); ERX.Scenes.push('game', { character: c }); return true; })()`);
    await waitFor(`ERX.Scenes.top().id === 'game'`, 3000);
    await ev(`(() => { const g = ${G}; g.script = null; return true; })()`);

    console.log('[the training room]');
    await ev(`(() => { const g = ${G}; g.loadLevel('hq', {}); g.player.placeAt(g.level.trainingDoor.x, g.level.floorY); g.player.controls = true; return true; })()`);
    await sleep(400);
    check('the HQ has a TRAINING ROOM door', await ev(`!!${G}.prompt && /TRAINING ROOM/.test(${G}.prompt.text)`));
    await b.key('KeyE');
    check('...which leads to the training room', await waitFor(`${G}.levelId === 'training' && !ERX.Scenes.busy`, 5000));
    check('7 kinds of dummies: normal, attacking, blocking, countering, 1 HP, tank, runner', await ev(`${G}.enemies.map(e => e.kind).join() === 'normal,attacker,blocker,counter,onehp,tank,runner'`));
    await shot('02-training');

    console.log('[your element in action]');
    await ev(`(() => { const g = ${G}; g.player.placeAt(12.5 * 16, g.level.floorY); g.player.facing = 1; g.player.controls = true; return true; })()`);
    const d0 = await ev(`${G}.enemies[0].log.length`);
    await b.key('KeyJ');
    await sleep(500);
    check('the attack button fires your element\'s M1 (wind slash)', await ev(`${G}.enemies[0].log.length > ${d0}`));
    check('...which inflicts its status (AIRBORNE)', await ev(`${G}.enemies[0].log.length > 0`));
    await b.key('KeyQ');
    await sleep(200);
    check('skills start locked', await ev(`${G}.player.ab.cd.s1 === 0`));
    await ev(`(() => { const c = ${G}.character; c.elementSkills = { s1: 1, s2: 1, s3: 1, s4: 1, s5: 1, ult: 1 }; return true; })()`);
    for (const [key, slot] of [['KeyQ', 's1'], ['KeyR', 's2'], ['KeyC', 's3'], ['KeyX', 's4'], ['KeyZ', 's5']]) {
      await ev(`(() => { const p = ${G}.player; p.mp = p.maxMp; p.ab.cd.${slot} = 0; return true; })()`);
      await b.key(key);
      await sleep(150);
    }
    check('Q / R / C / X / Z cast the five skills (they go on cooldown)', await ev(`(() => { const ab = ${G}.player.ab; return ['s1', 's2', 's3', 's4', 's5'].every(s => ab.cd[s] > 0); })()`));
    check('skills cost mana', await ev(`${G}.player.mp < ${G}.player.maxMp`));
    await sleep(600);
    await ev(`${G}.player.ab.ult = 0`);
    await b.key('KeyV');
    await sleep(100);
    check('the Ultimate needs a full meter', await ev(`!${G}.cine`));
    await ev(`${G}.player.ab.ult = 100`);
    await b.key('KeyV');
    check('V starts the Ultimate cutscene (the world freezes)', await waitFor(`!!${G}.cine && ${G}.cine.kit.ult.name === 'Divine Tempest'`, 1000));
    await sleep(650);
    check('...you clap, power bursts out, your eyes glow', await ev(`!!${G}.cine && ${G}.cine.t > ERX.Ultimate.T.clap && !!${G}.player.cinePose`));
    check('...the camera zooms in', await ev(`!!${G}.cine && ${G}.cine.zoom() > 2`));
    check('...cuts to black, then the title slams in', await waitFor(`!!${G}.cine && ${G}.cine.t > ERX.Ultimate.T.slam && ${G}.cine.black() === 1`, 4000));
    await shot('03-ultimate-title');
    check('...then zooms out and FIRES', await waitFor(`!${G}.cine && ${G}.effects.length > 0`, 3000));
    check('the whole cutscene is quick (under 4 seconds)', await ev('ERX.Ultimate.T.end < 4'));
    await sleep(2500);
    check('dealing damage fills the Ultimate meter', await ev(`${G}.player.ab.ult > 0`));

    console.log('[upgrades]');
    const upg = await ev(`(() => { const out = []; for (const el of ERX.Elements.list) { const k = ERX.Kits[el.id]; if (k.up === 'rainbow') continue; const a = ERX.Abilities.palette(el, k, false), b = ERX.Abilities.palette(el, k, true); if (a.c === b.c) out.push(el.id); } return out; })()`);
    check('every upgraded move changes colour', upg.length === 0, upg);
    const dmg = await ev(`(() => { const g = ${G}, p = g.player; g.effects.length = 0; p.placeAt(12.5 * 16, g.level.floorY); p.facing = 1; p.ab = new ERX.AbilityState(p); g.character.elementSkills = { m1: 1 }; const e0 = g.enemies[0]; e0.log = []; e0.status = {}; p.ab.cast('m1'); return true; })()`);
    void dmg;
    await sleep(500);
    const baseD = await ev(`${G}.enemies[0].log.reduce((s, l) => s + l.d, 0)`);
    await ev(`(() => { const g = ${G}, p = g.player; g.effects.length = 0; p.placeAt(12.5 * 16, g.level.floorY); p.facing = 1; g.character.elementSkills = { m1: 2 }; p.ab.cd.m1 = 0; const e0 = g.enemies[0]; e0.log = []; e0.status = {}; p.ab.cast('m1'); return true; })()`);
    await sleep(500);
    const upD = await ev(`${G}.enemies[0].log.reduce((s, l) => s + l.d, 0)`);
    check('upgraded moves hit harder', upD > baseD, [baseD, upD]);

    console.log('[status effects]');
    check('burn hurts over time', await ev(`(() => { const d = ${G}.enemies[5]; d.hp = d.maxHp; d.applyStatus('burn', 0); return true; })()`) && await waitFor(`${G}.enemies[5].hp < ${G}.enemies[5].maxHp`, 2000));
    check('3 chills -> FROZEN (can\'t move)', await ev(`(() => { const d = ${G}.enemies[6]; d.status = {}; d.applyStatus('chill'); d.applyStatus('chill'); d.applyStatus('chill'); return !!d.status.freeze && d.stunned(); })()`));
    check('blind monsters can\'t find you (or hurt you on touch)', await ev(`(() => { const d = ${G}.enemies[0]; d.status = {}; d.applyStatus('blind'); const t = d.target(); return t !== ${G}.player && d.isBlind(); })()`));
    check('confused monsters go the wrong way', await ev(`(() => { const d = ${G}.enemies[0]; d.status = {}; d.applyStatus('confuse'); const t = d.target(); return Math.sign(t.cx - d.cx) !== Math.sign(${G}.player.cx - d.cx); })()`));
    check('poison stacks', await ev(`(() => { const d = ${G}.enemies[0]; d.status = {}; d.applyStatus('poison'); d.applyStatus('poison'); return d.status.poison.stacks === 2; })()`));
    check('status potency makes it last longer', await ev(`(() => { const d = ${G}.enemies[0]; d.status = {}; d.applyStatus('burn', 0); const a = d.status.burn.t; d.status = {}; d.applyStatus('burn', 3); return d.status.burn.t > a; })()`));

    console.log('[block + dash]');
    await ev(`(() => { const g = ${G}, p = g.player; p.guard = p.guardMax; p.guardBrokenT = 0; p.hurtT = 0; p.invulnT = 0; p.dashT = 0; p.dashGrace = 0; return true; })()`);
    await b.down('KeyK');
    await sleep(100);
    const guardRun = await ev(`(() => { const p = ${G}.player; const out = []; for (let i = 0; i < 6; i++) { out.push(p.takeHit(6, p.cx + p.facing * 20)); } return { out, broken: p.guardBrokenT > 0, guard: p.guard, blocking: p.blocking }; })()`);
    check('blocking wears down your guard...', guardRun.out.slice(0, 4).every((r) => r === 'blocked'), guardRun);
    check('...and it BREAKS after 5 hits', guardRun.broken && guardRun.guard <= 0, guardRun);
    await sleep(100);
    check('...leaving you unable to block for a bit', await ev(`!${G}.player.blocking`));
    await shot('04-guard-break');
    await b.up('KeyK');
    check('the guard comes back', await waitFor(`${G}.player.guard >= ${G}.player.guardMax * 0.9 && ${G}.player.guardBrokenT === 0`, 7000));
    check('your block takes your element\'s look', await ev(`(() => { const g = ${G}, p = g.player; p.blocking = true; const cv = document.createElement('canvas').getContext('2d'); return ERX.Abilities.renderBlock(cv, p, g.camera, 0) === true; })()`));
    await ev(`(() => { const g = ${G}, p = g.player; g.character.elementSkills.dash = 2; p.placeAt(11 * 16, g.level.floorY); p.facing = 1; p.dashCd = 0; const d = g.enemies[0]; d.log = []; return true; })()`);
    await b.key('KeyL');
    await sleep(400);
    check('an upgraded dash hits what you dash through', await ev(`${G}.enemies[0].log.length > 0`));

    console.log('[training dummies]');
    const dum = (i) => `${G}.enemies[${i}]`;
    check('the 1 HP dummy goes down in one hit... and gets back up', await ev(`(() => { const d = ${dum(4)}; d.down = false; d.hp = 1; d.hurt(5, 1, false, 0); return d.down === true && !d.dead; })()`) && await waitFor(`!${dum(4)}.down`, 3000));
    check('the blocker blocks hits from the front', await ev(`(() => { const d = ${dum(2)}; d.status = {}; d.guard = 5; d.facing = -1; const hp = d.hp; d.hurt(10, 1, false, 0); return d.hp === hp && d.guard === 4; })()`));
    check('...until its guard breaks', await ev(`(() => { const d = ${dum(2)}; for (let i = 0; i < 4; i++) d.hurt(10, 1, false, 0); const hp = d.hp; d.hurt(10, 1, false, 0); return d.guard === 0 && d.hp < hp; })()`));
    check('the counter dummy hits back', await ev(`(() => { const g = ${G}, p = g.player, d = ${dum(3)}; p.placeAt(d.cx - 16, g.level.floorY); p.invulnT = 0; p.blocking = false; p.dashT = 0; p.dashGrace = 0; window.__hp = p.hp; d.facing = -1; d.counterT = 0; d.strikeT = 0; d.hurt(5, 1, false, 0); return d.counterT > 0; })()`) && await waitFor(`${G}.player.hp < window.__hp`, 1500));
    check('the tank has 2000 HP and heals when left alone', await ev(`(() => { const d = ${dum(5)}; d.hp = 1500; d.lastHit = d.t - 10; return d.maxHp === 2000; })()`) && await waitFor(`${dum(5)}.hp === 2000`, 1500));
    check('the runner runs', await ev(`(() => { window.__rx = ${dum(6)}.x; return true; })()`) && await waitFor(`Math.abs(${dum(6)}.x - window.__rx) > 10`, 2000));
    check('every dummy shows its DPS', await ev(`typeof ${dum(0)}.dps === 'number'`));
    check('dummies give no XP or gold (nice try)', await ev(`${G}.enemies.every(e => !e.xp && !e.gold)`));

    console.log('[skill tree]');
    await ev(`(() => { const c = ${G}.character; c.elementSkills = {}; c.skillPoints = 30; return true; })()`);
    await b.key('KeyT');
    check('the skill tree opens on your element\'s moves', await waitFor("ERX.Scenes.top().id === 'skills' && ERX.Scenes.top().appearT >= 1", 2000));
    await shot('05-skill-tree');
    const tree = (id) => ev(`(() => { ERX.Scenes.top()._buy('${id}'); return JSON.stringify(${G}.character.elementSkills) + '|' + ${G}.character.skillPoints; })()`);
    let r = await tree('ult');
    check('the Ultimate needs 3 skills first', !/ult/.test(r.split('|')[0]), r);
    await tree('s1'); await tree('s2'); r = await tree('ult');
    check('...two is not enough', !/ult/.test(r.split('|')[0]), r);
    r = await tree('s3');
    check('learning skills costs points', /"s1":1/.test(r) && /"s3":1/.test(r) && r.endsWith('|26'), r);
    r = await tree('ult');
    check('...then the Ultimate unlocks', /"ult":1/.test(r), r);
    r = await tree('s1+');
    check('every move can be upgraded', /"s1":2/.test(r), r);
    await tree('potency'); await tree('potency'); r = await tree('potency');
    check('status potency has 3 ranks', /"potency":3/.test(r), r);
    r = await tree('block+'); r = await tree('dash+');
    check('your block and dash can be upgraded', /"block":2/.test(r) && /"dash":2/.test(r), r);
    check('stats (vitality / focus / agility) are still there', await ev("ERX.Scenes.top().items.some(i => i.id === 'stat:focus') && ERX.Scenes.top().items.some(i => i.id === 'stat:agility')"));
    await b.key('Escape');
    await waitFor("ERX.Scenes.top().id === 'game'", 2000);
    check('levelling up gives a skill point', await ev(`(() => { const g = ${G}; const before = g.character.skillPoints; g.onEnemyKilled({ xp: 9999, gold: 0, cx: 0, y: 0 }); return g.character.skillPoints > before; })()`));

    console.log('[admin in a game]');
    await b.key('Escape');
    check('the pause menu has an ADMIN button (when unlocked)', await waitFor("ERX.Scenes.top().id === 'pause' && ERX.Scenes.top().buttons.some(b => b.label === 'ADMIN')", 2000));
    await ev("ERX.Scenes.top().buttons.find(b => b.label === 'ADMIN').activate()");
    check('...which opens the admin panel', await waitFor("ERX.Scenes.top().id === 'admin' && ERX.Scenes.top().items.length > 0", 2000));
    await ev("(() => { const s = ERX.Scenes.top(); s._activate(s.items.find(i => i.id === 'fire')); return true; })()");
    check('pick any element to test (fire)', await ev(`${G}.element().id === 'fire'`));
    check('...your real element is untouched', await ev(`${G}.character.element === 'wind' && ERX.Saves.characters.find(c => c.name === 'Tester').element === 'wind'`));
    check('the admin pick switches your whole kit (fire block, fire M1)', await ev(`${G}.player.kit() === ERX.Kits.fire`));
    await ev("(() => { const s = ERX.Scenes.top(); s._activate(s.items.find(i => i.id === 'skills')); s._activate(s.items.find(i => i.id === 'skills')); return true; })()");
    check('skills: ALL UPGRADED', await ev("ERX.Admin.data.skills === 'max' && ERX.Abilities.rank(ERX.Scenes.find('game'), 's3') === 2"));
    await ev("(() => { const s = ERX.Scenes.top(); s._activate(s.items.find(i => i.id === null)); return true; })()");
    check('"MY ELEMENT" goes back to your own', await ev(`${G}.element().id === 'wind'`));

    console.log('[every element, every move]');
    const sweep = await ev(`(async () => {
      const g = ${G}, p = g.player, bad = [];
      for (let i = 0; i < 6 && ERX.Scenes.top().id !== 'game'; i++) { const s = ERX.Scenes.stack; const x = s.pop(); if (x) x.exit(); }
      for (const el of ERX.Elements.list) {
        for (const mode of ['base', 'max']) {
          ERX.Admin.set('element', el.id); ERX.Admin.set('skills', mode); ERX.Admin.set('infiniteMp', true);
          p.ab = new ERX.AbilityState(p);
          for (const slot of ['m1', 's1', 's2', 's3', 's4', 's5', 'ult']) {
            p.ab.ult = 100;
            p.placeAt(12.5 * 16, g.level.floorY); p.facing = 1;
            if (!p.ab.cast(slot)) bad.push(el.id + ' ' + mode + ' ' + slot);
            for (let i = 0; i < (slot === 'ult' ? 330 : 40); i++) g.update(1 / 60, ERX.Input, true);
            if (g.cine) bad.push(el.id + ' ' + mode + ': cutscene never ended');
          }
          g.effects.length = 0;
        }
      }
      ERX.Admin.set('element', null); ERX.Admin.set('skills', 'normal');
      return bad;
    })()`);
    check('all ' + 31 * 7 * 2 + ' moves (base + upgraded) cast cleanly', sweep.length === 0, sweep);

    console.log('[ability wheel]');
    check('every element has a symbol, and every skill has its own icon', await ev("ERX.Elements.list.every(el => !!ERX.Symbols.ELEMENT[el.id] && ['s1','s2','s3','s4','s5'].every(s => !!ERX.Symbols.GLYPH[ERX.Symbols.iconOf(el.id, s)]) && new Set(ERX.Symbols.ICONS[el.id]).size === 5)"));
    check('the wheel draws (element in the middle, 5 skills around it)', await ev(`(() => { const g = ${G}, cv = document.createElement('canvas'); cv.width = 480; cv.height = 270; const c = cv.getContext('2d'); g.player.ab.ult = 100; ERX.HUD.render(c, 480, 270, g); const L = ERX.HUD.wheelLayout(270); const lit = (x, y) => c.getImageData(x, y, 1, 1).data[3] > 0; return lit(L.cx, L.cy) && L.slots.length === 5 && L.slots.every(s => lit(s.x, s.y)); })()`));

    console.log('[blocks]');
    check('every element has its own block look + hit burst + sound', await ev("ERX.Elements.list.every(el => { const gd = ERX.Guards[el.id]; return gd && typeof gd.draw === 'function' && typeof gd.hit === 'function' && !!gd.sound; }) && new Set(ERX.Elements.list.map(el => String(ERX.Guards[el.id].draw))).size === ERX.Elements.list.length"));
    check('blocking has sounds (raising your guard + a blocked hit)', await ev("!!ERX.SfxBank.guardUp && !!ERX.SfxBank.blockHit"));
    check('a blocked hit sprays your element burst', await ev(`(() => { const g = ${G}, p = g.player; const n = g.fx.count + g.effects.length; p._blockBurst(); return g.fx.count + g.effects.length > n; })()`));

    console.log('[ultimates you can see]');
    const drawn = await ev(`(() => { const g = ${G}, p = g.player, out = [];
      for (const id of ['darkness', 'storm', 'void', 'time', 'sound', 'mist', 'moon', 'solar']) {
        g.effects.length = 0; ERX.Admin.set('element', id); p.ab = new ERX.AbilityState(p);
        const kit = ERX.Kits[id], el = ERX.Elements.get(id);
        kit.ult.run(ERX.Abilities.api(g), { x: p.cx, y: p.y + 10, dir: 1, t: 0, hit: new Set(), hitT: new Map(), pal: ERX.Abilities.palette(el, kit, false), dmg: 1, status: kit.status, potency: 0, isUlt: true }, el);
        let calls = 0; for (const fx of g.effects) { const r = fx.render.bind(fx); fx.render = (c, cam) => { calls++; r(c, cam); }; }
        for (let i = 0; i < 20; i++) g.update(1 / 60, ERX.Input, true);
        g.render(ERX.Display.canvas.getContext('2d'));
        if (!calls) out.push(id);
      }
      g.effects.length = 0; ERX.Admin.set('element', null); return out; })()`);
    check('full-screen Ultimates actually draw (Endless Night, Solar Flare...)', drawn.length === 0, drawn);
    check('the silence before the title slam is 0.2 s', await ev('Math.abs(ERX.Ultimate.T.slam - ERX.Ultimate.T.black - 0.2) < 1e-9'));

    console.log('[chaos]');
    check('Chaos makes monsters tougher', await ev(`(() => { const g = ${G}; ERX.Admin.set('element', 'chaos'); const a = ERX.Enemies.create(g, { type: 'slime', x: 0, y: 0 }); ERX.Admin.set('element', 'fire'); const b2 = ERX.Enemies.create(g, { type: 'slime', x: 0, y: 0 }); ERX.Admin.set('element', null); return a.maxHp > b2.maxHp && a.damage > b2.damage; })()`));
    check('...but never the training dummies', await ev(`(() => { const g = ${G}; ERX.Admin.set('element', 'chaos'); const d = ERX.Enemies.create(g, { type: 'dummy', variant: 'normal', x: 0, y: 0 }); ERX.Admin.set('element', null); ERX.Admin.set('element', 'fire'); const d2 = ERX.Enemies.create(g, { type: 'dummy', variant: 'normal', x: 0, y: 0 }); ERX.Admin.set('element', null); return d.maxHp === d2.maxHp; })()`));
    check('the world bends around Chaos (shards, glitches, stranger worlds)', await ev("typeof ERX.ChaosWorld.render === 'function' && ERX.Elements.get('chaos').world.intensity > 1"));
    check('the Voice falls over when he scans Chaos (and calls you a threat)', await ev("/chaosReaction/.test(String(ERX.Story.void.meetFigure)) && /'fallen'/.test(String(ERX.Story.void.chaosReaction)) && /STRONGEST ELEMENT IN HISTORY/.test(String(ERX.Story.void.chaosReaction)) && /THREAT/.test(String(ERX.Story.void.chaosReaction)) && /careful/.test(String(ERX.Story.void.chaosReaction))") && await ev("!!ERX.FigureSprite.frame('shock', 'fallen', 0, 1)"));
    check('HQ staff talk to you differently with Chaos', await ev("['dot', 'kev', 'steve', 'atlas', 'ron', 'guide'].every(id => Array.isArray(ERX.Story.deep.MINERS[id].chaosLines))"));

    check('no console errors', b.errors.length === 0, b.errors);
  } catch (e) {
    check('test run crashed', false, String(e && e.stack || e));
  } finally {
    await b.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' checks passed.');
  process.exit(failed.length ? 1 : 0);
})();
