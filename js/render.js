/* Canvas renderer: 640x360 pixel-art scene, scaled up with nearest-neighbour by CSS. */
(function (XC) {
  const W = XC.W, H = XC.H, PXM = XC.PXM, PXV = XC.PXV, hash = XC.hash;
  const FONT = '8px "Press Start 2P", ui-monospace, monospace';
  const GROUND = {
    grass:  ['#79d94f', '#4fae3c', '#2f7d34'],
    dirt:   ['#d09a5c', '#a66e3c', '#7b4b2a'],
    gravel: ['#c4c1c6', '#9a97a0', '#6c6975'],
    mud:    ['#8a5d37', '#5f3d24', '#3e2716'],
    rough:  ['#b59a5c', '#8a7442', '#5c4c2c']
  };
  const THEMES = {
    fields: { sky: ['#6cc0f0', '#88cff4', '#a6dcf6', '#c6ebf2', '#eaf3cf', '#fbf0b8'], far: '#9fd0b8', mid: '#7cc07a', near: '#5fae5c', tree: 'round', dens: 0.18 },
    forest: { sky: ['#2f6f86', '#468a98', '#62a3a2', '#86bba6', '#aecfa8', '#d4e1aa'], far: '#3d7f6a', mid: '#2a6a50', near: '#1d523d', tree: 'pine', dens: 0.9 },
    champ:  { sky: ['#4f9fee', '#6cb4f2', '#8ec9f6', '#b2dcf6', '#d6ecf2', '#f2f4dc'], far: '#8fc2d8', mid: '#6bbb6d', near: '#52a653', tree: 'round', dens: 0.1 },
    hilly:  { sky: ['#34408a', '#5b4d9c', '#8f5ba0', '#c8708f', '#f09a7a', '#ffd08a'], far: '#6f5f98', mid: '#8a7a9c', near: '#5e7a58', tree: 'pine', dens: 0.25 }
  };

  XC.Renderer = function (canvas) {
    const g = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    g.imageSmoothingEnabled = false;
    const R = { fx: [], camH: 0, camX: 0, bend: 0, shake: 0 };
    const rect = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

    function gyOf(C, wx, gyP) { return gyP - (C.height(wx) - R.camH) * PXV; }

    function drawSky(th, t) {
      const bands = th.sky, bh = Math.ceil(H * 0.78 / bands.length);
      for (let i = 0; i < bands.length; i++) rect(bands[i], 0, i * bh, W, bh + 1);
      // dither seam between bands for the retro look
      for (let i = 1; i < bands.length; i++) for (let x = 0; x < W; x += 4) rect(bands[i], x + (i % 2) * 2, i * bh - 2, 2, 2);
    }
    function cloud(x, y, s, c) {
      rect(c, x, y + 2 * s, 18 * s, 4 * s); rect(c, x + 3 * s, y, 8 * s, 4 * s); rect(c, x + 9 * s, y + s, 7 * s, 4 * s);
      rect('#ffffff66', x, y + 5 * s, 18 * s, s);
    }
    function ridge(u, a, b, c) { return a + 26 * Math.sin(u / 170 + c) + 13 * Math.sin(u / 66 + c * 2) + 6 * Math.sin(u / 29 + c * 3) + b; }

    function drawTree(kind, x, base, s, th, seed) {
      if (kind === 'pine') {
        rect('#3b2a1c', x - s, base - 10 * s, 2 * s, 10 * s);
        const cols = ['#1d4a38', '#265c43', '#2f6e50'];
        for (let i = 0; i < 4; i++) { const w = (14 - i * 3) * s; rect('#10281f', x - w / 2 - 1, base - (8 + i * 6) * s - 1, w + 2, 6 * s + 2); rect(cols[i % 3], x - w / 2, base - (8 + i * 6) * s, w, 6 * s); }
      } else {
        rect('#4a3322', x - s, base - 8 * s, 2 * s, 8 * s);
        rect('#16431f', x - 8 * s - 1, base - 20 * s - 1, 16 * s + 2, 14 * s + 2);
        rect('#2f8a3a', x - 8 * s, base - 20 * s, 16 * s, 14 * s); rect('#4fb04a', x - 6 * s, base - 20 * s, 8 * s, 6 * s);
      }
    }

    // ---- main draw
    R.draw = function (st) {
      const C = st.course, th = THEMES[C.def.theme], p = st.player, t = st.t;
      // camera
      R.camH += (C.height(p.x) - R.camH) * Math.min(1, st.frameDt * 4);
      const camX = p.x - 190 / PXM; R.camX = camX;
      const gyP = 212;
      const turnAmt = C.turn(p.x) * C.turnDir(p.x);
      R.bend += (turnAmt * 90 - R.bend) * Math.min(1, st.frameDt * 3);
      const camPx = camX * PXM + R.bend;

      drawSky(th, t);
      // sun + clouds
      if (C.def.theme !== 'forest') { rect('#fff6c0', 520, 40, 22, 22); rect('#ffe88a', 524, 44, 14, 14); }
      for (let i = -1; i < 6; i++) {
        const u = i * 190 - ((camPx * 0.04 + t * 3) % 190);
        cloud(u, 26 + hash(i + Math.floor((camPx * 0.04 + t * 3) / 190)) * 50, 2, '#ffffffdd');
      }
      // layers (ridge heights are relative to the ground edge so hills stay behind the terrain)
      const cols = 321;
      const gcol = new Float32Array(cols);
      for (let i = 0; i < cols; i++) gcol[i] = gyOf(C, camX + (i * 2) / PXM, gyP);
      for (let i = 0; i < cols; i++) {
        const x = i * 2, base = XC.lerp(gcol[i], gyP, 0.75);
        const yF = base - ridge(camPx * 0.08 + x, 70, 0, 1);
        rect(th.far, x, yF, 2, H);
        if (C.def.theme === 'hilly' && ridge(camPx * 0.08 + x, 70, 0, 1) > 98) rect('#f4f4fb', x, yF, 2, 3);
        const yM = XC.lerp(gcol[i], gyP, 0.5) - ridge(camPx * 0.18 + x, 36, 0, 3.1);
        rect(th.mid, x, yM, 2, H);
      }
      // trees along the trail
      const spacing = th.tree === 'pine' ? 34 : 70;
      for (const layer of [{ f: 0.35, s: 1, a: 0.5 }, { f: 0.65, s: 1.4, a: 0.3 }]) {
        const u0 = camPx * layer.f, first = Math.floor((u0 - 20) / spacing);
        for (let i = first; i < first + W / spacing + 3; i++) {
          if (hash(i * 3.1 + layer.f) > th.dens) continue;
          const sx = i * spacing - u0 + hash(i) * 20;
          const ci = XC.clamp(Math.round(sx / 2), 0, cols - 1);
          const base = XC.lerp(gcol[ci], gyP, layer.a) + 6;
          drawTree(th.tree, sx, base, layer.s * (0.8 + hash(i + 9) * 0.5), th, i);
        }
      }
      if (C.def.theme === 'champ') drawStands(C, camX, gcol);

      // ---- ground
      for (let i = 0; i < cols - 1; i++) {
        const wx = camX + (i * 2) / PXM, y = Math.round(gcol[i]);
        const c = GROUND[C.surface(wx)];
        const nh = hash(Math.floor(wx * 3));
        rect(c[0], i * 2, y, 2, 4);
        rect(c[1], i * 2, y + 4, 2, 52);
        rect(c[2], i * 2, y + 56, 2, H);
        const sf = C.surface(wx);
        if (sf === 'grass' && nh > 0.7) rect(c[0], i * 2, y - 2, 1, 2);
        if (sf === 'gravel' && nh > 0.6) rect('#e2e0e6', i * 2, y + 8 + Math.floor(nh * 40), 2, 1);
        if (sf === 'mud') { if (nh > 0.55) rect('#a37a52', i * 2, y + 10 + Math.floor(nh * 30), 3, 1); if (nh < 0.2) rect('#2c1b0e', i * 2, y + 14, 4, 2); }
        if (sf === 'dirt' && nh > 0.8) rect('#e1b27a', i * 2, y + 12 + Math.floor(nh * 30), 2, 1);
        if (sf === 'rough') { if (nh > 0.82) { rect('#14101c', i * 2 - 1, y + 3, 5, 4); rect('#a9a29a', i * 2, y + 4, 3, 2); } if (nh < 0.1) rect('#4a3322', i * 2, y + 1, 2, 3); }
        // shoreline of the trail: soft dark band under the surface line for depth
        rect('#00000018', i * 2, y + 4, 2, 6);
      }
      // texture stripes that scroll with ground (speed feel)
      for (let k = 0; k < 14; k++) {
        const wx = Math.floor(camX / 6) * 6 + k * 6, sx = (wx - camX) * PXM, y = gyOf(C, wx, gyP) + 26 + (k * 7) % 28;
        rect('#00000014', sx, y, 12 + (k % 3) * 6, 2);
      }

      drawCourseProps(C, camX, gyP);

      // ---- runners
      const list = st.runners.slice().sort((a, b) => a.lane - b.lane);
      for (const r of list) {
        const sx = (r.x - camX) * PXM;
        if (sx < -40 || sx > W + 40) continue;
        const y = gyOf(C, r.x, gyP) + 14 + r.lane * 6;
        drawRunner(r, sx, y, st);
      }
      // dust/fx
      stepFx(st.frameDt);
      // finish tape + overlays
      drawMinimap(st);
      if (st.player && !st.player.finished && st.showMarker) {
        const sx = (st.player.x - camX) * PXM, y = gyOf(C, st.player.x, gyP) + 14 + st.player.lane * 6 - 66 + Math.sin(t * 6) * 2;
        rect('#14101c', sx - 5, y - 1, 11, 7); rect('#3aa0ff', sx - 4, y, 9, 5); rect('#14101c', sx - 3, y + 6, 7, 3); rect('#3aa0ff', sx - 2, y + 6, 5, 2); rect('#3aa0ff', sx - 1, y + 8, 3, 2);
      }
      // foreground blades (fast parallax) for speed
      for (let i = 0; i < 18; i++) {
        const u = camPx * 1.5 + i * 53, sx = ((i * 53 - (camPx * 1.5) % (18 * 53)) + 18 * 53) % (18 * 53) - 20;
        if (sx < -10 || sx > W) continue;
        const c = GROUND[C.surface(camX + sx / PXM)];
        rect(c[0], sx, H - 14 - (i % 3) * 3, 2, 14); rect(c[0], sx + 3, H - 10, 2, 10); rect(c[1], sx - 3, H - 8, 2, 8);
      }
    };

    function drawStands(C, camX, gcol) {
      for (const [a, b] of [[-45, 30], [C.dist - 35, C.dist + 40]]) {
        const sa = (a - camX) * PXM, sb = (b - camX) * PXM;
        if (sb < 0 || sa > W) continue;
        for (let x = Math.max(0, Math.floor(sa)); x < Math.min(W, sb); x += 2) {
          const y = gcol[Math.min(320, Math.floor(x / 2))];
          rect('#b7bcc8', x, y - 26, 2, 30);
          for (let r = 0; r < 4; r++) rect(`hsl(${Math.floor(hash(x * 0.5 + r) * 360)},60%,${50 + r * 4}%)`, x, y - 24 + r * 6, 2, 2);
        }
        rect('#d94a4a', sa, 0 + 90, 3, 1);
      }
    }

    function drawCourseProps(C, camX, gyP) {
      const sxOf = x => (x - camX) * PXM;
      // start line + banner
      line(C, 0, camX, gyP, '#ffffff', 'START');
      line(C, C.dist, camX, gyP, null, 'FINISH');
      // km markers
      for (let d = 500; d < C.dist; d += 500) {
        const sx = sxOf(d); if (sx < -20 || sx > W + 20) continue;
        const y = gyOf(C, d, gyP) + 4;
        rect('#14101c', sx - 1, y - 20, 3, 20); rect('#14101c', sx - 11, y - 28, 23, 11); rect('#fafafa', sx - 10, y - 27, 21, 9);
        g.fillStyle = '#14101c'; g.font = FONT; g.textAlign = 'center'; g.fillText(d % 1000 ? (d / 1000).toFixed(1) + 'K' : (d / 1000) + 'K', sx, y - 19);
      }
      // turn warning signs
      for (const tr of C.turns) {
        const sx = sxOf(tr.a - 38); if (sx < -20 || sx > W + 20) continue;
        const y = gyOf(C, tr.a - 38, gyP) + 6;
        rect('#14101c', sx - 1, y - 18, 3, 18); rect('#14101c', sx - 9, y - 30, 19, 14); rect('#ffd23f', sx - 8, y - 29, 17, 12);
        g.fillStyle = '#14101c'; g.textAlign = 'center'; g.fillText(tr.dir > 0 ? '>>' : '<<', sx + 1, y - 19);
      }
      // hill / mud signs: climbs are drawn by the terrain itself; mud gets puddle highlights
      for (const sg of C.segs) if (sg.t === 'mud') {
        const sa = sxOf(sg.a), sb = sxOf(sg.b); if (sb < 0 || sa > W) continue;
        for (let x = Math.max(0, sa); x < Math.min(W, sb); x += 14) {
          const wx = camX + x / PXM, y = gyOf(C, wx, gyP) + 28 + hash(x * 0.1 + Math.floor(camX)) * 24;
          rect('#4a2e18', x, y, 10, 3); rect('#9b7a56', x + 1, y, 4, 1);
        }
      }
    }
    function line(C, wx, camX, gyP, col, label) {
      const sx = (wx - camX) * PXM; if (sx < -40 || sx > W + 40) return;
      const y0 = gyOf(C, wx, gyP);
      for (let i = 0; i < 9; i++) { // vertical band across the running area, checkered for finish
        const y = y0 + 4 + i * 6;
        if (col) rect(col, sx - 2, y, 4, 6); else { rect(i % 2 ? '#14101c' : '#fafafa', sx - 4, y, 4, 6); rect(i % 2 ? '#fafafa' : '#14101c', sx, y, 4, 6); }
      }
      // gantry
      rect('#14101c', sx - 3, y0 - 54, 6, 58); rect('#14101c', sx + 60, y0 - 54, 6, 58);
      rect('#14101c', sx - 4, y0 - 60, 72, 14);
      rect(col ? '#16b3a8' : '#ffd23f', sx - 2, y0 - 58, 68, 10);
      g.fillStyle = '#14101c'; g.font = FONT; g.textAlign = 'center'; g.fillText(label, sx + 32, y0 - 50);
    }

    function drawRunner(r, sx, fy, st) {
      const frames = XC.Sprites.getFrames(r.look, r.look.artKey);
      const idx = Math.floor(r.phase * XC.FRAMES) % XC.FRAMES;
      const im = frames[idx];
      // shadow
      rect('#00000040', sx - 14, fy + 1, 26, 3);
      g.drawImage(im, Math.round(sx - 32), Math.round(fy - 60));
      // tap FX: hand punch + leg push-off dust (player gets the full effect)
      const full = r.isPlayer ? 1 : 0.5;
      for (const side of ['L', 'R']) {
        const pu = r.pulse[side]; if (pu <= 0.05) continue;
        const near = side === 'L';
        const hx = sx + 14 + (1 - pu) * 8, hy = fy - 36 + (near ? 2 : -2);
        for (let k = 0; k < 3; k++) rect(near ? '#ffe45c' : '#7df0ff', hx - k * 4 - (1 - pu) * 6, hy + k * 3 - 3, Math.round(5 * pu * full) + 1, 1);
        rect('#ffffff', hx + 2, hy - 1, Math.round(3 * pu) + 1, Math.round(3 * pu) + 1);
        if (pu > 0.85 && r.isPlayer) {
          for (let k = 0; k < 3; k++) R.fx.push({ x: r.x - 0.35, y: fy + 1, vx: -(1 + Math.random() * 2), vy: -(10 + Math.random() * 20), life: 0.35, c: '#d9c9a0', s: 2, rel: r });
        }
      }
      // name tag for nearby opponents
      if (!r.isPlayer && st.showNames && Math.abs(r.x - st.player.x) < 3.2 && r.lane >= 2) {
        const w = Math.min(70, r.name.length * 5 + 6);
        rect('#fafafacc', sx - w / 2, fy - 70, w, 9); g.fillStyle = '#14101c'; g.font = '6px ' + FONT.split(' ').slice(1).join(' '); g.textAlign = 'center'; g.fillText(r.name, sx, fy - 63);
      }
      // kick glow
      if (r.kicking) for (let k = 0; k < 5; k++) rect('#ff9a3c', sx - 20 - k * 6 - (st.t * 60 % 6), fy - 18 - k * 5 + (k % 2) * 3, 8, 1);
    }
    function stepFx(dt) {
      for (let i = R.fx.length - 1; i >= 0; i--) {
        const f = R.fx[i]; f.life -= dt; if (f.life <= 0) { R.fx.splice(i, 1); continue; }
        f.x += f.vx * dt; f.y += f.vy * dt * 0.5; f.vy += 40 * dt;
        const sx = (f.x - R.camX) * PXM; rect(f.c, sx, f.y, f.s, f.s);
      }
      if (R.fx.length > 200) R.fx.splice(0, 100);
    }

    function drawMinimap(st) {
      const C = st.course, x0 = 130, x1 = 510, y0 = 8, y1 = 34;
      rect('#14101ccc', x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 12);
      const span = Math.max(1, C.hMax - C.hMin);
      let prev = null;
      for (const pt of C.profile) {
        const x = x0 + pt.x / C.dist * (x1 - x0), y = y1 - (pt.h - C.hMin) / span * (y1 - y0 - 4);
        const col = GROUND[pt.s][0];
        rect(col, x, y, 3, y1 - y + 3);
        prev = [x, y];
      }
      // kick window
      const kw = XC.kickWindow(C.dist);
      rect('#ff5a5a', x0 + (C.dist - kw) / C.dist * (x1 - x0), y1 + 4, kw / C.dist * (x1 - x0), 2);
      for (const r of st.runners) {
        if (r.isPlayer) continue;
        const x = x0 + XC.clamp(r.x / C.dist, 0, 1) * (x1 - x0), y = y1 - (C.height(Math.max(0, r.x)) - C.hMin) / span * (y1 - y0 - 4) - 2;
        rect('#e8e8f0', x, y, 2, 2);
      }
      const p = st.player; if (p) {
        const x = x0 + XC.clamp(p.x / C.dist, 0, 1) * (x1 - x0), y = y1 - (C.height(Math.max(0, p.x)) - C.hMin) / span * (y1 - y0 - 4) - 3;
        rect('#14101c', x - 2, y - 2, 6, 6); rect('#ffd23f', x - 1, y - 1, 4, 4);
      }
    }
    return R;
  };
})(window.XC);
