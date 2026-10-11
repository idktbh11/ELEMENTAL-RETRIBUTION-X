/*
 * In-game menus: PAUSE, SKILL TREE, INVENTORY and the end-of-content panel.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme;
  const { Button, FocusGroup } = ERX.UI;
  const sfx = (n, o) => ERX.Audio.playSfx(n, o);

  // ================================================================ PAUSE
  class PauseScreen extends ERX.PanelScreen {
    enter(p) {
      this.game = p.game;
      this.maxW = 200;
      this.maxH = 182;
      const b = (label, icon, fn) => new Button({ label, icon, onActivate: fn });
      this.buttons = [
        b('RESUME', 'play', () => this.back()),
        b('SKILL TREE', 'star', () => ERX.Scenes.replace('skills', { game: this.game })),
        b('INVENTORY', 'keys', () => ERX.Scenes.replace('inventory', { game: this.game })),
        b('SETTINGS', 'gear', () => ERX.Scenes.push('settings')),
        b('RESTART', 'reset', () => this._restart()),
        b('QUIT TO MENU', 'back', () => this._quit()),
      ];
      this.group = new FocusGroup();
      this.group.set(this.buttons);
    }
    _restart() {
      ERX.Scenes.push('confirm', {
        title: 'RESTART?', message: 'Wipe ALL progress and start over in the cave? Level, XP, skills, gold, armor and your element are all reset. Only your looks survive.',
        yes: 'RESTART', no: 'CANCEL', danger: true,
        onYes: () => {
          const c = this.game.character;
          // a true fresh start: everything except name + looks
          c.progress = { stage: 'new' };
          c.level = 1;
          c.xp = 0;
          c.skills = { vitality: 0, focus: 0, agility: 0 };
          c.skillPoints = 0;
          c.gold = 0;
          c.armor = null;
          c.armorOwned = [];
          delete c.element;
          ERX.Saves.update(c);
          ERX.Scenes.transition('dissolve', 0.9, () => {
            const s = ERX.Scenes.stack;
            while (s.length && s[s.length - 1].id !== 'game') s.pop().exit();
            const g = s.pop();
            if (g) g.exit();
            s.push(ERX.Scenes._create('game', { character: c }));
          });
        },
      });
    }
    _quit() {
      const s = ERX.Scenes.stack;
      ERX.Scenes.transition('dissolve', 0.9, () => {
        // remove the pause menu and the game, landing on the character list
        while (s.length && s[s.length - 1].id !== 'game') { const x = s.pop(); x.exit(); }
        const g = s.pop();
        if (g) g.exit();
        const top = ERX.Scenes.top();
        if (top) top.resume();
      });
    }
    update(dt, input, active) {
      if (this.handleBack(input, active)) return;
      this.group.update(dt, input, active);
    }
    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      T.drawPanel(ctx, p.x, p.y, p.w, p.h);
      T.drawTitlePlate(ctx, p.x + p.w / 2, p.y - 10, 'PAUSED');
      this.buttons.forEach((b, i) => b.setRect(p.x + 18, p.y + 20 + i * 24, p.w - 36, 18));
      this.group.render(ctx);
    }
  }

  // =========================================================== SKILL TREE
  const BRANCHES = [
    { id: 'vitality', name: 'VITALITY', color: '#e0403a', icon: '♥', per: '+10 MAX HP', desc: ['Tougher skin.', 'Even tougher skin.', 'Basically a rock now.'] },
    { id: 'focus', name: 'FOCUS', color: '#3a8aff', icon: '★', per: '+5 MAX MP', desc: ['Think harder.', 'Think even harder.', 'Big brain energy.'] },
    { id: 'agility', name: 'AGILITY', color: '#72e05a', icon: '→', per: '+6% SPEED, FASTER DASH', desc: ['Light on your feet.', 'Lighter on your feet.', 'Feet? Optional.'] },
  ];
  const TIERS = 3;

  class SkillsScreen extends ERX.PanelScreen {
    enter(p) {
      this.game = p.game;
      this.c = this.game.character;
      this.maxW = 380;
      this.maxH = 250;
      this.col = 0; this.row = 0;
      this.flash = {};
      this.backBtn = new Button({ label: 'BACK', icon: 'back', sound: null, onActivate: () => this.back() });
      this.onBack = false;
    }
    _level(b) { return this.c.skills[b.id] || 0; }
    _buy() {
      const br = BRANCHES[this.col];
      const lvl = this._level(br);
      if (this.row !== lvl) {
        sfx('deny');
        ERX.Toast.show(this.row < lvl ? 'Already learned. You are welcome.' : 'Learn the skills below it first.', { color: '#ff8a6a' });
        return;
      }
      if ((this.c.skillPoints || 0) <= 0) {
        sfx('deny');
        ERX.Toast.show('No skill points. Get stronger. Or wait for the Voice to feel generous.', { color: '#ff8a6a' });
        return;
      }
      this.c.skillPoints--;
      this.c.skills[br.id] = lvl + 1;
      ERX.Saves.update(this.c);
      this.game.player.applySkills();
      this.flash[br.id + lvl] = 1;
      sfx('star');
      ERX.FX.shake(1, 0.15);
      ERX.Toast.show(br.name + ' ' + (lvl + 1) + ' learned! ' + br.per + '.', { color: br.color });
    }
    update(dt, input, active) {
      for (const k of Object.keys(this.flash)) this.flash[k] = Math.max(0, this.flash[k] - dt * 2);
      if (this.handleBack(input, active)) return;
      if (!active) return;
      if (ERX.Keybinds.wasPressed('skills')) { this.back(); return; }
      for (const a of input.actions) {
        if (this.onBack) {
          if (a === 'up') { this.onBack = false; sfx('move'); }
          else if (a === 'confirm') this.backBtn.activate();
          continue;
        }
        if (a === 'left') { this.col = (this.col + 2) % 3; sfx('move'); }
        if (a === 'right') { this.col = (this.col + 1) % 3; sfx('move'); }
        if (a === 'up') { if (this.row < TIERS - 1) { this.row++; sfx('move'); } else this._pokeElement(); }
        if (a === 'down') { if (this.row > 0) { this.row--; sfx('move'); } else { this.onBack = true; sfx('move'); } }
        if (a === 'confirm') this._buy();
      }
      // mouse
      const m = input.mouse;
      if (this.nodes) {
        for (const n of this.nodes) {
          const hit = m.x >= n.x && m.x < n.x + n.w && m.y >= n.y && m.y < n.y + n.h;
          if (hit && m.moved && (n.col !== this.col || n.row !== this.row || this.onBack)) { this.col = n.col; this.row = n.row; this.onBack = false; sfx('hover'); }
          if (hit && m.pressed[0]) { this.col = n.col; this.row = n.row; this.onBack = false; this._buy(); }
        }
        const er = this.elementRect;
        if (er && m.pressed[0] && m.x >= er.x && m.x < er.x + er.w && m.y >= er.y && m.y < er.y + er.h) this._pokeElement();
      }
      const b = this.backBtn;
      if (m.moved && b.contains(m.x, m.y)) this.onBack = true;
      if (m.pressed[0] && b.contains(m.x, m.y)) b.activate();
      b.update(dt, this.onBack);
    }
    _pokeElement() {
      sfx('deny', { minGap: 0.2 });
      ERX.Toast.show(ERX.Elements.get(this.c.element) ? 'ELEMENT SKILLS: still being built. Your element is doing stretches.' : 'ELEMENT SKILLS: locked until your element reveals itself. It is shy.', { color: '#c89aff' });
    }
    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      T.drawPanel(ctx, p.x, p.y, p.w, p.h);
      T.drawTitlePlate(ctx, p.x + p.w / 2, p.y - 10, 'SKILL TREE');
      const pts = this.c.skillPoints || 0;
      F.draw(ctx, 'SKILL POINTS: ' + (pts > 0 ? '{gold}' : '{gray}') + pts + '{/}', p.x + 14, p.y + 16, { color: T.text });

      // element core (locked)
      const ex = p.x + p.w / 2, ey = p.y + 38;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 2);
      const ew = 104, eh = 30;
      this.elementRect = { x: ex - ew / 2, y: ey - 4, w: ew, h: eh };
      T.rect(ctx, ex - ew / 2, ey - 4, ew, eh, T.ink);
      T.rect(ctx, ex - ew / 2 + 1, ey - 3, ew - 2, eh - 2, ERX.Color.mix('#2a1840', '#4a2a70', pulse));
      ERX.Sprites.drawIcon(ctx, 'lock', ex - 4, ey, '#c89aff', '#ffd34d');
      const el = ERX.Elements.get(this.c.element);
      F.draw(ctx, el ? 'ELEMENT: {el' + el.id + '}' + el.name.toUpperCase() + '{/}' : 'ELEMENT: ???', ex, ey + 10, { color: '#e0c8ff', align: 'center' });
      F.draw(ctx, el ? '{rar' + el.rarity + '}' + ERX.Elements.rarityOf(el).name.toUpperCase() + '{/} - skills coming soon' : 'not revealed yet', ex, ey + 19, { color: T.textMute, align: 'center' });

      // branches
      this.nodes = [];
      const colW = Math.floor((p.w - 40) / 3);
      const nodeS = 22;
      const baseY = p.y + p.h - 70;
      BRANCHES.forEach((br, ci) => {
        const cx = p.x + 20 + colW * ci + colW / 2;
        const lvl = this._level(br);
        // trunk line up to the element core
        T.rect(ctx, cx, ey + eh - 4, 1, baseY - (ey + eh - 4), lvl > 0 ? br.color : '#2e3354');
        for (let r = 0; r < TIERS; r++) {
          const ny = baseY - r * 34 - nodeS / 2;
          const nx = Math.round(cx - nodeS / 2);
          const learned = r < lvl, available = r === lvl;
          const sel = !this.onBack && this.col === ci && this.row === r;
          this.nodes.push({ x: nx, y: ny, w: nodeS, h: nodeS, col: ci, row: r });
          T.rect(ctx, nx - 1, ny - 1, nodeS + 2, nodeS + 2, sel ? T.gold : T.ink);
          T.rect(ctx, nx, ny, nodeS, nodeS, learned ? br.color : available ? '#2a3470' : '#161b3a');
          T.rect(ctx, nx, ny, nodeS, 1, learned ? ERX.Color.shade(br.color, 0.35) : '#3a4783');
          const fl = this.flash[br.id + r] || 0;
          if (fl > 0) { ctx.fillStyle = 'rgba(255,255,255,' + fl.toFixed(2) + ')'; ctx.fillRect(nx, ny, nodeS, nodeS); }
          F.draw(ctx, br.icon, nx + nodeS / 2, ny + 7, { color: learned ? '#ffffff' : available ? br.color : '#3e4470', align: 'center' });
          if (available && pts > 0 && Math.floor(this.time * 3) % 2 === 0) T.rect(ctx, nx + nodeS - 4, ny + 1, 3, 3, T.gold);
        }
        F.draw(ctx, br.name, cx, baseY + 16, { color: br.color, align: 'center', shadow: T.ink });
        F.draw(ctx, lvl + '/' + TIERS, cx, baseY + 26, { color: T.textMute, align: 'center' });
      });

      // description of the selected node
      const br = BRANCHES[this.col];
      const lvl = this._level(br);
      let info;
      if (this.onBack) info = 'Back to the game.';
      else if (this.row < lvl) info = br.name + ' ' + (this.row + 1) + ': ' + br.desc[this.row] + ' (learned)';
      else if (this.row === lvl) info = br.name + ' ' + (this.row + 1) + ': ' + br.desc[this.row] + ' ' + br.per + '. Cost: 1 point.';
      else info = br.name + ' ' + (this.row + 1) + ': locked. Learn the one below first.';
      F.draw(ctx, info, p.x + p.w / 2, p.y + p.h - 34, { color: T.textDim, align: 'center' });
      this.backBtn.setRect(p.x + p.w / 2 - 40, p.y + p.h - 22, 80, 16);
      this.backBtn.render(ctx, this.onBack);
    }
  }

  // ============================================================ INVENTORY
  class InventoryScreen extends ERX.PanelScreen {
    enter(p) {
      this.game = p.game;
      this.maxW = 340;
      this.maxH = 220;
      this.backBtn = new Button({ label: 'BACK', icon: 'back', sound: null, onActivate: () => this.back() });
      this.group = new FocusGroup();
      this.group.set([this.backBtn]);
    }
    update(dt, input, active) {
      if (this.handleBack(input, active)) return;
      if (active && ERX.Keybinds.wasPressed('inventory')) { this.back(); return; }
      this.group.update(dt, input, active);
    }
    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      T.drawPanel(ctx, p.x, p.y, p.w, p.h);
      T.drawTitlePlate(ctx, p.x + p.w / 2, p.y - 10, 'INVENTORY');
      const c = this.game.character;
      const D = ERX.Data.character;
      // equipment column
      const ex = p.x + 16;
      F.draw(ctx, 'EQUIPPED', ex, p.y + 18, { color: T.gold });
      const eq = [['WEAPON', 'Fists', 'Free. Reliable. Slightly bruised.'], ['OUTFIT', D.outfits[c.look.outfit], 'Comfy.'], ERX.Armor.get(c.armor) ? ['ARMOR', ERX.Armor.get(c.armor).name + ' (+' + ERX.Armor.get(c.armor).def + ' DEF)', ''] : ['ARMOR', 'None', ''], ERX.Elements.get(c.element) ? ['ELEMENT', ERX.Elements.get(c.element).name + ' (' + ERX.Elements.rarityOf(c.element).name + ')', ERX.Elements.get(c.element).desc] : ['ELEMENT', '???', 'Pending.']];
      eq.forEach(([k, v, d], i) => {
        const y = p.y + 32 + i * 22;
        T.rect(ctx, ex, y, 18, 18, T.ink); T.rect(ctx, ex + 1, y + 1, 16, 16, '#1c2348');
        F.draw(ctx, k, ex + 24, y, { color: T.textMute });
        F.draw(ctx, v, ex + 24, y + 9, { color: '#ffffff' });
        void d;
      });
      // bag grid
      const gx = p.x + 130, gy = p.y + 30, cs = 20;
      F.draw(ctx, 'BAG', gx, p.y + 18, { color: T.gold });
      for (let r = 0; r < 4; r++) for (let col = 0; col < 8; col++) {
        const x = gx + col * (cs + 2), y = gy + r * (cs + 2);
        if (x + cs > p.x + p.w - 10) continue;
        T.rect(ctx, x, y, cs, cs, T.ink);
        T.rect(ctx, x + 1, y + 1, cs - 2, cs - 2, '#161b3a');
        T.rect(ctx, x + 1, y + 1, cs - 2, 1, '#222a58');
      }
      F.draw(ctx, 'Empty. You woke up in a cave. What did you expect, a sword?', p.x + p.w / 2, p.y + p.h - 48, { color: T.textDim, align: 'center' });
      const gold = c.gold || 0;
      F.draw(ctx, 'GOLD: ' + gold + 'G' + (gold ? '' : '. Shocking.'), p.x + p.w / 2, p.y + p.h - 37, { color: '#ffd34d', align: 'center' });
      this.backBtn.setRect(p.x + p.w / 2 - 40, p.y + p.h - 23, 80, 16);
      this.group.render(ctx);
    }
  }

  // ========================================================== DEMO END
  class DemoEndScreen extends ERX.PanelScreen {
    enter(p) {
      this.game = p.game;
      this.p = p;
      this.maxW = 300;
      this.maxH = 180;
      this.stayBtn = new Button({ label: p.stay || 'KEEP EXPLORING', sound: null, onActivate: () => {
        sfx('back');
        if (this.game.state === 'reveal') this.game.leaveReveal();
        else if (this.game.state === 'elevator') this.game.leaveElevator();
        else this.game.player.x -= 24;
        ERX.Scenes.pop();
      } });
      this.menuBtn = new Button({ label: 'MAIN MENU', icon: 'back', onActivate: () => this._menu() });
      this.stayBtn.navRight = this.menuBtn;
      this.menuBtn.navLeft = this.stayBtn;
      this.group = new FocusGroup();
      this.group.set([this.stayBtn, this.menuBtn]);
      sfx('thud');
      ERX.FX.shake(2, 0.3);
    }
    _menu() {
      const s = ERX.Scenes.stack;
      ERX.Scenes.transition('dissolve', 1, () => {
        while (s.length > 1) { const x = s.pop(); x.exit(); }
        const top = ERX.Scenes.top();
        if (top) top.resume();
      });
    }
    update(dt, input, active) {
      if (active && input.hasAction('back')) { input.consumeAction('back'); this.stayBtn.activate(); return; }
      this.group.update(dt, input, active);
    }
    render(ctx) {
      const W = ERX.Display.width, H = ERX.Display.height;
      this.drawDim(ctx, W, H);
      const p = this.panel(W, H);
      T.drawPanel(ctx, p.x, p.y, p.w, p.h);
      T.drawTitlePlate(ctx, p.x + p.w / 2, p.y - 10, this.p.title || 'ROAD CLOSED');
      if (ERX.Slime) {
        const sl = ERX.Slime(this.time % 4 < 0.3 ? ERX.Color.ELEMENTS[Math.floor(this.time) % 6] : '#8a90b0', Math.floor(this.time * 2) % 2);
        ctx.drawImage(sl, Math.round(p.x + p.w / 2 - sl.width / 2), p.y + 18);
      }
      F.draw(ctx, 'Not here yet, be patient >:(', p.x + p.w / 2, p.y + 52, { scale: 1, color: '#ffffff', align: 'center', outline: T.ink });
      const lines = F.wrap(this.p.message || 'The rest of ELEMENTAL RETRIBUTION X is still being built. You reached the end of what exists. Impressive. Slightly sad.', p.w - 30);
      lines.forEach((l, i) => F.draw(ctx, l, p.x + p.w / 2, p.y + 68 + i * 10, { color: T.textDim, align: 'center' }));
      this.stayBtn.setRect(p.x + p.w / 2 - 124, p.y + p.h - 24, 118, 16);
      this.menuBtn.setRect(p.x + p.w / 2 + 6, p.y + p.h - 24, 118, 16);
      this.group.render(ctx);
    }
  }

  ERX.Scenes.register('pause', PauseScreen);
  ERX.Scenes.register('skills', SkillsScreen);
  ERX.Scenes.register('inventory', InventoryScreen);
  ERX.Scenes.register('demoEnd', DemoEndScreen);
})(window.ERX = window.ERX || {});
