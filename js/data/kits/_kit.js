/*
 * Shared helpers for the element kits (js/data/kits/*.js).
 *
 * A kit:
 *   { status, up, fx, block: [name, style], dash: [name, style],
 *     m1: move, s: [5 moves], ult: { name, desc, dmg, charge, run } }
 * A move (see js/game/abilities.js):
 *   { name, desc, dmg, cd, mp, kind: 'custom', life,
 *     spawn(e, g, A), update(e, dt, g, A), draw(e, ctx, ox, oy, A) }
 * An ultimate's charge: { pose, lift, draw(ctx, x, y, k, t, A, pal, cine) }
 *   k goes 0 -> 1 over the charge; x, y = your chest on screen.
 * An ultimate's run(A, e0, el): spawns the attack (e0 = where you are + damage).
 *
 * Every move has its own draw function: nothing is a recolour of anything else.
 */
(function (ERX) {
  'use strict';

  ERX.Kits = ERX.Kits || {};
  const U = ERX.U;

  const H = {
    /** Size multiplier for upgraded moves. */
    sc(e) { return e.up ? 1.4 : 1; },
    /** 0 -> 1 over the effect's life. */
    k(e) { return Math.min(1, e.t / e.life); },
    /** Put the effect in front of the player (dx forward, dy from the chest). */
    at(e, A, dx, dy) { const p = A.p; e.dir = p.facing; e.x = p.cx + e.dir * (dx || 0); e.y = p.y + 10 + (dy || 0); },
    /** Hit everything within `reach` in front of the player. */
    melee(e, A, reach, h, o) {
      const p = A.p; h = h || 20;
      return A.hit(e, { x: e.dir > 0 ? p.cx - 2 : p.cx - reach + 2, y: p.y + 10 - h / 2, w: reach, h }, Object.assign({ dir: e.dir }, o));
    },
    /** Move like a projectile; returns 'hit', 'wall', 'pierce' or null. */
    fly(e, dt, A, o) {
      o = o || {};
      if (o.gravity) e.vy += o.gravity * dt;
      if (o.homing) H.home(e, dt, A, o.homing, o.range || 170);
      e.x += e.vx * dt; e.y += e.vy * dt;
      const r = (o.r || 5) * H.sc(e);
      const hit = A.hit(e, { x: e.x - r, y: e.y - r, w: r * 2, h: r * 2 }, { dir: Math.sign(e.vx) || e.dir, kb: o.kb });
      if (hit && !o.pierce) return 'hit';
      if (A.solid(e.x, e.y)) return 'wall';
      return hit ? 'pierce' : null;
    },
    /** Steer towards the nearest target. */
    home(e, dt, A, rate, range) {
      const t = A.near(e.x, e.y, range || 170);
      if (!t) return;
      const c = A.center(t), sp = Math.hypot(e.vx, e.vy), cur = Math.atan2(e.vy, e.vx);
      let da = Math.atan2(c.y - e.y, c.x - e.x) - cur;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const na = cur + U.clamp(da, -rate * dt, rate * dt);
      e.vx = Math.cos(na) * sp; e.vy = Math.sin(na) * sp;
    },
    /** A projectile definition: draw = how it looks; o: life, r, gravity, homing, pierce, boom, onHit(e, A). */
    proj(draw, o) {
      o = o || {};
      return {
        life: o.life || 1.2,
        update(e, dt, g, A) {
          if (o.tick) o.tick(e, dt, A);
          const r = H.fly(e, dt, A, o);
          if (r === 'hit' || r === 'wall') {
            if (o.boom) A.blast(e, e.x, e.y, o.boom * H.sc(e));
            if (o.onHit) o.onHit(e, A, r);
            A.puff(e, e.x, e.y, 5);
            e.dead = true;
          }
        },
        draw,
      };
    },
    /** Rotate a point. */
    rot(x, y, a) { const c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; },
    /** The highest open point above (x, y): under the ceiling, or the top of the view. */
    sky(A, x, y) { const top = A.top(); for (let yy = y; yy > top; yy -= 4) if (A.solid(x, yy)) return yy + 6; return top; },
    /** Ground under x near the player. */
    floor(A, x) { return A.ground(x, A.p.y + 2); },
    /** Every target, nearest first, within range of (x, y). */
    nearby(A, x, y, range) {
      return A.targets().map((t) => ({ t, c: A.center(t) })).filter((o) => Math.hypot(o.c.x - x, o.c.y - y) < range).sort((a, b) => Math.hypot(a.c.x - x, a.c.y - y) - Math.hypot(b.c.x - x, b.c.y - y));
    },
    /** A solid-colour silhouette of the player (clones, afterimages), cached. */
    ghost(A, pose, facing, color) {
      const PS = ERX.PlayerSide, look = A.p.look, cv = PS.frame(look, pose, Math.min(1, (PS.FRAMES[pose] || 1) - 1), facing);
      const key = pose + facing + color;
      if (!look._ghosts) Object.defineProperty(look, '_ghosts', { value: new Map(), enumerable: false });
      const hit = look._ghosts.get(key);
      if (hit && hit.src === cv) return hit.cv;
      const out = ERX.Sprites.tint(cv, color);
      look._ghosts.set(key, { src: cv, cv: out });
      return out;
    },
    /** Draw a player silhouette with its feet at (x, y). */
    drawGhost(ctx, A, pose, x, y, facing, color) { ERX.PlayerSide.draw(ctx, H.ghost(A, pose, facing, color), x, y, facing); },
    /** A short burst of sparks in the move's colours (cosmetic). */
    sparks(A, x, y, n, col, speed) {
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = (speed || 60) * (0.4 + Math.random()); A.g.fx.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.3 + Math.random() * 0.3, color: col, size: 1, fadeOut: 0.2 }); }
    },
  };

  ERX.KitHelp = H;
})(window.ERX = window.ERX || {});
