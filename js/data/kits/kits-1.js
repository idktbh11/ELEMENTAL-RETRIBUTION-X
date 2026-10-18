/*
 * KITS: FIRE, WATER, WIND, EARTH, LIGHTNING, ICE
 * (format: js/data/kits/_kit.js)
 */
(function (ERX) {
  'use strict';

  const K = ERX.Kits, H = ERX.KitHelp, U = ERX.U;
  const Phys = () => ERX.GameEngine.Physics;

  // ===================================================================== FIRE
  const FIRE_LICK = { // cosmetic: a flame that rises and fades
    life: 0.4,
    update(e, dt) { e.y -= 24 * dt; },
    draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => { A.px(ctx, e.x + ox - 1, e.y + oy - 2, 2, 3, e.pal.c); A.px(ctx, e.x + ox, e.y + oy - 4, 1, 2, e.pal.l); }); },
  };
  const FIRE_FIELD = { // burning ground
    life: 3,
    update(e, dt, g, A) {
      A.tick(e, { x: e.x - e.r, y: e.gy - 14, w: e.r * 2, h: 14 }, 0.4, { mult: 0.25, kb: 0 });
      if (Math.random() < dt * e.r * 0.4) A.spawn(e, FIRE_LICK, { x: e.x + A.rnd(-e.r, e.r), y: e.gy - 2, life: 0.5 });
    },
    draw(e, ctx, ox, oy, A) {
      const f = A.fade(e, 0.2, 0.6);
      A.alpha(ctx, f, () => { for (let x = -e.r; x < e.r; x += 2) { const h = 2 + Math.abs(Math.sin(x * 0.7 + e.t * 9)) * 4; A.px(ctx, e.x + x + ox, e.gy + oy - h, 2, h, (x / 2) % 3 ? e.pal.c : e.pal.l); } });
    },
  };
  K.fire = {
    status: 'burn', up: '#5ab0ff', fx: 'embers', block: ['Flame Ward', 'shield'], dash: ['Flame Dash', 'trail'],
    m1: {
      name: 'Flame Slash', dmg: 8, cd: 0.36, kind: 'custom', life: 0.32,
      desc: 'A crescent of fire that flies forward, flames licking off its edge.',
      spawn(e, g, A) { H.at(e, A, 12); e.vx = e.dir * 210; A.sfx('swing'); },
      update(e, dt, g, A) { e.x += e.vx * dt; const s = 13 * H.sc(e); A.hit(e, { x: e.x - s * 0.7, y: e.y - s, w: s * 1.4, h: s * 2 }, { dir: e.dir }); },
      draw(e, ctx, ox, oy, A) {
        const x = e.x + ox, y = e.y + oy, s = 13 * H.sc(e), d = e.dir, P = e.pal;
        A.alpha(ctx, A.fade(e, 0.04, 0.12), () => {
          A.arc(ctx, x, y, s, d, P.d, 5); A.arc(ctx, x, y, s - 1, d, P.c, 4); A.arc(ctx, x, y, s - 3, d, P.l, 2);
          for (let i = 0; i < 9; i++) { const a = -1.1 + i * 0.27, fx = x + Math.cos(a) * s * d, fy = y + Math.sin(a) * s, h = 2 + ((i * 7 + Math.floor(e.t * 30)) % 4); A.px(ctx, fx - d, fy - h, 1, h, i % 2 ? P.c : P.l); }
          if (e.up) A.arc(ctx, x - d * 6, y, s * 0.6, d, P.core, 2);
        });
      },
    },
    s: [
      {
        name: 'Fireball', dmg: 18, cd: 4, mp: 5, kind: 'custom', life: 1.6,
        desc: 'Hurl a blazing fireball. It leaves flames in its wake and explodes on impact.',
        spawn(e, g, A) { H.at(e, A, 10, -2); e.vx = e.dir * 200; e.vy = 0; A.sfx('cast'); },
        update(e, dt, g, A) {
          e.tr = (e.tr || 0) - dt;
          if (e.tr <= 0) { e.tr = 0.04; A.spawn(e, FIRE_LICK, { x: e.x - e.dir * 4, y: e.y + A.rnd(-2, 2) }); }
          const r = H.fly(e, dt, A, { r: 6 });
          if (r === 'hit' || r === 'wall' || e.t > 1.5) { A.blast(e, e.x, e.y, 30 * H.sc(e)); e.dead = true; }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, s = H.sc(e), P = e.pal;
          for (let i = 0; i < 6; i++) A.px(ctx, x - e.dir * (5 + i * 3) * s, y + Math.sin(e.t * 40 + i) * 2 - 1, 3 - i * 0.4, 3 - i * 0.4, i % 2 ? P.c : P.l);
          A.glow(ctx, x, y, 7 * s, P.c, 0.25); A.disc(ctx, x, y, Math.round(5 * s), P.c, P.l); A.disc(ctx, x, y, Math.round(2 * s), P.core);
        },
      },
      {
        name: 'Flame Pillars', dmg: 14, cd: 5, mp: 6, kind: 'custom', life: 1.4,
        desc: 'Twisting columns of fire burst up from the ground, one after another.',
        spawn(e, g, A) {
          H.at(e, A, 0);
          const ax = A.aim(e, 120), start = ax !== null ? Math.abs(ax - e.x) : 30;
          const n = e.up ? 5 : 3;
          e.cols = [];
          for (let i = 0; i < n; i++) { const x = e.x + e.dir * (start + i * 30); e.cols.push({ x, gy: H.floor(A, x), d: i * 0.12 }); }
          e.life = n * 0.12 + 0.8;
        },
        update(e, dt, g, A) {
          const h = 70 * H.sc(e);
          for (const c of e.cols) {
            c.lt = e.t - c.d;
            if (c.lt > 0.2 && !c.boom) { c.boom = true; A.sfx('ignite'); A.shake(1.5, 0.12); }
            if (c.lt > 0.2 && c.lt < 0.6) A.hit(e, { x: c.x - 8, y: c.gy - h, w: 16, h }, { kb: 0.8 });
          }
        },
        draw(e, ctx, ox, oy, A) {
          const P = e.pal, h = 70 * H.sc(e);
          for (const c of e.cols) {
            if (!(c.lt > 0) || c.lt > 0.8) continue;
            const x = c.x + ox, gy = c.gy + oy;
            if (c.lt < 0.2) { for (let i = 0; i < 3; i++) A.px(ctx, x - 4 + i * 3, gy - 2 - ((i + Math.floor(c.lt * 40)) % 3), 2, 2, P.c); continue; }
            const k = Math.min(1, (c.lt - 0.2) / 0.08), fade = c.lt > 0.6 ? 1 - (c.lt - 0.6) / 0.2 : 1;
            A.alpha(ctx, fade, () => {
              for (let yy = 0; yy < h * k; yy += 2) {
                const q = yy / h, tw = Math.sin(yy * 0.25 - c.lt * 30) * 3 * q, hw = 7 * (q > 0.75 ? (1 - q) * 4 : 1);
                A.px(ctx, x - hw + tw, gy - yy, hw * 2, 2, P.c); A.px(ctx, x - hw * 0.45 + tw, gy - yy, hw * 0.9, 2, P.l);
              }
              A.px(ctx, x - 1, gy - h * k, 2, h * k * 0.8, P.core);
            });
          }
        },
      },
      {
        name: 'Fire Spin', dmg: 6, cd: 7, mp: 6, kind: 'custom', life: 1.4,
        desc: 'A wheel of fireballs whirls around you and spins outward.',
        spawn(e, g, A) { A.sfx('ignite'); e.n = e.up ? 10 : 7; },
        update(e, dt, g, A) {
          const p = A.p, R = (10 + 34 * H.k(e)) * H.sc(e);
          e.balls = [];
          for (let i = 0; i < e.n; i++) { const a = e.t * 9 + (i / e.n) * Math.PI * 2; e.balls.push([p.cx + Math.cos(a) * R, p.y + 10 + Math.sin(a) * R * 0.75, a]); }
          for (const [bx, by] of e.balls) A.tickR(e, bx, by, 6, 0.3, { kb: 0.4 });
        },
        draw(e, ctx, ox, oy, A) {
          for (const [bx, by, a] of e.balls || []) {
            for (let j = 1; j < 4; j++) A.px(ctx, bx + ox - Math.cos(a + Math.PI / 2) * j * 2, by + oy - Math.sin(a + Math.PI / 2) * j * 2, 2, 2, j % 2 ? e.pal.c : e.pal.d);
            A.disc(ctx, bx + ox, by + oy, 3, e.pal.c, e.pal.l);
          }
        },
      },
      {
        name: 'Flamethrower', dmg: 3, cd: 8, mp: 7, kind: 'custom', life: 1.2,
        desc: 'Breathe a roaring cone of fire in front of you.',
        spawn(e, g, A) { A.sfx('surge'); },
        update(e, dt, g, A) {
          H.at(e, A, 8, -1);
          const L = 70 * H.sc(e);
          A.tick(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 14, w: L, h: 28 }, 0.15, { kb: 0.25 });
          if (Math.random() < dt * 20) A.spawn(e, FIRE_LICK, { x: e.x + e.dir * A.rnd(20, L), y: e.y + A.rnd(-10, 10) });
        },
        draw(e, ctx, ox, oy, A) {
          const L = 70 * H.sc(e), P = e.pal;
          for (let i = 0; i < 40; i++) {
            const d = ((i * 17 + e.t * 160) % L), spread = d * 0.22, w = 2 + d / L * 4;
            const yy = e.y + oy + Math.sin(i * 2.3 + e.t * 12) * spread;
            A.px(ctx, e.x + ox + e.dir * d - w / 2, yy - w / 2, w, w, d < L * 0.25 ? P.core : d < L * 0.6 ? P.l : d < L * 0.85 ? P.c : P.d);
          }
        },
      },
      {
        name: 'Phoenix Dive', dmg: 22, cd: 9, mp: 8, kind: 'custom', life: 1,
        desc: 'Leap into the air as a burning phoenix and crash down in an explosion.',
        spawn(e, g, A) { const p = A.p; e.dir = p.facing; e.vy = -230; p.vx = e.dir * 160; p.lungeT = 1; A.sfx('ignite'); },
        update(e, dt, g, A) {
          const p = A.p;
          e.vy += 700 * dt;
          const ny = p.y + e.vy * dt;
          if (!Phys().overlapsSolid(g.level, p.x, ny, p.w, p.h)) p.y = ny;
          else if (e.vy > 0 || e.t > 0.9) { p.lungeT = 0; p.vx *= 0.3; A.blast(e, p.cx, p.feet - 6, 44 * H.sc(e), { dmg: e.dmg * 1.3 }); A.spawn(e, FIRE_FIELD, { x: p.cx, gy: p.feet, r: 26, life: 2, dmg: e.dmg }); e.dead = true; return; }
          e.x = p.cx; e.y = p.y + 10;
          A.hit(e, { x: p.x - 4, y: p.y, w: p.w + 8, h: p.h }, { dir: e.dir, mult: 0.5 });
          if (Math.random() < dt * 40) A.spawn(e, FIRE_LICK, { x: p.cx - e.dir * 6, y: p.y + 10 });
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, P = e.pal, flap = Math.sin(e.t * 30) * 4, s = H.sc(e);
          for (const side of [-1, 1]) for (let i = 0; i < 9; i++) { const k = i / 8; A.px(ctx, x - e.dir * 3 + side * 0 - e.dir * k * 10 * s, y - 4 - k * (8 + flap) * s * (side > 0 ? 1 : 0.6), 2, 2, i % 3 ? P.c : P.l); }
          for (let i = 0; i < 5; i++) A.px(ctx, x - e.dir * (6 + i * 2), y + 6 + i, 2, 1, i % 2 ? P.d : P.c);
          A.glow(ctx, x, y, 10 * s, P.c, 0.2);
        },
      },
    ],
    ult: {
      name: 'Inferno Supernova', dmg: 34,
      desc: 'Leap up, form a gigantic ball of fire and hurl it. It leaves a trail of flames and detonates in a massive explosion.',
      charge: {
        pose: 'raise', lift: 28,
        draw(ctx, x, y, k, t, A, P) {
          const f = A.p.facing, bx = x + f * 2, by = y - 24 - k * 8, r = Math.round(2 + k * 14);
          A.glow(ctx, bx, by, r + 4, P.c, 0.3);
          A.disc(ctx, bx, by, r, P.c, P.l); A.disc(ctx, bx, by, Math.max(1, Math.round(r * 0.45)), P.core);
          for (let i = 0; i < 12; i++) { const a = t * 5 + i * 0.52, rr = r + 2 + ((i * 3 + Math.floor(t * 20)) % 4); A.px(ctx, bx + Math.cos(a) * rr, by + Math.sin(a) * rr, 2, 2, i % 2 ? P.c : P.l); }
          for (let i = 0; i < 8; i++) { const a = i * 0.8 - t * 6, d = 30 * (1 - ((t * 1.8 + i * 0.13) % 1)); A.px(ctx, bx + Math.cos(a) * d, by + Math.sin(a) * d, 1, 1, '#ffd34d'); }
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.4,
          spawn(e) { e.x = p.cx + e.dir * 6; e.y = p.y - 6; e.vx = e.dir * 130; A.sfx('surge'); },
          update(e, dt, g, A) {
            e.x += e.vx * dt;
            e.tr = (e.tr || 0) - dt;
            if (e.tr <= 0) { e.tr = 0.1; A.spawn(e, FIRE_FIELD, { x: e.x, gy: A.ground(e.x, e.y), r: 12, life: 2.5, dmg: e.dmg }); }
            const R = 16 * H.sc(e);
            const touch = A.targets().some((t) => A.center(t) && Math.hypot(A.center(t).x - e.x, A.center(t).y - e.y) < R + 6);
            if (touch || A.solid(e.x + e.dir * R, e.y) || e.t > 2) {
              A.blast(e, e.x, e.y, 150 * H.sc(e), { dmg: e.dmg * 1.6 });
              A.spawn(e, FIRE_FIELD, { x: e.x, gy: A.ground(e.x, e.y), r: 100, life: 3, dmg: e.dmg });
              A.flash(0.6); A.shake(6, 0.6); e.dead = true;
            }
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.x + ox, y = e.y + oy, R = Math.round(16 * H.sc(e)), P = e.pal;
            for (let i = 0; i < 14; i++) A.px(ctx, x - e.dir * (R + i * 3), y + Math.sin(e.t * 20 + i) * (R * 0.5) * (1 - i / 14), 4 - i * 0.2, 4 - i * 0.2, i % 2 ? P.c : P.d);
            A.glow(ctx, x, y, R + 8, P.c, 0.3);
            A.disc(ctx, x, y, R, P.c, P.l); A.disc(ctx, x, y, Math.round(R * 0.5), P.core);
            for (let i = 0; i < 16; i++) { const a = e.t * 4 + i * 0.39, rr = R + 2 + ((i * 5 + Math.floor(e.t * 25)) % 5); A.px(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr, 2, 2, P.l); }
          },
        }, {});
      },
    },
  };

  // ==================================================================== WATER
  const DROP = { life: 0.5, update(e, dt) { e.vy += 400 * dt; e.x += e.vx * dt; e.y += e.vy * dt; }, draw(e, ctx, ox, oy, A) { A.px(ctx, e.x + ox, e.y + oy, 1, 2, e.pal.l); } };
  const BUBBLE_JAIL = {
    life: 1.1,
    update(e, dt, g, A) { if (e.target && !e.target.dead) { const c = A.center(e.target); e.x = c.x; e.y = c.y; e.target.vx = 0; e.target.vy = Math.min(e.target.vy, 0) - 20 * dt; } },
    onEnd(e, A) { A.sfx('pop'); A.puff(e, e.x, e.y, 6); },
    draw(e, ctx, ox, oy, A) { const r = 9 + Math.sin(e.t * 10); A.ring(ctx, e.x + ox, e.y + oy, r, e.pal.l); A.ring(ctx, e.x + ox, e.y + oy, r - 1, e.pal.c); A.px(ctx, e.x + ox - 4, e.y + oy - 5, 2, 1, '#ffffff'); },
  };
  K.water = {
    status: 'wet', up: '#3affd8', fx: 'droplets', block: ['Water Bubble', 'bubble'], dash: ['Riptide', 'ghost'],
    m1: {
      name: 'Aqua Whip', dmg: 8, cd: 0.4, kind: 'custom', life: 0.32,
      desc: 'Lash out with a whip of water that sprays as it cracks.',
      spawn(e, g, A) { A.sfx('swing'); },
      update(e, dt, g, A) {
        H.at(e, A, 6, -1);
        e.ext = Math.min(1, e.t / 0.12) * (1 - Math.max(0, (e.t - 0.2) / 0.12));
        const L = 48 * H.sc(e) * e.ext;
        A.hit(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 6, w: L, h: 12 }, { dir: e.dir });
        if (e.ext > 0.9 && !e.sprayed) { e.sprayed = true; for (let i = 0; i < 6; i++) A.spawn(e, DROP, { x: e.x + e.dir * L, y: e.y, vx: e.dir * A.rnd(20, 80), vy: A.rnd(-120, -40) }); }
      },
      draw(e, ctx, ox, oy, A) {
        const L = 48 * H.sc(e) * (e.ext || 0), n = Math.max(2, Math.round(L / 2));
        for (let i = 0; i <= n; i++) {
          const k = i / n, x = e.x + ox + e.dir * L * k, y = e.y + oy + Math.sin(k * 8 - e.t * 34) * 3 * k;
          A.px(ctx, x, y - 1, 2, 3, i % 3 ? e.pal.c : e.pal.l);
          if (i % 4 === 0) A.px(ctx, x, y - 2, 1, 1, '#ffffff');
        }
      },
    },
    s: [
      {
        name: 'Bubble Barrage', dmg: 6, cd: 4, mp: 5, kind: 'custom', life: 0.01,
        desc: 'Blow wobbly bubbles that trap whatever they touch.',
        spawn(e, g, A) {
          H.at(e, A, 8, -2); A.sfx('pop');
          const n = e.up ? 7 : 5;
          for (let i = 0; i < n; i++) A.spawn(e, H.proj((b, ctx, ox, oy, A) => { const r = 3 + (b.up ? 1 : 0); A.ring(ctx, b.x + ox, b.y + oy + Math.sin(b.t * 8 + b.ph) * 2, r, b.pal.l); A.px(ctx, b.x + ox - 1, b.y + oy - 2, 1, 1, '#ffffff'); },
            { life: 2.2, r: 4, tick(b, dt) { b.vy -= 10 * dt; b.vx *= 1 - dt * 0.4; }, onHit(b, A) { const t = A.near(b.x, b.y, 14); if (t && t.applyStatus) { t.applyStatus('stagger', 0); if (t.status.stagger) t.status.stagger.t = 1; A.spawn(b, BUBBLE_JAIL, { target: t }); } } }),
          { x: e.x, y: e.y + A.rnd(-4, 4), vx: e.dir * A.rnd(60, 110), vy: A.rnd(-25, 10), ph: i });
        },
      },
      {
        name: 'Tidal Wave', dmg: 14, cd: 5, mp: 6, kind: 'custom', life: 1.1,
        desc: 'A curling, foaming wave rolls forward and knocks enemies back.',
        spawn(e, g, A) { H.at(e, A, 8); e.gy = H.floor(A, e.x); e.vx = e.dir * 170; A.sfx('whoosh'); },
        update(e, dt, g, A) {
          e.x += e.vx * dt; e.gy = A.ground(e.x, e.gy - 20);
          const h = 40 * H.sc(e);
          if (A.solid(e.x + e.dir * 8, e.gy - 6)) { e.dead = true; return; }
          A.hit(e, { x: e.x - 14, y: e.gy - h, w: 28, h }, { dir: e.dir, kb: 1.5 });
          if (Math.random() < dt * 25) A.spawn(e, DROP, { x: e.x, y: e.gy - h, vx: e.dir * A.rnd(20, 60), vy: A.rnd(-90, -30) });
        },
        draw(e, ctx, ox, oy, A) {
          const h = 40 * H.sc(e), x = e.x + ox, gy = e.gy + oy, d = e.dir, P = e.pal;
          for (let i = 0; i < 28; i++) {
            const k = i / 28, col = x - d * (28 - i), hh = h * Math.pow(k, 1.4);
            A.px(ctx, col, gy - hh, 2, hh, i % 4 ? P.c : P.d);
          }
          for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * 0.3; A.px(ctx, x + Math.cos(a) * 7 * d, gy - h + 7 + Math.sin(a) * 7, 2, 2, i % 2 ? '#ffffff' : P.l); }   // the curl + foam
        },
      },
      {
        name: 'Whirlpool', dmg: 3, cd: 8, mp: 8, kind: 'custom', life: 3,
        desc: 'A spinning whirlpool opens on the ground and drags enemies into it.',
        spawn(e, g, A) { H.at(e, A, 50); e.gy = H.floor(A, e.x); e.life *= e.up ? 1.3 : 1; A.sfx('whoosh'); },
        update(e, dt, g, A) {
          const R = 46 * H.sc(e);
          for (const t of A.targets()) { if (t.tutorial) continue; const c = A.center(t), dx = e.x - c.x; if (Math.abs(dx) < R * 1.6 && Math.abs(c.y - e.gy) < 40) t.vx = U.approach(t.vx, Math.sign(dx) * 110, 6, dt); }
          A.tick(e, { x: e.x - R, y: e.gy - 16, w: R * 2, h: 16 }, 0.4, { kb: 0 });
        },
        draw(e, ctx, ox, oy, A) {
          const R = 46 * H.sc(e), x = e.x + ox, gy = e.gy + oy - 3;
          A.alpha(ctx, A.fade(e, 0.3, 0.4), () => {
            for (let i = 0; i < 60; i++) { const k = i / 60, a = k * 14 - e.t * 8, r = R * (1 - k); A.px(ctx, x + Math.cos(a) * r, gy + Math.sin(a) * r * 0.22, 2, 1, i % 5 === 0 ? '#ffffff' : i % 2 ? e.pal.c : e.pal.l); }
            A.disc(ctx, x, gy, 2, e.pal.d);
          });
        },
      },
      {
        name: 'Water Jet', dmg: 3, cd: 6, mp: 6, kind: 'custom', life: 0.8,
        desc: 'A high-pressure jet that blasts enemies backwards.',
        spawn(e, g, A) { A.sfx('surge'); },
        update(e, dt, g, A) {
          H.at(e, A, 8, -1);
          let L = 110 * H.sc(e);
          for (let d = 4; d < L; d += 4) if (A.solid(e.x + e.dir * d, e.y)) { L = d; break; }
          e.L = L;
          A.tick(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 3, w: L, h: 6 }, 0.12, { kb: 1.4 });
          if (Math.random() < dt * 30) A.spawn(e, DROP, { x: e.x + e.dir * L, y: e.y, vx: -e.dir * A.rnd(20, 70), vy: A.rnd(-100, -40) });
        },
        draw(e, ctx, ox, oy, A) {
          const L = e.L || 0, x = e.x + ox, y = e.y + oy;
          A.px(ctx, e.dir > 0 ? x : x - L, y - 2, L, 4, e.pal.c);
          for (let d = 0; d < L; d += 3) A.px(ctx, x + e.dir * d, y - 1 + ((d + Math.floor(e.t * 60)) % 3 === 0 ? -1 : 0), 2, 1, '#ffffff');
          A.ring(ctx, x + e.dir * L, y, 3 + Math.sin(e.t * 30), e.pal.l);
        },
      },
      {
        name: 'Rain Dance', dmg: 4, cd: 12, mp: 8, kind: 'custom', life: 4,
        desc: 'Summon a rain cloud. The rain hurts enemies and slowly heals you.',
        spawn(e, g, A) { H.at(e, A, 30); e.cy = A.p.y - 50; A.sfx('whoosh'); },
        update(e, dt, g, A) {
          const p = A.p;
          e.x = U.approach(e.x, p.cx + p.facing * 30, 3, dt);
          e.dropT = (e.dropT || 0) - dt;
          if (e.dropT <= 0) {
            e.dropT = 0.05;
            A.spawn(e, H.proj((d, ctx, ox, oy, A) => A.px(ctx, d.x + ox, d.y + oy, 1, 3, d.pal.l), { life: 0.9, r: 2 }), { x: e.x + A.rnd(-30, 30), y: e.cy + 6, vx: 0, vy: 260, dmg: e.dmg * 0.5 });
          }
          if (Math.abs(p.cx - e.x) < 34) { e.heal = (e.heal || 0) + dt; if (e.heal > 0.5) { e.heal = 0; p.hp = Math.min(p.maxHp, p.hp + (e.up ? 3 : 2)); } }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.cy + oy;
          A.alpha(ctx, A.fade(e, 0.3, 0.4), () => { for (const [dx, r] of [[-20, 9], [-6, 12], [9, 11], [22, 8]]) A.disc(ctx, x + dx, y, r, '#8a9ab8', '#c8d4e8'); A.px(ctx, x - 28, y + 4, 56, 4, '#6a7a98'); });
        },
      },
    ],
    ult: {
      name: 'Leviathan Tsunami', dmg: 30,
      desc: 'Summon an enormous wall of water, sweep enemies away with it, then crash it down with overwhelming force.',
      charge: {
        pose: 'raiseBoth', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          const f = A.p.facing;
          for (let s = 0; s < 3; s++) for (let i = 0; i < 18; i++) { const q = i / 18, a = q * 10 + t * 8 + s * 2.1, r = 10 + s * 5; A.px(ctx, x + Math.cos(a) * r, y + 14 - q * 40 * k, 2, 2, s === 1 ? P.l : P.c); }
          const wh = 50 * k;
          for (let i = 0; i < 18; i++) A.px(ctx, x - f * (20 + i), y + 14 - wh * Math.sin((i / 18) * Math.PI * 0.9), 1, wh * Math.sin((i / 18) * Math.PI * 0.9), i % 3 ? P.c : P.d);
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.2,
          spawn(e) { e.x = p.cx - e.dir * 30; e.gy = H.floor(A, p.cx); e.vx = e.dir * 150; e.h = 120 * H.sc(e); A.sfx('rumble', { dur: 1.5 }); A.shake(3, 1.5); },
          update(e, dt, g, A) {
            if (!e.crashed) {
              e.x += e.vx * dt;
              for (const t of A.targets()) { if (t.tutorial) continue; const c = A.center(t); if ((c.x - e.x) * e.dir < 6 && (c.x - e.x) * e.dir > -50) { t.vx = e.vx; t.vy = Math.min(t.vy, -40); } }
              A.tick(e, { x: e.x - 50, y: e.gy - e.h, w: 56, h: e.h }, 0.25, { kb: 0.4, mult: 0.35 });
              if (e.t > 1.6 || A.solid(e.x + e.dir * 10, e.gy - 10)) {
                e.crashed = e.t; A.blast(e, e.x + e.dir * 10, e.gy - 20, 90 * H.sc(e), { dmg: e.dmg * 1.5 }); A.shake(6, 0.5); A.flash(0.3);
                for (let i = 0; i < 30; i++) A.spawn(e, DROP, { x: e.x + A.rnd(-40, 40), y: e.gy - A.rnd(20, 80), vx: A.rnd(-120, 120), vy: A.rnd(-220, -60) });
              }
            }
            if (e.crashed && e.t - e.crashed > 0.5) e.dead = true;
          },
          draw(e, ctx, ox, oy, A) {
            const x = e.x + ox, gy = e.gy + oy, d = e.dir, P = e.pal;
            const h = e.crashed ? e.h * Math.max(0, 1 - (e.t - e.crashed) * 3) : e.h;
            for (let i = 0; i < 60; i++) { const k = i / 60, hh = h * Math.sin(k * Math.PI * 0.55); A.px(ctx, x - d * (60 - i), gy - hh, 2, hh, i % 5 === 0 ? P.d : i % 3 ? P.c : P.l); }
            for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + i * 0.25; A.px(ctx, x + Math.cos(a) * 14 * d, gy - h + 14 + Math.sin(a) * 14, 3, 3, i % 2 ? '#ffffff' : P.l); }
            A.alpha(ctx, 0.5, () => { for (let i = 0; i < 12; i++) A.px(ctx, x - d * A.rnd(0, 60), gy - A.rnd(0, h), 2, 1, '#ffffff'); });
          },
        }, {});
      },
    },
  };

  // ===================================================================== WIND
  const GUST = { life: 0.35, update(e, dt) { e.x += e.vx * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.px(ctx, e.x + ox, e.y + oy, 6, 1, e.pal.l)); } };
  const XSLASH = {
    life: 0.35,
    spawn(e, g, A) { A.sfx('swing', { minGap: 0.02 }); A.hitR(e, e.x, e.y, e.r, { kb: 1 }); },
    draw(e, ctx, ox, oy, A) {
      const k = e.t / e.life, x = e.x + ox, y = e.y + oy, r = e.r * Math.min(1, k * 4);
      A.alpha(ctx, 1 - k, () => { A.line(ctx, x - r, y - r, x + r, y + r, e.pal.l, 3); A.line(ctx, x + r, y - r, x - r, y + r, e.pal.l, 3); A.line(ctx, x - r, y - r, x + r, y + r, '#ffffff', 1); A.line(ctx, x + r, y - r, x - r, y + r, '#ffffff', 1); });
    },
  };
  const FUNNEL = (e, ctx, x, gy, h, w, A) => {
    for (let i = 0; i < 26; i++) { const q = i / 26, yy = gy - q * h, rw = w * (0.25 + q), a = e.t * 14 + i * 0.7; A.px(ctx, x + Math.cos(a) * rw, yy, 3, 1, i % 3 ? e.pal.c : e.pal.l); A.px(ctx, x - Math.cos(a) * rw * 0.6, yy, 2, 1, e.pal.d); }
  };
  K.wind = {
    status: 'launch', up: '#d8a0ff', fx: 'gusts', block: ['Wind Barrier', 'swirl'], dash: ['Tailwind', 'ghost'],
    m1: {
      name: 'Wind Slash', dmg: 8, cd: 0.36, kind: 'custom', life: 0.45,
      desc: 'A razor-thin crescent of compressed air that flies far.',
      spawn(e, g, A) { H.at(e, A, 12); e.vx = e.dir * 330; A.sfx('swing'); },
      update(e, dt, g, A) { e.x += e.vx * dt; const s = 12 * H.sc(e); A.hit(e, { x: e.x - s * 0.6, y: e.y - s, w: s * 1.2, h: s * 2 }, { dir: e.dir }); if (A.solid(e.x, e.y)) e.dead = true; },
      draw(e, ctx, ox, oy, A) {
        const x = e.x + ox, y = e.y + oy, s = 12 * H.sc(e), d = e.dir;
        A.alpha(ctx, 0.85 * A.fade(e, 0.03, 0.15), () => {
          A.arc(ctx, x, y, s, d, e.pal.l, 2, -1.3, 1.3);
          A.arc(ctx, x - d * 3, y, s - 2, d, '#ffffff', 1, -0.9, 0.9);
          for (let i = 0; i < 4; i++) A.px(ctx, x - d * (8 + i * 6), y - 8 + i * 5, 5, 1, e.pal.c);
          if (e.up) A.arc(ctx, x - d * 8, y, s * 0.8, d, e.pal.c, 2, -1.1, 1.1);
        });
      },
    },
    s: [
      {
        name: 'Gale Burst', dmg: 14, cd: 6, mp: 6, kind: 'custom', life: 0.45,
        desc: 'A spiralling blast of wind hurls everything around you away.',
        spawn(e, g, A) { A.sfx('whoosh'); A.shake(2, 0.2); },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; A.hitR(e, e.x, e.y, 60 * H.sc(e) * Math.min(1, e.t / 0.3), { kb: 2.4 }); },
        draw(e, ctx, ox, oy, A) {
          const R = 60 * H.sc(e) * Math.min(1, e.t / 0.3), x = e.x + ox, y = e.y + oy;
          A.alpha(ctx, 1 - e.t / e.life, () => { for (let i = 0; i < 70; i++) { const q = i / 70, a = q * 12 + e.t * 10, r = R * q; A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 2, 1, i % 3 ? e.pal.l : '#ffffff'); } });
        },
      },
      {
        name: 'Tornado', dmg: 3, cd: 8, mp: 8, kind: 'custom', life: 3,
        desc: 'A tornado that roams forward, sucking enemies up into it.',
        spawn(e, g, A) { H.at(e, A, 30); e.gy = H.floor(A, e.x); A.sfx('whoosh'); },
        update(e, dt, g, A) {
          const nx = e.x + e.dir * 60 * dt;
          if (!A.solid(nx, e.gy - 8)) e.x = nx;
          e.gy = A.ground(e.x, e.gy - 20);
          for (const t of A.targets()) { if (t.tutorial) continue; const c = A.center(t), dx = e.x - c.x; if (Math.abs(dx) < 50) { t.vx = U.approach(t.vx, Math.sign(dx) * 90, 6, dt); t.vy = U.approach(t.vy, -60, 4, dt); } }
          A.tick(e, { x: e.x - 16, y: e.gy - 60, w: 32, h: 60 }, 0.4, { kb: 0 });
        },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, A.fade(e, 0.3, 0.4), () => FUNNEL(e, ctx, e.x + ox, e.gy + oy, 60 * H.sc(e), 14 * H.sc(e), A)); },
      },
      {
        name: 'Air Blades', dmg: 6, cd: 4, mp: 5, kind: 'custom', life: 0.01,
        desc: 'Three wavering blades of air that weave through enemies.',
        spawn(e, g, A) {
          H.at(e, A, 8); A.sfx('swing');
          const n = e.up ? 5 : 3;
          for (let i = 0; i < n; i++) A.spawn(e, {
            life: 0.9,
            update(b, dt, g, A) { b.x += b.dir * 260 * dt; b.y = b.y0 + Math.sin(b.t * 14 + b.ph) * 12; A.hit(b, { x: b.x - 5, y: b.y - 6, w: 10, h: 12 }, { dir: b.dir, kb: 0.6 }); if (A.solid(b.x, b.y)) b.dead = true; },
            draw(b, ctx, ox, oy, A) { const x = b.x + ox, y = b.y + oy; for (let k = -3; k <= 3; k++) A.px(ctx, x - Math.abs(k) * b.dir * 0.8, y + k, 1, 1, k === 0 ? '#ffffff' : b.pal.l); },
          }, { y0: e.y, ph: (i / n) * Math.PI * 2 });
        },
      },
      {
        name: 'Updraft', dmg: 16, cd: 5, mp: 5, kind: 'custom', life: 0.7,
        desc: 'A column of wind erupts under the nearest enemy and launches it sky-high.',
        spawn(e, g, A) {
          H.at(e, A, 0);
          const t = A.near(e.x, e.y, 130); e.tx = t ? A.center(t).x : e.x + e.dir * 50; e.gy = H.floor(A, e.tx);
          A.sfx('whoosh');
        },
        update(e, dt, g, A) { if (e.t > 0.15) A.hit(e, { x: e.tx - 12, y: e.gy - 90, w: 24, h: 90 }, { kb: 0.2 }); },
        draw(e, ctx, ox, oy, A) {
          const x = e.tx + ox, gy = e.gy + oy, P = e.pal;
          if (e.t < 0.15) { A.alpha(ctx, 0.6, () => A.ring(ctx, x, gy - 2, 10, P.l, 2)); return; }
          A.alpha(ctx, 1 - (e.t - 0.15) / 0.55, () => { for (let i = 0; i < 24; i++) { const yy = (i * 9 + e.t * 400) % 90; A.px(ctx, x - 10 + (i * 7) % 20, gy - yy, 1, 6, i % 3 ? P.l : '#ffffff'); } });
        },
      },
      {
        name: 'Cyclone Step', dmg: 12, cd: 6, mp: 5, kind: 'custom', life: 0.25,
        desc: 'Dash forward inside a spinning cyclone, shredding everything you pass.',
        spawn(e, g, A) { const p = A.p; e.dir = p.facing; p.vx = e.dir * (110 * H.sc(e)) / 0.2; p.lungeT = 0.2; A.sfx('dash'); },
        update(e, dt, g, A) { const p = A.p; e.x = p.cx; e.y = p.y + 10; A.hit(e, { x: p.x - 6, y: p.y - 2, w: p.w + 12, h: p.h + 4 }, { dir: e.dir }); A.spawn(e, GUST, { x: p.cx, y: p.y + A.rnd(0, 20), vx: -e.dir * 60 }); },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy; for (let i = 0; i < 24; i++) { const a = e.t * 50 + i * 0.6; A.px(ctx, x + Math.cos(a) * 9, y + Math.sin(a) * 13, 1, 2, i % 2 ? e.pal.l : '#ffffff'); } },
      },
    ],
    ult: {
      name: 'Divine Tempest', dmg: 22,
      desc: 'Wrapped in violent wind, dash around the battlefield carving dozens of giant air slashes, then finish with a tornado strike.',
      charge: {
        pose: 'crouch', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          for (let s = 0; s < 3; s++) for (let i = 0; i < 30; i++) { const q = i / 30, a = q * 9 + t * (12 + s * 4), r = (34 - k * 22) * (0.5 + q * 0.6) + s * 3; A.px(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 2, 1, s === 0 ? '#ffffff' : P.l); }
          for (let i = 0; i < 6; i++) A.px(ctx, x - 8 + A.rnd(0, 16), y - 14 - A.rnd(0, 6), 1, 2, P.c);
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.2,
          spawn(e) { const ts = H.nearby(A, p.cx, p.y, 260).slice(0, 6); e.pts = ts.length ? ts.map((o) => o.c) : [0, 1, 2, 3].map((i) => ({ x: p.cx + e.dir * (40 + i * 40), y: p.y + 6 })); while (e.pts.length < 6) e.pts.push(e.pts[e.pts.length % e.pts.length]); e.i = 0; e.nt = 0; },
          update(e, dt, g, A) {
            e.nt -= dt;
            if (e.i < e.pts.length && e.nt <= 0) {
              const c = e.pts[e.i++]; e.nt = 0.14;
              const side = e.i % 2 ? -1 : 1;
              const from = { x: p.cx, y: p.y + 10 };
              const nx = c.x + side * 14 - p.w / 2; if (!Phys().overlapsSolid(g.level, nx, p.y, p.w, p.h)) p.x = nx; p.facing = -side;
              e.trail = { a: from, b: { x: p.cx, y: p.y + 10 }, t: 0.15 };
              A.spawn(e, XSLASH, { x: c.x, y: c.y, r: 18 * H.sc(e) });
            }
            if (e.trail) e.trail.t -= dt;
            if (e.i >= e.pts.length && !e.final && e.nt <= 0) {
              e.final = true;
              const c = e.pts[e.pts.length - 1];
              A.spawn(e, { life: 1.6, update(f, dt, g, A) { f.gy = A.ground(f.x, f.y); A.tick(f, { x: f.x - 22, y: f.gy - 100, w: 44, h: 100 }, 0.2, { kb: 0.2, mult: 0.6 }); for (const t of A.targets()) if (!t.tutorial && Math.abs(A.center(t).x - f.x) < 30) t.vy = -140; }, draw(f, ctx, ox, oy, A) { A.alpha(ctx, A.fade(f, 0.1, 0.4), () => FUNNEL(f, ctx, f.x + ox, f.gy + oy, 100 * H.sc(f), 22 * H.sc(f), A)); } }, { x: c.x, y: c.y });
              A.shake(4, 0.5); A.sfx('whoosh');
            }
          },
          draw(e, ctx, ox, oy, A) { if (e.trail && e.trail.t > 0) A.alpha(ctx, e.trail.t / 0.15, () => A.line(ctx, e.trail.a.x + ox, e.trail.a.y + oy, e.trail.b.x + ox, e.trail.b.y + oy, e.pal.l, 2)); },
        }, {});
      },
    },
  };

  // ==================================================================== EARTH
  const PEBBLE = { life: 0.6, update(e, dt) { e.vy += 500 * dt; e.x += e.vx * dt; e.y += e.vy * dt; }, draw(e, ctx, ox, oy, A) { A.px(ctx, e.x + ox, e.y + oy, 2, 2, e.pal.d); } };
  const ROCK = (ctx, x, y, r, a, P, A) => {
    for (let i = 0; i < 7; i++) { const q = a + i * 0.9, rr = r * (0.75 + ((i * 37) % 10) / 40); A.line(ctx, x, y, x + Math.cos(q) * rr, y + Math.sin(q) * rr, P.c, 2); }
    A.disc(ctx, x, y, Math.round(r * 0.7), P.c, P.l); A.px(ctx, x - r * 0.3, y - r * 0.3, 2, 1, P.l); A.px(ctx, x + r * 0.2, y + r * 0.1, 2, 1, P.d);
  };
  K.earth = {
    status: 'stagger', up: '#ffcf5a', fx: 'pebbles', block: ['Stone Wall', 'wall'], dash: ['Rockslide', 'ghost'],
    m1: {
      name: 'Stone Fist', dmg: 9, cd: 0.42, kind: 'custom', life: 0.22,
      desc: 'Punch out a fist of solid rock.',
      spawn(e, g, A) { H.at(e, A, 8); e.vx = e.dir * 300; A.sfx('punchHit', { minGap: 0.05 }); },
      update(e, dt, g, A) { e.vx *= 1 - dt * 6; e.x += e.vx * dt; const s = 8 * H.sc(e); A.hit(e, { x: e.x - s, y: e.y - s, w: s * 2, h: s * 2 }, { dir: e.dir, kb: 1.6 }); },
      draw(e, ctx, ox, oy, A) {
        const x = e.x + ox, y = e.y + oy, s = Math.round(8 * H.sc(e)), d = e.dir, P = e.pal;
        A.px(ctx, x - s, y - s * 0.7, s * 2, s * 1.4, P.d); A.px(ctx, x - s + 1, y - s * 0.7 + 1, s * 2 - 2, s * 1.4 - 2, P.c);
        for (let i = 0; i < 4; i++) A.px(ctx, x + d * (s - 2), y - s * 0.55 + i * s * 0.35, 2, 1, P.d);
        A.px(ctx, x - d * s, y - s * 0.7, 2, s * 1.4, P.l);
        if (e.up) { A.px(ctx, x - 2, y - 2, 4, 4, P.core); A.ring(ctx, x, y, s + 2, P.l); }
      },
    },
    s: [
      {
        name: 'Rock Spikes', dmg: 12, cd: 5, mp: 6, kind: 'custom', life: 0.9,
        desc: 'Jagged stone spikes burst out of the ground in a line.',
        spawn(e, g, A) {
          H.at(e, A, 0);
          const n = e.up ? 6 : 4, ax = A.aim(e, 110), start = ax !== null ? Math.max(18, Math.abs(ax - e.x) - 16) : 22;
          e.sp = [];
          for (let i = 0; i < n; i++) { const x = e.x + e.dir * (start + i * 20); e.sp.push({ x, gy: H.floor(A, x), d: i * 0.06, h: (26 + i * 3) * H.sc(e) }); }
          A.sfx('crash', { minGap: 0.05 });
        },
        update(e, dt, g, A) {
          for (const s of e.sp) {
            const lt = e.t - s.d; s.k = lt < 0 ? 0 : lt < 0.1 ? lt / 0.1 : lt < 0.45 ? 1 : Math.max(0, 1 - (lt - 0.45) / 0.15);
            if (lt > 0 && !s.p) { s.p = true; A.g.dust(s.x, s.gy, 4); }
            if (s.k > 0.5) A.hit(e, { x: s.x - 6, y: s.gy - s.h * s.k, w: 12, h: s.h * s.k }, { kb: 1.2 });
          }
        },
        draw(e, ctx, ox, oy, A) {
          for (const s of e.sp) {
            if (!s.k) continue;
            const x = s.x + ox, gy = s.gy + oy, h = s.h * s.k;
            A.tri(ctx, x, gy, 12, h, e.pal.d); A.tri(ctx, x - 1, gy, 8, h - 2, e.pal.c, e.pal.l);
            A.line(ctx, x - 2, gy - h * 0.3, x + 1, gy - h * 0.55, e.pal.d); A.line(ctx, x + 1, gy - h * 0.55, x - 1, gy - h * 0.7, e.pal.d);
          }
        },
      },
      {
        name: 'Boulder Toss', dmg: 18, cd: 5, mp: 5, kind: 'custom', life: 2.2,
        desc: 'Lob a boulder. It bounces once, rolls, then shatters into gravel.',
        spawn(e, g, A) { H.at(e, A, 8, -6); e.vx = e.dir * 150; e.vy = -110; e.bounces = 0; A.sfx('cast'); },
        update(e, dt, g, A) {
          e.vy += 420 * dt; e.x += e.vx * dt; e.y += e.vy * dt;
          const r = 7 * H.sc(e);
          A.hit(e, { x: e.x - r, y: e.y - r, w: r * 2, h: r * 2 }, { dir: e.dir, kb: 1.3 });
          if (A.solid(e.x, e.y + r)) { e.y -= e.vy * dt; if (e.bounces++ < 1) { e.vy = -e.vy * 0.45; A.sfx('crash', { minGap: 0.05 }); A.shake(1.5, 0.1); } else e.vy = 0; }
          if (A.solid(e.x + e.dir * r, e.y) || e.t > 1.8) {
            A.blast(e, e.x, e.y, 26 * H.sc(e));
            for (let i = 0; i < 10; i++) A.spawn(e, PEBBLE, { x: e.x, y: e.y, vx: A.rnd(-90, 90), vy: A.rnd(-180, -60) });
            e.dead = true;
          }
        },
        draw(e, ctx, ox, oy, A) { ROCK(ctx, e.x + ox, e.y + oy, 7 * H.sc(e), e.x * 0.1 * e.dir, e.pal, A); },
      },
      {
        name: 'Quake', dmg: 16, cd: 7, mp: 7, kind: 'custom', life: 0.8,
        desc: 'Stomp the ground. Cracks race outwards and stagger anything standing on them.',
        spawn(e, g, A) {
          const p = A.p; e.x = p.cx; e.gy = p.feet; A.sfx('crash'); A.sfx('rumble', { dur: 0.6 }); A.shake(4, 0.5); A.g.dust(p.cx, p.feet, 14);
          for (const t of A.targets()) { const c = A.center(t); if (Math.abs(c.x - e.x) < 100 * H.sc(e) && Math.abs(t.box.y + t.box.h - e.gy) < 10) A.damage(e, t, 1, 0.6); }
        },
        draw(e, ctx, ox, oy, A) {
          const k = Math.min(1, e.t / 0.3), R = 100 * H.sc(e) * k, x = e.x + ox, gy = e.gy + oy;
          A.alpha(ctx, 1 - Math.max(0, e.t - 0.4) / 0.4, () => {
            for (const side of [-1, 1]) { let lx = x, ly = gy; for (let i = 1; i <= 10; i++) { const nx = x + side * R * (i / 10), ny = gy - ((i * 7) % 3); A.line(ctx, lx, ly, nx, ny, e.pal.d, 2); if (i % 3 === 0) A.line(ctx, nx, ny, nx + side * 4, ny - 4, e.pal.d); lx = nx; ly = ny; } }
          });
        },
      },
      {
        name: 'Earth Wall', dmg: 12, cd: 9, mp: 6, kind: 'custom', life: 3.5,
        desc: 'Raise a wall of rock in front of you. It shoves enemies away and blocks projectiles.',
        spawn(e, g, A) { H.at(e, A, 20); e.gy = H.floor(A, e.x); e.h = 36 * H.sc(e); A.sfx('crash'); A.shake(2, 0.2); },
        update(e, dt, g, A) {
          const k = Math.min(1, e.t / 0.15);
          if (k < 1) A.hit(e, { x: e.x - 8, y: e.gy - e.h, w: 16, h: e.h }, { dir: e.dir, kb: 2 });
          for (const b of A.g.bolts) if (Math.abs(b.x - e.x) < 7 && b.y > e.gy - e.h) { b.dead = true; A.puff(e, b.x, b.y, 4); }
          for (const t of A.targets()) { if (t.tutorial) continue; const c = A.center(t); if (Math.abs(c.x - e.x) < 10 && c.y > e.gy - e.h) t.vx = Math.sign(c.x - e.x || e.dir) * 120; }
        },
        draw(e, ctx, ox, oy, A) {
          const k = Math.min(1, e.t / 0.15), h = e.h * k * (e.t > e.life - 0.3 ? (e.life - e.t) / 0.3 : 1), x = e.x + ox, gy = e.gy + oy;
          A.px(ctx, x - 7, gy - h, 14, h, e.pal.d);
          for (let yy = 0; yy < h - 2; yy += 6) { A.px(ctx, x - 6, gy - h + yy + 1, 6, 5, e.pal.c); A.px(ctx, x + 1, gy - h + yy + 4, 5, 4, e.pal.c); }
          A.px(ctx, x - 7, gy - h, 14, 2, e.pal.l);
        },
      },
      {
        name: 'Landslide', dmg: 9, cd: 7, mp: 7, kind: 'custom', life: 0.9,
        desc: 'Send a tumble of rolling rocks down the ground in front of you.',
        spawn(e, g, A) { H.at(e, A, 6); e.n = e.up ? 6 : 4; e.made = 0; A.sfx('rumble', { dur: 0.8 }); },
        update(e, dt, g, A) {
          while (e.made < e.n && e.t > e.made * 0.15) {
            e.made++;
            A.spawn(e, {
              life: 1.6,
              spawn(r) { r.gy = H.floor(A, r.x); r.y = r.gy - r.rr; r.vx = r.dir * A.rnd(140, 180); },
              update(r, dt, g, A) { r.x += r.vx * dt; r.gy = A.ground(r.x, r.gy - 18); r.y = r.gy - r.rr; A.hit(r, { x: r.x - r.rr, y: r.y - r.rr, w: r.rr * 2, h: r.rr * 2 }, { dir: r.dir, kb: 1.2 }); if (A.solid(r.x + r.dir * r.rr, r.y)) { A.g.dust(r.x, r.gy, 6); r.dead = true; } },
              draw(r, ctx, ox, oy, A) { ROCK(ctx, r.x + ox, r.y + oy, r.rr, r.x * 0.15 * r.dir, r.pal, A); },
            }, { x: e.x, rr: (4 + (e.made % 3)) * H.sc(e) });
          }
        },
      },
    ],
    ult: {
      name: 'World Breaker', dmg: 30,
      desc: 'Form a gigantic stone fist and punch the ground: colossal spikes race at the enemy, then a devastating final impact.',
      charge: {
        pose: 'raise', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          const f = A.p.facing, hx = x + f * 2, hy = y - 18;
          for (let i = 0; i < 14; i++) { const a = i * 0.45 + t * 2, d = 30 * (1 - Math.min(1, k * 1.5 - i * 0.04)); if (d < 0) continue; A.px(ctx, hx + Math.cos(a) * (d + 5), hy + Math.sin(a) * (d + 5), 3, 3, i % 2 ? P.c : P.d); }
          if (k > 0.4) { const r = Math.round(4 + (k - 0.4) * 14); A.disc(ctx, hx, hy - 2, r, P.d, P.c); A.px(ctx, hx - r * 0.5, hy - r * 0.5, 2, 2, P.l); for (let i = 0; i < 3; i++) A.px(ctx, hx - r + 2 + i * r * 0.6, hy - r + 1, 2, 2, P.d); }
          if (k > 0.6) for (let i = 0; i < 6; i++) A.px(ctx, x - 20 + i * 8, y + 12, 3, 1, P.d);
        },
      },
      run(A, e0) {
        const p = A.p;
        A.shake(6, 0.4); A.sfx('crash'); A.g.dust(p.cx, p.feet, 20);
        const t = A.near(p.cx, p.y, 220), tx = t ? A.center(t).x : p.cx + e0.dir * 150;
        A.spawn(e0, {
          life: 2,
          spawn(e) { e.sx = p.cx; e.tx = tx; e.sp = []; const n = 7; for (let i = 0; i < n; i++) { const x = U.lerp(e.sx + e.dir * 20, e.tx, i / (n - 1)); e.sp.push({ x, gy: A.ground(x, p.y + 2), d: i * 0.08, h: (24 + i * 9) * H.sc(e) }); } },
          update(e, dt, g, A) {
            for (const s of e.sp) {
              const lt = e.t - s.d; s.k = lt < 0 ? 0 : lt < 0.1 ? lt / 0.1 : lt < 0.7 ? 1 : Math.max(0, 1 - (lt - 0.7) / 0.2);
              if (lt > 0 && !s.p) { s.p = true; A.g.dust(s.x, s.gy, 6); A.sfx('crash', { minGap: 0.03 }); A.shake(2, 0.1); }
              if (s.k > 0.5) A.hit(e, { x: s.x - 10, y: s.gy - s.h, w: 20, h: s.h }, { kb: 0.8, mult: 0.6 });
            }
            if (e.t > 0.9 && !e.final) {
              e.final = true; const gy = A.ground(e.tx, p.y + 2);
              A.blast(e, e.tx, gy - 20, 90 * H.sc(e), { dmg: e.dmg * 1.8 }); A.flash(0.4); A.shake(8, 0.6);
              for (let i = 0; i < 20; i++) A.spawn(e, PEBBLE, { x: e.tx, y: gy - 10, vx: A.rnd(-160, 160), vy: A.rnd(-280, -80) });
              e.pill = { x: e.tx, gy, t: 0 };
            }
            if (e.pill) e.pill.t += dt;
          },
          draw(e, ctx, ox, oy, A) {
            for (const s of e.sp) { if (!s.k) continue; const x = s.x + ox, gy = s.gy + oy, h = s.h * s.k; A.tri(ctx, x, gy, 18, h, e.pal.d); A.tri(ctx, x - 1, gy, 13, h - 3, e.pal.c, e.pal.l); }
            if (e.pill && e.pill.t < 0.8) { const x = e.pill.x + ox, gy = e.pill.gy + oy, h = 110 * Math.min(1, e.pill.t / 0.08) * (1 - Math.max(0, e.pill.t - 0.5) / 0.3); A.px(ctx, x - 14, gy - h, 28, h, e.pal.d); A.px(ctx, x - 11, gy - h, 22, h, e.pal.c); A.px(ctx, x - 4, gy - h, 6, h, e.pal.l); }
          },
        }, {});
      },
    },
  };

  // ================================================================ LIGHTNING
  const ARC = { // cosmetic jagged arc between two points
    life: 0.18,
    draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => { A.jag(ctx, e.x + ox, e.y + oy, e.x2 + ox, e.y2 + oy, e.pal.c, e.amp || 4, 2); A.jag(ctx, e.x + ox, e.y + oy, e.x2 + ox, e.y2 + oy, '#ffffff', 2, 1); }); },
  };
  const SKYBOLT = {
    life: 0.45,
    spawn(e, g, A) { e.gy = A.ground(e.x, e.y - 8); e.top = H.sky(A, e.x, e.gy - 8); },
    update(e, dt, g, A) { if (e.t > (e.delay || 0.18) && !e.done) { e.done = true; A.sfx('zap', { minGap: 0.03 }); A.shake(2, 0.12); A.hit(e, { x: e.x - (e.w || 7), y: e.top, w: (e.w || 7) * 2, h: e.gy - e.top }, { kb: 0.6 }); H.sparks(A, e.x, e.gy - 2, 10, e.pal.l, 90); } },
    draw(e, ctx, ox, oy, A) {
      const d = e.delay || 0.18;
      if (e.t < d) { if (Math.floor(e.t * 30) % 2) A.px(ctx, e.x + ox - 5, e.gy + oy - 2, 10, 2, e.pal.l); return; }
      if (e.t > d + 0.2) return;
      const w = e.w ? e.w / 7 : 1;
      A.jag(ctx, e.x + ox, e.top + oy, e.x + ox, e.gy + oy, e.pal.c, 5 * w, Math.round(3 * w)); A.jag(ctx, e.x + ox, e.top + oy, e.x + ox, e.gy + oy, '#ffffff', 3 * w, Math.max(1, Math.round(w)));
    },
  };
  K.lightning = {
    status: 'shock', up: '#c88aff', fx: 'sparks', block: ['Static Field', 'shield'], dash: ['Flash Step', 'blink'],
    m1: {
      name: 'Shock Bolt', dmg: 7, cd: 0.36, kind: 'custom', life: 0.16,
      desc: 'Fire an instant, crackling bolt.',
      spawn(e, g, A) {
        H.at(e, A, 8, -1); let L = 80 * H.sc(e);
        for (let d = 4; d <= L; d += 4) if (A.solid(e.x + e.dir * d, e.y)) { L = d; break; }
        e.L = L; A.hit(e, { x: e.dir > 0 ? e.x : e.x - L, y: e.y - 5, w: L, h: 10 }, { dir: e.dir }); A.sfx('zap', { minGap: 0.04 });
      },
      draw(e, ctx, ox, oy, A) {
        const x = e.x + ox, y = e.y + oy, x2 = x + e.dir * e.L;
        A.jag(ctx, x, y, x2, y, e.pal.c, 4, 2); A.jag(ctx, x, y, x2, y, '#ffffff', 2, 1);
        if (e.up) A.jag(ctx, x, y, x2, y + A.rnd(-5, 5), e.pal.l, 6, 1);
        A.disc(ctx, x2, y, 2, '#ffffff');
      },
    },
    s: [
      {
        name: 'Chain Lightning', dmg: 14, cd: 5, mp: 6, kind: 'custom', life: 0.3,
        desc: 'A bolt that leaps from enemy to enemy.',
        spawn(e, g, A) {
          H.at(e, A, 8, -1); A.sfx('zap');
          const used = new Set(); let from = { x: e.x, y: e.y }; e.pts = [from];
          for (let i = 0; i < (e.up ? 6 : 4); i++) { const t = A.near(from.x, from.y, i ? 100 : 120, used); if (!t) break; used.add(t.uid); const c = A.center(t); e.pts.push(c); A.damage(e, t, 1 - i * 0.08, 0.4); from = c; }
          if (e.pts.length === 1) e.pts.push({ x: e.x + e.dir * 50, y: e.y });
        },
        draw(e, ctx, ox, oy, A) { for (let i = 1; i < e.pts.length; i++) { const a = e.pts[i - 1], b = e.pts[i]; A.jag(ctx, a.x + ox, a.y + oy, b.x + ox, b.y + oy, e.pal.c, 4, 2); A.jag(ctx, a.x + ox, a.y + oy, b.x + ox, b.y + oy, '#ffffff', 2, 1); A.disc(ctx, b.x + ox, b.y + oy, 3, e.pal.l); } },
      },
      {
        name: 'Thunder Strike', dmg: 16, cd: 6, mp: 7, kind: 'custom', life: 0.01,
        desc: 'Call bolts down from the sky onto the nearest enemies.',
        spawn(e, g, A) {
          H.at(e, A, 0);
          const ts = H.nearby(A, e.x, e.y, 170), n = e.up ? 5 : 3;
          for (let i = 0; i < n; i++) { const x = ts[i] ? ts[i].c.x : e.x + e.dir * (40 + i * 30); A.spawn(e, SKYBOLT, { x, y: ts[i] ? ts[i].c.y : e.y, delay: 0.15 + i * 0.1, life: 0.6 + i * 0.1 }); }
        },
      },
      {
        name: 'Volt Step', dmg: 14, cd: 4, mp: 4, kind: 'custom', life: 0.3,
        desc: 'Become a spark: teleport forward and discharge where you land.',
        spawn(e, g, A) {
          const p = A.p; e.dir = p.facing; const D = 90 * H.sc(e);
          let d = 0; while (d < D && !Phys().overlapsSolid(g.level, p.x + e.dir * (d + 4), p.y, p.w, p.h)) d += 4;
          e.a = { x: p.cx, y: p.y + 10 }; p.x += e.dir * d; e.b = { x: p.cx, y: p.y + 10 };
          A.hit(e, { x: Math.min(e.a.x, e.b.x), y: p.y, w: Math.abs(e.b.x - e.a.x) + 1, h: p.h }, {});
          A.blast(e, e.b.x, e.b.y, 30 * H.sc(e)); A.sfx('zap');
        },
        draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => { A.jag(ctx, e.a.x + ox, e.a.y + oy, e.b.x + ox, e.b.y + oy, e.pal.c, 6, 2); A.jag(ctx, e.a.x + ox, e.a.y + oy, e.b.x + ox, e.b.y + oy, '#ffffff', 3, 1); }); },
      },
      {
        name: 'Ball Lightning', dmg: 5, cd: 7, mp: 6, kind: 'custom', life: 2.6,
        desc: 'A slow, crackling orb that zaps everything near it as it drifts.',
        spawn(e, g, A) { H.at(e, A, 12, -2); e.vx = e.dir * 55; A.sfx('surge'); },
        update(e, dt, g, A) {
          e.x += e.vx * dt; e.y += Math.sin(e.t * 4) * 10 * dt;
          if (A.solid(e.x, e.y)) e.vx = 0;
          e.zt = (e.zt || 0) - dt;
          if (e.zt <= 0) { e.zt = 0.3; for (const o of H.nearby(A, e.x, e.y, 55 * H.sc(e)).slice(0, e.up ? 3 : 2)) { A.damage(e, o.t, 1, 0.2); A.spawn(e, ARC, { x: e.x, y: e.y, x2: o.c.x, y2: o.c.y }); } A.sfx('zap', { minGap: 0.1 }); }
        },
        draw(e, ctx, ox, oy, A) {
          const x = e.x + ox, y = e.y + oy, r = Math.round(5 * H.sc(e));
          A.glow(ctx, x, y, r + 4, e.pal.c, 0.3); A.disc(ctx, x, y, r, e.pal.c, '#ffffff');
          for (let i = 0; i < 4; i++) { const a = A.rnd(0, 6.3), l = A.rnd(5, 10); A.jag(ctx, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, e.pal.l, 2, 1); }
        },
      },
      {
        name: 'Static Field', dmg: 4, cd: 10, mp: 7, kind: 'custom', life: 4,
        desc: 'Charge the air around you. Anything that comes close gets shocked.',
        spawn(e, g, A) { A.sfx('surge'); },
        update(e, dt, g, A) {
          const p = A.p, R = 34 * H.sc(e); e.x = p.cx; e.y = p.y + 10;
          for (const o of H.nearby(A, e.x, e.y, R)) { const last = e.hitT.get(o.t.uid); if (last === undefined || e.t - last > 0.45) { e.hitT.set(o.t.uid, e.t); A.damage(e, o.t, 1, 0.3); A.spawn(e, ARC, { x: e.x, y: e.y, x2: o.c.x, y2: o.c.y, amp: 3 }); } }
        },
        draw(e, ctx, ox, oy, A) {
          const R = 34 * H.sc(e), x = e.x + ox, y = e.y + oy;
          A.alpha(ctx, 0.6, () => { for (let i = 0; i < 10; i++) { const a = i * 0.63 + e.t * 3, b = a + 0.5; A.jag(ctx, x + Math.cos(a) * R, y + Math.sin(a) * R * 0.75, x + Math.cos(b) * R, y + Math.sin(b) * R * 0.75, i % 2 ? e.pal.c : e.pal.l, 2, 1); } });
        },
      },
    ],
    ult: {
      name: "Raijin's Wrath", dmg: 26,
      desc: 'Become pure lightning and strike enemy after enemy in an instant, then a colossal bolt crashes down in a huge electrical explosion.',
      charge: {
        pose: 'crouch', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          A.glow(ctx, x, y, 12 + k * 8, P.c, 0.15 + k * 0.25);
          for (let i = 0; i < 3 + Math.round(k * 6); i++) { const a = A.rnd(0, 6.3), l = A.rnd(8, 18 + k * 10); A.jag(ctx, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, i % 2 ? P.c : '#ffffff', 3, 1); }
          if (Math.floor(t * 20) % 3 === 0) A.alpha(ctx, 0.4, () => A.disc(ctx, x, y - 4, 10, '#ffffff'));
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2,
          spawn(e) { const ts = H.nearby(A, p.cx, p.y, 280).slice(0, 6); e.pts = ts.map((o) => o.t); e.i = 0; e.nt = 0; e.trails = []; },
          update(e, dt, g, A) {
            e.nt -= dt;
            for (const tr of e.trails) tr.t -= dt;
            if (e.i < e.pts.length && e.nt <= 0) {
              const t = e.pts[e.i++]; e.nt = 0.11;
              if (!t.dead) { const c = A.center(t), a = { x: p.cx, y: p.y + 10 }, nx = c.x - p.facing * 12 - p.w / 2; if (!Phys().overlapsSolid(g.level, nx, p.y, p.w, p.h)) p.x = nx; e.trails.push({ a, b: { x: p.cx, y: p.y + 10 }, t: 0.25 }); A.damage(e, t, 1, 0.3); A.sfx('zap', { minGap: 0.02 }); H.sparks(A, c.x, c.y, 8, e.pal.l, 80); }
            }
            if (e.i >= e.pts.length && !e.final && e.nt <= 0) {
              e.final = true;
              const last = e.pts.length ? A.center(e.pts[e.pts.length - 1]) : { x: p.cx + e.dir * 60, y: p.y };
              A.spawn(e, SKYBOLT, { x: last.x, y: last.y, w: 22 * H.sc(e), delay: 0.25, life: 0.6, dmg: e.dmg * 1.5 });
              A.spawn(e, { life: 0.6, update(f, dt, g, A) { if (f.t > 0.25 && !f.boom) { f.boom = true; A.blast(f, f.x, A.ground(f.x, f.y) - 10, 100 * H.sc(f), { dmg: f.dmg }); A.flash(0.5); A.shake(7, 0.5); } } }, { x: last.x, y: last.y });
            }
          },
          draw(e, ctx, ox, oy, A) { for (const tr of e.trails) if (tr.t > 0) A.alpha(ctx, tr.t / 0.25, () => { A.jag(ctx, tr.a.x + ox, tr.a.y + oy, tr.b.x + ox, tr.b.y + oy, e.pal.c, 6, 3); A.jag(ctx, tr.a.x + ox, tr.a.y + oy, tr.b.x + ox, tr.b.y + oy, '#ffffff', 3, 1); }); },
        }, {});
      },
    },
  };

  // ====================================================================== ICE
  const SNOWFLAKE = { life: 0.8, update(e, dt) { e.x += e.vx * dt; e.y += e.vy * dt; }, draw(e, ctx, ox, oy, A) { A.alpha(ctx, 1 - e.t / e.life, () => A.px(ctx, e.x + ox, e.y + oy, 1, 1, '#ffffff')); } };
  const SHARD_DRAW = (b, ctx, ox, oy, A) => {
    const a = Math.atan2(b.vy, b.vx), s = b.up ? 1.4 : 1;
    for (let i = -4; i <= 4; i++) { const [rx, ry] = H.rot(i * s, 0, a); A.px(ctx, b.x + ox + rx, b.y + oy + ry, 1, 1, i > 2 ? '#ffffff' : b.pal.l); const [qx, qy] = H.rot(i * s, Math.abs(i) < 2 ? 1 : 0, a); A.px(ctx, b.x + ox + qx, b.y + oy + qy, 1, 1, b.pal.c); }
  };
  const ICE_SHARD = H.proj(SHARD_DRAW, { life: 0.9, r: 4 });
  K.ice = {
    status: 'chill', up: '#7a8aff', fx: 'snow', block: ['Ice Wall', 'wall'], dash: ['Ice Slide', 'trail'],
    m1: {
      name: 'Ice Spikes', dmg: 4, cd: 0.42, kind: 'custom', life: 0.01,
      desc: 'Launch three spikes of ice in a fan.',
      spawn(e, g, A) {
        H.at(e, A, 8, -1); A.sfx('cast', { minGap: 0.04 });
        const n = e.up ? 5 : 3;
        for (let i = 0; i < n; i++) { const a = n === 1 ? 0 : -0.22 + (0.44 * i) / (n - 1); A.spawn(e, ICE_SHARD, { vx: Math.cos(a) * 260 * e.dir, vy: Math.sin(a) * 260 }); }
      },
    },
    s: [
      {
        name: 'Glacial Spikes', dmg: 12, cd: 5, mp: 6, kind: 'custom', life: 1,
        desc: 'Faceted ice crystals erupt from the ground, frosting the floor around them.',
        spawn(e, g, A) {
          H.at(e, A, 0); const n = e.up ? 6 : 4, ax = A.aim(e, 110), start = ax !== null ? Math.max(18, Math.abs(ax - e.x) - 16) : 22;
          e.sp = []; for (let i = 0; i < n; i++) { const x = e.x + e.dir * (start + i * 22); e.sp.push({ x, gy: H.floor(A, x), d: i * 0.07, h: (30 + (i % 2) * 8) * H.sc(e) }); }
          A.sfx('glassCrack', { minGap: 0.05 });
        },
        update(e, dt, g, A) { for (const s of e.sp) { const lt = e.t - s.d; s.k = lt < 0 ? 0 : lt < 0.1 ? lt / 0.1 : lt < 0.55 ? 1 : Math.max(0, 1 - (lt - 0.55) / 0.15); if (s.k > 0.5) A.hit(e, { x: s.x - 6, y: s.gy - s.h * s.k, w: 12, h: s.h * s.k }, { kb: 1 }); } },
        draw(e, ctx, ox, oy, A) {
          for (const s of e.sp) {
            if (!s.k) continue; const x = s.x + ox, gy = s.gy + oy, h = s.h * s.k;
            A.px(ctx, x - 10, gy - 1, 20, 1, '#e8f8ff');
            for (let yy = 0; yy < h; yy++) { const q = yy / h, hw = 5 * (q < 0.7 ? 1 : (1 - q) / 0.3); A.px(ctx, x - hw, gy - yy, hw, 1, e.pal.c); A.px(ctx, x, gy - yy, hw, 1, e.pal.l); }
            A.px(ctx, x - 1, gy - h * 0.8, 1, h * 0.5, '#ffffff');
          }
        },
      },
      {
        name: 'Blizzard', dmg: 3, cd: 8, mp: 7, kind: 'custom', life: 3.5,
        desc: 'A howling snowstorm that chills everything inside it.',
        spawn(e, g, A) { H.at(e, A, 50); e.gy = H.floor(A, e.x); e.life *= e.up ? 1.3 : 1; A.sfx('whoosh'); },
        update(e, dt, g, A) {
          const R = 50 * H.sc(e);
          A.tick(e, { x: e.x - R, y: e.gy - R * 1.4, w: R * 2, h: R * 1.4 }, 0.45, { kb: 0 });
          for (let i = 0; i < 3; i++) A.spawn(e, SNOWFLAKE, { x: e.x + A.rnd(-R, R), y: e.gy - A.rnd(0, R * 1.4), vx: A.rnd(-90, -40) * e.dir, vy: A.rnd(20, 50) });
        },
        draw(e, ctx, ox, oy, A) { const R = 50 * H.sc(e); A.alpha(ctx, A.fade(e, 0.3, 0.4) * 0.5, () => { A.px(ctx, e.x + ox - R, e.gy + oy - 2, R * 2, 2, '#e8f8ff'); for (let i = 0; i < 16; i++) A.px(ctx, e.x + ox - R + ((i * 37 + e.t * 120) % (R * 2)), e.gy + oy - R * 1.4 + (i * 13) % (R * 1.4), 3, 1, e.pal.l); }); },
      },
      {
        name: 'Frozen Orb', dmg: 18, cd: 6, mp: 6, kind: 'custom', life: 1.6,
        desc: 'A spinning orb of ice that sprays shards in a spiral, then bursts.',
        spawn(e, g, A) { H.at(e, A, 10, -2); e.vx = e.dir * 110; A.sfx('cast'); },
        update(e, dt, g, A) {
          e.x += e.vx * dt;
          e.st = (e.st || 0) - dt;
          if (e.st <= 0) { e.st = 0.12; const a = e.t * 9; A.spawn(e, ICE_SHARD, { vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, dmg: e.dmg * 0.25, life: 0.5 }); }
          if (A.solid(e.x, e.y) || e.t > 1.5) { A.blast(e, e.x, e.y, 36 * H.sc(e)); for (let i = 0; i < 8; i++) A.spawn(e, ICE_SHARD, { vx: Math.cos(i * 0.785) * 200, vy: Math.sin(i * 0.785) * 200, dmg: e.dmg * 0.3, life: 0.4 }); e.dead = true; }
        },
        draw(e, ctx, ox, oy, A) { const x = e.x + ox, y = e.y + oy, r = Math.round(6 * H.sc(e)); A.disc(ctx, x, y, r, e.pal.c, e.pal.l); for (let i = 0; i < 6; i++) { const a = e.t * 9 + i * 1.05; A.line(ctx, x, y, x + Math.cos(a) * (r + 3), y + Math.sin(a) * (r + 3), '#ffffff'); } },
      },
      {
        name: 'Frost Nova', dmg: 10, cd: 7, mp: 6, kind: 'custom', life: 0.8,
        desc: 'A ring of frost races across the floor, chilling everything twice over.',
        spawn(e, g, A) { const p = A.p; e.x = p.cx; e.gy = p.feet; A.sfx('glassCrack'); },
        update(e, dt, g, A) {
          const R = 90 * H.sc(e) * Math.min(1, e.t / 0.4);
          for (const t of A.targets()) { const c = A.center(t); if (Math.abs(c.x - e.x) < R && Math.abs(c.y - e.gy) < 30 && !e.hit.has(t.uid)) { e.hit.add(t.uid); A.damage(e, t, 1, 0.1); if (t.applyStatus) t.applyStatus('chill', e.potency); } }
        },
        draw(e, ctx, ox, oy, A) {
          const R = 90 * H.sc(e) * Math.min(1, e.t / 0.4), x = e.x + ox, gy = e.gy + oy;
          A.alpha(ctx, 1 - Math.max(0, e.t - 0.5) / 0.3, () => { for (const side of [-1, 1]) for (let d = 0; d < R; d += 4) { const h = (d % 12 === 0) ? 5 : 2; A.px(ctx, x + side * d, gy - h, 2, h, d > R - 8 ? '#ffffff' : e.pal.l); } });
        },
      },
      {
        name: 'Icicle Drop', dmg: 15, cd: 6, mp: 6, kind: 'custom', life: 0.01,
        desc: 'Icicles form high above the nearest enemies, then drop.',
        spawn(e, g, A) {
          H.at(e, A, 0);
          const ts = H.nearby(A, e.x, e.y, 170), n = e.up ? 5 : 3;
          for (let i = 0; i < n; i++) {
            const x = ts[i] ? ts[i].c.x : e.x + e.dir * (30 + i * 25);
            A.spawn(e, {
              life: 1.4,
              spawn(c) { c.y = H.sky(A, c.x, A.p.y) + 14; c.vy = 0; },
              update(c, dt, g, A) { if (c.t < 0.4 + c.d) return; c.vy += 900 * dt; c.y += c.vy * dt; if (A.hit(c, { x: c.x - 4, y: c.y - 12, w: 8, h: 14 }, { kb: 0.6 }) || A.solid(c.x, c.y)) { A.sfx('glassCrack', { minGap: 0.04 }); A.puff(c, c.x, c.y, 6); c.dead = true; } },
              draw(c, ctx, ox, oy, A) { const x = c.x + ox, y = c.y + oy, s = c.up ? 1.4 : 1; A.tri(ctx, x, y - 14 * s, 6 * s, -14 * s, c.pal.c, '#ffffff'); A.px(ctx, x - 3 * s, y - 15 * s, 6 * s, 2, c.pal.l); if (c.t < 0.4 + c.d) A.alpha(ctx, 0.3, () => A.px(ctx, x - 3, A.ground(c.x, c.y) + oy - 1, 6, 1, c.pal.l)); },
            }, { x, d: i * 0.08 });
          }
          A.sfx('glassCrack');
        },
      },
    ],
    ult: {
      name: 'Absolute Zero', dmg: 28,
      desc: 'A wave of freezing energy brings everything to absolute zero, freezing it solid, then shatters it with one final strike.',
      charge: {
        pose: 'raiseBoth', lift: 0,
        draw(ctx, x, y, k, t, A, P) {
          const w = 70 * k;
          A.px(ctx, x - w, y + 13, w * 2, 1, '#e8f8ff');
          for (let i = 0; i < 8; i++) { const a = i * 0.785 + t, r = 14 + k * 6, cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r * 0.8; A.px(ctx, cx - 1, cy - 3 * k, 2, 6 * k, P.l); A.px(ctx, cx - 3 * k, cy - 1, 6 * k, 2, P.c); }
          A.glow(ctx, x, y, 14, '#e8f8ff', 0.15 * k);
        },
      },
      run(A, e0) {
        const p = A.p;
        A.spawn(e0, {
          life: 2.6,
          spawn(e) { e.x = p.cx; e.y = p.y + 10; A.sfx('glassCrack'); A.sfx('surge'); },
          update(e, dt, g, A) {
            const R = 320 * Math.min(1, e.t / 0.6);
            for (const t of A.targets()) { const c = A.center(t); if (Math.hypot(c.x - e.x, c.y - e.y) < R && !e.hit.has(t.uid)) { e.hit.add(t.uid); if (t.applyStatus) { t.applyStatus('freeze', e.potency); if (t.status.freeze) t.status.freeze.t = 2; } } }
            if (e.t > 1.4 && !e.shattered) {
              e.shattered = true; A.sfx('shatter'); A.flash(0.4); A.shake(6, 0.4);
              for (const t of A.targets()) if (t.status && t.status.freeze) { A.damage(e, t, 2.2, 0.6); const c = A.center(t); for (let i = 0; i < 10; i++) A.spawn(e, ICE_SHARD, { x: c.x, y: c.y, vx: A.rnd(-200, 200), vy: A.rnd(-240, 60), dmg: 0, life: 0.4 }); delete t.status.freeze; }
            }
          },
          draw(e, ctx, ox, oy, A) {
            const R = 320 * Math.min(1, e.t / 0.6), x = e.x + ox, y = e.y + oy;
            if (e.t < 1.2) A.alpha(ctx, 1 - e.t / 1.2, () => { A.ring(ctx, x, y, R, '#ffffff', R * 0.6); A.ring(ctx, x, y, R - 3, e.pal.l, R * 0.6 - 2); });
            A.alpha(ctx, (e.t < 1.4 ? Math.min(1, e.t * 2) : Math.max(0, 1 - (e.t - 1.4) * 2)) * 0.22, () => A.px(ctx, x - 400, y - 300, 800, 600, '#a8e8ff'));
          },
        }, {});
      },
    },
  };
})(window.ERX = window.ERX || {});
