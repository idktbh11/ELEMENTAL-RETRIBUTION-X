/*
 * THE VOID — where you land after the reveal. Space in every direction and
 * no floor. (There is a floor. It's invisible. Don't think about it.)
 *
 * THE HQ — the Voice's headquarters, floating somewhere in the void. Desks,
 * a couch, staff of questionable usefulness, and Brenda's armour counter.
 *
 * ERX.Worlds.build(element) paints the 7 worlds you have to save. They are
 * different for every element (colours + surface types come from it).
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, PB = ERX.PixelBuffer, C = ERX.Color;
  const c32 = (h) => C.u32(h);
  const TS = 16;
  const { AIR, ROCK } = ERX.CaveLevel.TILES;

  const PAL = {
    rock: ['#8a7e9c', '#6a6080', '#524866', '#3c344e', '#2a2438', '#1e1a2a'],
    moss: ['#8a7e9c', '#6a6080'],
    metal: ['#a8b0c0', '#848ca0', '#5e6478', '#3e4254'],
    wood: ['#a8784a', '#7a5236', '#4a3022'],
    outline: '#120c1a',
    back: ['#0a0818', '#07061a', '#05040f', '#120a2a'],
  };

  const blank = (w, h) => ERX.makeCanvas(w, h);

  // ================================================================= VOID
  class VoidLevel extends ERX.CaveLevel {
    configure() {
      this.W = 150;
      this.H = 24;
      this.pal = PAL;
      this.sections = [];
      this.id = 'void';
    }

    build() {
      this.tiles.fill(AIR);
      // the invisible floor + invisible walls at both ends
      for (let x = 0; x < this.W; x++) for (let y = 18; y < this.H; y++) this.setTile(x, y, ROCK);
      for (let y = 0; y < this.H; y++) for (const x of [0, 1, this.W - 2, this.W - 1]) this.setTile(x, y, ROCK);

      this.floorY = 18 * TS;
      this.spawn = { x: 14 * TS, y: this.floorY };
      this.figureX = 66 * TS;     // where the Voice stands, staring at the horizon
      this.jumpX = 80 * TS;       // the jump point under world 1
      this.doorX = 96 * TS;       // the HQ door (appears later)
      this.checkpoints = [this.spawn];

      this.decor = [];
      this.lights = [];
      this.torches = [];
      this.braziers = [];
      this.signs = [{ x: 26 * TS + 8, y: this.floorY, text: 'THE VOID.\nPlease do not touch the nothing.', read: false }];
      this.chalk = [];
      this.npcs = [];
      this.enemySpawns = [];
    }

    darknessAt() { return 0; }
    renderTiles() { return blank(this.pw, this.ph); }   // the floor is invisible. obviously.

    /** Deep space: mostly dark, soft nebula clouds, lots of stars. Wide enough to never repeat. */
    renderBackground() {
      const w = Math.round(this.pw * 0.2) + 900, h = this.ph;
      const buf = new PB(w, h);
      const noise = new U.Noise(0x5eed);
      const purple = ['#05040f', '#08061a', '#0e0a26', '#160e36', '#201246', '#2c1656'].map(c32);
      const blue = ['#08102a', '#0c1838', '#122248'].map(c32);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const n = noise.fbm2(x * 0.006, y * 0.009, 4);
          const m = noise.fbm2(x * 0.004 + 50, y * 0.006 + 20, 3);
          const d = (ERX.bayer(x, y) - 0.5) * 0.06;
          let col = purple[U.clamp(Math.floor((n + d - 0.42) * 22), 0, purple.length - 1)];
          if (m + d > 0.58 && n < 0.56) col = blue[U.clamp(Math.floor((m + d - 0.58) * 25), 0, blue.length - 1)];
          buf.data[y * w + x] = col;
        }
      }
      const rng = new U.RNG(77);
      for (let i = 0; i < (w * h) / 70; i++) {
        const x = rng.int(0, w - 1), y = rng.int(0, h - 1);
        buf.set(x, y, c32(rng.chance(0.15) ? '#ffe8a0' : rng.chance(0.3) ? '#a8b8ff' : '#ffffff'));
        if (rng.chance(0.04)) { buf.set(x - 1, y, c32('#6a70b0')); buf.set(x + 1, y, c32('#6a70b0')); buf.set(x, y - 1, c32('#6a70b0')); buf.set(x, y + 1, c32('#6a70b0')); }
      }
      return buf.toCanvas();
    }
  }

  // ================================================================== HQ
  const HQ_PEOPLE = [
    { id: 'dot', x: 11.25 },
    { id: 'kev', x: 17 },
    { id: 'brenda', x: 23.75 },
    { id: 'steve', x: 32, pose: 'sit' },
    { id: 'atlas', x: 38 },
    { id: 'guide', x: 46 },
    { id: 'ron', x: 52, pose: 'punch' },
  ];

  class HqLevel extends ERX.CaveLevel {
    configure() {
      this.W = 58;
      this.H = 18;
      this.pal = PAL;
      this.sections = [];
      this.id = 'hq';
    }

    build() {
      this.tiles.fill(ROCK);
      this.air(2, this.W - 2, 4, 15);
      this.floorY = 15 * TS;
      this.spawn = { x: 6 * TS, y: this.floorY };
      this.exit = { x: 4 * TS + 8, y: this.floorY };
      this.checkpoints = [this.spawn];
      this.people = HQ_PEOPLE.map((p) => Object.assign({}, p, { x: Math.round(p.x * TS + 8), y: this.floorY }));

      this.decor = [];
      this.torches = [];
      this.braziers = [];
      this.signs = [];
      this.chalk = [];
      this.npcs = [];
      this.enemySpawns = [];
      this.lights = [];
      for (const lx of [8, 18, 28, 38, 48]) this.lights.push({ x: lx * TS + 8, y: 4 * TS + 10, r: 90, color: '#ffd8a0', flicker: false });
      this.lights.push({ x: 4 * TS + 8, y: 12 * TS, r: 40, color: '#b07aff', flicker: false, pulse: true, ref: { phase: 0 } });
    }

    darknessAt() { return 0.18; }

    renderBackground() { return blank(16, 16); }

    /** Ceiling, side walls and a wooden floor. */
    renderTiles() {
      const buf = new PB(this.pw, this.ph);
      const ink = c32('#120c1a');
      for (let ty = 0; ty < this.H; ty++) for (let tx = 0; tx < this.W; tx++) {
        if (!this.isSolid(tx, ty)) continue;
        for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) {
          const gx = tx * TS + x, gy = ty * TS + y;
          let col;
          if (ty >= 15) {
            // floor planks
            const row = Math.floor((gy - 15 * TS) / 6);
            const seam = (gx + row * 23) % 40 === 0;
            col = gy === 15 * TS ? '#d8a868' : gy === 15 * TS + 1 ? '#b8844a' : seam ? '#5a3a22' : (gy - 15 * TS) % 6 === 0 ? '#6a4628' : row % 2 ? '#8a5a36' : '#9a6a40';
            if (gy > 15 * TS + 10) col = C.shade(col, -0.35);
          } else if (ty < 4) {
            col = gy === 4 * TS - 1 ? '#120c1a' : gy === 4 * TS - 2 ? '#5a4a7a' : (gx % 64 < 6) ? '#2a2040' : '#1c1630';
          } else {
            col = (tx < 2 ? gx === 2 * TS - 1 : gx === (this.W - 2) * TS) ? '#120c1a' : (gy % 24 === 0) ? '#2a2040' : '#3a2e54';
          }
          buf.data[gy * this.pw + gx] = c32(col);
        }
      }
      void ink;
      return buf.toCanvas();
    }

    /** The back wall: windows onto space, posters, furniture. Drawn 1:1 behind everything. */
    renderBackWall() {
      const cv = blank(this.pw, this.ph);
      const ctx = cv.getContext('2d');
      const F = ERX.Font;
      const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
      const top = 4 * TS, fl = this.floorY;
      // wallpaper + wainscot
      R(2 * TS, top, (this.W - 4) * TS, fl - top, '#2a2240');
      for (let x = 2 * TS; x < (this.W - 2) * TS; x += 12) R(x, top, 1, fl - top, '#30284a');
      R(2 * TS, fl - 40, (this.W - 4) * TS, 40, '#3a2a4a');
      R(2 * TS, fl - 41, (this.W - 4) * TS, 2, '#5a4a6a');
      for (let x = 2 * TS; x < (this.W - 2) * TS; x += 24) R(x, fl - 38, 1, 36, '#2e2040');
      R(2 * TS, fl - 3, (this.W - 4) * TS, 3, '#1c1428');

      // round windows onto space
      const rng = new U.RNG(4);
      for (const wx of [7.5, 19.5, 33.5, 52.5]) {
        const cx = Math.round(wx * TS), cy = top + 46, r = 22;
        for (let y = -r - 3; y <= r + 3; y++) for (let x = -r - 3; x <= r + 3; x++) {
          const d = Math.sqrt(x * x + y * y);
          if (d <= r) R(cx + x, cy + y, 1, 1, y < -r * 0.3 ? '#0a0818' : '#120a2a');
          else if (d <= r + 3) R(cx + x, cy + y, 1, 1, d <= r + 1 ? '#c89a50' : '#7a5a2a');
        }
        for (let i = 0; i < 18; i++) {
          const a = rng.range(0, Math.PI * 2), d = rng.range(0, r - 2);
          R(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1, 1, rng.chance(0.3) ? '#a8b8ff' : '#ffffff');
        }
        R(cx - r, cy, r * 2, 1, '#7a5a2a'); R(cx, cy - r, 1, r * 2, '#7a5a2a');
      }

      // the big neon sign
      F.draw(ctx, 'HERO HQ', 26 * TS, top + 10, { scale: 2, color: '#ff8ad8', outline: '#3a0a3a', align: 'center' });
      F.draw(ctx, '(EST. ???)', 26 * TS, top + 28, { color: '#c89aff', align: 'center' });
      // posters
      const poster = (x, y, lines, col) => {
        R(x - 1, y - 1, 52, 32, '#120c1a'); R(x, y, 50, 30, col);
        lines.forEach((l, i) => F.draw(ctx, l, x + 25, y + 4 + i * 8, { color: '#120c1a', align: 'center' }));
      };
      poster(14 * TS, top + 70, ['DESTROY', 'PILLARS.', 'HYDRATE.'], '#ffd36a');
      poster(41 * TS, top + 70, ['EMPLOYEE', 'OF THE', 'MONTH: ?'], '#8ad8ff');

      // exit door (back to the void)
      const dx = 4 * TS + 8;
      R(dx - 13, fl - 46, 26, 46, '#120c1a'); R(dx - 11, fl - 44, 22, 44, '#4a2a7a');
      R(dx - 9, fl - 42, 18, 40, '#120a2a');
      for (let i = 0; i < 10; i++) R(dx - 8 + rng.int(0, 15), fl - 41 + rng.int(0, 37), 1, 1, '#ffffff');
      F.draw(ctx, 'EXIT', dx, fl - 56, { color: '#7af0a0', align: 'center' });

      // coffee machine (Kev's station)
      R(18 * TS - 1, fl - 33, 14, 33, '#120c1a'); R(18 * TS, fl - 32, 12, 32, '#5e6478'); R(18 * TS + 3, fl - 26, 6, 6, '#1c1428'); R(18 * TS + 4, fl - 30, 4, 2, '#ff6a4f');

      // armour on stands (behind Brenda's counter)
      const stand = (x, col) => {
        R(x, fl - 52, 1, 30, '#5e6478');
        R(x - 5, fl - 50, 11, 12, '#120c1a'); R(x - 4, fl - 49, 9, 10, col); R(x - 2, fl - 48, 2, 3, C.shade(col, 0.4));
        R(x - 6, fl - 51, 4, 3, col); R(x + 3, fl - 51, 4, 3, col);
        R(x - 2, fl - 56, 5, 5, '#120c1a'); R(x - 1, fl - 55, 3, 3, '#3a2e54');
      };
      stand(21 * TS, '#c8a070'); stand(26 * TS + 6, '#a8b0c0'); stand(27 * TS + 14, '#ffd34d');

      // couch (Steve's)
      R(30 * TS, fl - 22, 54, 22, '#120c1a'); R(30 * TS + 1, fl - 21, 52, 14, '#8a3a5a'); R(30 * TS + 1, fl - 9, 52, 7, '#6a2a44');
      R(30 * TS - 2, fl - 16, 6, 16, '#6a2a44'); R(30 * TS + 50, fl - 16, 6, 16, '#6a2a44');

      // Dr. Atlas' map of the worlds
      R(36 * TS, top + 56, 64, 44, '#120c1a'); R(36 * TS + 1, top + 57, 62, 42, '#1c2348');
      for (let i = 0; i < 7; i++) {
        const mx = 36 * TS + 8 + (i % 4) * 15, my = top + 66 + Math.floor(i / 4) * 18;
        R(mx - 3, my - 3, 7, 7, '#120c1a'); R(mx - 2, my - 2, 5, 5, i === 0 ? '#7af0a0' : '#5a5e7a');
      }
      F.draw(ctx, 'WORLDS', 36 * TS + 32, top + 92, { color: '#a8f0ff', align: 'center' });
      // vending machine
      R(41 * TS + 4, fl - 44, 22, 44, '#120c1a'); R(41 * TS + 5, fl - 43, 20, 42, '#c83a3a');
      R(41 * TS + 7, fl - 40, 12, 24, '#1c1428');
      for (let i = 0; i < 6; i++) R(41 * TS + 8 + (i % 3) * 4, fl - 38 + Math.floor(i / 3) * 10, 3, 6, ['#ffd36a', '#7af0e0', '#ff8ad8'][i % 3]);

      // the plant that bites
      R(48 * TS, fl - 12, 10, 12, '#120c1a'); R(48 * TS + 1, fl - 11, 8, 11, '#a85a36');
      for (const [lx, ly] of [[-4, -20], [6, -24], [12, -18], [2, -28], [-2, -14]]) { R(48 * TS + lx, fl + ly, 6, 4, '#3a8a3a'); R(48 * TS + lx + 1, fl + ly, 2, 1, '#6ad86a'); }
      R(48 * TS + 3, fl - 26, 4, 2, '#ff3a4a'); // ...teeth?

      // weights rack (Big Ron)
      R(54 * TS - 2, fl - 26, 30, 2, '#5e6478');
      for (const wx of [54 * TS, 54 * TS + 22]) { R(wx - 2, fl - 30, 6, 10, '#120c1a'); R(wx - 1, fl - 29, 4, 8, '#3a3e54'); }
      R(54 * TS - 4, fl - 24, 2, 24, '#5e6478'); R(54 * TS + 28, fl - 24, 2, 24, '#5e6478');
      return cv;
    }

    /** Desks + counters, drawn IN FRONT of the people standing behind them. */
    renderFront() {
      const cv = blank(this.pw, this.ph);
      const ctx = cv.getContext('2d');
      const F = ERX.Font;
      const R = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
      const fl = this.floorY;
      const desk = (x0, w, h, col, colTop) => { R(x0 - 1, fl - h - 1, w + 2, h + 1, '#120c1a'); R(x0, fl - h, w, h, col); R(x0, fl - h, w, 2, colTop); R(x0, fl - 2, w, 2, C.shade(col, -0.35)); };
      desk(10 * TS, 40, 11, '#6a4a7a', '#a87ab8');
      F.draw(ctx, 'HELLO', 10 * TS + 20, fl - 9, { color: '#ffd36a', align: 'center' });
      desk(22 * TS, 56, 11, '#7a5236', '#b8844a');
      F.draw(ctx, 'ARMOR', 22 * TS + 28, fl - 9, { color: '#ffd34d', align: 'center' });
      desk(44 * TS, 60, 11, '#4a2a7a', '#c89aff');
      R(44 * TS + 6, fl - 21, 18, 10, '#120c1a'); R(44 * TS + 7, fl - 20, 16, 8, '#2a3a6a'); R(44 * TS + 9, fl - 18, 12, 4, '#7af0e0');
      R(44 * TS + 40, fl - 14, 12, 3, '#f4f0ff'); R(44 * TS + 42, fl - 16, 10, 2, '#d8d0ec');
      F.draw(ctx, 'THE BOSS', 44 * TS + 30, fl - 9, { color: '#ffd34d', align: 'center' });
      return cv;
    }
  }

  // ============================================================== WORLDS
  // where the 7 worlds hang in the sky: dx = offset from world 1 (fraction of
  // the view width; world 1 hangs right above the jump point), fy = height
  const SPOTS = [
    { dx: 0, fy: 0.24, r: 18 },
    { dx: -0.72, fy: 0.2, r: 12 },
    { dx: -0.58, fy: 0.42, r: 10 },
    { dx: -0.44, fy: 0.15, r: 14 },
    { dx: -0.29, fy: 0.38, r: 11 },
    { dx: -0.15, fy: 0.13, r: 9 },
    { dx: 0.14, fy: 0.42, r: 10 },
  ];
  const ACCENTS = ['#ffffff', '#ff6a4f', '#5ab0ff', '#7af07a', '#ffd34d', '#c86aff', '#1a1430'];
  const SURFACES = ['spots', 'bands', 'craters', 'swirl', 'crystal', 'molten', 'ring'];

  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  function paintPlanet(r, base, accent, surface, seed, locked) {
    const pad = surface === 'ring' ? Math.round(r * 0.8) : 2;
    const size = r * 2 + 1 + pad * 2;
    const buf = new PB(size, size);
    const noise = new U.Noise(seed);
    const rng = new U.RNG(seed);
    const craters = [];
    for (let i = 0; i < 6; i++) craters.push({ x: rng.range(-0.7, 0.7), y: rng.range(-0.7, 0.7), r: rng.range(0.12, 0.3) });
    const o = r + pad;
    const shades = (col) => [C.shade(col, 0.35), col, C.shade(col, -0.3), C.shade(col, -0.55)];
    const A = shades(base), B = shades(accent);
    const ringBack = [], ringFront = [];
    if (surface === 'ring') {
      for (let a = 0; a < Math.PI * 2; a += 0.01) {
        for (const k of [1.35, 1.45, 1.55]) {
          const x = Math.round(Math.cos(a) * r * k), y = Math.round(Math.sin(a) * r * k * 0.28 - Math.cos(a) * r * 0.12);
          (Math.sin(a) < 0 ? ringBack : ringFront).push([x, y, k === 1.45 ? 0 : 1]);
        }
      }
    }
    const put = (x, y, col) => buf.set(o + x, o + y, c32(locked ? C.mix(C.shade(col, -0.3), '#2a2a4a', 0.3) : col));
    for (const [x, y, k] of ringBack) put(x, y, B[k + 1]);
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d2 = x * x + y * y;
      if (d2 > r * r) continue;
      const nx = x / r, ny = y / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const light = U.clamp(-nx * 0.5 - ny * 0.5 + nz * 0.7, 0, 1.2);
      let mixAcc = 0;
      switch (surface) {
        case 'spots': mixAcc = noise.fbm2(nx * 2.4 + 3, ny * 2.4 + 3, 3) > 0.52 ? 1 : 0; break;
        case 'bands': mixAcc = Math.sin((ny * 5 + (noise.n2(nx * 2, ny * 2) - 0.5) * 1.6) * Math.PI) > 0.2 ? 1 : 0; break;
        case 'craters': for (const c of craters) if ((nx - c.x) ** 2 + (ny - c.y) ** 2 < c.r * c.r) mixAcc = 1; break;
        case 'swirl': { const a = Math.atan2(ny, nx) + Math.sqrt(nx * nx + ny * ny) * 4; mixAcc = Math.sin(a * 2) > 0.3 ? 1 : 0; break; }
        case 'crystal': mixAcc = (Math.floor((nx + ny) * 3) + Math.floor((nx - ny) * 3)) % 2 === 0 ? 1 : 0; break;
        case 'molten': mixAcc = Math.abs(noise.fbm2(nx * 2 + 9, ny * 2 + 9, 3) - 0.5) < 0.05 ? 2 : 0; break;
        default: mixAcc = noise.n2(nx * 3, ny * 3) > 0.6 ? 1 : 0;
      }
      const lv = light + (ERX.bayer(x + o, y + o) - 0.5) * 0.25;
      const k = lv > 0.95 ? 0 : lv > 0.55 ? 1 : lv > 0.2 ? 2 : 3;
      let col = mixAcc === 2 ? '#ffd36a' : (mixAcc ? B : A)[k];
      if (d2 > (r - 1) * (r - 1) && nx + ny < 0) col = C.shade(col, 0.3);   // lit atmosphere rim
      put(x, y, col);
    }
    for (const [x, y, k] of ringFront) put(x, y, B[k]);
    buf.outline(c32('#05040f'));
    return buf.toCanvas();
  }

  ERX.Worlds = {
    /** The 7 worlds for an element (same element, same worlds; different element, different worlds). */
    build(el) {
      const seed = hashStr(el ? el.id : 'none');
      const rng = new U.RNG(seed);
      const surfaces = SURFACES.slice();
      for (let i = surfaces.length - 1; i > 0; i--) { const j = rng.int(0, i); [surfaces[i], surfaces[j]] = [surfaces[j], surfaces[i]]; }
      const base = el ? el.color : '#8a8aa8';
      const tint = el ? el.world.tint : '#c8c8e0';
      return SPOTS.map((s, i) => {
        const b = C.mix(base, ACCENTS[i], i === 0 ? 0 : 0.28);
        const a = C.mix(tint, ACCENTS[(i + 3) % 7], 0.35);
        const surface = surfaces[i];
        return Object.assign({}, s, {
          i, surface,
          cv: paintPlanet(s.r, b, a, surface, seed + i * 97, false),
          cvLocked: paintPlanet(s.r, b, a, surface, seed + i * 97, true),
        });
      });
    },
  };

  VoidLevel.TS = TS;
  ERX.VoidLevel = VoidLevel;
  ERX.HqLevel = HqLevel;
})(window.ERX = window.ERX || {});
