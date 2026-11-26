/* AI opponents. They use the SAME stepRunner() physics, energy and fatigue as the player; the brain only chooses cadence/efficiency/kick.
   Race style changes pacing plans; difficulty changes ability + decision quality. They are independent. */
(function (XC) {
  const clamp = XC.clamp, smooth = XC.smooth;
  const FIRST = ['Gunter', 'Plato', 'Lon', 'Ram', 'Anie', 'Bofur', 'Henri', 'Mika', 'Sora', 'Dani', 'Kofi', 'Tomas', 'Ivo', 'Lena', 'Noor', 'Arlo', 'Pia', 'Joss', 'Remy', 'Zane', 'Bea', 'Otis', 'Yuki', 'Cato', 'Finn', 'Sasha', 'Eli', 'Rhea', 'Ugo', 'Tess'];
  const LAST = ['Milton', 'Cox', 'Wiley', 'Faulkner', 'Bruno', 'Newell', 'Coving', 'Hale', 'Okoro', 'Vance', 'Lund', 'Ruiz', 'Kato', 'Mbeki', 'Frost', 'Pike', 'Bell', 'Nash', 'Quill', 'Sato', 'Voss', 'Marsh', 'Dube', 'Reyes', 'Holt'];
  const BASE_I = { 1000: 0.90, 2000: 0.84, 3000: 0.80, 5000: 0.76, 8000: 0.73 };
  const UNI = XC.UNIFORMS;

  XC.makeField = function (n, diff, rnd, startIdx) {
    const dn = (diff - 1) / 9;
    const field = [];
    for (let i = 0; i < n; i++) {
      const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 2;
      const persona = XC.PERSONAS[Math.floor(rnd() * XC.PERSONAS.length)].id;
      let sp = 50 + 4.2 * diff + gauss() * 7, stm = 48 + 4.0 * diff + gauss() * 8;
      if (persona === 'starter') sp += 4;
      if (persona === 'finisher') sp += 3;
      if (persona === 'strategic') stm += 4;
      sp = clamp(sp, 38, 98); stm = clamp(stm, 38, 98);
      const u = UNI[Math.floor(rnd() * UNI.length)];
      const look = Object.assign({}, XC.DEFAULT_LOOK, {
        skin: Math.floor(rnd() * XC.SKINS.length), hair: XC.HAIRS[Math.floor(rnd() * XC.HAIRS.length)].id,
        hairColor: Math.floor(rnd() * XC.HAIR_COLORS.length), uniform: u.id, singlet: u.singlet, trim: u.trim, shorts: u.shorts, shoes: u.shoes,
        bib: 2 + Math.floor(rnd() * 98), tattoos: rnd() < 0.2
      });
      // spread across hue so the pack is readable
      if (rnd() < 0.7) { const h = Math.floor(rnd() * 360); look.singlet = `hsl(${h},70%,55%)`; look.trim = `hsl(${(h + 150) % 360},70%,60%)`; }
      const r = XC.makeRunner({
        id: 'ai' + (startIdx || 0) + '_' + i, name: FIRST[Math.floor(rnd() * FIRST.length)] + ' ' + LAST[Math.floor(rnd() * LAST.length)],
        look, bib: look.bib, speed: sp, stamina: stm, persona, lane: Math.floor(rnd() * 6)
      });
      r.brain = { diff, dn, persona, noise: 0, timer: rnd() * 0.15, want: 0.7, cad: 3, eff: 0.8, kickErr: 0.55 + rnd() * 1.1 * (1.0 - 0.55 * dn) + 0.25 * dn, rnd: XC.rng(Math.floor(rnd() * 1e9)), kick: false, laneT: 0 };
      field.push(r);
    }
    return field;
  };

  function styleShape(style, p) {
    if (style === 'fast') return 1.05 * (1 - smooth(p / 0.18)) + 1.02 * smooth(p / 0.18) + 0.07 * smooth((p - 0.8) / 0.2) - (p < 0.18 ? 0 : 0);
    // tactical: slow compact start, building, strong finish
    return 0.86 + 0.07 * smooth(p / 0.5) + 0.08 * smooth((p - 0.5) / 0.35) + 0.12 * smooth((p - 0.85) / 0.15);
  }
  function personaShape(persona, p) {
    switch (persona) {
      case 'starter': return 0.09 * (1 - smooth(p / 0.22)) - 0.03 * smooth((p - 0.2) / 0.4);
      case 'strategic': return -0.05 * (1 - smooth((p - 0.55) / 0.15)) + 0.10 * smooth((p - 0.72) / 0.28);
      case 'finisher': return -0.05 * (1 - smooth((p - 0.7) / 0.12)) + 0.14 * smooth((p - 0.85) / 0.15);
      default: return 0;
    }
  }

  // Returns {cadence, eff, kick} for one AI runner. all = every runner (for passing / packing)
  XC.aiThink = function (r, dt, ctx, all, packX) {
    const b = r.brain, L = ctx.dist, style = ctx.style;
    b.timer -= dt;
    if (b.timer <= 0) {
      b.timer = 0.15;
      const p = clamp(r.x / L, 0, 1), dn = b.dn, g = r.slope;
      let I = (BASE_I[L] || 0.76) + (style === 'fast' ? 0.035 : -0.04);
      I *= styleShape(style, p);
      I += personaShape(b.persona, p);
      // terrain / hills
      if (b.persona === 'hill') I += g * 1.1; else I -= g * (0.9 - 0.6 * dn);
      if (r.terrain === 'mud') I -= 0.03;
      // energy management: follow a planned energy curve, better with difficulty
      const eTarget = 100 - (style === 'fast' ? 82 : 80) * Math.pow(p, 0.9);
      I += clamp((r.energy - eTarget) / 100, -0.15, 0.15) * (0.15 + 1.1 * dn);
      // fatigue awareness
      I -= (r.fatigue / 100) * 0.08 * dn;
      // tactical pack gravity
      if (style === 'tactical' && p < 0.6 && packX != null) I += clamp((packX - r.x) / 40, -0.05, 0.05);
      // positioning & passing
      let ahead = null, ad = 1e9;
      for (const o of all) {
        if (o === r) continue;
        const d = o.x - r.x;
        if (d > 0 && d < 8 && Math.abs(o.lane - r.lane) < 1.0 && d < ad) { ahead = o; ad = d; }
      }
      if (ahead) {
        if (dn > 0.2 && r.energy > eTarget - 8) I += 0.03 + 0.09 * dn;        // go around
        if (ad < 2.6 && ahead.v < r.v + 0.3) {                                // find a free lane
          for (const dl of [1, -1, 2, -2]) {
            const nl = clamp(Math.round(r.lane) + dl, 0, 5);
            let free = true;
            for (const o of all) if (o !== r && Math.abs(o.x - r.x) < 3.5 && Math.abs(o.lane - nl) < 0.9) { free = false; break; }
            if (free) { r.laneTarget = nl; break; }
          }
          if (Math.abs(r.laneTarget - r.lane) < 0.2) I = Math.min(I, 0.3 + ahead.intensity * 0.95); // boxed in: draft
        }
      }
      // noise (smaller with difficulty)
      b.noise = b.noise * 0.9 + (b.rnd() - 0.5) * 0.12 * (1 - 0.8 * dn);
      I += b.noise;
      b.want = clamp(I, 0.35, 1.0 + 0.04 * dn);
      b.cad = XC.CAD_REF * Math.pow(b.want, 1 / 0.75);
      b.eff = clamp(0.66 + 0.32 * dn + (b.rnd() - 0.5) * 0.16 * (1 - dn), 0.45, 1);
      // finishing kick plan
      const rem = L - r.x, win = XC.kickWindow(L);
      const dist = clamp(r.energy / 9 * r.v * 1.02 * b.kickErr * (b.persona === 'finisher' ? 1.15 : 1), 40, win);
      b.kick = rem < dist && r.energy > 5 && dn >= 0.0;
    }
    return { cadence: b.cad, eff: b.eff, kick: b.kick };
  };
})(window.XC);
