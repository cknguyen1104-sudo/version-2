/* Runner model + physics. Player and AI share stepRunner(): the only difference is where cadence/eff come from.
   Animation contract (matches the 20-frame Higgsfield cycle):
     phase 0.0  = LEFT tap pose  -> left arm drives forward (hand punch), left leg pushes off, right knee drives
     phase 0.5  = RIGHT tap pose -> mirrored.
   Every accepted tap snaps the phase onto its pose, so hands and legs are tied to the taps. */
(function (XC) {
  const clamp = XC.clamp;

  XC.makeRunner = function (o) {
    return {
      id: o.id, name: o.name, isPlayer: !!o.isPlayer, look: o.look, bib: o.bib,
      speedAttr: o.speed, stamina: o.stamina, persona: o.persona || null,
      x: o.x || 0, v: 0, energy: 100, fatigue: 0,
      cadence: 0, cadTarget: 0, eff: 0.75, rhythm: 0.28, lastSide: null, lastTapReal: 0, lastTapSim: -9,
      intensity: 0, effort: 0, kicking: false, kickT: 0,
      lane: o.lane == null ? 3 : o.lane, laneTarget: o.lane == null ? 3 : o.lane,
      phase: 0, pulse: { L: 0, R: 0 }, lastLabel: '', labelT: 0, regen: 0, regenFlash: 0,
      slope: 0, terrain: 'grass', spamT: 0, stumbleT: 0,
      finished: false, finishT: 0, place: 0, maxV: 0, sumV: 0, tAcc: 0, brain: null, bob: 0
    };
  };

  // Called for every accepted keypress/touch. side = 'L' | 'R'. Returns quality label.
  XC.processTap = function (r, side, tReal, simT) {
    if (r.finished) return null;
    let dt = r.lastTapReal ? (tReal - r.lastTapReal) / 1000 : 0;
    if (r.lastTapReal && dt < 0.07) { r.spamT = 0.4; r.eff *= 0.93; return 'SPAM'; } // button mashing: ignored
    r.lastTapReal = tReal;
    let q;
    if (!dt || dt > 1.6) { q = 0.78; if (dt > 1.6) dt = 0; }
    else {
      const m = r.rhythm;
      const dev = Math.abs(dt - m) / m;
      const cons = clamp(1 - dev * 1.7, 0, 1);
      const win = dt < 0.11 ? 0.55 : dt > 0.9 ? 0.4 : 1;
      q = (0.25 + 0.75 * cons) * win;
    }
    if (r.lastSide === side) { q *= 0.3; r.stumbleT = 0.35; }   // same hand/leg twice = stumble
    if (dt) { r.rhythm = r.rhythm * 0.6 + dt * 0.4; r.cadTarget = 1 / r.rhythm; }
    else if (!r.cadTarget) r.cadTarget = 2.2;
    r.eff += (q - r.eff) * (q < r.eff ? 0.55 : 0.32);
    r.lastSide = side; r.lastTapSim = simT;
    // Tie animation phase to the tap: hand + leg snap onto the tap pose
    const target = side === 'L' ? 0 : 0.5;
    let d = target - r.phase; d -= Math.round(d);
    r.phase = (r.phase + d * 0.8 + 1) % 1;
    r.pulse[side] = 1;
    const label = q > 0.82 ? 'PERFECT' : q > 0.6 ? 'GOOD' : q > 0.38 ? 'OK' : 'OFF';
    r.lastLabel = label; r.labelT = 0.7;
    return label;
  };

  const effortOf = I => I < 0.55 ? 0 : I < 0.75 ? 1 : I < 0.9 ? 2 : 3;
  XC.EFFORTS = ['EASY', 'MODERATE', 'HARD', 'MAXIMUM'];

  XC.kickWindow = L => Math.max(250, Math.min(0.3 * L, 600));
  XC.canKick = (r, L) => !r.finished && L - r.x <= XC.kickWindow(L) && r.energy > 2;

  // inp: {cadence, eff, kick}. ctx: {C, dist, t, settings}
  XC.stepRunner = function (r, dt, inp, ctx) {
    const C = ctx.C, L = ctx.dist, set = ctx.settings;
    const sp = r.speedAttr / 100, st = r.stamina / 100;
    const T = C.terrain(r.x), g = C.slope(r.x);
    r.slope = g; r.terrain = C.surface(r.x);

    // ---- finish handling
    if (r.finished) {
      r.v = Math.max(0, r.v - 2.4 * dt);
      r.x += r.v * dt; r.kicking = false;
      r.cadence = r.v * 0.55; r.intensity = 0.3; r.effort = 0;
      tickAnim(r, dt, null);
      return;
    }

    // ---- cadence (taps/s). Decays when taps stop.
    let cad = inp.cadence, eff = inp.eff;
    r.spamT = Math.max(0, r.spamT - dt); r.stumbleT = Math.max(0, r.stumbleT - dt);
    if (r.spamT > 0) eff *= 0.7;
    if (r.stumbleT > 0) eff *= 0.75;
    r.cadence = cad;
    const cn = cad / XC.CAD_REF;

    // ---- kick
    const wantKick = !!inp.kick && XC.canKick(r, L);
    r.kicking = wantKick;
    let kickMult = 1, kickAcc = 1;
    if (r.kicking) {
      const power = 0.08 + 0.2 * sp * sp;                       // SPEED decides kick strength
      const eEff = Math.pow(clamp(r.energy / 45, 0, 1), 0.7);  // little energy = weak kick
      const fEff = 1 - 0.55 * r.fatigue / 100;
      kickMult = 1 + power * eEff * fEff; kickAcc = 1.7;
    }

    // ---- speed target
    const vMaxBase = 6.4 + 3.6 * sp;
    const fatMult = 1 - 0.30 * (r.fatigue / 100) * (1.25 - 0.7 * st);
    const enMult = r.energy >= 35 ? 1 : 0.62 + 0.38 * XC.smooth(r.energy / 35); // progressive, never a hard stop
    const over = cn > 1.08 ? clamp(1 - (cn - 1.08) * 2.2, 0.35, 1) : 1;        // overstriding / mashing
    const effT = clamp(eff * T.eff * C.roughMult(r.x), 0, 1.1);
    const drive = vMaxBase * Math.pow(clamp(cn, 0, 1.2), 0.75) * (0.55 + 0.45 * effT) * over;
    let slopeMult = g >= 0 ? 1 - clamp(g * 3.4, 0, 0.55) : 1 + clamp(-g * 2.2, 0, 0.2);
    if (g < -0.02) slopeMult *= 1 - 0.12 * clamp((r.v - vMaxBase * 0.95) / 2, 0, 1); // reckless downhill loses efficiency
    const turn = 1 - 0.08 * C.turn(r.x);
    const target = drive * slopeMult * T.speed * turn * fatMult * enMult * kickMult;

    // ---- acceleration / momentum
    const aMax = (2.4 + 2.0 * sp) * kickAcc * (1 - 0.45 * clamp(r.v / (vMaxBase * 1.15), 0, 1));
    const dec = 2.4 + (g > 0 ? g * 8 : 0);
    r.v += clamp(target - r.v, -dec * dt, aMax * dt);
    if (r.v < 0) r.v = 0;
    const dx = r.v * dt;
    r.x += dx;

    // ---- effort / intensity
    let I = 0.65 * Math.pow(clamp(cn, 0, 1.2), 0.75) * over + 0.35 * clamp(r.v / vMaxBase, 0, 1.2);
    if (r.kicking) I = Math.max(I, 1.0);
    r.intensity = I; r.effort = effortOf(I);

    // ---- energy (all costs are per metre and scaled by race length so pacing matters in every distance)
    const factor = Math.pow(L / 5000, 0.25);
    const stF = 1.55 - 0.85 * st;
    const slopeCost = g > 0 ? 1 + g * 9 : Math.max(0.65, 1 + g * 3.5);
    const c = (0.18 + 1.0 * I * I * I) * stF * slopeCost * T.drain * (1 + 0.9 * r.fatigue / 100) * factor;
    let dE = (100 * c / L) * dx;
    if (r.kicking) dE += (9 + 5 * (1 - st)) * dt;
    r.energy -= dE;
    r.regen = 0;
    const thr = set.recoverThreshold;
    if (r.energy < thr && I < 0.62 && !r.kicking) {   // recovery only when below threshold AND effort is low enough
      const rec = (100 / L) * 1.8 * (1 - I / 0.62) * (0.65 + 0.7 * st) * (1 - 0.5 * r.fatigue / 100) * T.recov *
                  (g <= 0 ? 1 : Math.max(0.3, 1 - g * 6)) * dx;
      r.energy += rec; r.regen = rec / Math.max(dt, 1e-6); r.regenFlash = 1;
    }
    r.energy = clamp(r.energy, 0, 100);
    if (r.regen === 0) r.regenFlash = Math.max(0, r.regenFlash - dt * 2);

    // ---- fatigue
    // time-based so a 1K sprint and an 8K grind both build a believable amount of fatigue
    if (I > 0.72) r.fatigue += dt * 0.16 * (I - 0.72) / 0.28 * (1 + Math.max(0, g) * 12) * (1.5 - 0.8 * st);
    else if (I < 0.65) r.fatigue -= dt * 0.07 * (0.65 - I) / 0.65;
    r.fatigue = clamp(r.fatigue, 0, 100);

    // ---- stats
    r.tAcc += dt; r.sumV += r.v * dt; if (r.v > r.maxV) r.maxV = r.v;
    r.pulse.L = Math.max(0, r.pulse.L - dt * 6); r.pulse.R = Math.max(0, r.pulse.R - dt * 6);
    r.labelT = Math.max(0, r.labelT - dt);
    tickAnim(r, dt, r.isPlayer ? null : inp);

    // ---- finish line (interpolated time)
    if (r.x >= L) {
      r.finished = true;
      r.finishT = ctx.t - (r.x - L) / Math.max(r.v, 0.1);
      r.kicking = false;
    }
  };

  // Advance animation phase. Player's phase is also snapped by taps; AI crossings generate virtual taps.
  function tickAnim(r, dt, aiInp) {
    const stepRate = Math.max(r.cadence, r.v / 2.3); // steps per sec
    const prev = r.phase;
    r.phase = (r.phase + dt * stepRate * 0.5) % 1;
    if (aiInp) { // virtual taps at pose crossings so the AI hands pump in sync too
      if (prev < 0.5 && r.phase >= 0.5) r.pulse.R = 1;
      if (prev > r.phase) r.pulse.L = 1;
    }
    r.bob += dt * stepRate * Math.PI;
  }
})(window.XC);
