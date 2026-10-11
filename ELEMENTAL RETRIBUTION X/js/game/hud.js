/*
 * Gameplay HUD: portrait + name, HP / MP bars, element (??? until revealed), objectives,
 * boss bar, warning banner, the Voice's side comments, interact prompts.
 */
(function (ERX) {
  'use strict';

  const U = ERX.U, F = ERX.Font, T = ERX.UITheme;

  function bar(ctx, x, y, w, h, frac, col, dark) {
    T.rect(ctx, x - 1, y - 1, w + 2, h + 2, T.ink);
    T.rect(ctx, x, y, w, h, '#1a1428');
    const fw = Math.round(w * U.clamp(frac, 0, 1));
    T.rect(ctx, x, y, fw, h, col);
    T.rect(ctx, x, y, fw, 1, ERX.Color.shade(col, 0.35));
    T.rect(ctx, x, y + h - 1, fw, 1, dark);
    for (let sx = x + 6; sx < x + w; sx += 6) T.rect(ctx, sx, y, 1, h, 'rgba(0,0,0,0.25)');
  }

  function render(ctx, W, H, g) {
    const p = g.player;
    const a = g.hudAlpha;
    if (a <= 0.01) return;
    ctx.globalAlpha = a;

    // ---- portrait + bars ----
    const x = 6, y = 6;
    T.rect(ctx, x, y, 24, 30, T.ink);
    T.rect(ctx, x + 1, y + 1, 22, 28, '#1c2348');
    const face = ERX.PlayerSprite.idleFrame(g.character.look, g.t);
    ERX.PlayerSprite.draw(ctx, face, x + 12, y + 28, 1);
    const nameW = F.draw(ctx, g.character.name, x + 30, y + 1, { color: '#ffffff', outline: T.ink });
    F.draw(ctx, 'LV ' + p.level, x + 36 + nameW, y + 1, { color: '#ffd34d', outline: T.ink });
    const need = ERX.Player.xpFor(p.level);
    T.rect(ctx, x + 30, y + 34, 70, 2, T.ink);
    T.rect(ctx, x + 30, y + 34, Math.round(70 * U.clamp(p.xp / need, 0, 1)), 2, '#a8f0ff');
    // gold
    T.rect(ctx, x + 1, y + 34, 5, 5, T.ink); T.rect(ctx, x + 2, y + 35, 3, 3, '#ffd34d'); T.rect(ctx, x + 2, y + 35, 1, 1, '#fff6c0');
    F.draw(ctx, (g.character.gold || 0) + 'G', x + 8, y + 33, { color: '#ffd34d', outline: T.ink });
    bar(ctx, x + 30, y + 11, 70, 5, g.hpShown / p.maxHp, '#e0403a', '#8a1e1e');
    F.draw(ctx, Math.ceil(p.hp) + '/' + p.maxHp, x + 104, y + 10, { color: '#ffb0a0', outline: T.ink });
    bar(ctx, x + 30, y + 19, 50, 4, p.mp / p.maxMp, '#3a8aff', '#1a3a8a');
    F.draw(ctx, Math.ceil(p.mp) + '/' + p.maxMp, x + 84, y + 17, { color: '#a8d0ff', outline: T.ink });
    const pulse = 0.6 + 0.4 * Math.sin(g.t * 3);
    const el = ERX.Elements.get(g.character.element);
    if (el) F.draw(ctx, 'ELEMENT: {el' + el.id + '}' + el.name.toUpperCase() + '{/}', x + 30, y + 26, { color: '#d4daf5', outline: T.ink });
    else F.draw(ctx, 'ELEMENT: ???', x + 30, y + 26, { color: ERX.Color.mix('#8a7ab0', '#d8b0ff', pulse), outline: T.ink });

    // ---- objective ----
    if (g.objective) {
      const o = g.objective;
      const label = ERX.keyText(o.label);
      let txt = label;
      if (o.progress) {
        const v = Math.min(o.goal, o.progress());
        if (o.goal > 1) txt += '  ' + Math.floor(v) + '/' + o.goal;
      }
      const done = o.doneT > 0;
      const w = F.measure(txt) + 22;
      const ox = Math.round(W / 2 - w / 2), oy = 6 + Math.round((1 - U.ease.outBack(U.clamp(o.t / 0.3, 0, 1))) * -20);
      T.rect(ctx, ox, oy, w, 14, T.ink);
      T.rect(ctx, ox + 1, oy + 1, w - 2, 12, done ? '#2a5a2a' : '#2a2350');
      T.rect(ctx, ox + 1, oy + 1, 2, 12, done ? T.good : T.gold);
      F.draw(ctx, (done ? '★ ' : '') + txt, ox + 9, oy + 4, { color: done ? '#c8ffb0' : '#ffffff' });
      if (o.progress && o.goal === 1 && !done) {
        const v = U.clamp(o.progress(), 0, 1);
        if (v > 0 && v < 1) T.rect(ctx, ox + 1, oy + 13, Math.round((w - 2) * v), 1, T.gold);
      }
    }

    // ---- boss warning + fake boss bar ----
    if (g.warning) {
      const flash = Math.floor(g.t * 5) % 2 === 0;
      T.rect(ctx, 0, Math.round(H * 0.18), W, 22, flash ? 'rgba(180,20,30,0.75)' : 'rgba(90,10,20,0.75)');
      for (let sx = -20 + Math.floor(g.t * 40) % 20; sx < W; sx += 20) {
        T.rect(ctx, sx, Math.round(H * 0.18), 10, 2, '#ffd34d');
        T.rect(ctx, sx + 10, Math.round(H * 0.18) + 20, 10, 2, '#ffd34d');
      }
      F.draw(ctx, '!! WARNING !!', W / 2, Math.round(H * 0.18) + 3, { scale: 1, color: '#ffffff', outline: '#3a0008', align: 'center' });
      F.draw(ctx, 'A TERRIFYING FOE APPROACHES', W / 2, Math.round(H * 0.18) + 12, { color: '#ffd0d0', outline: '#3a0008', align: 'center' });
    }
    if (g.bossBar) {
      const bw = Math.min(W - 60, 220), bx = Math.round(W / 2 - bw / 2), by = H - 30;
      if (!g.dialogue.active) {
        F.draw(ctx, g.bossBar.name, W / 2, by - 18, { scale: 1, color: '#ffd34d', outline: T.ink, align: 'center' });
        F.draw(ctx, g.bossBar.sub, W / 2, by - 9, { color: '#d4daf5', outline: T.ink, align: 'center' });
        bar(ctx, bx, by + 2, bw, 5, 1, '#c8d0e0', '#5e6478');
        F.draw(ctx, 'HP: YES', W / 2, by + 10, { color: T.textDim, outline: T.ink, align: 'center' });
      }
    }

    // ---- the Voice's side comments ----
    if (g.barkMsg) {
      const b = g.barkMsg;
      const k = U.clamp(Math.min(b.t / 0.2, (b.dur - b.t) / 0.3), 0, 1);
      const txt = ERX.keyText(b.text);
      const w = F.measure('???: ' + txt) + 14;
      const bx = Math.round(W - w - 8), by = H - 22;
      ctx.globalAlpha = a * k;
      T.rect(ctx, bx, by, w, 14, T.ink);
      T.rect(ctx, bx + 1, by + 1, w - 2, 12, '#2a1840');
      F.draw(ctx, '{purple}???:{/} ' + txt, bx + 7, by + 4, { color: '#e8dcff' });
      ctx.globalAlpha = a;
    }

    // ---- area banner ----
    if (g.banner) {
      const b = g.banner;
      const k = U.clamp(Math.min(b.t / 0.6, (b.dur - b.t) / 0.8), 0, 1);
      ctx.globalAlpha = a * k;
      F.draw(ctx, b.title, W / 2, Math.round(H * 0.3), { scale: 2, color: '#ffffff', outline: T.ink, shadow: '#2a3070', shadowOffset: 2, align: 'center' });
      F.draw(ctx, b.sub, W / 2, Math.round(H * 0.3) + 22, { color: '#c8d0f0', outline: T.ink, align: 'center' });
      ctx.globalAlpha = a;
    }

    // ---- interact prompt ----
    if (g.prompt && !g.dialogue.active) {
      const sx = Math.round((g.prompt.x - g.camera.x) * g.zoom), sy = Math.round((g.prompt.y - g.camera.y) * g.zoom) - 12 + Math.round(Math.sin(g.t * 5));
      const txt = ERX.keyText(g.prompt.text);
      const w = F.measure(txt) + 8;
      T.rect(ctx, sx - w / 2, sy - 1, w, 11, T.ink);
      T.rect(ctx, sx - w / 2 + 1, sy, w - 2, 9, '#2a2350');
      F.draw(ctx, txt, sx, sy + 1, { color: T.gold, align: 'center' });
    }
    ctx.globalAlpha = 1;
  }

  ERX.HUD = { render };
})(window.ERX = window.ERX || {});
