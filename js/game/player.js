/*
 * The player character in gameplay.
 * Reads controls ONLY through ERX.Keybinds, so remapped keys just work.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, K = ERX.Keybinds, PSide = ERX.PlayerSide;
  const { Physics } = ERX.GameEngine;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);

  const TUNING = {
    speed: 92, accel: 900, airAccel: 620, friction: 1100,
    gravity: 900, maxFall: 380, jumpV: 310, jumpCut: 1.7,
    coyote: 0.1, buffer: 0.12,
    dashSpeed: 275, dashTime: 0.16, dashCooldown: 0.55,
    attackTime: 0.3, attackActive: [0.07, 0.17], attackDamage: [6, 9],
    hurtTime: 0.32, invuln: 0.9,
  };

  // pale-blue silhouettes left behind while dashing
  const ghostCache = new Map();
  function ghostSprite(look, facing) {
    const key = JSON.stringify(look) + facing;
    if (!ghostCache.has(key)) ghostCache.set(key, ERX.Sprites.tint(PSide.frame(look, 'dash', 1, facing), '#9ad8ff'));
    return ghostCache.get(key);
  }

  class Player {
    constructor(game, character) {
      this.game = game;
      this.character = character;
      this.w = 10; this.h = 22;
      this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
      this.facing = 1;
      this.onGround = false;
      this.controls = false;
      this.lying = false;
      this.coyoteT = 0; this.bufferT = 0;
      this.dashT = 0; this.dashCd = 0;
      this.attackT = 0; this.combo = 0; this.swingId = 0;
      this.hurtT = 0; this.invulnT = 0;
      this.blocking = false;
      this.blockFlash = 0;
      this.stepT = 0;
      this.animT = 0;
      this.runPhase = 0;
      this.dashLines = [];
      this.ghosts = [];
      this.ghostT = 0;
      this.stats = { movedLeft: 0, movedRight: 0, jumps: 0, dashes: 0, hits: 0, blocks: 0, platform: false };
      this.applySkills();
      this.hp = this.maxHp;
      this.mp = this.maxMp;
    }

    /** Skill tree bonuses (see js/screens/skills.js). */
    applySkills() {
      const s = this.character.skills || {};
      this.level = this.character.level || 1;
      this.xp = this.character.xp || 0;
      this.maxHp = 100 + 10 * (s.vitality || 0) + 5 * (this.level - 1);
      this.maxMp = 20 + 5 * (s.focus || 0);
      this.speedMult = 1 + 0.06 * (s.agility || 0);
      this.dashCdMult = 1 - 0.08 * (s.agility || 0);
      this.hp = Math.min(this.hp || this.maxHp, this.maxHp);
      this.mp = Math.min(this.mp || this.maxMp, this.maxMp);
    }

    /** XP needed to go from one level to the next. */
    static xpFor(level) { return 20 + (level - 1) * 25; }

    /** Award XP; returns how many levels were gained. */
    gainXp(n) {
      this.xp += n;
      let ups = 0;
      while (this.xp >= Player.xpFor(this.level)) {
        this.xp -= Player.xpFor(this.level);
        this.level++;
        ups++;
      }
      this.character.level = this.level;
      this.character.xp = this.xp;
      if (ups) {
        this.applySkills();
        this.hp = this.maxHp;
      }
      ERX.Saves.update(this.character);
      return ups;
    }

    get cx() { return this.x + this.w / 2; }
    get feet() { return this.y + this.h; }
    get attacking() { return this.attackT > 0; }

    placeAt(px, feetY) {
      this.x = px - this.w / 2;
      this.y = feetY - this.h;
      this.vx = this.vy = 0;
    }

    /** Called by enemies/projectiles. Returns 'blocked' | 'hit' | 'ignored'. */
    /** Dashing makes you intangible: nothing can hit you mid-dash. */
    get intangible() { return this.dashT > 0 || this.dashGrace > 0; }

    /** The character's look, plus any armour they're wearing. */
    get look() {
      const a = ERX.Armor && ERX.Armor.get(this.character.armor);
      if (!a) return this.character.look;
      if (!this._lookA || this._lookA.armor !== a.color || this._lookBase !== this.character.look) {
        this._lookBase = this.character.look;
        this._lookA = Object.assign({}, this.character.look, { armor: a.color });
      }
      return this._lookA;
    }

    takeHit(damage, fromX) {
      if (this.intangible) {
        if (!this.dodgeShown) { this.dodgeShown = true; this.game.floatText(this.cx, this.y - 6, 'DODGE!', '#a8f0ff'); }
        return 'ignored';
      }
      const fromFront = (fromX - this.cx) * this.facing > 0;
      if (this.blocking && fromFront) {
        this.blockFlash = 1;
        this.stats.blocks++;
        this.vx = -this.facing * 60;
        sfx('block');
        return 'blocked';
      }
      if (this.invulnT > 0) return 'ignored';
      // armour soaks some of every hit (always at least 1 gets through)
      const armor = ERX.Armor && ERX.Armor.get(this.character.armor);
      if (armor) damage = Math.max(1, damage - armor.def);
      // nobody dies in the tutorial (the Immortality Stone sees to that, later)
      this.hp = Math.max(this.game.allowDeath ? 0 : 1, this.hp - damage);
      this.hurtT = TUNING.hurtTime;
      this.invulnT = TUNING.invuln;
      this.vx = (this.cx < fromX ? -1 : 1) * 140;
      this.vy = -150;
      sfx('hurt');
      ERX.FX.shake(2, 0.2);
      this.game.floatText(this.cx, this.y - 4, '-' + damage, '#ff6a4f');
      return 'hit';
    }

    /** Sent flying (cutscenes): no damage, just physics and dignity loss. */
    fling(vx, vy) {
      this.hurtT = 1.6;
      this.flungT = 1.6;
      this.dashT = 0;
      this.attackT = 0;
      this.vx = vx;
      this.vy = vy;
      this.onGround = false;
    }

    update(dt) {
      const level = this.game.level;
      this.animT += dt;
      this.blockFlash = Math.max(0, this.blockFlash - dt * 4);
      this.invulnT = Math.max(0, this.invulnT - dt);
      this.dashCd = Math.max(0, this.dashCd - dt);
      this.dashGrace = Math.max(0, (this.dashGrace || 0) - dt);
      this.coyoteT = Math.max(0, this.coyoteT - dt);
      this.bufferT = Math.max(0, this.bufferT - dt);

      if (this.lying) {
        this.vx = 0;
        this.vy = Math.min(this.vy + TUNING.gravity * dt, TUNING.maxFall);
        Physics.move(level, this, dt);
        return;
      }

      const can = this.controls;
      const left = can && K.isDown('moveLeft'), right = can && K.isDown('moveRight');
      const dir = (right ? 1 : 0) - (left ? 1 : 0);
      this.blocking = can && K.isDown('block') && this.dashT <= 0 && this.hurtT <= 0;
      if (can && K.wasPressed('jump')) this.bufferT = TUNING.buffer;

      const wasGround = this.onGround;
      const fallSpeed = this.vy;

      if (this.hurtT > 0) {
        this.hurtT -= dt;
        this.vx = U.approach(this.vx, 0, this.flungT > 0 ? 1.2 : 4, dt);
        this.vy = Math.min(this.vy + TUNING.gravity * dt, TUNING.maxFall);
        this.flungT = Math.max(0, (this.flungT || 0) - dt);
      } else if (this.dashT > 0) {
        this.dashT -= dt;
        this.vx = this.facing * TUNING.dashSpeed;
        this.vy = 0;
        this.ghostT -= dt;
        if (this.ghostT <= 0) {
          this.ghostT = 0.03;
          this.ghosts.push({ x: this.cx, y: this.feet, facing: this.facing, t: 0.25 });
        }
        if (this.dashT <= 0) { this.vx = this.facing * TUNING.speed * this.speedMult; this.dashGrace = 0.06; }
      } else {
        // --- run ---
        let max = TUNING.speed * this.speedMult;
        if (this.blocking) max *= 0.35;
        if (this.attacking && this.onGround) max *= 0.35;
        if (dir !== 0) {
          if (!this.attacking) this.facing = dir;
          const acc = this.onGround ? TUNING.accel : TUNING.airAccel;
          this.vx = U.clamp(this.vx + dir * acc * dt, -max, max);
          if (Math.abs(this.vx) > max) this.vx = Math.sign(this.vx) * max;
        } else {
          const f = TUNING.friction * dt;
          this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f;
        }
        // --- jump (buffered, with coyote time) ---
        if (this.bufferT > 0 && (this.onGround || this.coyoteT > 0) && !this.blocking) {
          this.vy = -TUNING.jumpV;
          this.bufferT = 0;
          this.coyoteT = 0;
          this.onGround = false;
          this.stats.jumps++;
          sfx('jump');
          this.game.dust(this.cx, this.feet, 4);
        }
        // variable jump height: let go early for a short hop
        const g = TUNING.gravity * (this.vy < 0 && !(can && K.isDown('jump')) ? TUNING.jumpCut : 1);
        this.vy = Math.min(this.vy + g * dt, TUNING.maxFall);

        // --- dash ---
        if (can && K.wasPressed('dash') && this.dashCd <= 0 && !this.blocking) {
          if (dir !== 0) this.facing = dir;
          this.dashT = TUNING.dashTime;
          this.dashCd = TUNING.dashCooldown * this.dashCdMult;
          this.attackT = 0;
          this.stats.dashes++;
          this.dodgeShown = false;
          sfx('dash');
          ERX.FX.shake(0.8, 0.08);
          this.game.dust(this.cx, this.feet, 8);
          this.ghostT = 0;
        }
        // --- attack ---
        if (can && K.wasPressed('attack') && this.attackT <= 0 && !this.blocking && this.dashT <= 0) {
          this.attackT = TUNING.attackTime;
          this.swingId++;
          this.combo = (this.combo + 1) % 3;
          sfx('swing');
          if (this.onGround) this.vx += this.facing * 40;
        }
      }

      if (this.attackT > 0) {
        this.attackT -= dt;
        const el = TUNING.attackTime - this.attackT;
        if (el >= TUNING.attackActive[0] && el <= TUNING.attackActive[1]) {
          // every target can be hit once per swing (so one punch can hit a crowd)
          const box = { x: this.facing > 0 ? this.x + this.w - 2 : this.x - 16, y: this.y + 1, w: 18, h: 18 };
          const dmg = (this.combo === 2 ? TUNING.attackDamage[1] : TUNING.attackDamage[0]) + Math.floor((this.level - 1) / 2);
          this.game.playerAttack(box, dmg, this.facing, this.combo === 2, this.swingId);
        }
      }

      const prevX = this.x;
      Physics.move(level, this, dt);
      const moved = this.x - prevX;
      if (moved < 0) this.stats.movedLeft -= moved; else this.stats.movedRight += moved;
      if (this.onGround) this.coyoteT = TUNING.coyote;
      if (this.onGround && this.onPlatform) this.stats.platform = true;

      if (!wasGround && this.onGround && fallSpeed > 160) {
        sfx('land');
        this.game.dust(this.cx, this.feet, 6);
      }
      // run cycle advances with distance travelled; footsteps land on the contact frames
      if (this.onGround && Math.abs(this.vx) > 15 && this.dashT <= 0) {
        const before = Math.floor(this.runPhase);
        this.runPhase += (Math.abs(this.vx) * dt) / 5.5;
        const after = Math.floor(this.runPhase);
        if (after !== before && (after % 6 === 0 || after % 6 === 3)) {
          sfx('step', { minGap: 0.08 });
          if (Math.abs(this.vx) > 70 && Math.random() < 0.5) this.game.dust(this.cx - this.facing * 4, this.feet, 1);
        }
      } else if (this.onGround) {
        this.runPhase = 0;
      }
      // dash speed lines
      if (this.dashT > 0 && Math.random() < 0.9) {
        this.dashLines.push({ x: this.cx - this.facing * 8, y: this.y + 3 + Math.random() * (this.h - 6), len: 6 + Math.random() * 10, t: 0.18, facing: this.facing });
      }
      for (const l of this.dashLines) { l.t -= dt; l.x -= l.facing * 40 * dt; }
      this.dashLines = this.dashLines.filter((l) => l.t > 0);

      for (const gh of this.ghosts) gh.t -= dt;
      this.ghosts = this.ghosts.filter((g) => g.t > 0);
    }

    pose() {
      if (this.lying) return ['lie', 0];
      if (this.hurtT > 0) return ['hurt', 0];
      if (this.dashT > 0) {
        const el = TUNING.dashTime - this.dashT;
        return ['dash', el < 0.035 ? 0 : 1 + (Math.floor(el * 28) % 2)];
      }
      if (this.attackT > 0) {
        const p = 1 - this.attackT / TUNING.attackTime;
        return ['attack', p < 0.22 ? 0 : p < 0.6 ? 1 : 2];
      }
      if (this.blocking) return ['block', 0];
      if (!this.onGround) return [this.vy < 0 ? 'jump' : 'fall', 0];
      if (Math.abs(this.vx) > 15) return ['run', Math.floor(this.runPhase) % 6];
      return ['idle', Math.floor(this.animT * 1.6) % 2];
    }

    render(ctx, cam) {
      const ox = -cam.ix, oy = -cam.iy;
      // dash afterimages
      for (const g of this.ghosts) {
        ctx.globalAlpha = (g.t / 0.25) * 0.55;
        PSide.draw(ctx, ghostSprite(this.look, g.facing), g.x + ox, g.y + oy, g.facing);
      }
      ctx.globalAlpha = 1;
      // speed lines
      for (const l of this.dashLines) {
        ctx.fillStyle = 'rgba(220,240,255,' + (l.t / 0.18 * 0.8).toFixed(2) + ')';
        ctx.fillRect(Math.round(l.facing > 0 ? l.x - l.len : l.x) + ox, Math.round(l.y) + oy, Math.round(l.len), 1);
      }
      if (this.invulnT > 0 && Math.floor(this.invulnT * 20) % 2 === 0 && this.hurtT <= 0) return;
      const [pose, frame] = this.pose();
      const cv = PSide.frame(this.look, pose, frame, this.facing);
      PSide.draw(ctx, cv, Math.round(this.cx) + ox, Math.round(this.feet) + oy, this.facing, pose === 'lie');
      // block shield shimmer (generic, element-free)
      if (this.blocking || this.blockFlash > 0) {
        const sx = Math.round(this.cx + this.facing * 9) + ox, sy = Math.round(this.y + 2) + oy;
        ctx.fillStyle = this.blockFlash > 0 ? '#ffffff' : 'rgba(200,220,255,0.6)';
        for (let i = 0; i < 18; i++) {
          const bend = Math.round(Math.sin((i / 17) * Math.PI) * 2) * this.facing;
          if ((i + Math.floor(this.animT * 12)) % 3 !== 0 || this.blockFlash > 0) ctx.fillRect(sx + bend, sy + i, 1, 1);
        }
      }
      // punch swoosh
      if (this.attackT > 0) {
        const p = 1 - this.attackT / TUNING.attackTime;
        if (p > 0.2 && p < 0.65) {
          const sx = Math.round(this.cx + this.facing * 12) + ox, sy = Math.round(this.y + 9) + oy;
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          for (let i = 0; i < 7; i++) {
            const a = (-0.9 + (i / 6) * 1.8);
            ctx.fillRect(sx + Math.round(Math.cos(a) * 7 * this.facing), sy + Math.round(Math.sin(a) * 7), 1, 1);
          }
        }
      }
    }
  }

  Player.TUNING = TUNING;
  ERX.Player = Player;
})(window.ERX = window.ERX || {});
