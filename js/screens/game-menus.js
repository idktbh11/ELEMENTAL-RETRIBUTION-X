/*
 * In-game menus: PAUSE, INVENTORY and the end-of-content panel.
 * (The skill tree is js/screens/skill-tree.js.)
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
      // no restarting once you have your element: there's no going back
      if (this.game.awakened && this.game.awakened()) { this.buttons.splice(4, 1); this.maxH -= 24; }
      if (ERX.Admin.on()) { this.buttons.splice(this.buttons.length - 1, 0, b('ADMIN', 'gear', () => ERX.Scenes.push('admin', { game: this.game }))); this.maxH += 24; }
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
          c.elementSkills = {};
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
  ERX.Scenes.register('inventory', InventoryScreen);
  ERX.Scenes.register('demoEnd', DemoEndScreen);
})(window.ERX = window.ERX || {});
