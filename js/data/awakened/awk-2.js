/*
 * AWAKENED: NATURE, DARKNESS, SHADOW, LIGHT, ARCANE, POISON
 * (format: js/data/awakened/_awk.js)
 */
(function (ERX) {
  'use strict';

  const AW = ERX.Awakened, H = ERX.KitHelp, W = ERX.AwkHelp, U = ERX.U;
  const { J, IDLE, RUN } = W;
  const Phys = () => ERX.GameEngine.Physics;
  const dot = (g, x, y, vx, vy, color, o) => g.fx.add(Object.assign({ x, y, vx, vy, life: 0.5, color, size: 1, fadeOut: 0.3 }, o));
  const holdStun = (t, s) => { if (!t.applyStatus) return; t.applyStatus('stagger', 0); if (t.status.stagger) t.status.stagger.t = s; };

  // ============================================================== NATURE (spring)
  const PETALS = (A, e, x, y, n, sp) => { for (let i = 0; i < n; i++) A.spawn(e, { life: 1, update(s, dt) { s.x += s.vx * dt + Math.sin(s.t * 8 + s.ph) * 20 * dt; s.y += s.vy * dt; s.vy += 40 * dt; s.vx *= 1 - dt; }, draw(s, ctx, ox, oy, A) { A.alpha(ctx, 1 - s.t / s.life, () => A.px(ctx, s.x + ox, s.y + oy, 2, 1, s.c)); } }, { x, y, vx: A.rnd(-1, 1) * (sp || 80), vy: A.rnd(-120, -20), ph: Math.random() * 6, c: ['#ff9ad0', '#ffd34d', '#ffffff', '#2aff8a'][i % 4] }); };
  const FLOWER = (ctx, A, x, y, k, col) => { const r = Math.max(1, Math.round(2 * k)); for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r], [0, r]]) A.px(ctx, x + dx, y + dy, 1, 1, col); A.px(ctx, x, y, 1, 1, '#ffd34d'); };
  AW.nature = {
    color: '#2aff8a', up: '#ff9ad0', status: 'poison', fx: 'leaves', block: ['Ancient Oak Shield', 'tree'],
    icons: ['knuckles', 'flytrap', 'sunflower', 'oak', 'bees'],
    look: { fx(ctx, F) { for (let i = 0; i < 2; i++) { const a = F.t * 1.6 + i * 3.1, x = F.x + Math.cos(a) * 11, y = F.y - 16 + Math.sin(a * 1.4) * 5, flap = Math.floor(F.t * 12 + i) % 2; F.A.px(ctx, x - 1, y - flap, 1, 1, i ? '#ffd34d' : '#ff9ad0'); F.A.px(ctx, x + 1, y - flap, 1, 1, i ? '#ffd34d' : '#ff9ad0'); F.A.px(ctx, x, y, 1, 1, '#2a1a10'); } } },   // butterflies
    idle: {
      pose: (t) => IDLE.open(t),
      fx(ctx, F) { for (const h of ['handF', 'handB']) { const p = F.at(h), k = 0.6 + 0.4 * Math.sin(F.t * 2 + (h === 'handF' ? 0 : 2)); F.A.px(ctx, p.x, p.y - 1, 1, 1, '#2aff8a'); FLOWER(ctx, F.A, p.x, p.y - 3, k, h === 'handF' ? '#ff9ad0' : '#ffffff'); } },
    },
    run: {
      pose: (ph) => RUN.skip(ph),
      step(A, p) { if (W.footfall(p)) W.emit(A, { life: 1.6, draw(e, ctx, ox, oy, A) { const k = Math.min(1, e.t / 0.3); A.alpha(ctx, A.fade(e, 0.05, 0.5), () => { A.px(ctx, e.x + ox, e.y + oy - 3 * k, 1, 3 * k, '#3a8a2a'); FLOWER(ctx, A, e.x + ox, e.y + oy - 4 * k, k, e.c); }); } }, { x: p.cx - p.facing * 3, y: p.feet, c: ['#ff9ad0', '#ffd34d', '#ffffff'][Math.floor(Math.random() * 3)] }); },
    },
    dash: {
      name: 'Blossom Step', dmg: 10, life: 1.4,
      spawn(e) { e.buds = []; },
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) { e.bt = (e.bt || 0) - dt; if (e.bt <= 0) { e.bt = 0.04; e.buds.push({ x: p.cx, gy: p.feet, t: e.t, pop: false }); } } for (const b of e.buds) if (!b.pop && e.t - b.t > 0.4) { b.pop = true; A.hitR(e, b.x, b.gy - 6, 12, { kb: 0.6, once: false, every: 9 }); PETALS(A, e, b.x, b.gy - 4, 4, 60); } },
      draw(e, ctx, ox, oy, A) { for (const b of e.buds) if (!b.pop) { const k = Math.min(1, (e.t - b.t) / 0.3); A.px(ctx, b.x + ox, b.gy + oy - 4 * k, 1, 4 * k, '#3a8a2a'); FLOWER(ctx, A, b.x + ox, b.gy + oy - 5 * k, k * 1.4, '#ff9ad0'); } },
    },
    guard: {
      name: 'Ancient Oak Shield', sound: 'wood',
      draw(ctx, { A, x, bot, h, t }) { A.px(ctx, x - 5, bot - h, 10, h, '#5a3a22'); for (let yy = 2; yy < h; yy += 4) A.px(ctx, x - 5, bot - h + yy, 10, 1, '#3a2614'); A.px(ctx, x - 5, bot - h, 2, h, '#7a5236'); for (let i = 0; i < 3; i++) A.px(ctx, x - 1, bot - h + 6 + i * 8, 2, 2, Math.sin(t * 3 + i) > 0 ? '#2aff8a' : '#1a8a4a'); for (let i = 0; i < 6; i++) A.disc(ctx, x - 6 + (i % 3) * 6, bot - h - 2 + Math.floor(i / 3) * 4, 3, i % 2 ? '#2aff8a' : '#1a8a4a'); },
      hit(g, x, y, d) { for (let i = 0; i < 12; i++) dot(g, x, y, d * U.lerp(20, 100, Math.random()), U.lerp(-110, -10, Math.random()), i % 3 ? '#2aff8a' : '#7a5236', { ay: 120, wobble: 30, wobbleRate: 9, size: 2, life: 0.9 }); },
    },
    m1: {
      name: 'Briar Knuckles', dmg: 9, cd: 0.34, kind: 'custom', life: 0.25,
      desc: 'Fists wrapped in thorny vines. Every third punch bursts into a spray of thorns.',
      spawn(e, g, A) { const p = A.p; p._briar = ((p._briar || 0) + 1) % 3; e.n = p._briar; A.sfx(e.n === 0 ? 'crash' : 'punchHit', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); H.melee(e, A, (e.n === 0 ? 38 : 32) * H.sc(e), 20, { mult: e.n === 0 ? 1.6 : 1, kb: e.n === 0 ? 1.4 : 0.6 }); },
      draw(e, ctx, ox, oy, A) { const k = e.t / e.life, x = e.x + ox + e.dir * (8 + 10 * Math.min(1, k * 4)), y = e.y + oy + (e.n === 1 ? -3 : 2); A.alpha(ctx, 1 - k, () => { A.disc(ctx, x, y, 3, '#3a8a2a', e.pal.c); for (let i = 0; i < 4; i++) A.px(ctx, x + Math.cos(i * 1.6) * 4, y + Math.sin(i * 1.6) * 4, 1, 1, '#e8f0a0'); if (e.n === 0) for (let i = 0; i < 10; i++) { const a = -0.8 + i * 0.16; A.line(ctx, x, y, x + Math.cos(a) * 18 * e.dir * k * 2, y + Math.sin(a) * 18 * k * 2, '#3a8a2a'); } }); },
    },
    s: [
      {
        name: 'Venus Snap', dmg: 30, cd: 6, mp: 6, kind: 'custom', life: 1.2,
        desc: 'A giant flytrap bursts out of the ground under the nearest enemy and snaps shut.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 160); H.at(e, A, 0); e.tx = t ? A.center(t).x : e.x + e.dir * 50; e.gy = H.floor(A, e.tx); A.sfx('crash'); },
        update(e, dt, g, A) { if (e.t > 0.45 && !e.snap) { e.snap = true; A.hit(e, { x: e.tx - 12, y: e.gy - 30, w: 24, h: 30 }, { kb: 0.4, onHit(t) { holdStun(t, 0.8); } }); A.sfx('punchHit'); A.shake(3, 0.2); } },
        draw(e, ctx, ox, oy, A) { const x = e.tx + ox, gy = e.gy + oy, rise = Math.min(1, e.t / 0.25), shut = e.snap ? 1 : Math.min(0.2, e.t), f = e.t > 0.9 ? 1 - (e.t - 0.9) / 0.3 : 1; A.alpha(ctx, f, () => { A.px(ctx, x - 1, gy - 12 * rise, 3, 12 * rise, '#3a8a2a'); const jy = gy - 12 * rise - 2, open = (1 - shut) * 1.1; for (const sd of [-1, 1]) for (let r = 0; r < 12 * rise; r++) { const jx = x + Math.sin(open) * r * sd, jyy = jy - Math.cos(open) * r; A.px(ctx, jx - 1, jyy, 3, 2, r > 9 ? '#ff4a6a' : e.pal.c); if (r % 3 === 1) A.px(ctx, jx + sd * 2, jyy, 1, 1, '#ffffff'); } }); },
      },
      {
        name: 'Sunflower Sentry', dmg: 6, cd: 10, mp: 7, kind: 'custom', life: 6,
        desc: 'Plant a sunflower that turns its face to enemies and spits seeds at them.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx + p.facing * 14; e.gy = A.ground(e.x, p.y + 2); e.st = 0.5; A.sfx('pop'); },
        update(e, dt, g, A) { e.st -= dt; const t = A.near(e.x, e.gy - 24, 170); e.face = t ? Math.sign(A.center(t).x - e.x) || 1 : e.face || 1; if (e.st <= 0 && t) { e.st = e.up ? 0.3 : 0.45; const c = A.center(t), a = Math.atan2(c.y - (e.gy - 24), c.x - e.x); A.spawn(e, H.proj((b, ctx, ox, oy, A) => A.px(ctx, b.x + ox, b.y + oy, 2, 1, '#3a2a10'), { life: 0.8, r: 2 }), { x: e.x, y: e.gy - 24, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260 }); A.sfx('tick', { value: 60, minGap: 0.05 }); } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy, k = Math.min(1, e.t / 0.4); A.alpha(ctx, A.fade(e, 0.05, 0.4), () => { A.px(ctx, x, gy - 22 * k, 1, 22 * k, '#3a8a2a'); A.px(ctx, x - 3, gy - 10 * k, 3, 2, '#3a8a2a'); A.disc(ctx, x + (e.face || 1), gy - 24 * k, 5, '#ffd34d'); A.disc(ctx, x + (e.face || 1) * 2, gy - 24 * k, 2, '#6a3a1a'); }); },
      },
      {
        name: 'Toppling Oak', dmg: 34, cd: 8, mp: 7, kind: 'custom', life: 1.4,
        desc: 'A huge oak sprouts in front of you, creaks... and topples onto your enemies.',
        spawn(e, g, A) { H.at(e, A, 14); e.gy = H.floor(A, e.x); A.sfx('crash'); },
        update(e, dt, g, A) { if (e.t > 0.85 && !e.fall) { e.fall = true; const L = 70 * H.sc(e); A.hit(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.gy - 22, w: L, h: 22 }, { kb: 1.2 }); A.sfx('crash'); A.shake(5, 0.3); PETALS(A, e, e.x + e.dir * L * 0.8, e.gy - 6, 12, 120); } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy, grow = Math.min(1, e.t / 0.35), L = 70 * H.sc(e) * grow, fallK = e.t < 0.45 ? 0 : W.easeIn(Math.min(1, (e.t - 0.45) / 0.4)), a = -Math.PI / 2 + fallK * (Math.PI / 2) * e.dir, f = e.t > 1.1 ? 1 - (e.t - 1.1) / 0.3 : 1; A.alpha(ctx, f, () => { for (let r = 0; r < L; r++) { const w = Math.max(2, 5 - r / 16); A.px(ctx, x + Math.cos(a) * r - w / 2, gy + Math.sin(a) * r, w, 2, r % 6 ? '#5a3a22' : '#7a5236'); } const tx = x + Math.cos(a) * L, ty = gy + Math.sin(a) * L; for (let i = 0; i < 6; i++) A.disc(ctx, tx + Math.cos(i) * 8, ty + Math.sin(i * 1.7) * 6, Math.round(6 * grow), i % 2 ? e.pal.c : '#1a8a4a'); }); },
      },
      {
        name: 'Bloom Burst', dmg: 14, cd: 10, mp: 7, kind: 'custom', life: 1,
        desc: 'Flowers bloom all over you, then burst: enemies nearby are cut by petals and you are healed.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; A.sfx('star'); },
        update(e, dt, g, A) { if (e.t > 0.35 && !e.pop) { e.pop = true; const p = A.p, n = H.nearby(A, e.x, e.y, 50 * H.sc(e)).length; A.hitR(e, e.x, e.y, 50 * H.sc(e), { kb: 1 }); const heal = Math.round((10 + n * 5) * (e.up ? 1.5 : 1)); p.hp = Math.min(p.maxHp, p.hp + heal); A.g.floatText(p.cx, p.y - 8, '+' + heal, '#7af0a0'); PETALS(A, e, e.x, e.y, 30, 160); A.sfx('pop'); } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy; if (!e.pop) { const k = e.t / 0.35; for (let i = 0; i < 8; i++) { const a = i * 0.785; FLOWER(ctx, A, x + Math.cos(a) * 8, y + Math.sin(a) * 11, k * 1.5, i % 2 ? '#ff9ad0' : '#ffffff'); } return; } const k = (e.t - 0.35) / 0.65; A.alpha(ctx, 1 - k, () => A.ring(ctx, x, y, 8 + k * 46 * H.sc(e), '#ff9ad0', (8 + k * 46 * H.sc(e)) * 0.7)); },
      },
      {
        name: 'Wild Hive', dmg: 4, cd: 9, mp: 7, kind: 'custom', life: 4,
        desc: 'Kick a hive. A furious swarm of bees chases your enemies around and stings them.',
        spawn(e, g, A) { const p = A.p; e.bees = []; for (let i = 0; i < (e.up ? 12 : 9); i++) e.bees.push({ x: p.cx + p.facing * 8, y: p.y + 6, vx: A.rnd(-40, 40), vy: A.rnd(-40, 40), st: A.rnd(0, 0.5) }); A.sfx('rumble', { dur: 0.4 }); },
        update(e, dt, g, A) { for (const b of e.bees) { const t = A.near(b.x, b.y, 220); if (t) { const c = A.center(t); b.vx += (c.x - b.x) * 6 * dt + A.rnd(-200, 200) * dt; b.vy += (c.y - b.y) * 6 * dt + A.rnd(-200, 200) * dt; } b.vx *= 1 - dt * 2; b.vy *= 1 - dt * 2; b.x += b.vx * dt; b.y += b.vy * dt; b.st -= dt; if (t && b.st <= 0 && Math.hypot(A.center(t).x - b.x, A.center(t).y - b.y) < 8) { b.st = 0.6; A.damage(e, t, 1, 0); } } },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, A.fade(e, 0.1, 0.4), () => { for (const b of e.bees) { const flap = Math.floor((e.t + b.st) * 30) % 2; A.px(ctx, b.x + ox, b.y + oy, 2, 1, '#ffd34d'); A.px(ctx, b.x + ox + 1, b.y + oy, 1, 1, '#2a1a10'); A.px(ctx, b.x + ox, b.y + oy - 1 - flap, 1, 1, '#e8f8ff'); } }); },
      },
    ],
    ult: {
      name: "Eden's Wrath", dmg: 9,
      desc: 'A supernatural forest erupts across the battlefield. Giant trees, roots and carnivorous plants attack everything... then the whole forest closes in.',
      charge: {
        pose: (t, k) => J({ bob: 1, FA: [[11.2, 15], [13, 17.4]], BA: [[5.4, 15], [3.6, 17.4]], FL: [[10.6, 19.4], [11.4, 22]], BL: [[5.8, 19.4], [5, 22]], eyesClosed: true }),
        lift: 0,
        draw(ctx, x, y, k, t, A, P) { for (let i = 0; i < 9; i++) { const sx = x - 32 + i * 8, h = (8 + (i % 3) * 8) * k; A.px(ctx, sx, y + 14 - h, 2, h, '#3a8a2a'); if (k > 0.4) A.disc(ctx, sx + 1, y + 14 - h - 2, Math.round(2 + k * 2), i % 2 ? P.c : '#1a8a4a'); } for (let i = 0; i < 6; i++) { const a = t * 2 + i, d = 26 + Math.sin(t * 3 + i) * 4; FLOWER(ctx, A, x + Math.cos(a) * d, y - 4 + Math.sin(a) * d * 0.5, 1.5, i % 2 ? '#ff9ad0' : '#ffd34d'); } },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.6,
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 320).map((o) => o.t); const c = e.ts[0] ? A.center(e.ts[0]) : { x: p.cx + e.dir * 90, y: p.y }; e.cx = c.x; e.gy = A.ground(c.x, p.y + 2); e.trees = []; for (let i = 0; i < 10; i++) { const x = p.cx + (i - 4.5) * 44 + A.rnd(-10, 10); e.trees.push({ x, gy: A.ground(x, p.y + 2), h: A.rnd(50, 90), d: i * 0.05 }); } e.traps = e.ts.map((t) => ({ t })); A.sfx('crash'); A.sfx('rumble', { dur: 3 }); },
          update(e, dt, g, A) {
            // the forest attacks: branches lash, flytraps bite
            e.at = (e.at || 0) - dt;
            if (e.t > 0.5 && e.t < 2.4 && e.at <= 0) { e.at = 0.16; const live = e.ts.filter((t) => !t.dead); const t = live[Math.floor(Math.random() * live.length)]; if (t) { A.damage(e, t, 0.6, 0.2); e.lash = { c: A.center(t), t: e.t }; A.sfx('swing', { minGap: 0.04 }); } }
            // ...then it all closes in on one spot
            if (e.t > 2.4 && !e.close) { e.close = true; A.sfx('crash'); }
            if (e.close) for (const tr of e.trees) tr.x = U.approach(tr.x, e.cx + (tr.x < e.cx ? -10 : 10), 4, dt);
            if (e.t > 2.9 && !e.boom) { e.boom = true; A.blast(e, e.cx, e.gy - 30, 100 * H.sc(e), { dmg: e.dmg * 6 }); A.flash(0.3); A.shake(10, 0.5); PETALS(A, e, e.cx, e.gy - 30, 50, 220); }
          },
          draw(e, ctx, ox, oy, A) {
            const f = e.t > 3.1 ? 1 - (e.t - 3.1) / 0.5 : 1;
            A.alpha(ctx, f, () => {
              for (const tr of e.trees) { const k = U.clamp((e.t - tr.d) / 0.4, 0, 1), h = tr.h * k, x = tr.x + ox, gy = tr.gy + oy; A.px(ctx, x - 3, gy - h, 6, h, '#5a3a22'); A.px(ctx, x - 3, gy - h, 2, h, '#7a5236'); for (let i = 0; i < 5; i++) A.disc(ctx, x + Math.cos(i * 1.3 + tr.x) * 10, gy - h + Math.sin(i * 2.1) * 6, Math.round(9 * k), i % 2 ? e.pal.c : '#1a8a4a'); }
              for (const tp of e.traps) if (!tp.t.dead && e.t > 0.4 && !e.boom) { const c = A.center(tp.t), x = c.x + ox, gy = tp.t.box.y + tp.t.box.h + oy, open = Math.abs(Math.sin(e.t * 6)); for (const s of [-1, 1]) A.tri(ctx, x + s * (4 + open * 4), gy, 8, 14, s < 0 ? e.pal.c : '#1a8a4a', '#ff4a6a'); }
              if (e.lash && e.t - e.lash.t < 0.12) { const c = e.lash.c; A.line(ctx, c.x + ox - 30, c.y + oy - 20, c.x + ox + 4, c.y + oy, '#5a3a22', 2); }
            });
          },
        }, {});
      },
    },
  };

  // ========================================================== DARKNESS (abyss)
  const REDEYES = (ctx, A, x, y) => { A.px(ctx, x - 3, y, 2, 1, '#ff2a3a'); A.px(ctx, x + 1, y, 2, 1, '#ff2a3a'); };
  const DARK_TEND = (ctx, A, x0, y0, x1, y1, t, col) => { const n = 14; for (let i = 0; i <= n; i++) { const q = i / n; A.px(ctx, U.lerp(x0, x1, q) + Math.sin(q * 5 + t) * 3, U.lerp(y0, y1, q), Math.max(1, 3 - q * 2), Math.max(1, 3 - q * 2), i % 3 ? '#05020a' : col); } };
  AW.darkness = {
    color: '#7a2aff', up: '#ff2a4a', status: 'blind', fx: 'gloom', block: ['Abyss Curtain', 'veil'],
    icons: ['nightClaw', 'maw', 'shadeSpears', 'terror', 'bats'],
    look: { fx(ctx, F) { const e = F.at('eye'); F.A.px(ctx, e.x, e.y, 1, 2, '#ff2a3a'); F.A.alpha(ctx, 0.4, () => F.A.disc(ctx, e.x, e.y, 2, '#ff2a3a')); } },
    idle: {
      pose: (t) => IDLE.hunch(t),
      back(ctx, F) { const c = F.at('chest'); for (let i = 0; i < 3; i++) DARK_TEND(ctx, F.A, c.x - F.d * 3, c.y - 2, c.x - F.d * (12 + i * 3) + Math.sin(F.t * 2 + i) * 4, c.y - 14 - i * 4, F.t * 3 + i, '#7a2aff'); },
    },
    run: {
      pose: (ph) => RUN.creep(ph),
      step(A, p, dt) { if (W.every(p, 'mist', 0.05, dt)) W.emit(A, { life: 0.9, update(e, dt) { e.y -= 8 * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 0.5 * (1 - e.t / e.life), () => A.disc(ctx, e.x + ox, e.y + oy, Math.round(2 + e.t * 5), '#120a20')); } }, { x: p.cx - p.facing * 5, y: p.feet - 4 - Math.random() * 10 }); },
    },
    dash: {
      name: 'Rift Plunge', style: 'blink', dmg: 14, life: 1.3,
      spawn(e, g, A) { const p = A.p; e.sx = p.cx; e.gy = p.feet; A.sfx('whoosh'); },
      update(e, dt, g, A) { const p = A.p; if (p.dashT <= 0 && !e.out) { e.out = true; e.ex = p.cx; A.hitR(e, e.ex, e.gy - 10, 20, { kb: 1.2 }); A.sfx('crash', { minGap: 0.1 }); } if (e.out && e.t < 0.9) A.tick(e, { x: Math.min(e.sx, e.ex), y: e.gy - 10, w: Math.abs(e.ex - e.sx), h: 10 }, 0.4, { mult: 0.3, kb: 0 }); },
      draw(e, ctx, ox, oy, A) { const gy = e.gy + oy; A.alpha(ctx, A.fade(e, 0.02, 0.4), () => { A.px(ctx, e.sx + ox - 6, gy - 1, 12, 2, '#05020a'); if (e.out) { A.px(ctx, e.ex + ox - 6, gy - 1, 12, 2, '#05020a'); for (let x = Math.min(e.sx, e.ex); x < Math.max(e.sx, e.ex); x += 6) A.tri(ctx, x + ox, gy, 4, 6 + Math.sin(x) * 3, '#05020a', '#7a2aff'); } }); },
    },
    guard: {
      name: 'Abyss Curtain', sound: 'whoosh',
      draw(ctx, { A, x, bot, h, t }) { for (let k = 0; k < 5; k++) for (let yy = 0; yy < h + 2; yy++) { const q = yy / h; A.px(ctx, x - 5 + k * 2.4 + Math.sin(q * 7 + t * 6 + k) * 1.5, bot - yy, 2, 1, (yy + k) % 4 ? '#05020a' : '#7a2aff'); } REDEYES(ctx, A, x, bot - h * 0.7 + Math.sin(t) * 2); },
      hit(g, x, y, d) { for (let i = 0; i < 10; i++) dot(g, x, y, d * U.lerp(10, 80, Math.random()), U.lerp(-60, 20, Math.random()), i % 3 ? '#05020a' : '#ff2a3a', { size: 3, grow: 3, alpha: 0.8 }); },
    },
    m1: {
      name: 'Nightmare Rend', dmg: 10, cd: 0.4, kind: 'custom', life: 0.3,
      desc: 'Claw the air: three blood-red streaks tear through a smear of darkness.',
      spawn(e, g, A) { A.sfx('swing', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); H.melee(e, A, 32 * H.sc(e), 26); },
      draw(e, ctx, ox, oy, A) { const k = Math.min(1, e.t / 0.1), x = e.x + ox, y = e.y + oy, d = e.dir; A.alpha(ctx, 1 - Math.max(0, e.t - 0.1) / 0.2, () => { A.alpha(ctx, 0.6, () => A.disc(ctx, x + d * 16, y, 10, '#05020a')); for (let i = 0; i < 3; i++) A.line(ctx, x + d * (4 + i * 3), y - 12 + i * 2, x + d * (10 + i * 3 + 18 * k), y + 10 - i * 2, i === 1 ? '#ffffff' : '#ff2a3a', 1); }); },
    },
    s: [
      {
        name: 'Abyss Maw', dmg: 32, cd: 7, mp: 6, kind: 'custom', life: 1.2,
        desc: 'A mouth of pure darkness opens in the ground under your enemies... and chomps.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 150); e.tx = ax !== null ? ax : e.x + e.dir * 50; e.gy = H.floor(A, e.tx); A.sfx('whoosh'); },
        update(e, dt, g, A) { if (e.t > 0.55 && !e.chomp) { e.chomp = true; A.hit(e, { x: e.tx - 18, y: e.gy - 26, w: 36, h: 26 }, { kb: 0.2, onHit(t) { if (!t.tutorial) t.vy = 200; } }); A.sfx('crash'); A.shake(4, 0.25); } },
        draw(e, ctx, ox, oy, A) { const x = e.tx + ox, gy = e.gy + oy, open = e.chomp ? Math.max(0, 1 - (e.t - 0.55) / 0.08) : Math.min(1, e.t / 0.4), f = e.t > 0.95 ? 1 - (e.t - 0.95) / 0.25 : 1; A.alpha(ctx, f, () => { A.px(ctx, x - 18, gy - 2, 36, 3, '#05020a'); for (const s of [-1, 1]) for (let i = -16; i <= 16; i += 4) A.tri(ctx, x + i, gy - 1, 4, s * -(4 + open * 16), '#e8e0f0'); if (open > 0.3) REDEYES(ctx, A, x, gy - 20 * open - 4); }); },
      },
      {
        name: 'Shade Spears', dmg: 8, cd: 7, mp: 6, kind: 'custom', life: 1,
        desc: 'Five spears of shadow rise around the nearest enemy and drive into it at once.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 160); e.tg = t; const c = t ? A.center(t) : { x: A.p.cx + A.p.facing * 50, y: A.p.y + 10 }; e.c = c; e.sp = [0, 1, 2, 3, 4].map((i) => { const a = Math.PI + (i / 4) * Math.PI; return { x: c.x + Math.cos(a) * 30, y: c.y + Math.sin(a) * 26 }; }); A.sfx('whoosh'); },
        update(e, dt, g, A) { if (e.tg && !e.tg.dead) e.c = A.center(e.tg); if (e.t > 0.45 && !e.go) { e.go = true; if (e.tg) for (let i = 0; i < 5; i++) A.damage(e, e.tg, 1, 0.1); A.sfx('punchHit'); A.shake(2, 0.15); } },
        draw(e, ctx, ox, oy, A) { const q = e.t < 0.45 ? 0 : Math.min(1, (e.t - 0.45) / 0.1), f = e.t > 0.7 ? 1 - (e.t - 0.7) / 0.3 : Math.min(1, e.t * 5); A.alpha(ctx, f, () => { for (const s of e.sp) { const a = Math.atan2(e.c.y - s.y, e.c.x - s.x), x0 = U.lerp(s.x, e.c.x - Math.cos(a) * 10, q), y0 = U.lerp(s.y, e.c.y - Math.sin(a) * 10, q); A.line(ctx, x0 + ox, y0 + oy, x0 + ox + Math.cos(a) * 12, y0 + oy + Math.sin(a) * 12, '#05020a', 2); A.px(ctx, x0 + ox + Math.cos(a) * 12, y0 + oy + Math.sin(a) * 12, 1, 1, '#ff2a3a'); } }); },
      },
      {
        name: 'Terror Visage', dmg: 16, cd: 10, mp: 7, kind: 'custom', life: 1.6,
        desc: 'A colossal face of darkness with burning red eyes looms up behind you. Enemies panic and flee.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx - p.facing * 6; e.y = p.y; A.sfx('surge'); for (const o of H.nearby(A, p.cx, p.y, 120 * H.sc(e))) { A.damage(e, o.t, 1, 0.8); if (o.t.applyStatus) { o.t.applyStatus('confuse', e.potency); o.t.applyStatus('blind', e.potency); } } A.shake(3, 0.4); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy - 20, k = Math.min(1, e.t / 0.3), f = A.fade(e, 0.2, 0.5); A.alpha(ctx, f * 0.85, () => { A.disc(ctx, x, y, Math.round(24 * k), '#05020a'); A.disc(ctx, x, y + 10 * k, Math.round(16 * k), '#05020a'); REDEYES(ctx, A, x - 6, y - 2); REDEYES(ctx, A, x + 8, y - 2); A.px(ctx, x - 6, y - 2, 4, 2, '#ff2a3a'); A.px(ctx, x + 6, y - 2, 4, 2, '#ff2a3a'); for (let i = -8; i <= 8; i += 3) A.tri(ctx, x + i, y + 10 * k, 2, -4, '#e8e0f0'); }); },
      },
      {
        name: 'Night Wings', dmg: 24, cd: 7, mp: 6, kind: 'custom', life: 0.8,
        desc: 'Sprout wings of darkness, leap forward and dive down in a tearing slash.',
        spawn(e, g, A) { const p = A.p; e.dir = p.facing; p.vy = -240; p.vx = e.dir * 160; A.sfx('whoosh'); },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; if (e.t > 0.25 && !e.dive) { e.dive = true; p.vy = 420; p.vx = e.dir * 200; } if (e.dive) A.hit(e, { x: p.x - 6, y: p.y, w: p.w + 12, h: p.h + 4 }, { kb: 1.2, dir: e.dir }); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy - 4, flap = Math.sin(e.t * 20) * 3; for (const s of [-1, 1]) for (let i = 0; i < 9; i++) A.px(ctx, x - e.dir * 2 + s * 0 - e.dir * i * 1.2, y - 2 - i * 0.6 * s - flap * (i / 9) * s, 2, 2, i % 3 ? '#05020a' : '#7a2aff'); if (e.dive) A.arc(ctx, x + e.dir * 4, y + 6, 12, e.dir, '#ff2a3a', 1, -0.4, 1.2); },
      },
      {
        name: 'Night Terror Swarm', dmg: 6, cd: 8, mp: 6, kind: 'custom', life: 2.4,
        desc: 'A shrieking swarm of shadow bats pours out of you and bites everything in front.',
        spawn(e, g, A) { H.at(e, A, 6, -4); e.bats = []; for (let i = 0; i < (e.up ? 10 : 7); i++) e.bats.push({ x: e.x, y: e.y, vx: e.dir * A.rnd(120, 200), vy: A.rnd(-60, 60), ph: Math.random() * 6, done: false }); A.sfx('batScreech'); },
        update(e, dt, g, A) { for (const b of e.bats) { if (b.done) continue; b.vy += Math.sin(e.t * 9 + b.ph) * 300 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vy *= 1 - dt * 3; const t = A.targets().find((t) => Phys().rectsOverlap(t.box, { x: b.x - 3, y: b.y - 3, w: 6, h: 6 })); if (t) { b.done = true; A.damage(e, t, 1, 0.2); } else if (A.solid(b.x, b.y)) b.done = true; } },
        draw(e, ctx, ox, oy, A) { for (const b of e.bats) if (!b.done) { const x = b.x + ox, y = b.y + oy, f = Math.floor(e.t * 20 + b.ph) % 2; A.px(ctx, x - 1, y - 1, 2, 2, '#05020a'); A.px(ctx, x - 4, y - 2 + f * 2, 3, 1, '#05020a'); A.px(ctx, x + 2, y - 2 + f * 2, 3, 1, '#05020a'); A.px(ctx, x, y - 1, 1, 1, '#ff2a3a'); } },
      },
    ],
    ult: {
      name: 'Abyssal Dominion', dmg: 12,
      desc: 'The abyss opens under the battlefield. A colossal hand of darkness rises, crushes every enemy in its fist, and drags them under.',
      charge: {
        pose: (t, k) => J({ lean: 1, bob: 1, FA: [[11.6, 15.4], [13.8, 18 + Math.sin(t * 10) * 0.6]], BA: [[6.4, 15.4], [5.6, 18.4]], FL: [[10.8, 19.4], [11.6, 22]], BL: [[5.6, 19.4], [4.8, 22]] }),
        lift: 0,
        draw(ctx, x, y, k, t, A, P) { A.alpha(ctx, 0.6 * k, () => A.px(ctx, x - 300, y - 200, 600, 400, '#05020a')); A.px(ctx, x - 40 * k, y + 13, 80 * k, 3, '#05020a'); for (let i = 0; i < 6; i++) DARK_TEND(ctx, A, x - 30 + i * 12, y + 14, x - 30 + i * 12 + Math.sin(t * 3 + i) * 8, y + 14 - (18 + i % 3 * 10) * k, t * 4 + i, P.c); if (k > 0.5) for (let i = 0; i < 4; i++) REDEYES(ctx, A, x - 36 + i * 24, y - 30 + Math.sin(i * 2) * 8); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.4, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 320).map((o) => o.t); const c = e.ts[0] ? A.center(e.ts[0]) : { x: p.cx + e.dir * 90, y: p.y }; e.cx = c.x; e.gy = A.ground(c.x, p.y + 2); for (const t of e.ts) holdStun(t, 2.6); A.sfx('rumble', { dur: 3 }); A.sfx('surge'); },
          update(e, dt, g, A) {
            if (e.t > 0.4 && e.t < 1.6) for (const t of e.ts) if (!t.dead && !t.tutorial) { const c = A.center(t); t.vx = (e.cx - c.x) * 3; }
            if (e.t > 1.4 && !e.grab) { e.grab = true; for (const t of e.ts) if (!t.dead) A.damage(e, t, 3, 0); A.sfx('crash'); A.shake(8, 0.4); }
            if (e.t > 2.4 && !e.boom) { e.boom = true; A.blast(e, e.cx, e.gy - 20, 110 * H.sc(e), { dmg: e.dmg * 5 }); A.flash(0.25); A.shake(10, 0.5); }
          },
          draw(e, ctx, ox, oy, A) {
            const dark = e.t < 2.6 ? Math.min(1, e.t * 3) * 0.7 : Math.max(0, 0.7 - (e.t - 2.6) * 1.2);
            A.alpha(ctx, dark, () => A.px(ctx, -10, -10, 2000, 2000, '#05020a'));
            const x = e.cx + ox, gy = e.gy + oy, rise = U.clamp((e.t - 0.3) / 0.8, 0, 1), close = U.clamp((e.t - 1.1) / 0.3, 0, 1), sink = e.t > 1.7 ? (e.t - 1.7) * 140 : 0;
            A.alpha(ctx, Math.min(1, dark * 1.4), () => {
              A.px(ctx, x - 70, gy - 2, 140, 4, '#05020a'); A.alpha(ctx, 0.6, () => A.ring(ctx, x, gy, 70, '#7a2aff', 5));
              if (!e.boom) {
                const top = gy - 90 * rise + sink;
                A.px(ctx, x - 18, top + 30, 36, Math.max(0, gy - top - 30), '#0a0612');   // the forearm
                for (let f = 0; f < 4; f++) { const fx = x - 22 + f * 15, curl = close * 18; A.px(ctx, fx + (f < 2 ? curl * 0.5 : -curl * 0.5), top + curl * 0.6, 8, 34 - curl * 0.4, '#0a0612'); A.px(ctx, fx + (f < 2 ? curl * 0.5 : -curl * 0.5), top + curl * 0.6, 8, 2, '#7a2aff'); }
                A.px(ctx, x + 18 - close * 10, top + 26, 8, 22, '#0a0612');   // thumb
                REDEYES(ctx, A, x - 6, top + 40); REDEYES(ctx, A, x + 6, top + 40);
              } else { const k = (e.t - 2.4) / 1; A.alpha(ctx, 1 - k, () => { A.ring(ctx, x, gy - 20, 20 + k * 120, '#7a2aff', (20 + k * 120) * 0.6, 2); for (let i = 0; i < 10; i++) DARK_TEND(ctx, A, x, gy, x + Math.cos(i * 0.63) * (30 + k * 100), gy - 20 + Math.sin(i * 0.63) * (30 + k * 60), e.t * 5 + i, '#ff2a3a'); }); }
            });
          },
        }, {});
      },
    },
  };

  // ============================================================= SHADOW (violet)
  AW.shadow = {
    color: '#a04aff', up: '#6af0ff', status: 'expose', fx: 'wisps', block: ['Night Mirror', 'veil'],
    icons: ['phantomCut', 'puppet', 'kunaiStorm', 'swap', 'cloak'],
    look: { fx(ctx, F) { const e = F.at('eye'); F.A.px(ctx, e.x, e.y, 1, 1, '#d8a0ff'); F.A.alpha(ctx, 0.5, () => F.A.px(ctx, e.x - F.d * 3, e.y, 3, 1, '#a04aff')); } },
    idle: {
      pose: (t) => Object.assign(IDLE.crossed(t, { lean: 0 }), { noLegs: true, bob: 3 }),
      back(ctx, F) { const A = F.A; A.alpha(ctx, 0.95, () => { for (let i = -10; i <= 10; i++) { const h = Math.max(0, 4 - Math.abs(i) * 0.3) + Math.sin(F.t * 4 + i) * 0.6; A.px(ctx, F.ground + 0 * i + F.x - F.ground + i, F.ground - h, 1, h + 1, Math.abs(i) > 7 ? '#3a1a5a' : '#05020a'); } }); A.px(ctx, F.x - 7, F.ground - 7, 14, 4, '#05020a'); for (let i = 0; i < 3; i++) A.px(ctx, F.x - 8 + ((F.t * 8 + i * 6) % 16), F.ground - 2 - ((F.t * 6 + i * 3) % 5), 1, 1, '#a04aff'); },
    },
    run: {
      pose: (ph) => RUN.sink(ph),
      back(ctx, F) { const A = F.A; A.px(ctx, F.x - 8, F.ground - 6, 16, 6, '#05020a'); for (let i = 1; i < 6; i++) A.alpha(ctx, 0.8 - i * 0.12, () => A.px(ctx, F.x - F.d * (6 + i * 4), F.ground - 2, 6, 2, '#05020a')); A.px(ctx, F.x - 8, F.ground - 7, 16, 1, '#a04aff'); },
    },
    dash: {
      name: 'Shade Slip', style: 'blink', dmg: 16, life: 0.8,
      spawn(e, g, A) { const p = A.p; e.sx = p.cx; e.gy = p.feet; },
      update(e, dt, g, A) { const p = A.p; if (p.dashT <= 0 && !e.out) { e.out = true; e.ex = p.cx; A.hit(e, { x: p.cx - 16, y: p.y, w: 32, h: p.h }, { kb: 1, onHit(t) { if (t.applyStatus) t.applyStatus('expose', 0); } }); A.sfx('swing'); } },
      draw(e, ctx, ox, oy, A) { const gy = e.gy + oy, x = (e.out ? e.ex : A.p.cx) + ox; A.px(ctx, Math.min(e.sx + ox, x) - 4, gy - 1, Math.abs(x - e.sx - ox) + 8, 1, '#05020a'); if (e.out) { const k = (e.t - 0.16) / 0.5; A.alpha(ctx, Math.max(0, 1 - k), () => { A.arc(ctx, x, gy - 12, 14, A.p.facing, '#a04aff', 2, -1.2, 1.2); A.arc(ctx, x, gy - 12, 12, A.p.facing, '#ffffff', 1, -1, 1); }); } },
    },
    guard: {
      name: 'Night Mirror', sound: 'glass',
      draw(ctx, { A, x, bot, h, d, t }) { A.px(ctx, x - 5, bot - h, 10, h, '#120a20'); A.px(ctx, x - 5, bot - h, 10, 1, '#a04aff'); A.px(ctx, x - 5, bot - 1, 10, 1, '#a04aff'); A.alpha(ctx, 0.7, () => ERX.PlayerSide.draw(ctx, ERX.KitHelp.ghost(A, 'block', -d, '#5a2a8a'), x + d * 1, bot - 1, -d)); A.px(ctx, x - 3, bot - h + ((t * 25) % h), 1, 4, '#d8a0ff'); },
      hit(g, x, y, d) { for (let i = 0; i < 12; i++) dot(g, x, y, d * U.lerp(30, 140, Math.random()), U.lerp(-90, 60, Math.random()), i % 2 ? '#a04aff' : '#ffffff', { len: i % 3 ? 0 : 2 }); },
    },
    m1: {
      name: 'Phantom Cut', dmg: 7, cd: 0.36, kind: 'custom', life: 0.4,
      desc: 'A quick cut... then your shadow appears behind the enemy and repeats it from the other side.',
      spawn(e, g, A) { H.at(e, A, 0); A.sfx('swing', { minGap: 0.04 }); e.tg = A.near(e.x + e.dir * 20, e.y, 34); },
      update(e, dt, g, A) { if (e.t < 0.1) H.melee(e, A, 28 * H.sc(e), 22); if (e.t > 0.18 && !e.echo) { e.echo = true; if (e.tg && !e.tg.dead) { A.damage(e, e.tg, 1, 0.4); e.ec = A.center(e.tg); A.sfx('swing', { minGap: 0.03 }); } } },
      draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, k = Math.min(1, e.t / 0.1); if (e.t < 0.2) A.arc(ctx, x, y, 18 * H.sc(e), e.dir, e.pal.c, 2, -1, U.lerp(-1, 1, k)); if (e.echo && e.ec) { const q = (e.t - 0.18) / 0.22; A.alpha(ctx, 1 - q, () => { H.drawGhost(ctx, A, 'attack', e.ec.x + ox + e.dir * 12, e.ec.y + oy + 12, -e.dir, '#3a1a5a'); A.arc(ctx, e.ec.x + ox + e.dir * 10, e.ec.y + oy, 14, -e.dir, '#d8a0ff', 1, -1, 1); }); } },
    },
    s: [
      {
        name: 'Shadow Puppet', dmg: 20, cd: 7, mp: 6, kind: 'custom', life: 1.6,
        desc: 'Grab the nearest enemy by its shadow. It is yanked around like a puppet, then slammed down.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 170); e.tg = t; if (!t) { e.dead = true; return; } holdStun(t, 1.4); A.sfx('whoosh'); },
        update(e, dt, g, A) { const t = e.tg; if (!t || t.dead) { e.dead = true; return; } if (!t.tutorial) { if (e.t < 1) { t.vx = Math.sin(e.t * 10) * 160; t.vy = e.t < 0.5 ? -60 : 0; } else if (!e.slam) t.vy = 500; } if (e.t > 1.05 && !e.slam) { e.slam = true; A.damage(e, t, 1, 0.4); A.sfx('crash'); A.shake(3, 0.2); } },
        draw(e, ctx, ox, oy, A) { const t = e.tg; if (!t || t.dead) return; const c = A.center(t), p = A.p; A.alpha(ctx, e.slam ? 1 - (e.t - 1.05) / 0.55 : 1, () => { for (let i = 0; i < 3; i++) A.line(ctx, p.cx + ox + p.facing * 4, p.y + oy + 6 + i, c.x + ox - 2 + i * 2, t.box.y + oy, '#a04aff'); A.px(ctx, c.x + ox - 6, t.box.y + t.box.h + oy - 1, 12, 2, '#05020a'); }); },
      },
      {
        name: 'Kunai Storm', dmg: 5, cd: 6, mp: 6, kind: 'custom', life: 0.6,
        desc: 'Throw a rapid storm of shadow kunai in a widening fan.',
        spawn(e, g, A) { e.n = 0; A.sfx('whoosh'); },
        update(e, dt, g, A) { H.at(e, A, 6, -2); const want = Math.min(e.up ? 14 : 10, Math.floor(e.t / 0.045) + 1); while (e.n < want) { e.n++; const a = Math.sin(e.n * 1.7) * 0.35; A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const an = Math.atan2(b.vy, b.vx), c = Math.cos(an), s = Math.sin(an); A.line(ctx, b.x + ox - c * 5, b.y + oy - s * 5, b.x + ox, b.y + oy, '#3a1a5a'); A.px(ctx, b.x + ox, b.y + oy, 1, 1, '#d8a0ff'); }, { life: 0.7, r: 3 }), { vx: Math.cos(a) * 360 * e.dir, vy: Math.sin(a) * 360 }); } },
      },
      {
        name: 'Silhouette Swap', dmg: 26, cd: 6, mp: 5, kind: 'custom', life: 0.5,
        desc: 'Swap places with the nearest enemy\'s shadow, ending up behind it with a stab in its back.',
        spawn(e, g, A) { const p = A.p, t = A.near(p.cx, p.y, 160); e.a = { x: p.cx, f: p.feet }; if (!t) { e.dead = true; return; } const c = A.center(t), side = c.x > p.cx ? 1 : -1, nx = c.x + side * 12 - p.w / 2; if (!Phys().overlapsSolid(g.level, nx, p.y, p.w, p.h)) { p.x = nx; p.facing = -side; } if (!t.tutorial && !Phys().overlapsSolid(g.level, e.a.x - t.box.w / 2, t.box.y, t.box.w, t.box.h)) t.x = e.a.x - t.box.w / 2; A.damage(e, t, 1, 0.6); if (t.applyStatus) t.applyStatus('expose', e.potency); e.b = { x: p.cx, f: p.feet }; A.sfx('dash'); },
        draw(e, ctx, ox, oy, A) { if (!e.b) return; const k = e.t / e.life; A.alpha(ctx, 1 - k, () => { for (const pt of [e.a, e.b]) { A.px(ctx, pt.x + ox - 8, pt.f + oy - 1, 16, 2, '#05020a'); A.ring(ctx, pt.x + ox, pt.f + oy - 10, 4 + k * 10, '#a04aff'); } A.line(ctx, e.a.x + ox, e.a.f + oy - 10, e.b.x + ox, e.b.f + oy - 10, '#d8a0ff'); }); },
      },
      {
        name: 'Night Cloak', dmg: 0, cd: 14, mp: 6, kind: 'custom', life: 3,
        desc: 'Vanish into the dark: nothing can touch you for a moment, and your next strikes hit harder.',
        spawn(e, g, A) { const p = A.p; p.dashGrace = e.up ? 2.5 : 1.8; p.ab.buffs.rage = { t: e.life, up: e.up, pal: e.pal }; A.g.floatText(p.cx, p.y - 10, 'CLOAKED', e.pal.l); A.sfx('whoosh'); },
        update(e, dt, g, A) { e.x = A.p.cx; e.f = A.p.feet; },
        draw(e, ctx, ox, oy, A) { if (A.p.dashGrace <= 0) return; A.alpha(ctx, 0.5, () => { for (let i = 0; i < 6; i++) A.px(ctx, e.x + ox - 6 + ((e.t * 20 + i * 4) % 12), e.f + oy - 4 - ((e.t * 30 + i * 7) % 20), 1, 2, '#a04aff'); }); },
      },
      {
        name: 'Shadow Bloom', dmg: 18, cd: 8, mp: 6, kind: 'custom', life: 0.9,
        desc: 'Shadows burst up out of the floor all around you like the petals of a black flower.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.gy = p.feet; A.sfx('whoosh'); },
        update(e, dt, g, A) { const R = 56 * H.sc(e), k = Math.min(1, e.t / 0.25); A.hit(e, { x: e.x - R * k, y: e.gy - 30, w: R * 2 * k, h: 30 }, { kb: 1, onHit(t) { if (t.applyStatus) t.applyStatus('launch', 0); } }); },
        draw(e, ctx, ox, oy, A) { const R = 56 * H.sc(e), k = Math.min(1, e.t / 0.25), x = e.x + ox, gy = e.gy + oy, f = 1 - Math.max(0, e.t - 0.5) / 0.4; A.alpha(ctx, f, () => { for (let i = -6; i <= 6; i++) { if (!i) continue; const px = x + (i / 6) * R * k, h = (30 - Math.abs(i) * 3) * k; A.tri(ctx, px, gy, 6, h, '#05020a', '#a04aff'); } }); },
      },
    ],
    ult: {
      name: 'Eternal Eclipse', dmg: 10,
      desc: 'A gigantic eclipse swallows the battlefield in darkness. A colossal shadow beast crawls out of it, rips into everything, then the eclipse collapses in on itself.',
      charge: {
        pose: (t, k) => J({ FA: [[11, 10], [11.6, 6.4]], BA: [[5.2, 10.4], [4.4, 6.8]], bob: 0 }),
        lift: 8,
        draw(ctx, x, y, k, t, A, P) { const sx = x, sy = y - 40, r = Math.round(4 + k * 18); A.alpha(ctx, 0.5 * k, () => A.px(ctx, x - 300, y - 200, 600, 400, '#08040e')); A.glow(ctx, sx, sy, r + 6, P.c, 0.35); A.disc(ctx, sx, sy, r + 1, '#d8a0ff'); A.disc(ctx, sx + Math.round((1 - k) * r), sy, r, '#05020a'); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.6, layer: 'screen',
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 320).map((o) => o.t); const c = e.ts[0] ? A.center(e.ts[0]) : { x: p.cx + e.dir * 90, y: p.y }; e.cx = c.x; e.gy = A.ground(c.x, p.y + 2); e.top = A.top(); e.claws = []; A.sfx('surge'); },
          update(e, dt, g, A) {
            e.ct = (e.ct || 0) - dt; for (const c of e.claws) c.t += dt;
            if (e.t > 0.9 && e.t < 2.4 && e.ct <= 0) { e.ct = 0.13; const live = e.ts.filter((t) => !t.dead); const t = live[Math.floor(Math.random() * live.length)]; if (t) { const c = A.center(t); A.damage(e, t, 0.8, 0.2); e.claws.push({ x: c.x, y: c.y, a: A.rnd(-1, 1), t: 0 }); A.sfx('swing', { minGap: 0.04 }); } }
            if (e.t > 2.6 && !e.boom) { e.boom = true; A.blast(e, e.cx, e.gy - 40, 120 * H.sc(e), { dmg: e.dmg * 6 }); A.sfx('boom'); A.flash(0.4); A.shake(10, 0.5); }
          },
          draw(e, ctx, ox, oy, A) {
            const dark = e.t < 2.6 ? Math.min(1, e.t * 2.5) * 0.75 : Math.max(0, 0.75 - (e.t - 2.6) * 1);
            A.alpha(ctx, dark, () => A.px(ctx, -10, -10, 2000, 2000, '#05020a'));
            const ex = e.cx + ox, ey = e.top + oy + 46, r = e.boom ? Math.max(0, 30 - (e.t - 2.6) * 120) : 30;
            if (r > 0) { A.glow(ctx, ex, ey, r + 8, e.pal.c, 0.4); A.disc(ctx, ex, ey, Math.round(r + 2), '#d8a0ff'); A.disc(ctx, ex, ey, Math.round(r), '#05020a'); }
            // the beast: a huge silhouette with violet eyes, crawling down out of the eclipse
            const rise = U.clamp((e.t - 0.5) / 0.5, 0, 1), bx = ex, by = ey + 40 + 30 * rise;
            if (!e.boom && rise > 0) A.alpha(ctx, rise, () => { A.disc(ctx, bx, by, 26, '#0a0612'); A.disc(ctx, bx, by + 22, 20, '#0a0612'); for (const s of [-1, 1]) { A.line(ctx, bx + s * 18, by + 10, bx + s * 46, by + 40 + Math.sin(e.t * 8 + s) * 8, '#0a0612', 6); for (let i = 0; i < 3; i++) A.line(ctx, bx + s * 46, by + 40, bx + s * (50 + i * 4), by + 52 + i * 2, '#e8e0f0'); } A.px(ctx, bx - 10, by - 6, 6, 3, e.pal.c); A.px(ctx, bx + 5, by - 6, 6, 3, e.pal.c); for (let i = -12; i <= 12; i += 4) A.tri(ctx, bx + i, by + 8, 3, -6, '#e8e0f0'); });
            for (const c of e.claws) if (c.t < 0.18) A.alpha(ctx, 1 - c.t / 0.18, () => { for (let i = -1; i <= 1; i++) A.line(ctx, c.x + ox - 12 + i * 4, c.y + oy - 12 + c.a * 5, c.x + ox + 12 + i * 4, c.y + oy + 12 - c.a * 5, i ? '#a04aff' : '#ffffff', 1); });
            if (e.boom) { const k = (e.t - 2.6) / 1; A.alpha(ctx, 1 - k, () => A.ring(ctx, e.cx + ox, e.gy + oy - 40, 20 + k * 160, '#d8a0ff', (20 + k * 160) * 0.6, 2)); }
          },
        }, {});
      },
    },
  };

  // =============================================================== LIGHT (gold)
  const HALO = (ctx, A, x, y, t, col) => { A.ring(ctx, x, y, 5, col, 1.5); A.alpha(ctx, 0.4 + 0.2 * Math.sin(t * 4), () => A.ring(ctx, x, y - 0.5, 6, '#ffffff', 2)); };
  const WING = (ctx, A, x, y, d, spread, col) => { for (let i = 0; i < 9; i++) { const a = -0.3 - i * 0.16 * spread, L = 4 + i * 1.2; A.line(ctx, x, y, x - d * Math.cos(a) * L, y + Math.sin(a) * L, i % 3 ? col : '#ffffff'); } };
  AW.light = {
    color: '#ffd84a', up: '#ffffff', status: 'dazzle', fx: 'motes', block: ['Aegis of Dawn', 'shield'],
    icons: ['seraph', 'judgeSword', 'sanctuary', 'crossBurst', 'haloDisc'],
    look: { fx(ctx, F) { const h = F.at('headTop'); HALO(ctx, F.A, h.x, h.y - 3, F.t, '#ffd84a'); } },
    idle: {
      pose: (t) => IDLE.meditate(t, { lift: 7, open: true }),
      back(ctx, F) { const c = F.at('chest'), A = F.A; A.alpha(ctx, 0.3 + 0.1 * Math.sin(F.t * 2), () => { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + F.t * 0.4; A.line(ctx, c.x + Math.cos(a) * 8, c.y + Math.sin(a) * 8, c.x + Math.cos(a) * 18, c.y + Math.sin(a) * 18, '#fff4c8'); } }); },
    },
    run: {
      pose: (ph) => RUN.hover(ph, { lift: 4, lean: 2, arms: [[7.4, 13], [4.4, 11.8]], armsB: [[6.8, 13], [3.4, 11]] }),
      back(ctx, F) { const c = F.at('chest'); WING(ctx, F.A, c.x - F.d * 2, c.y - 2, F.d, 1 + Math.sin(F.t * 9) * 0.25, '#ffd84a'); for (let i = 1; i < 6; i++) F.A.alpha(ctx, 0.4 - i * 0.07, () => F.A.px(ctx, F.x - F.d * i * 5, F.y - 12, 4, 1, '#fff4c8')); },
    },
    dash: {
      name: 'Radiant Afterglow', dmg: 12, life: 1,
      spawn(e) { e.imgs = []; },
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) { e.it = (e.it || 0) - dt; if (e.it <= 0) { e.it = 0.05; e.imgs.push({ x: p.cx, f: p.feet, t: e.t, d: p.facing, b: false }); } } for (const im of e.imgs) if (!im.b && e.t - im.t > 0.3) { im.b = true; A.hitR(e, im.x, im.f - 12, 14, { kb: 0.8, once: false, every: 9 }); A.sfx('ding', { minGap: 0.06 }); } },
      draw(e, ctx, ox, oy, A) { for (const im of e.imgs) { const k = e.t - im.t; if (!im.b) A.alpha(ctx, 0.7, () => H.drawGhost(ctx, A, 'dash', im.x + ox, im.f + oy, im.d, '#fff4c8')); else if (k < 0.55) A.alpha(ctx, 1 - (k - 0.3) / 0.25, () => { A.line(ctx, im.x + ox - 8, im.f + oy - 12, im.x + ox + 8, im.f + oy - 12, '#ffffff'); A.line(ctx, im.x + ox, im.f + oy - 22, im.x + ox, im.f + oy - 2, '#ffffff'); A.ring(ctx, im.x + ox, im.f + oy - 12, 4 + (k - 0.3) * 30, '#ffd84a'); }); } },
    },
    guard: {
      name: 'Aegis of Dawn', sound: 'chime',
      draw(ctx, { A, x, bot, h, d, t }) { const cy = bot - h / 2; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, b2 = a + Math.PI / 3; A.line(ctx, x + Math.cos(a) * 6, cy + Math.sin(a) * h / 2, x + Math.cos(b2) * 6, cy + Math.sin(b2) * h / 2, '#ffd84a', 2); } A.alpha(ctx, 0.3, () => A.px(ctx, x - 4, cy - h / 2 + 3, 8, h - 6, '#fff8e0')); WING(ctx, A, x - d * 3, cy - 4, d, 1 + Math.sin(t * 5) * 0.2, '#ffd84a'); A.px(ctx, x - 1, cy - 3, 2, 6, '#ffffff'); A.px(ctx, x - 3, cy - 1, 6, 2, '#ffffff'); },
      hit(g, x, y, d) { for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; dot(g, x, y, Math.cos(a) * 110, Math.sin(a) * 110, i % 2 ? '#ffd84a' : '#ffffff', { life: 0.3 }); } },
    },
    m1: {
      name: 'Seraph Strike', dmg: 9, cd: 0.36, kind: 'custom', life: 0.35,
      desc: 'A radiant palm strike that brands a glowing cross on whatever it hits.',
      spawn(e, g, A) { A.sfx('ding', { minGap: 0.05 }); },
      update(e, dt, g, A) { H.at(e, A, 0); H.melee(e, A, 30 * H.sc(e), 20, { onHit(t) { e.mark = A.center(t); } }); },
      draw(e, ctx, ox, oy, A) { const k = e.t / e.life, x = e.x + ox + e.dir * (10 + 10 * Math.min(1, k * 4)), y = e.y + oy; A.alpha(ctx, 1 - k, () => { A.glow(ctx, x, y, 5, e.pal.c, 0.4); A.disc(ctx, x, y, 3, '#ffffff'); if (e.mark) { const m = e.mark; A.px(ctx, m.x + ox - 1, m.y + oy - 7, 2, 14, '#ffffff'); A.px(ctx, m.x + ox - 5, m.y + oy - 3, 10, 2, '#ffffff'); A.alpha(ctx, 0.6, () => A.ring(ctx, m.x + ox, m.y + oy, 6 + k * 6, e.pal.c)); } }); },
    },
    s: [
      {
        name: 'Judgment Sword', dmg: 34, cd: 6, mp: 6, kind: 'custom', life: 1.1,
        desc: 'A colossal sword of light falls from the heavens and impales the ground where your enemy stands.',
        spawn(e, g, A) { H.at(e, A, 0); const ax = A.aim(e, 160); e.tx = ax !== null ? ax : e.x + e.dir * 60; e.gy = H.floor(A, e.tx); e.top = H.sky(A, e.tx, e.gy - 10); A.sfx('ding'); },
        update(e, dt, g, A) { if (e.t > 0.35 && !e.hitd) { e.hitd = true; A.hit(e, { x: e.tx - 8, y: e.gy - 50, w: 16, h: 50 }, { kb: 0.8 }); A.hitR(e, e.tx, e.gy - 4, 30, { mult: 0.4, kb: 1.2 }); A.sfx('crash'); A.shake(4, 0.25); A.flash(0.1); } },
        draw(e, ctx, ox, oy, A) { const x = e.tx + ox, gy = e.gy + oy, q = Math.min(1, e.t / 0.35), tip = U.lerp(e.top + oy - 20, gy + 6, W.easeIn(q)), f = e.t > 0.8 ? 1 - (e.t - 0.8) / 0.3 : 1, L = 50 * H.sc(e); A.alpha(ctx, f, () => { A.px(ctx, x - 3, tip - L, 6, L - 6, '#ffd84a'); A.px(ctx, x - 1, tip - L, 2, L - 6, '#ffffff'); A.tri(ctx, x, tip - 6, 6, -6, '#ffffff'); A.px(ctx, x - 9, tip - L, 18, 3, '#ffd84a'); A.px(ctx, x - 2, tip - L - 9, 4, 9, '#c8a84a'); A.disc(ctx, x, tip - L - 10, 2, '#ffffff'); if (e.hitd) A.alpha(ctx, 1 - (e.t - 0.35) / 0.4, () => A.ring(ctx, x, gy - 2, 6 + (e.t - 0.35) * 70, '#ffffff', 2 + (e.t - 0.35) * 12)); }); },
      },
      {
        name: 'Sanctuary', dmg: 5, cd: 13, mp: 8, kind: 'custom', life: 4,
        desc: 'A dome of holy light: it slowly heals you while it burns any enemy inside.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.gy = p.feet; e.ht = 0; A.sfx('revive'); },
        update(e, dt, g, A) { const R = 46 * H.sc(e), p = A.p; A.tick(e, { x: e.x - R, y: e.gy - R, w: R * 2, h: R }, 0.4, { kb: 0.3 }); e.ht -= dt; if (e.ht <= 0 && Math.abs(p.cx - e.x) < R) { e.ht = 0.5; const n = e.up ? 5 : 3; if (p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + n); A.g.floatText(p.cx, p.y - 6, '+' + n, '#7af0a0'); } } },
        draw(e, ctx, ox, oy, A) { const R = 46 * H.sc(e), x = e.x + ox, gy = e.gy + oy, f = A.fade(e, 0.3, 0.5); A.alpha(ctx, f * 0.18, () => { for (let yy = 0; yy < R; yy++) { const w = Math.sqrt(R * R - yy * yy); A.px(ctx, x - w, gy - yy, w * 2, 1, '#fff4c8'); } }); A.alpha(ctx, f, () => { for (let a = Math.PI; a <= Math.PI * 2; a += 0.05) A.px(ctx, x + Math.cos(a) * R, gy + Math.sin(a) * R, 1, 1, '#ffd84a'); for (let i = 0; i < 6; i++) A.px(ctx, x - R + ((i * 23 + e.t * 20) % (R * 2)), gy - ((e.t * 30 + i * 9) % R), 1, 1, '#ffffff'); }); },
      },
      {
        name: 'Cross Burst', dmg: 28, cd: 7, mp: 6, kind: 'custom', life: 1,
        desc: 'Brand a giant cross of light on the nearest enemy. It explodes outward in all four directions.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 170); e.c = t ? A.center(t) : { x: A.p.cx + A.p.facing * 50, y: A.p.y + 10 }; e.tg = t; A.sfx('ding'); },
        update(e, dt, g, A) { if (e.tg && !e.tg.dead && e.t < 0.45) e.c = A.center(e.tg); if (e.t > 0.45 && !e.go) { e.go = true; const L = 46 * H.sc(e); A.hit(e, { x: e.c.x - L, y: e.c.y - 5, w: L * 2, h: 10 }, { kb: 1 }); A.hit(e, { x: e.c.x - 5, y: e.c.y - L, w: 10, h: L * 2 }, { kb: 0.4 }); A.sfx('shockwave'); A.flash(0.12); } },
        draw(e, ctx, ox, oy, A) { const x = e.c.x + ox, y = e.c.y + oy, L = 46 * H.sc(e); if (!e.go) { const k = e.t / 0.45; A.alpha(ctx, 0.5 + 0.5 * Math.sin(e.t * 30), () => { A.px(ctx, x - 1, y - 10 * k, 2, 20 * k, '#ffd84a'); A.px(ctx, x - 7 * k, y - 3, 14 * k, 2, '#ffd84a'); }); return; } const k = (e.t - 0.45) / 0.55; A.alpha(ctx, 1 - k, () => { A.px(ctx, x - L * Math.min(1, k * 3), y - 3, L * 2 * Math.min(1, k * 3), 6, '#ffd84a'); A.px(ctx, x - 3, y - L * Math.min(1, k * 3), 6, L * 2 * Math.min(1, k * 3), '#ffd84a'); A.px(ctx, x - L * Math.min(1, k * 3), y - 1, L * 2 * Math.min(1, k * 3), 2, '#ffffff'); A.px(ctx, x - 1, y - L * Math.min(1, k * 3), 2, L * 2 * Math.min(1, k * 3), '#ffffff'); }); },
      },
      {
        name: 'Halo Ricochet', dmg: 14, cd: 6, mp: 6, kind: 'custom', life: 2.2,
        desc: 'Throw your halo. It ricochets from enemy to enemy, then flies back to your head.',
        spawn(e, g, A) { H.at(e, A, 4, -8); e.cur = A.near(e.x, e.y, 170); e.done = new Set(); e.n = 0; A.sfx('ding'); },
        update(e, dt, g, A) { const p = A.p; let tx, ty; if (e.cur && !e.cur.dead && !e.back) { const c = A.center(e.cur); tx = c.x; ty = c.y; } else { e.back = true; tx = p.cx; ty = p.y - 4; } const a = Math.atan2(ty - e.y, tx - e.x); e.x += Math.cos(a) * 320 * dt; e.y += Math.sin(a) * 320 * dt; if (Math.hypot(tx - e.x, ty - e.y) < 7) { if (e.back) { e.dead = true; return; } A.damage(e, e.cur, 1, 0.3); e.done.add(e.cur.uid); e.n++; A.sfx('ding', { minGap: 0.04 }); e.cur = e.n < (e.up ? 6 : 4) ? A.near(e.x, e.y, 120, e.done) : null; if (!e.cur) e.back = true; } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy; A.ring(ctx, x, y, 6, '#ffd84a', 2); A.ring(ctx, x, y, 5, '#ffffff', 1.5); A.glow(ctx, x, y, 6, '#ffd84a', 0.2); },
      },
      {
        name: 'Radiant Wings', dmg: 12, cd: 8, mp: 6, kind: 'custom', life: 0.8,
        desc: 'Unfold wings of light: a wave of glowing feathers bursts forward, pushing enemies back.',
        spawn(e, g, A) { H.at(e, A, 0, -6); A.sfx('whoosh'); for (let i = 0; i < (e.up ? 14 : 10); i++) { const a = U.lerp(-0.5, 0.5, i / 9); A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const an = Math.atan2(b.vy, b.vx), c = Math.cos(an), s = Math.sin(an); A.line(ctx, b.x + ox - c * 4, b.y + oy - s * 4, b.x + ox + c * 2, b.y + oy + s * 2, '#ffd84a'); A.px(ctx, b.x + ox - s, b.y + oy + c, 1, 1, '#ffffff'); }, { life: 0.6, r: 3, pierce: true, kb: 1.4 }), { vx: Math.cos(a) * 280 * e.dir, vy: Math.sin(a) * 280 }); } },
        update(e, dt, g, A) { H.at(e, A, 0, -6); },
        draw(e, ctx, ox, oy, A) { const k = e.t / e.life; A.alpha(ctx, 1 - k, () => { for (const s of [1, -1]) WING(ctx, A, e.x + ox - e.dir * 2, e.y + oy, e.dir * s, 1.6, '#ffd84a'); }); },
      },
    ],
    ult: {
      name: "Heaven's Erasure", dmg: 9,
      desc: 'Rise into the air and charge an enormous beam of pure light. Then fire it for three seconds, aiming it across the battlefield. Anything inside is erased.',
      charge: {
        pose: (t, k) => J({ lean: 1, FA: [[11.6, 12.4], [14, 12]], BA: [[10.6, 12.6], [13.4, 12.8]], FL: [[10, 18.4], [10.8, 21]], BL: [[6.8, 19], [5.8, 21.6]] }),
        lift: 34, keepLift: true,
        draw(ctx, x, y, k, t, A, P) { const bx = x + 10, by = y, r = Math.round(2 + k * 12); A.glow(ctx, bx, by, r + 6, '#ffffff', 0.3); A.disc(ctx, bx, by, r, P.c, '#ffffff'); for (let i = 0; i < 16; i++) { const a = i * 0.39 + t * 3, d = 46 * (1 - ((t * 1.8 + i / 16) % 1)); A.line(ctx, bx + Math.cos(a) * d, by + Math.sin(a) * d, bx + Math.cos(a) * (d + 4), by + Math.sin(a) * (d + 4), '#fff4c8'); } },
      },
      run(A, e0) {
        const p = A.p, K = ERX.Keybinds;
        const firePose = () => J({ lean: 1, FA: [[11.6, 12.4], [14, 12]], BA: [[10.6, 12.6], [13.4, 12.8]], FL: [[10, 18.4], [10.8, 21]], BL: [[6.8, 19], [5.8, 21.6]] });
        W.hold(A, firePose, 34, 4.5);
        A.spawn(e0, {
          life: 3.6,
          spawn(e) { e.ang = 0.35; A.sfx('surge'); A.sfx('zap'); A.flash(0.4); },
          update(e, dt, g, A) {
            const h = p.ultHold;
            // aim it: jump = up, aim down (S / down / block) = down
            if (K.isDown('jump')) e.ang -= dt * 0.9;
            if (K.isDown('aimDown') || K.isDown('block')) e.ang += dt * 0.9;
            e.ang = U.clamp(e.ang, -0.9, 1.2);
            e.x = p.cx + e.dir * 12; e.y = p.y + 10 - (h ? h.lift : 0);
            const L = 520, w = 22 * H.sc(e), c = Math.cos(e.ang), s = Math.sin(e.ang);
            if (e.t < 3.1) for (let r = 0; r < L; r += 12) A.tickR(e, e.x + c * r * e.dir, e.y + s * r, w / 2 + 4, 0.1, { kb: 0.2 });
            A.shake(1.5, 0.05);
            if (h) h.lift = e.t < 3.1 ? 34 : Math.max(0, 34 - (e.t - 3.1) * 90);
            if (e.t > 3.45 && h) W.release(A);
          },
          draw(e, ctx, ox, oy, A) {
            if (e.t > 3.15) return;
            const L = 520, c = Math.cos(e.ang), s = Math.sin(e.ang), d = e.dir, x = e.x + ox, y = e.y + oy;
            const w = 22 * H.sc(e) * Math.min(1, e.t * 6) * (e.t > 2.9 ? (3.15 - e.t) / 0.25 : 1) * (1 + Math.sin(e.t * 30) * 0.08);
            for (let r = 0; r < L; r += 2) { const bx = x + c * r * d, by = y + s * r; A.px(ctx, bx - 1, by - w / 2, 2, w, e.pal.c); A.px(ctx, bx - 1, by - w / 3, 2, w * 0.66, '#fff4c8'); A.px(ctx, bx - 1, by - w / 7, 2, w * 0.28, '#ffffff'); }
            A.disc(ctx, x, y, Math.round(w * 0.6), '#ffffff');
            for (let i = 0; i < 18; i++) { const r = (i * 31 + e.t * 800) % L; A.px(ctx, x + c * r * d - s * (w / 2 + 2) * d, y + s * r + c * (w / 2 + 2), 5, 1, '#ffffff'); }
          },
        }, {});
      },
    },
  };

  // ============================================================= ARCANE (magenta)
  const RUNE = (ctx, A, x, y, i, col) => { const g = [[0, -2, 0, 2], [-2, 0, 2, 0], [-2, -2, 2, 2], [2, -2, -2, 2]][i % 4]; A.line(ctx, x + g[0], y + g[1], x + g[2], y + g[3], col); A.px(ctx, x, y - 3, 1, 1, col); };
  const SEAL = (ctx, A, x, y, r, t, col, n) => { A.ring(ctx, x, y, r, col, r * 0.3); A.ring(ctx, x, y, r * 0.75, '#ffffff', r * 0.22); for (let i = 0; i < (n || 8); i++) { const a = t + (i / (n || 8)) * Math.PI * 2; RUNE(ctx, A, x + Math.cos(a) * r * 0.88, y + Math.sin(a) * r * 0.27, i, col); } A.line(ctx, x - r * 0.7, y, x + r * 0.7, y, col); };
  AW.arcane = {
    color: '#ff4aff', up: '#5affc8', status: 'mark', fx: 'runes', block: ['Grimoire Ward', 'shield'],
    icons: ['spellblade', 'portal', 'frog', 'grimoire', 'owl'],
    look: { fx(ctx, F) { for (let i = 0; i < 3; i++) { const a = F.t * 2 + i * 2.1; RUNE(ctx, F.A, F.x + Math.cos(a) * 10, F.y - 10 + Math.sin(a) * 4, i + Math.floor(F.t), '#ff9aff'); } } },
    idle: {
      pose: (t) => IDLE.raise(t),
      fx(ctx, F) { const h = F.at('handF'); SEAL(ctx, F.A, h.x, h.y - 6, 7, F.t * 2, '#ff4aff', 6); },
    },
    run: {
      pose: (ph) => RUN.hover(ph, { lift: 4, lean: 1, arms: [[11.2, 13.2], [13.6, 12.4]], armsB: [[6.2, 14], [5.4, 16.4]] }),
      back(ctx, F) { SEAL(ctx, F.A, F.x, F.y + 1, 12, F.t * 4, '#ff4aff', 6); },
    },
    dash: {
      name: 'Blink Cascade', style: 'blink', dmg: 12, life: 1.2,
      spawn(e, g, A) { const p = A.p; e.sx = p.cx; e.y0 = p.y + 10; A.sfx('cast'); },
      update(e, dt, g, A) { const p = A.p; if (p.dashT <= 0 && !e.out) { e.out = true; e.ex = p.cx; e.glyphs = [0, 1, 2].map((i) => ({ x: U.lerp(e.sx, e.ex, (i + 0.5) / 3), b: false })); } if (e.out) for (const gl of e.glyphs) if (!gl.b && e.t > 0.45 + gl.x * 0) { gl.b = true; A.hitR(e, gl.x, e.y0, 14, { kb: 0.8, once: false, every: 9 }); A.sfx('cast', { minGap: 0.04 }); } },
      draw(e, ctx, ox, oy, A) { if (!e.out) return; const k = e.t - 0.16; for (const gl of e.glyphs) { if (!gl.b) SEAL(ctx, A, gl.x + ox, e.y0 + oy, 6, e.t * 6, e.pal.c, 4); else if (k < 0.7) A.alpha(ctx, 1 - (k - 0.3) / 0.4, () => A.ring(ctx, gl.x + ox, e.y0 + oy, 6 + (k - 0.3) * 30, '#ffffff')); } },
    },
    guard: {
      name: 'Grimoire Ward', sound: 'chime',
      draw(ctx, { A, x, bot, h, t }) { const cy = bot - h / 2; A.px(ctx, x - 1, cy - 12, 2, 24, '#5a2a1a'); for (const s of [-1, 1]) { A.px(ctx, x + (s < 0 ? -8 : 1), cy - 11, 7, 22, '#f4ecd8'); for (let i = 0; i < 5; i++) A.px(ctx, x + (s < 0 ? -7 : 2), cy - 8 + i * 4, 5, 1, '#c8b8a0'); } const flip = (t * 2) % 1; A.px(ctx, x + Math.round((flip - 0.5) * 12), cy - 11, 2, 22, '#ffffff'); RUNE(ctx, A, x - 4, cy, Math.floor(t * 3), '#ff4aff'); RUNE(ctx, A, x + 4, cy, Math.floor(t * 3) + 2, '#ff4aff'); },
      hit(g, x, y, d) { for (let i = 0; i < 8; i++) dot(g, x, y, d * U.lerp(20, 90, Math.random()), U.lerp(-80, 20, Math.random()), i % 2 ? '#f4ecd8' : '#ff4aff', { size: 2, wobble: 20, wobbleRate: 10, life: 0.8 }); },
    },
    m1: {
      name: 'Spellblade', dmg: 8, cd: 0.38, kind: 'custom', life: 1.1,
      desc: 'Slash with a blade of runes. The rune left hanging in the air explodes a moment later.',
      spawn(e, g, A) { H.at(e, A, 0); e.rx = e.x + e.dir * 20; e.ry = e.y; A.sfx('swing', { minGap: 0.04 }); },
      update(e, dt, g, A) { if (e.t < 0.12) H.melee(e, A, 28 * H.sc(e), 22); if (e.t > 0.7 && !e.boom) { e.boom = true; e.hit.clear(); A.hitR(e, e.rx, e.ry, 14 * H.sc(e), { mult: 0.8, kb: 0.8 }); A.sfx('cast', { minGap: 0.04 }); } },
      draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy; if (e.t < 0.18) A.arc(ctx, x, y, 22 * H.sc(e), e.dir, e.pal.c, 2, -1.2, U.lerp(-1.2, 1.2, e.t / 0.18)); if (!e.boom) { A.alpha(ctx, 0.5 + 0.5 * Math.sin(e.t * 20), () => RUNE(ctx, A, e.rx + ox, e.ry + oy, 2, '#ffffff')); } else { const k = (e.t - 0.7) / 0.4; A.alpha(ctx, 1 - k, () => A.ring(ctx, e.rx + ox, e.ry + oy, 3 + k * 14, e.pal.c, 3 + k * 14)); } },
    },
    s: [
      {
        name: 'Portal Volley', dmg: 7, cd: 6, mp: 6, kind: 'custom', life: 1.3,
        desc: 'Open a portal behind the nearest enemy. Your magic missiles fire out of it, straight into its back.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 180); e.tg = t; const c = t ? A.center(t) : { x: A.p.cx + A.p.facing * 80, y: A.p.y + 10 }; e.side = c.x > A.p.cx ? 1 : -1; e.px = c.x + e.side * 26; e.py = c.y; e.n = 0; A.sfx('cast'); },
        update(e, dt, g, A) { if (e.t > 0.3) { const want = Math.min(e.up ? 8 : 6, Math.floor((e.t - 0.3) / 0.1) + 1); while (e.n < want) { e.n++; A.spawn(e, H.proj((b, ctx, ox, oy, A) => { A.disc(ctx, b.x + ox, b.y + oy, 2, b.pal.c, '#ffffff'); A.px(ctx, b.x + ox - b.vx * 0.02, b.y + oy - b.vy * 0.02, 1, 1, b.pal.l); }, { life: 0.8, r: 3, homing: 6 }), { x: e.px, y: e.py + A.rnd(-6, 6), vx: -e.side * 240, vy: A.rnd(-30, 30) }); A.sfx('tick', { value: 90, minGap: 0.04 }); } } },
        draw(e, ctx, ox, oy, A) { const x = e.px + ox, y = e.py + oy, k = Math.min(1, e.t / 0.25), f = A.fade(e, 0.05, 0.3); A.alpha(ctx, f, () => { A.ring(ctx, x, y, 4 * k, '#ff4aff', 12 * k); A.ring(ctx, x, y, 3 * k, '#ffffff', 10 * k); A.alpha(ctx, 0.5, () => A.ring(ctx, x, y, 2 * k, '#120820', 8 * k)); }); },
      },
      {
        name: 'Hex', dmg: 10, cd: 11, mp: 7, kind: 'custom', life: 2.6,
        desc: 'Turn the nearest enemy into a frog for a few seconds. It can only croak about it.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 170); e.tg = t; if (!t) { e.dead = true; return; } A.damage(e, t, 1, 0); holdStun(t, e.up ? 3.2 : 2.4); if (t.applyStatus) t.applyStatus('mark', e.potency); A.sfx('pop'); A.puff(e, A.center(t).x, A.center(t).y, 10); },
        update(e, dt, g, A) { if (!e.tg || e.tg.dead) e.dead = true; },
        draw(e, ctx, ox, oy, A) { if (!e.tg) return; const b = e.tg.box, x = b.x + b.w / 2 + ox, gy = b.y + b.h + oy, hop = Math.abs(Math.sin(e.t * 5)) * 3; A.alpha(ctx, A.fade(e, 0.05, 0.3), () => { A.px(ctx, b.x + ox - 2, b.y + oy - 2, b.w + 4, b.h + 2, 'rgba(20,10,30,0.85)'); A.disc(ctx, x, gy - 5 - hop, 5, '#5fd84a', '#8ae06a'); A.px(ctx, x - 4, gy - 11 - hop, 3, 3, '#ffffff'); A.px(ctx, x + 1, gy - 11 - hop, 3, 3, '#ffffff'); A.px(ctx, x - 3, gy - 10 - hop, 1, 1, '#05030a'); A.px(ctx, x + 2, gy - 10 - hop, 1, 1, '#05030a'); A.px(ctx, x - 3, gy - 3 - hop, 6, 1, '#2a6a2a'); if (Math.floor(e.t * 2) % 2) A.text(ctx, 'croak', x, gy - 22, '#8ae06a'); }); },
      },
      {
        name: 'Grimoire Barrage', dmg: 6, cd: 7, mp: 6, kind: 'custom', life: 2.2,
        desc: 'A floating spellbook flips open and fires its razor-sharp pages at your enemies.',
        spawn(e, g, A) { e.st = 0.2; A.sfx('cast'); },
        update(e, dt, g, A) { const p = A.p; e.x = U.approach(e.x, p.cx + p.facing * 10, 6, dt); e.y = U.approach(e.y, p.y - 6 + Math.sin(e.t * 3) * 2, 6, dt); e.st -= dt; if (e.st <= 0 && e.t < 2) { e.st = e.up ? 0.1 : 0.14; const t = A.near(e.x, e.y, 190); const a = t ? Math.atan2(A.center(t).y - e.y, A.center(t).x - e.x) : (p.facing > 0 ? 0 : Math.PI); A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const s = Math.abs(Math.sin(b.t * 30)) * 3 + 1; A.px(ctx, b.x + ox - s / 2, b.y + oy - 2, s, 4, '#f4ecd8'); }, { life: 0.8, r: 3 }), { vx: Math.cos(a) * 280, vy: Math.sin(a) * 280 }); A.sfx('tick', { value: 75, minGap: 0.04 }); } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy; A.alpha(ctx, A.fade(e, 0.1, 0.3), () => { A.px(ctx, x - 6, y - 4, 12, 8, '#f4ecd8'); A.px(ctx, x - 1, y - 4, 2, 8, '#5a2a1a'); A.px(ctx, x - 6, y + 3, 12, 1, '#c8b8a0'); A.glow(ctx, x, y, 7, e.pal.c, 0.2); RUNE(ctx, A, x - 3, y, 1, e.pal.c); }); },
      },
      {
        name: 'Mana Overflow', dmg: 2, cd: 12, mp: 0, kind: 'custom', life: 0.8,
        desc: 'Dump ALL your mana in one huge arcane explosion. The more mana you have, the bigger the blast.',
        spawn(e, g, A) { const p = A.p; const mp = Math.max(6, p.mp); e.r = 24 + mp * 1.4; e.pow = mp; p.mp = 0; e.x = p.cx; e.y = p.y + 10; A.hitR(e, e.x, e.y, e.r * H.sc(e), { mult: 1 + mp * 0.5, kb: 1.6 }); A.sfx('shockwave'); A.shake(2 + mp * 0.08, 0.3); A.flash(0.15); },
        draw(e, ctx, ox, oy, A) { const k = e.t / e.life, R = e.r * H.sc(e) * Math.min(1, k * 3); A.alpha(ctx, 1 - k, () => { SEAL(ctx, A, e.x + ox, e.y + oy, R, e.t * 5, e.pal.c, 10); A.ring(ctx, e.x + ox, e.y + oy, R * 0.6, '#ffffff', R * 0.6, 2); }); },
      },
      {
        name: 'Owl Familiar', dmg: 12, cd: 11, mp: 7, kind: 'custom', life: 6,
        desc: 'Summon a spectral owl familiar that circles above you and dives at enemies.',
        spawn(e, g, A) { e.x = A.p.cx; e.y = A.p.y - 20; e.mode = 'circle'; e.ct = 0.8; A.sfx('star'); },
        update(e, dt, g, A) { const p = A.p; e.ct -= dt; if (e.mode === 'circle') { const a = e.t * 2.4; e.x = U.approach(e.x, p.cx + Math.cos(a) * 18, 6, dt); e.y = U.approach(e.y, p.y - 18 + Math.sin(a) * 5, 6, dt); if (e.ct <= 0) { const t = A.near(e.x, e.y, 170); if (t) { e.mode = 'dive'; e.tg = t; e.hit.clear(); } else e.ct = 0.3; } } else { const t = e.tg; if (!t || t.dead) { e.mode = 'circle'; e.ct = 0.5; return; } const c = A.center(t), a = Math.atan2(c.y - e.y, c.x - e.x); e.x += Math.cos(a) * 280 * dt; e.y += Math.sin(a) * 280 * dt; if (Math.hypot(c.x - e.x, c.y - e.y) < 8) { A.damage(e, t, 1, 0.4); A.sfx('swing', { minGap: 0.05 }); e.mode = 'circle'; e.ct = e.up ? 0.6 : 0.9; } } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, flap = Math.floor(e.t * 10) % 2; A.alpha(ctx, A.fade(e, 0.2, 0.4) * 0.9, () => { A.px(ctx, x - 2, y - 3, 5, 6, '#e0c8ff'); A.px(ctx, x - 1, y - 2, 1, 1, '#ffd34d'); A.px(ctx, x + 1, y - 2, 1, 1, '#ffd34d'); A.px(ctx, x - 5, y - 1 - flap * 2, 3, 2, '#c8a0ff'); A.px(ctx, x + 3, y - 1 - flap * 2, 3, 2, '#c8a0ff'); A.px(ctx, x - 2, y - 4, 1, 1, '#c8a0ff'); A.px(ctx, x + 2, y - 4, 1, 1, '#c8a0ff'); }); },
      },
    ],
    ult: {
      name: 'Forbidden Genesis', dmg: 8,
      desc: 'Open a colossal forbidden seal in the sky. Meteors, beams, explosions, portals and summoned weapons all rain down at once, then the seal itself detonates.',
      charge: {
        pose: (t, k) => J({ FA: [[11.2, 10.6], [12.6, 6.8]], BA: [[5.4, 10.6], [4, 6.8]], bob: 0 }),
        lift: 10,
        draw(ctx, x, y, k, t, A, P) { SEAL(ctx, A, x, y - 34, 8 + k * 36, t * 2, P.c, 12); SEAL(ctx, A, x, y - 34, 4 + k * 22, -t * 3, '#ffffff', 8); },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.8,
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 320).map((o) => o.t); const c = e.ts[0] ? A.center(e.ts[0]) : { x: p.cx + e.dir * 90, y: p.y }; e.cx = c.x; e.gy = A.ground(c.x, p.y + 2); e.sy = A.top() + 36; e.fx = []; e.st = 0; A.sfx('star'); },
          update(e, dt, g, A) {
            e.st -= dt; for (const f of e.fx) f.t += dt;
            if (e.t > 0.4 && e.t < 2.8 && e.st <= 0) {
              e.st = 0.1;
              const live = e.ts.filter((t) => !t.dead), t = live[Math.floor(Math.random() * live.length)];
              const tx = t ? A.center(t).x : e.cx + A.rnd(-120, 120), ty = t ? A.center(t).y : e.gy - 10, kind = Math.floor(Math.random() * 4);
              e.fx.push({ kind, sx: e.cx + A.rnd(-90, 90), tx, ty, t: 0, col: ['#ff6a3a', '#5affc8', '#ffd34d', '#ff4aff'][kind] });
              A.hitR(e, tx, ty, 16, { mult: 0.7, kb: 0.4, once: false, every: 0.1 });
              A.sfx(['boom', 'zap', 'crash', 'cast'][kind], { minGap: 0.05 });
            }
            if (e.t > 3 && !e.boom) { e.boom = true; A.blast(e, e.cx, e.gy - 40, 130 * H.sc(e), { dmg: e.dmg * 7 }); A.flash(0.5); A.shake(12, 0.6); A.sfx('boom'); }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.cx + ox, sy = e.sy + oy, open = Math.min(1, e.t / 0.4), f = e.boom ? Math.max(0, 1 - (e.t - 3) / 0.4) : 1;
            A.alpha(ctx, f, () => { SEAL(ctx, A, x, sy, 90 * open, e.t * 1.2, e.pal.c, 16); SEAL(ctx, A, x, sy, 60 * open, -e.t * 2, '#ffffff', 10); SEAL(ctx, A, x, sy, 30 * open, e.t * 3, '#5affc8', 6); });
            for (const fx of e.fx) {
              if (fx.t > 0.3) continue;
              const k = fx.t / 0.3, tx = fx.tx + ox, ty = fx.ty + oy, sx = fx.sx + ox;
              if (fx.kind === 0) { const mx = U.lerp(sx, tx, k), my = U.lerp(sy, ty, k); A.disc(ctx, mx, my, 4, fx.col, '#ffffff'); A.line(ctx, mx, my, U.lerp(sx, tx, k - 0.2), U.lerp(sy, ty, k - 0.2), fx.col, 2); }
              else if (fx.kind === 1) A.alpha(ctx, 1 - k, () => { A.line(ctx, sx, sy, tx, ty, fx.col, 3); A.line(ctx, sx, sy, tx, ty, '#ffffff', 1); });
              else if (fx.kind === 2) { const by = U.lerp(sy, ty - 10, Math.min(1, k * 1.5)); A.px(ctx, tx - 1, by - 14, 3, 14, '#e8ecf4'); A.px(ctx, tx - 4, by - 14, 9, 2, fx.col); }
              else A.alpha(ctx, 1 - k, () => { A.ring(ctx, tx, ty, 4 + k * 14, fx.col, 4 + k * 14); A.ring(ctx, tx, ty, 2 + k * 8, '#ffffff', 2 + k * 8); });
            }
            if (e.boom) { const k = (e.t - 3) / 0.8; A.alpha(ctx, 1 - k, () => A.ring(ctx, x, e.gy + oy - 40, 20 + k * 160, e.pal.c, (20 + k * 160) * 0.6, 2)); }
          },
        }, {});
      },
    },
  };

  // ================================================================ POISON (acid)
  const DRIP = { life: 0.6, update(e, dt) { e.vy += 300 * dt; e.y += e.vy * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.px(ctx, e.x + ox, e.y + oy, 1, 2, '#c8ff2a')); } };
  const SKULL = (ctx, A, x, y, col) => { A.px(ctx, x - 3, y - 3, 6, 5, col); A.px(ctx, x - 2, y + 2, 4, 2, col); A.px(ctx, x - 2, y - 1, 1, 2, '#05030a'); A.px(ctx, x + 1, y - 1, 1, 2, '#05030a'); };
  AW.poison = {
    color: '#c8ff2a', up: '#d84aff', status: 'toxin', fx: 'bubbles', block: ['Toxic Membrane', 'bubble'],
    icons: ['venomFang', 'flask', 'hydra', 'acidMelt', 'bubble'],
    look: { fx(ctx, F) { if (Math.sin(F.t * 3) > 0.9) { const h = F.at('handF'); F.A.px(ctx, h.x, h.y + 2 + ((F.t * 20) % 4), 1, 2, '#c8ff2a'); } } },
    idle: {
      pose: (t) => IDLE.sway(t),
      back(ctx, F) { const A = F.A; A.px(ctx, F.x - 9, F.ground - 1, 18, 1, '#6a8a1a'); for (let i = 0; i < 3; i++) { const r = (F.t * 1.2 + i / 3) % 1; A.ring(ctx, F.x - 6 + i * 6, F.ground - 2 - r * 3, 1 + r * 2, '#c8ff2a'); } },
      step(A, p, dt) { if (W.every(p, 'drip', 0.4, dt)) W.emit(A, DRIP, { x: p.cx + p.facing * 3, y: p.y + 16, vy: 0 }); },
    },
    run: {
      pose: (ph) => RUN.slither(ph),
      step(A, p) { if (W.footfall(p)) W.emit(A, { life: 1.6, draw(e, ctx, ox, oy, A) { A.alpha(ctx, A.fade(e, 0.05, 0.6), () => { A.px(ctx, e.x + ox - 3, e.y + oy - 1, 6, 1, '#8aaa1a'); A.px(ctx, e.x + ox - 1, e.y + oy - 2, 2, 1, '#c8ff2a'); }); } }, { x: p.cx, y: p.feet }); },
    },
    dash: {
      name: 'Venom Slide', dmg: 9, life: 2,
      spawn(e) { e.pts = []; },
      update(e, dt, g, A) { const p = A.p; if (p.dashT > 0) { e.pts.push({ x: p.cx, gy: p.feet, t: e.t }); A.hit(e, { x: p.x - 4, y: p.y + 8, w: p.w + 8, h: p.h - 8 }, { dir: p.facing, kb: 0.6, onHit(t) { if (t.applyStatus) t.applyStatus('toxin', 0); } }); } for (const s of e.pts) if (e.t - s.t < 1.6) A.tick(e, { x: s.x - 3, y: s.gy - 5, w: 6, h: 5 }, 0.5, { mult: 0.2, kb: 0 }); },
      draw(e, ctx, ox, oy, A) { for (const s of e.pts) { const a = 1 - (e.t - s.t) / 1.6; if (a > 0) A.alpha(ctx, a, () => { A.px(ctx, s.x + ox - 3, s.gy + oy - 1, 6, 1, '#8aaa1a'); if ((Math.floor(e.t * 8) + s.x) % 3 === 0) A.px(ctx, s.x + ox, s.gy + oy - 3, 1, 1, '#c8ff2a'); }); } },
    },
    guard: {
      name: 'Toxic Membrane', sound: 'squelch',
      draw(ctx, { A, x, bot, h, t }) { const cy = bot - h / 2; for (let yy = -h / 2; yy <= h / 2; yy++) { const w = Math.sqrt(Math.max(0, 1 - (yy * yy) / (h * h / 4))) * (6 + Math.sin(yy * 0.5 + t * 6)); A.alpha(ctx, 0.55, () => A.px(ctx, x - w, cy + yy, w * 2, 1, yy % 3 ? '#8aaa1a' : '#c8ff2a')); } SKULL(ctx, A, x, cy, '#e8ff9a'); for (let i = 0; i < 2; i++) { const r = (t * 1.5 + i / 2) % 1; A.ring(ctx, x - 2 + i * 4, cy + h / 2 - r * h, 1 + r, '#c8ff2a'); } },
      hit(g, x, y, d) { for (let i = 0; i < 14; i++) dot(g, x, y, d * U.lerp(10, 110, Math.random()), U.lerp(-120, 10, Math.random()), i % 2 ? '#c8ff2a' : '#8aaa1a', { ay: 380, size: 2 }); },
    },
    m1: {
      name: 'Toxic Fang', dmg: 9, cd: 0.36, kind: 'custom', life: 0.32,
      desc: 'A biting double-slash that leaves venom dripping from the wound.',
      spawn(e, g, A) { A.sfx('swing', { minGap: 0.04 }); },
      update(e, dt, g, A) { H.at(e, A, 0); H.melee(e, A, 28 * H.sc(e), 22, { onHit(t) { const c = A.center(t); for (let i = 0; i < 3; i++) A.spawn(e, DRIP, { x: c.x + A.rnd(-3, 3), y: c.y, vy: A.rnd(-40, 10) }); } }); },
      draw(e, ctx, ox, oy, A) { const k = Math.min(1, e.t / 0.1), x = e.x + ox + e.dir * 14, y = e.y + oy; A.alpha(ctx, 1 - Math.max(0, e.t - 0.1) / 0.22, () => { A.arc(ctx, x, y - 4, 10, e.dir, e.pal.c, 2, -1.5, U.lerp(-1.5, 0.3, k)); A.arc(ctx, x, y + 4, 10, e.dir, e.pal.c, 2, -0.3, U.lerp(-0.3, 1.5, k)); A.px(ctx, x + e.dir * 8, y - 5, 2, 3, '#ffffff'); A.px(ctx, x + e.dir * 8, y + 3, 2, 3, '#ffffff'); }); },
    },
    s: [
      {
        name: "Alchemist's Flask", dmg: 18, cd: 5, mp: 5, kind: 'custom', life: 0.01,
        desc: 'Lob a bubbling flask. It shatters in a splash of acid and leaves a lingering cloud of poison gas.',
        spawn(e, g, A) { H.at(e, A, 6, -6); A.sfx('swing'); A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const x = b.x + ox, y = b.y + oy; A.px(ctx, x - 2, y - 1, 4, 4, '#c8ff2a'); A.px(ctx, x - 1, y - 3, 2, 2, '#c8e8ff'); A.px(ctx, x - 1, y - 4, 2, 1, '#8a5a3a'); }, { life: 1.6, r: 3, gravity: 380, boom: 22, onHit(b, A) { const gy = A.ground(b.x, b.y - 8); A.spawn(b, { life: 3, update(s, dt, g, A) { A.tick(s, { x: s.x - 26, y: s.gy - 26, w: 52, h: 26 }, 0.45, { mult: 0.2, kb: 0 }); }, draw(s, ctx, ox, oy, A) { A.alpha(ctx, A.fade(s, 0.2, 0.6) * 0.45, () => { for (let i = 0; i < 7; i++) A.disc(ctx, s.x + ox + Math.sin(i * 2 + s.t) * 18, s.gy + oy - 8 - (i * 5) % 16, 7, i % 2 ? '#8aaa1a' : '#c8ff2a'); }); } }, { x: b.x, gy }); } }), { vx: e.dir * 170, vy: -170 }); },
      },
      {
        name: 'Hydra Heads', dmg: 14, cd: 8, mp: 7, kind: 'custom', life: 1.6,
        desc: 'Three serpent heads of venom rise from a puddle in front of you and strike one after another.',
        spawn(e, g, A) { H.at(e, A, 4); e.gy = H.floor(A, e.x); e.heads = [0, 1, 2].map((i) => ({ dx: (i - 1) * 7, d: 0.25 + i * 0.25 })); A.sfx('whoosh'); },
        update(e, dt, g, A) { for (const h of e.heads) { const lt = e.t - h.d; if (lt > 0.2 && !h.hit) { h.hit = true; const bx = e.x + h.dx + e.dir * 26; e.hit.clear(); A.hit(e, { x: bx - 10, y: e.gy - 26, w: 20, h: 22 }, { kb: 0.8 }); A.sfx('punchHit', { minGap: 0.04 }); } } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, gy = e.gy + oy; A.px(ctx, x - 12, gy - 1, 24, 2, '#6a8a1a'); for (const h of e.heads) { const lt = e.t - h.d; if (lt < -0.2) continue; const reach = lt < 0 ? 0 : lt < 0.2 ? lt / 0.2 : Math.max(0, 1 - (lt - 0.3) / 0.4), bx = x + h.dx, hx = bx + e.dir * 26 * reach, hy = gy - 16 - reach * 4; for (let i = 0; i <= 10; i++) { const q = i / 10; A.px(ctx, U.lerp(bx, hx, q) - 1, U.lerp(gy, hy, q) - Math.sin(q * Math.PI) * 6, 3, 3, i % 3 ? e.pal.c : '#6a8a1a'); } A.px(ctx, hx - 2, hy - 2, 5, 4, e.pal.c); A.px(ctx, hx + e.dir * 2, hy - 2, 1, 1, '#ff3a3a'); A.px(ctx, hx + e.dir * 3, hy + 1, 2, 1, '#ffffff'); } },
      },
      {
        name: 'Acid Melt', dmg: 16, cd: 9, mp: 6, kind: 'custom', life: 3,
        desc: 'Douse the nearest enemy in acid. It melts its defences: everything hits it harder for a while.',
        spawn(e, g, A) { const t = A.near(A.p.cx, A.p.y, 160); e.tg = t; if (!t) { e.dead = true; return; } A.damage(e, t, 1, 0); if (t.applyStatus) { t.applyStatus('shatter', e.potency); t.applyStatus('toxin', e.potency); t.applyStatus('toxin', e.potency); } A.sfx('pop'); },
        update(e, dt, g, A) { if (!e.tg || e.tg.dead) { e.dead = true; return; } if (Math.random() < dt * 14) { const b = e.tg.box; A.spawn(e, DRIP, { x: b.x + Math.random() * b.w, y: b.y + Math.random() * b.h * 0.5, vy: 0 }); } },
        draw(e, ctx, ox, oy, A) { if (!e.tg || e.tg.dead) return; const b = e.tg.box; A.alpha(ctx, A.fade(e, 0.1, 0.5) * 0.4, () => A.px(ctx, b.x + ox, b.y + oy, b.w, Math.min(b.h, e.t * 12), '#c8ff2a')); for (let i = 0; i < 3; i++) { const r = (e.t * 2 + i / 3) % 1; A.ring(ctx, b.x + ox + (i + 1) * b.w / 4, b.y + oy - r * 6, 1 + r * 1.5, '#e8ff9a'); } },
      },
      {
        name: 'Noxious Breath', dmg: 4, cd: 7, mp: 6, kind: 'custom', life: 1.4,
        desc: 'Breathe out a thick cone of choking green gas that lingers in the air.',
        spawn(e, g, A) { A.sfx('whoosh'); e.puffs = []; },
        update(e, dt, g, A) { H.at(e, A, 6, -8); if (e.t < 0.7 && Math.random() < dt * 40) e.puffs.push({ x: e.x, y: e.y, vx: e.dir * A.rnd(70, 130), vy: A.rnd(-20, 30), t: 0 }); for (const pf of e.puffs) { pf.t += dt; pf.x += pf.vx * dt; pf.y += pf.vy * dt; pf.vx *= 1 - dt * 1.4; } const L = 70 * H.sc(e); A.tick(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 14, w: L, h: 30 }, 0.25, { kb: 0 }); },
        draw(e, ctx, ox, oy, A) { for (const pf of e.puffs) A.alpha(ctx, Math.max(0, 0.5 - pf.t * 0.35), () => A.disc(ctx, pf.x + ox, pf.y + oy, Math.round(2 + pf.t * 7), pf.t < 0.3 ? '#e8ff9a' : '#8aaa1a')); },
      },
      {
        name: 'Plague Bubble', dmg: 20, cd: 7, mp: 6, kind: 'custom', life: 3,
        desc: 'Blow a huge bubble of plague that drifts forward. The first thing it touches gets the full splash.',
        spawn(e, g, A) { H.at(e, A, 10, -6); A.sfx('pop'); },
        update(e, dt, g, A) { if (e.pop) return; e.x += e.dir * 45 * dt; e.y += Math.sin(e.t * 2) * 8 * dt; const r = 8 * H.sc(e); const t = A.targets().find((t) => Phys().rectsOverlap(t.box, { x: e.x - r, y: e.y - r, w: r * 2, h: r * 2 })); if (t || A.solid(e.x, e.y) || e.t > 2.8) { e.pop = true; A.blast(e, e.x, e.y, 30 * H.sc(e)); for (let i = 0; i < 14; i++) A.spawn(e, DRIP, { x: e.x + A.rnd(-8, 8), y: e.y, vy: A.rnd(-160, -20) }); A.sfx('pop'); e.dead = true; } },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, r = Math.round(8 * H.sc(e) + Math.sin(e.t * 6)); A.alpha(ctx, 0.35, () => A.disc(ctx, x, y, r, '#8aaa1a')); A.ring(ctx, x, y, r, '#c8ff2a'); A.px(ctx, x - r / 2, y - r / 2, 2, 2, '#ffffff'); SKULL(ctx, A, x, y + 1, '#e8ff9a'); },
      },
    ],
    ult: {
      name: 'Plague of Eternity', dmg: 8,
      desc: 'A gigantic sphere of concentrated poison forms above the battlefield and bursts, drowning everything in toxin while poison explosions keep erupting.',
      charge: {
        pose: (t, k) => J({ FA: [[11, 10.8], [12.4, 7]], BA: [[5.4, 10.8], [4, 7]], bob: 1 }),
        lift: 6,
        draw(ctx, x, y, k, t, A, P) { const sy = y - 42, r = Math.round(4 + k * 20); A.alpha(ctx, 0.6, () => A.disc(ctx, x, sy, r, '#4a6a1a')); A.ring(ctx, x, sy, r, P.c); SKULL(ctx, A, x, sy, '#e8ff9a'); for (let i = 0; i < 10; i++) { const rr = (t * 1.5 + i / 10) % 1; A.ring(ctx, x - r + ((i * 9) % (r * 2)), sy + r - rr * r * 2, 1 + rr * 2, P.c); } },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 3.8,
          spawn(e) { e.ts = H.nearby(A, p.cx, p.y, 320).map((o) => o.t); const c = e.ts[0] ? A.center(e.ts[0]) : { x: p.cx + e.dir * 90, y: p.y }; e.cx = c.x; e.gy = A.ground(c.x, p.y + 2); e.sy = A.top() + 40; e.booms = []; e.bt = 0; A.sfx('surge'); },
          update(e, dt, g, A) {
            e.bt -= dt; for (const b of e.booms) b.t += dt;
            if (e.t > 0.6 && !e.burst) { e.burst = true; A.sfx('crash'); A.shake(6, 0.4); for (const t of e.ts) if (!t.dead && t.applyStatus) for (let i = 0; i < 4; i++) t.applyStatus('toxin', e.potency); }
            if (e.burst && e.t < 3.2) { A.tick(e, { x: p.cx - 320, y: e.gy - 140, w: 640, h: 140 }, 0.3, { mult: 0.3, kb: 0 }); if (e.bt <= 0) { e.bt = 0.14; const live = e.ts.filter((t) => !t.dead), t = live[Math.floor(Math.random() * live.length)]; const x = t ? A.center(t).x + A.rnd(-10, 10) : e.cx + A.rnd(-160, 160), y = t ? A.center(t).y : e.gy - 10; e.booms.push({ x, y, t: 0 }); A.hitR(e, x, y, 20, { mult: 0.9, kb: 0.5, once: false, every: 0.1 }); A.sfx('boom', { minGap: 0.06 }); } }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.cx + ox, sy = e.sy + oy, gy = e.gy + oy;
            if (!e.burst) { const r = Math.round(26 + e.t * 10); A.alpha(ctx, 0.6, () => A.disc(ctx, x, sy, r, '#4a6a1a')); A.ring(ctx, x, sy, r, e.pal.c); SKULL(ctx, A, x, sy, '#e8ff9a'); return; }
            const k = Math.min(1, (e.t - 0.6) / 0.5), f = e.t > 3.3 ? (3.8 - e.t) / 0.5 : 1;
            A.alpha(ctx, 0.35 * k * f, () => A.px(ctx, -10, -10, 2000, 2000, '#6a8a1a'));
            A.alpha(ctx, f, () => { for (let i = -320; i < 320; i += 3) A.px(ctx, p.cx + ox + i, gy - 3 - Math.abs(Math.sin(i * 0.1 + e.t * 6)) * 4, 3, 5, (i / 3) % 4 ? '#8aaa1a' : e.pal.c); });
            for (const b of e.booms) if (b.t < 0.35) A.alpha(ctx, 1 - b.t / 0.35, () => { A.disc(ctx, b.x + ox, b.y + oy, Math.round(4 + b.t * 30), '#8aaa1a'); A.ring(ctx, b.x + ox, b.y + oy, 4 + b.t * 34, e.pal.c, 4 + b.t * 34); SKULL(ctx, A, b.x + ox, b.y + oy - b.t * 20, '#e8ff9a'); });
          },
        }, {});
      },
    },
  };
})(window.ERX = window.ERX || {});
