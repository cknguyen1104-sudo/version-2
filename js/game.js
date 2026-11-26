/* Game controller: save data, race lifecycle, fixed-step loop, HUD, results, championship. */
(function (XC) {
  const clamp = XC.clamp;
  const $ = id => document.getElementById(id);
  const PTS = [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  // ---------------- save ----------------
  const DEF_SAVE = {
    settings: { recoverThreshold: 70, units: 'mph', sound: true, names: true },
    look: Object.assign({}, XC.DEFAULT_LOOK),
    setup: { mode: 'quick', dist: 3000, course: 0, style: 'tactical', diff: 5, char: 0, field: 20 },
    pb: {}, stats: { races: 0, wins: 0 }, courses: 1
  };
  const Save = XC.Save = {
    d: null,
    load() {
      try { const j = JSON.parse(localStorage.getItem('xc_save') || 'null'); this.d = merge(JSON.parse(JSON.stringify(DEF_SAVE)), j || {}); }
      catch (e) { this.d = JSON.parse(JSON.stringify(DEF_SAVE)); }
    },
    store() { try { localStorage.setItem('xc_save', JSON.stringify(this.d)); } catch (e) {} }
  };
  function merge(a, b) { for (const k in b) a[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k]) ? merge(a[k], b[k]) : b[k]; return a; }

  XC.isUnlocked = function (item) {
    if (!item.unlock) return true;
    const s = Save.d.stats;
    return (item.unlock.races && s.races >= item.unlock.races) || (item.unlock.wins && s.wins >= item.unlock.wins) || false;
  };
  XC.unlockText = u => u ? (u.races ? `Finish ${u.races} races` : `Win ${u.wins} races`) : '';

  // ---------------- sound ----------------
  let actx = null;
  function beep(f, d, type, vol) {
    if (!Save.d.settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'square'; o.frequency.value = f; g.gain.value = vol || 0.04;
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d);
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + d);
    } catch (e) {}
  }
  XC.beep = beep;

  // ---------------- game ----------------
  const G = XC.G = { race: null, paused: false, running: false, rend: null };
  G.playerLook = function () {
    const l = Object.assign({}, Save.d.look);
    l.artKey = (!l.custom && (l.uniform === 'r8' || l.uniform === 'r13')) ? l.uniform : null;
    return l;
  };

  G.init = function () {
    Save.load();
    G.rend = new XC.Renderer($('game'));
    XC.bindTouch();
    document.body.classList.toggle('touch', matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window);
    addEventListener('resize', G.resize); addEventListener('orientationchange', G.resize); G.resize();
    XC.Input.onPause = () => G.togglePause();
    XC.Input.onRestart = () => G.restart();
    XC.Input.onTap = side => {
      const el = $(side === 'L' ? 'lamp-L' : 'lamp-R'); el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 90);
    };
    $('h-menu').onclick = () => G.toMenu();
    $('h-restart').onclick = () => G.restart();
    $('h-pause').onclick = () => G.togglePause();
    XC.Sprites.load(() => { XC.UI.init(); requestAnimationFrame(loop); });
  };
  G.resize = function () {
    const st = $('stage'); document.documentElement.style.setProperty('--u', (st.clientWidth / 160) + 'px');
    $('rotate').classList.toggle('hidden', !(document.body.classList.contains('racing') && innerHeight > innerWidth));
  };

  G.start = function (cfg, keepRoster) {
    const set = Save.d.settings, ch = XC.CHARACTERS[cfg.char];
    const def = XC.COURSES[cfg.course], C = XC.buildCourse(def, cfg.dist);
    const rnd = XC.rng((Math.random() * 1e9) | 0);
    const player = XC.makeRunner({ id: 'player', name: 'YOU', isPlayer: true, look: G.playerLook(), bib: Save.d.look.bib, speed: ch.speed, stamina: ch.stamina, lane: 3, x: 0 });
    let ai = [];
    if (cfg.mode === 'quick' || cfg.mode === 'champ') {
      if (keepRoster && cfg.roster) { ai = cfg.roster; ai.forEach(r => resetRunner(r)); }
      else {
        ai = XC.makeField(cfg.mode === 'champ' ? 15 : cfg.field - 1, cfg.diff, rnd, 0);
        if (cfg.mode === 'champ') cfg.roster = ai;
      }
    }
    ai.forEach((r, i) => { r.x = -0.9 * Math.floor((i + 1) / 6); r.lane = (i % 6 === 3 ? 2 : i % 6); r.laneTarget = r.lane; });
    const R = G.race = {
      cfg, C, dist: cfg.dist, style: cfg.style, player, ai, all: [player].concat(ai), t: 0, phase: 'countdown', cd: 0, cdStage: 0,
      set, finishWait: 0, lastCad: 0, done: false, ctx: null, packX: 0, packT: 0
    };
    R.ctx = { C, dist: cfg.dist, t: 0, style: cfg.style, settings: set };
    R.cdTimes = [1.6, 1.0 + Math.random() * 0.8];
    XC.Input.drain(); XC.Input.enabled = true;
    document.body.classList.add('racing');
    ['hud'].forEach(i => $(i).classList.remove('hidden'));
    $('touch').classList.toggle('hidden', !document.body.classList.contains('touch'));
    XC.UI.hideAll(); G.paused = false; G.running = true; G.resize();
    $('banner').textContent = cfg.mode === 'practice' ? 'PRACTICE: match the blinking rhythm' : '';
    $('countdown').textContent = 'ON YOUR MARKS';
  };
  function resetRunner(r) {
    Object.assign(r, { x: 0, v: 0, energy: 100, fatigue: 0, cadence: 0, finished: false, finishT: 0, maxV: 0, sumV: 0, tAcc: 0, kicking: false, phase: Math.random() });
    r.brain.noise = 0; r.brain.timer = Math.random() * 0.15;
  }

  G.restart = function () { if (G.race) G.start(G.race.cfg, G.race.cfg.mode === 'champ'); };
  G.toMenu = function () {
    G.running = false; XC.Input.enabled = false; G.race = null;
    document.body.classList.remove('racing');
    $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('rotate').classList.add('hidden');
    XC.UI.show('menu');
  };
  G.togglePause = function () {
    if (!G.race || G.race.phase === 'done') return;
    G.paused = !G.paused; XC.Input.enabled = !G.paused;
    if (G.paused) XC.UI.show('pause', true); else XC.UI.hide('pause');
    XC.Input.drain();
  };

  // ---------------- fixed step ----------------
  function playerInput(R) {
    const p = R.player, age = R.t - p.lastTapSim;
    let cad = p.cadTarget;
    if (age > 0) cad = Math.min(cad, 1.6 / Math.max(age, 0.001));
    if (age > 2.5 || !p.lastTapReal) cad = 0;
    if (R.cfg.mode === 'practice' || true) { /* same physics in every mode */ }
    return { cadence: cad, eff: p.eff, kick: XC.Input.kick };
  }
  function step(R) {
    const taps = XC.Input.drain(), p = R.player;
    for (const tp of taps) {
      const lab = XC.processTap(p, tp.side, tp.t, R.t);
      if (lab) beep(lab === 'PERFECT' ? 880 : lab === 'GOOD' ? 700 : lab === 'OK' ? 520 : 220, 0.05, 'square', 0.025);
    }
    R.ctx.t = R.t;
    XC.stepRunner(p, XC.DT, playerInput(R), R.ctx);
    R.packT -= XC.DT;
    if (R.packT <= 0 && R.ai.length) { R.packT = 0.5; const xs = R.ai.map(r => r.x).sort((a, b) => a - b); R.packX = xs[Math.floor(xs.length / 2)]; }
    for (const r of R.ai) {
      if (!r.finished) XC.stepRunner(r, XC.DT, XC.aiThink(r, XC.DT, R.ctx, R.all, R.packX), R.ctx);
      else XC.stepRunner(r, XC.DT, { cadence: 0, eff: 0, kick: false }, R.ctx);
      // smooth lane drift
      r.lane += clamp(r.laneTarget - r.lane, -1.4 * XC.DT, 1.4 * XC.DT);
    }
    R.t += XC.DT;
  }

  function place(R) {
    const p = R.player; let n = 1;
    for (const r of R.ai) if ((r.finished && (!p.finished || r.finishT < p.finishT)) || (!r.finished && !p.finished && r.x > p.x)) n++;
    return n;
  }

  let last = 0, acc = 0, hudT = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now;
    const R = G.race;
    if (!R || !G.running) { // idle backdrop
      idleDraw(dt, now / 1000); return;
    }
    if (!G.paused) {
      if (R.phase === 'countdown') {
        XC.Input.drain();
        R.cd += dt;
        if (R.cdStage === 0 && R.cd > R.cdTimes[0]) { R.cdStage = 1; R.cd = 0; $('countdown').textContent = 'SET'; beep(440, 0.15, 'square', 0.05); }
        else if (R.cdStage === 1 && R.cd > R.cdTimes[1]) { R.cdStage = 2; R.cd = 0; R.phase = 'race'; R.t = 0; $('countdown').textContent = 'GO!'; beep(880, 0.35, 'square', 0.06); }
      } else {
        if (R.phase === 'race' && R.cd > 0.8) $('countdown').textContent = '';
        R.cd += dt; acc += dt;
        let n = 0;
        while (acc >= XC.DT && n++ < 40) { step(R); acc -= XC.DT; }
        if (n >= 40) acc = 0;
        if (R.phase === 'race' && R.player.finished) { R.phase = 'finishing'; R.finishWait = 0; $('banner').textContent = 'FINISH!'; beep(988, 0.4, 'triangle', 0.06); }
        if (R.phase === 'finishing') { R.finishWait += dt; if (R.finishWait > 2.4 && !R.done) { R.done = true; finishRace(R); } }
      }
    }
    G.rend.draw({
      course: R.C, player: R.player, runners: R.all, t: R.t + (R.phase === 'countdown' ? now / 1000 % 1000 * 0 : 0), frameDt: G.paused ? 0 : dt,
      showMarker: R.phase !== 'finishing', showNames: Save.d.settings.names
    });
    hudT -= dt; if (hudT <= 0) { hudT = 0.05; updateHud(R); }
    updateBars(R);
  }
  let idle = null;
  function idleDraw(dt, t) {
    if (!idle) { const C = XC.buildCourse(XC.COURSES[0], 3000); const p = XC.makeRunner({ isPlayer: true, look: G.playerLook(), speed: 75, stamina: 75, x: 0, lane: 3 }); idle = { C, p }; }
    idle.p.x += 6 * dt; idle.p.v = 6; idle.p.cadence = 3; idle.p.phase = (idle.p.phase + dt * 1.5) % 1;
    if (idle.p.x > 2400) idle.p.x = 0;
    idle.p.look = G.playerLook(); idle.p.lane = 3; idle.p.pulse = { L: 0, R: 0 };
    G.rend.draw({ course: idle.C, player: idle.p, runners: [idle.p], t, frameDt: dt, showMarker: false, showNames: false });
  }

  // ---------------- HUD ----------------
  const zone = e => e >= 55 ? '#33d65a' : e >= 25 ? '#f0c820' : '#ff3d4a';
  function updateBars(R) {
    const p = R.player;
    $('b-energy').style.width = p.energy + '%'; $('b-energy').style.background = zone(p.energy);
    $('b-fat').style.width = p.fatigue + '%';
    $('b-regen').classList.toggle('on', p.regen > 0.001);
  }
  function updateHud(R) {
    const p = R.player, set = Save.d.settings;
    $('b-thr').style.left = set.recoverThreshold + '%';
    $('t-energy').textContent = Math.round(p.energy) + '%';
    $('t-fat').textContent = Math.round(p.fatigue) + '%';
    $('t-effort').textContent = XC.EFFORTS[p.effort];
    document.querySelectorAll('#pips b').forEach((b, i) => { b.className = i <= p.effort ? 'on' + p.effort : ''; });
    $('t-cad').textContent = 'CADENCE ' + p.cadence.toFixed(1);
    const rh = $('t-rhythm');
    if (p.labelT > 0) { rh.textContent = p.lastLabel; rh.className = 'q-' + p.lastLabel; } else if (p.spamT > 0) { rh.textContent = 'SPAM'; rh.className = 'q-SPAM'; } else rh.textContent = ' ';
    $('t-time').textContent = (R.phase === 'countdown' ? 0 : Math.min(R.t, p.finished ? p.finishT : R.t)).toFixed(2) + ' s';
    $('t-speed').textContent = set.units === 'mph' ? (p.v * 2.23694).toFixed(1) + ' mph' : (p.v * 3.6).toFixed(1) + ' km/h';
    $('h-pos').innerHTML = (R.ai.length ? place(R) : 1) + '<small>/' + R.all.length + '</small>';
    $('h-rem').textContent = Math.max(0, Math.round(R.dist - p.x)).toLocaleString() + ' m';
    $('h-surf').textContent = (XC.TERRAIN[p.terrain].name + (p.slope > 0.025 ? ' ▲ UPHILL' : p.slope < -0.025 ? ' ▼ DOWNHILL' : '')).toUpperCase();
    $('kick-hint').classList.toggle('hidden', !(R.phase === 'race' && XC.canKick(p, R.dist) && p.energy > 8 && !p.kicking));
    if (R.cfg.mode === 'practice') { // metronome guide at an ideal rhythm
      const beat = Math.floor(performance.now() / 333) % 2;
      $('lamp-L').style.outline = beat === 0 ? '3px dashed #ffd23f' : 'none'; $('lamp-R').style.outline = beat === 1 ? '3px dashed #ffd23f' : 'none';
    } else { $('lamp-L').style.outline = 'none'; $('lamp-R').style.outline = 'none'; }
    if (R.phase === 'race' && R.t > 1.2 && $('banner').textContent && R.cfg.mode !== 'practice' && R.phase !== 'finishing') $('banner').textContent = '';
  }

  // ---------------- finishing / results ----------------
  function finishRace(R) {
    XC.Input.enabled = false;
    // fast-forward the AI to the line (no rendering)
    let guard = 0;
    while (R.ai.some(r => !r.finished) && guard++ < 120 * 60 * 40) step2(R);
    const p = R.player, all = R.all.slice().sort((a, b) => a.finishT - b.finishT);
    const pos = all.indexOf(p) + 1, winner = all[0];
    const S = Save.d, key = R.cfg.course + '|' + R.dist;
    const before = snapshotUnlocks();
    const pb = S.pb[key], isPb = !pb || p.finishT < pb;
    if (isPb) S.pb[key] = p.finishT;
    if (R.cfg.mode !== 'practice') {
      S.stats.races++; if (pos === 1 && R.ai.length) S.stats.wins++;
      if (pos <= 10 || !R.ai.length) S.courses = Math.max(S.courses, Math.min(XC.COURSES.length, R.cfg.course + 2));
    }
    Save.store();
    const res = {
      cfg: R.cfg, time: p.finishT, pos, n: all.length, avg: R.dist / p.finishT, max: p.maxV, energy: p.energy, fatigue: p.fatigue,
      pb: S.pb[key], isPb, table: all.map((r, i) => ({ name: r.isPlayer ? 'YOU' : r.name, t: r.finishT, me: r.isPlayer, id: r.id, persona: r.persona, sp: r.speedAttr, st: r.stamina })),
      winnerT: winner.finishT, unlocked: diffUnlocks(before)
    };
    if (R.cfg.mode === 'champ') {
      const ch = R.cfg.champ;
      res.table.forEach((row, i) => { ch.points[row.id] = (ch.points[row.id] || 0) + (PTS[i] || 0); });
      ch.names[p.id] = 'YOU'; R.ai.forEach(r => ch.names[r.id] = r.name);
      res.champ = ch;
    }
    G.lastResult = res;
    XC.UI.results(res);
  }
  function step2(R) { // physics-only step for AI fast-forward (player already finished)
    R.ctx.t = R.t;
    R.packT -= XC.DT;
    if (R.packT <= 0) { R.packT = 0.5; const xs = R.ai.map(r => r.x).sort((a, b) => a - b); R.packX = xs[Math.floor(xs.length / 2)]; }
    for (const r of R.ai) if (!r.finished) { XC.stepRunner(r, XC.DT, XC.aiThink(r, XC.DT, R.ctx, R.all, R.packX), R.ctx); r.lane += clamp(r.laneTarget - r.lane, -1.4 * XC.DT, 1.4 * XC.DT); }
    R.t += XC.DT;
  }
  function snapshotUnlocks() {
    const s = Save.d, ids = [];
    XC.HAIRS.concat(XC.UNIFORMS).forEach(i => { if (XC.isUnlocked(i)) ids.push(i.id); });
    XC.COURSES.forEach((c, i) => { if (i < s.courses) ids.push(c.id); });
    return ids;
  }
  function diffUnlocks(before) {
    const now = snapshotUnlocks(), names = {};
    XC.HAIRS.concat(XC.UNIFORMS, XC.COURSES).forEach(i => names[i.id] = i.name);
    return now.filter(i => before.indexOf(i) < 0).map(i => names[i]);
  }

  G.nextChampRound = function () {
    const res = G.lastResult, cfg = res.cfg, ch = cfg.champ;
    ch.round++;
    const unlocked = Math.max(1, Save.d.courses);
    cfg.course = (ch.round) % unlocked;
    G.start(cfg, true);
  };
  window.addEventListener('DOMContentLoaded', G.init);
})(window.XC);
