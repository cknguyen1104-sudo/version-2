/* Course builder: elevation profile, surfaces, turns. Distances are exact; visuals are drawn from this data. */
(function (XC) {
  const STEP = 2; // sample spacing, metres

  XC.buildCourse = function (def, dist) {
    const rnd = XC.rng(def.seed + dist);
    const total = dist + 600;
    const n = Math.ceil(total / STEP) + 4;
    const waves = [];
    for (let k = 0; k < 3; k++) {
      waves.push({
        amp: def.amp * [1, 0.45, 0.2][k],
        wl: XC.lerp(def.wl[0], def.wl[1], rnd()) * [1, 0.5, 0.25][k],
        ph: rnd() * 6.283
      });
    }
    const hs = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i * STEP;
      let h = 0;
      for (const w of waves) h += w.amp * Math.sin(x / w.wl * 6.283 + w.ph);
      const ramp = XC.smooth(x / 120);                       // flat start
      const endRamp = XC.smooth((dist + 80 - x) / 160);      // flat run-out
      h *= ramp * (x > dist ? Math.max(0.0, endRamp) : 1);
      if (def.finalClimb) h += 15 * XC.smooth((x - (dist - 750)) / 420) * (1 - XC.smooth((x - (dist - 150)) / 130));
      hs[i] = h;
    }
    // Surface segments
    const segs = [];
    let x = 0;
    const keys = Object.keys(def.surf);
    while (x < total) {
      const len = 70 + rnd() * 210;
      let r = rnd(), t = keys[0], acc = 0;
      const sum = keys.reduce((s, k) => s + def.surf[k], 0);
      for (const k of keys) { acc += def.surf[k] / sum; if (r <= acc) { t = k; break; } }
      if (x < 60) t = 'grass';
      segs.push({ a: x, b: x + len, t });
      x += len;
    }
    // Mud patches (in low spots so they feel earned)
    const mudN = Math.round(def.mud * dist / 450);
    for (let m = 0; m < mudN; m++) {
      const mx = 250 + rnd() * (dist - 500), ml = 50 + rnd() * 110;
      segs.push({ a: mx, b: mx + ml, t: 'mud', over: true });
    }
    // Sharp turns
    const turns = [];
    const turnN = Math.round(def.turns * dist / 380);
    for (let t = 0; t < turnN; t++) turns.push({ a: 200 + rnd() * (dist - 400), len: 38, dir: rnd() < 0.5 ? -1 : 1 });
    turns.sort((p, q) => p.a - q.a);

    const C = {
      def, dist, total,
      height(x) {
        const f = Math.max(0, x) / STEP, i = Math.min(n - 2, Math.floor(f)), t = f - i;
        return hs[i] * (1 - t) + hs[i + 1] * t;
      },
      slope(x) { return (C.height(x + 4) - C.height(x - 4)) / 8; },
      surface(x) {
        let t = 'grass';
        for (const s of segs) if (!s.over && x >= s.a && x < s.b) { t = s.t; break; }
        for (const s of segs) if (s.over && x >= s.a && x < s.b) return 'mud';
        return t;
      },
      terrain(x) { return XC.TERRAIN[C.surface(x)]; },
      // deterministic stride jitter on uneven ground (cells of 14 m)
      roughMult(x) {
        if (C.surface(x) !== 'rough') return 1;
        return 1 + (XC.hash(Math.floor(x / 14) + def.seed) - 0.5) * 0.28;
      },
      turn(x) { // 0..1 inside a turn
        for (const t of turns) if (x >= t.a - 6 && x < t.a + t.len + 6) {
          const m = Math.min(x - (t.a - 6), t.a + t.len + 6 - x);
          return XC.smooth(m / 10);
        }
        return 0;
      },
      turnDir(x) { for (const t of turns) if (x >= t.a - 6 && x < t.a + t.len + 6) return t.dir; return 0; },
      turns, segs
    };
    // Cache profile for the minimap
    C.profile = [];
    for (let d = 0; d <= dist; d += Math.max(10, dist / 160)) C.profile.push({ x: d, h: C.height(d), s: C.surface(d) });
    let mn = 1e9, mx2 = -1e9;
    for (const p of C.profile) { mn = Math.min(mn, p.h); mx2 = Math.max(mx2, p.h); }
    C.hMin = mn; C.hMax = mx2;
    return C;
  };
})(window.XC);
