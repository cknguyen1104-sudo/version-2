/* Sprite pipeline.
   getFrames(look) -> array of 20 canvases (64x64, feet on y=60, facing right).
   1) If Higgsfield art exists (assets/manifest.js lists it and it loads), those PNG frames are used.
   2) Otherwise a pixel-art rig renders the SAME 20-frame cycle procedurally (stand-in until art is exported).
   Frame 00 = LEFT tap pose, frame 10 = RIGHT tap pose (see HIGGSFIELD_PROMPTS.md). */
(function (XC) {
  const FW = 64, FH = 64, N = XC.FRAMES;
  const S = XC.Sprites = { art: {}, cache: {}, hasArt: false };

  // ---------- optional Higgsfield art loader ----------
  S.load = function (done) {
    const man = window.XC_ASSETS || { chars: {}, env: {}, ui: {} };
    const jobs = [];
    S.env = {}; S.ui = {};
    const img = (path, cb) => { const i = new Image(); i.onload = () => cb(i); i.onerror = () => cb(null); i.src = path; jobs.push(i); };
    let pending = 0, finished = false;
    const fin = () => { if (!--pending && !finished) { finished = true; done(); } };
    Object.keys(man.chars || {}).forEach(key => {
      const c = man.chars[key]; const frames = new Array(N).fill(null); let ok = 0;
      for (let f = 0; f < N; f++) {
        pending++;
        img(c.dir + '/run_' + String(f).padStart(2, '0') + '.png', im => { if (im) { frames[f] = im; ok++; } fin(); });
      }
      pending++;
      setTimeout(() => { if (ok === N) { S.art[key] = frames; S.hasArt = true; } fin(); }, 0);
    });
    ['env', 'ui'].forEach(g => Object.keys(man[g] || {}).forEach(k => {
      pending++; img(man[g][k], im => { if (im) S[g][k] = im; fin(); });
    }));
    pending++; setTimeout(fin, 0);
    // safety: never block the game on art
    setTimeout(() => { if (!finished) { finished = true; done(); } }, 2500);
  };

  // ---------- procedural pixel rig ----------
  const DIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111' };
  function digit(g, d, x, y, col) {
    const p = DIG[d];
    g.fillStyle = col;
    for (let i = 0; i < 15; i++) if (p[i] === '1') g.fillRect(x + (i % 3), y + Math.floor(i / 3), 1, 1);
  }
  function cap(g, x0, y0, x1, y1, w, col) { // pixel capsule: stamp squares along the segment (no anti-aliasing)
    const len = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    g.fillStyle = col;
    for (let i = 0; i <= len; i++) {
      const t = i / len, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w);
    }
  }
  function limb(g, pts, w, col, ol) { // outline pass + colour pass
    if (ol) for (let i = 0; i < pts.length - 1; i++) cap(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w + 2, ol);
    for (let i = 0; i < pts.length - 1; i++) cap(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, col);
  }
  const OL = '#14101c';

  function legPts(hx, hy, theta, kappa, T, Sh) {
    const kx = hx + Math.sin(theta) * T, ky = hy + Math.cos(theta) * T;
    const sa = theta - kappa;                                 // shin swings back relative to thigh
    const fx = kx + Math.sin(sa) * Sh, fy = ky + Math.cos(sa) * Sh;
    return [[hx, hy], [kx, ky], [fx, fy], sa];
  }
  function armPts(sx, sy, theta, flex, U, F) {
    const ex = sx + Math.sin(theta) * U, ey = sy + Math.cos(theta) * U;
    const fa = theta + flex;                                   // forearm folds forward
    return [[sx, sy], [ex, ey], [ex + Math.sin(fa) * F, ey + Math.cos(fa) * F]];
  }

  // Pose parameters for one side at cycle angle th (0 = this side's tap pose: leg pushing off, same-side hand forward)
  function sidePose(th) {
    return {
      thigh: 0.25 - 1.2 * Math.cos(th),
      knee: 0.3 + 1.5 * Math.pow((1 + Math.cos(th - Math.PI - 0.35)) / 2, 1.3),
      arm: 0.0 + 1.35 * Math.cos(th),
      flex: 1.45 - 0.35 * Math.cos(th)
    };
  }

  function drawFrame(look, f) {
    const cv = document.createElement('canvas'); cv.width = FW; cv.height = FH;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const skin = XC.SKINS[look.skin] || XC.SKINS[1];
    const skinD = shade(skin, -28);
    const ph = f / N, thL = ph * Math.PI * 2, thR = thL + Math.PI;
    const pL = sidePose(thL), pR = sidePose(thR);
    const lean = 0.30, T = 12, Sh = 12;
    const hip = [30, 36];
    const sh = [hip[0] + Math.sin(lean) * 13, hip[1] - Math.cos(lean) * 13];
    const bobY = Math.abs(Math.cos(thL)) * -1;      // small bounce, peaks at the tap poses
    const legL = legPts(hip[0], hip[1], pL.thigh, pL.knee, T, Sh), legR = legPts(hip[0], hip[1], pR.thigh, pR.knee, T, Sh);
    const maxY = Math.max(legL[2][1], legR[2][1]);
    const dy = 59 - maxY;                           // plant lowest foot on the ground line
    g.translate(0, dy + bobY * 0 );

    const armL = armPts(sh[0], sh[1] + 1, pL.arm, pL.flex, 8, 8), armR = armPts(sh[0], sh[1] + 1, pR.arm, pR.flex, 8, 8);
    const drawArm = (a, near) => {
      limb(g, a, 3, near ? skin : skinD, OL);
      // sleeveless: upper arm skin; tattoo on r13
      if (look.tattoos) { cap(g, a[0][0], a[0][1] + 1, a[1][0], a[1][1], 1, '#3a2f5a'); }
      const h = a[2]; g.fillStyle = OL; g.fillRect(Math.round(h[0] - 2), Math.round(h[1] - 2), 4, 4);
      g.fillStyle = near ? skin : skinD; g.fillRect(Math.round(h[0] - 1), Math.round(h[1] - 1), 2, 2);
    };
    const drawLeg = (l, near) => {
      const col = near ? skin : skinD;
      limb(g, [l[0], l[1], l[2]], 4, col, OL);
      // shorts cover upper thigh
      const t = 0.42, sx = l[0][0] + (l[1][0] - l[0][0]) * t, sy = l[0][1] + (l[1][1] - l[0][1]) * t;
      limb(g, [l[0], [sx, sy]], 5, near ? look.shorts : shade(look.shorts, -20), OL);
      // shoe
      const fx = l[2][0], fy = l[2][1], sa = l[3];
      const shoe = look.shoes;
      const toeX = fx + 4, toeY = fy + 1;
      g.fillStyle = OL; g.fillRect(Math.round(fx - 3), Math.round(fy - 1), 9, 5);
      g.fillStyle = near ? shoe : shade(shoe, -25); g.fillRect(Math.round(fx - 2), Math.round(fy), 7, 3);
      g.fillStyle = '#ffffff55'; g.fillRect(Math.round(fx - 2), Math.round(fy + 2), 7, 1);
    };
    // far side first (R), then torso, then near side (L)
    drawArm(armR, false);
    drawLeg(legR, false);
    // hair behind (ponytail)
    // torso (singlet)
    const tx0 = hip[0] - 1, ty0 = hip[1] - 1;
    limb(g, [[tx0, ty0 + 1], [sh[0], sh[1]]], 9, look.singlet, OL);
    cap(g, tx0 - 1, ty0 - 1, sh[0] - 1, sh[1], 2, look.trim);           // side trim stripe
    cap(g, tx0, ty0 + 2, sh[0] + 1, sh[1] + 4, 2, look.trim);
    // shorts waist
    limb(g, [[hip[0] - 1, hip[1] + 2], [hip[0] + 1, hip[1] + 3]], 7, look.shorts, null);
    // bib
    const bx = Math.round((tx0 + sh[0]) / 2) - 4, by = Math.round((ty0 + sh[1]) / 2) - 3;
    g.fillStyle = OL; g.fillRect(bx - 1, by - 1, 9, 8);
    g.fillStyle = '#fafafa'; g.fillRect(bx, by, 7, 6);
    const bs = String(look.bib);
    if (bs.length === 1) digit(g, +bs, bx + 2, by, '#14101c');
    else { digit(g, +bs[0], bx, by, '#14101c'); digit(g, +bs[1], bx + 4, by, '#14101c'); }
    // head
    const hd = [sh[0] + 4, sh[1] - 6];
    g.fillStyle = OL; g.fillRect(hd[0] - 5, hd[1] - 5, 11, 11);
    g.fillStyle = skin; g.fillRect(hd[0] - 4, hd[1] - 4, 9, 9);
    g.fillStyle = skinD; g.fillRect(hd[0] - 4, hd[1] + 3, 9, 2);
    g.fillStyle = OL; g.fillRect(hd[0] + 2, hd[1] - 1, 2, 2);          // eye
    g.fillStyle = '#ffffff'; g.fillRect(hd[0] + 2, hd[1] - 1, 1, 1);
    g.fillStyle = skinD; g.fillRect(hd[0] + 5, hd[1], 1, 2);           // nose
    hair(g, look, hd);
    // near leg + arm last
    drawLeg(legL, true);
    drawArm(armL, true);
    return cv;
  }

  function hair(g, look, hd) {
    const c = XC.HAIR_COLORS[look.hairColor] || '#1b1210';
    g.fillStyle = OL;
    switch (look.hair) {
      case 'afro':
        g.fillRect(hd[0] - 7, hd[1] - 9, 13, 10); g.fillStyle = c; g.fillRect(hd[0] - 6, hd[1] - 8, 11, 8); g.fillRect(hd[0] - 7, hd[1] - 4, 3, 7); break;
      case 'pony':
        g.fillRect(hd[0] - 5, hd[1] - 6, 11, 5); g.fillStyle = c; g.fillRect(hd[0] - 4, hd[1] - 5, 9, 4); g.fillRect(hd[0] - 5, hd[1] - 3, 2, 5);
        g.fillStyle = OL; g.fillRect(hd[0] - 10, hd[1] - 3, 6, 5); g.fillStyle = c; g.fillRect(hd[0] - 9, hd[1] - 2, 5, 3); break;
      case 'buzz':
        g.fillRect(hd[0] - 5, hd[1] - 6, 11, 3); g.fillStyle = c; g.fillRect(hd[0] - 4, hd[1] - 5, 9, 2); break;
      case 'band':
        g.fillRect(hd[0] - 5, hd[1] - 6, 11, 5); g.fillStyle = c; g.fillRect(hd[0] - 4, hd[1] - 5, 9, 2); g.fillStyle = '#ffffff'; g.fillRect(hd[0] - 4, hd[1] - 3, 9, 2); break;
      default:
        g.fillRect(hd[0] - 5, hd[1] - 6, 11, 5); g.fillStyle = c; g.fillRect(hd[0] - 4, hd[1] - 5, 9, 3); g.fillRect(hd[0] - 4, hd[1] - 3, 2, 3);
    }
  }
  function shade(col, amt) {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const g = c.getContext('2d'); g.fillStyle = col; g.fillRect(0, 0, 1, 1);
    const d = g.getImageData(0, 0, 1, 1).data;
    const k = v => Math.max(0, Math.min(255, v + amt));
    return `rgb(${k(d[0])},${k(d[1])},${k(d[2])})`;
  }

  S.lookKey = look => [look.skin, look.hair, look.hairColor, look.singlet, look.trim, look.shorts, look.shoes, look.bib, look.tattoos ? 1 : 0].join('|');
  S.getFrames = function (look, artKey) {
    if (artKey && S.art[artKey]) return S.art[artKey];
    const k = S.lookKey(look);
    if (!S.cache[k]) { S.cache[k] = []; for (let f = 0; f < N; f++) S.cache[k].push(drawFrame(look, f)); }
    return S.cache[k];
  };
  S.shade = shade;
})(window.XC);
