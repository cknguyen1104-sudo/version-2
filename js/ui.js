/* Menus (DOM). Gameplay lives in game.js; this only edits the saved setup/look/settings and starts races. */
(function (XC) {
  const $ = id => document.getElementById(id);
  const UI = XC.UI = {};
  const names = ['menu', 'setup', 'custom', 'settings', 'results', 'pause'];
  let mode = 'quick', prevAnim = null;

  UI.hideAll = () => names.forEach(n => $('s-' + n).classList.add('hidden'));
  UI.hide = n => $('s-' + n).classList.add('hidden');
  UI.show = function (n, over) {
    if (!over) UI.hideAll();
    const el = $('s-' + n); el.classList.remove('hidden'); el.classList.toggle('over', !!over);
    ({ menu: renderMenu, setup: renderSetup, custom: renderCustom, settings: renderSettings, pause: renderPause })[n] && ({ menu: renderMenu, setup: renderSetup, custom: renderCustom, settings: renderSettings, pause: renderPause })[n]();
    if (n !== 'custom' && prevAnim) { clearInterval(prevAnim); prevAnim = null; }
  };
  UI.init = function () { UI.show('menu'); };
  const S = () => XC.Save.d;
  const stat = (v, col) => `<div class="statbar"><i style="width:${v}%;background:${col}"></i></div>`;
  const bind = (root, sel, fn) => root.querySelectorAll(sel).forEach(e => e.onclick = () => fn(e));

  function renderMenu() {
    const el = $('s-menu'), s = S();
    el.innerHTML = `<div class="wrap">
      <h1>CROSS COUNTRY<em>SPEED STARS</em></h1>
      <p class="note">Tap <b>A / &#9664;</b> and <b>D / &#9654;</b> in rhythm. Each tap pumps a hand <i>and</i> drives the leg on the same side. Alternate evenly, pace your energy, hold <b>SPACE</b> for the finishing kick.</p>
      <div class="menu-grid">
        <button class="btn" data-m="quick">QUICK RACE<small>Pick a distance and course. Race a full field.</small></button>
        <button class="btn" data-m="trial">TIME TRIAL<small>Race alone and chase your personal best.</small></button>
        <button class="btn" data-m="champ">CHAMPIONSHIP<small>Four races, points for every finish.</small></button>
        <button class="btn" data-m="practice">PRACTICE<small>No opponents. A blinking guide shows the rhythm.</small></button>
        <button class="btn alt" id="m-custom">CUSTOMIZE RUNNER<small>Hair, uniform, shoes, bib number.</small></button>
        <button class="btn alt" id="m-settings">SETTINGS<small>Recovery threshold, units, sound.</small></button>
      </div>
      <p class="note">Races finished: ${s.stats.races} &nbsp; Wins: ${s.stats.wins} &nbsp; Courses unlocked: ${s.courses}/4</p></div>`;
    bind(el, '[data-m]', e => { mode = e.dataset.m; S().setup.mode = mode; UI.show('setup'); });
    $('m-custom').onclick = () => UI.show('custom'); $('m-settings').onclick = () => UI.show('settings');
  }

  const MODE_NAME = { quick: 'QUICK RACE', trial: 'TIME TRIAL', champ: 'CHAMPIONSHIP', practice: 'PRACTICE' };
  function renderSetup() {
    const el = $('s-setup'), s = S(), c = s.setup;
    mode = c.mode;
    const ai = mode === 'quick' || mode === 'champ';
    const pb = s.pb[c.course + '|' + c.dist];
    el.innerHTML = `<div class="wrap"><h1>${MODE_NAME[mode]}</h1>
      <h2>1. RACE DISTANCE</h2><div class="chips">${XC.DISTANCES.map(d => `<button class="opt ${c.dist === d ? 'sel' : ''}" data-d="${d}">${d / 1000}K</button>`).join('')}</div>
      <h2>2. COURSE</h2><div class="grid">${XC.COURSES.map((co, i) => {
        const lock = i >= s.courses;
        return `<button class="opt ${c.course === i ? 'sel' : ''} ${lock ? 'locked' : ''}" data-c="${i}"><b>${co.name}</b><small>${lock ? 'LOCKED: finish top 10 on the previous course' : co.desc}</small></button>`;
      }).join('')}</div>
      ${ai ? `<div class="cols"><div><h2>3. RACE STYLE</h2><div class="grid">${Object.keys(XC.STYLES).map(k => `<button class="opt ${c.style === k ? 'sel' : ''}" data-s="${k}"><b>${XC.STYLES[k].name}</b><small>${XC.STYLES[k].desc}</small></button>`).join('')}</div></div>
      <div><h2>4. OVERALL DIFFICULTY</h2><div class="big">${c.diff} &middot; ${XC.DIFF_LABELS(c.diff)}</div>
        <input type="range" id="diff" min="1" max="10" step="1" value="${c.diff}">
        <p class="note">Changes opponent ability, pacing, passing, energy management and kicks. Never your controls or physics.</p>
        ${mode === 'quick' ? `<h2>FIELD SIZE</h2><div class="chips">${[10, 20, 30, 40].map(n => `<button class="opt ${c.field === n ? 'sel' : ''}" data-f="${n}">${n}</button>`).join('')}</div>` : '<p class="note">Championship: 16 runners per race, 4 races.</p>'}</div></div>` : ''}
      <h2>${ai ? '5' : '3'}. CHARACTER</h2><div class="grid">${XC.CHARACTERS.map((ch, i) => `<button class="opt ${c.char === i ? 'sel' : ''}" data-ch="${i}"><b>${ch.name}</b> <small>${ch.tag}</small>
        <small>SPEED ${ch.speed}</small>${stat(ch.speed, '#ff4f81')}<small>STAMINA ${ch.stamina}</small>${stat(ch.stamina, '#33d65a')}</button>`).join('')}</div>
      ${pb ? `<p class="note">Personal best on this course and distance: <b>${XC.fmtTime(pb)}</b></p>` : ''}
      <p><button class="btn go" id="go">START RACE &#9654;</button><button class="btn alt" id="back">BACK</button></p></div>`;
    const keep = el.scrollTop;
    const re = () => { renderSetup(); $('s-setup').scrollTop = keep; };
    bind(el, '[data-d]', e => { c.dist = +e.dataset.d; XC.Save.store(); re(); });
    bind(el, '[data-c]', e => { if (+e.dataset.c < s.courses) { c.course = +e.dataset.c; XC.Save.store(); re(); } });
    bind(el, '[data-s]', e => { c.style = e.dataset.s; XC.Save.store(); re(); });
    bind(el, '[data-f]', e => { c.field = +e.dataset.f; XC.Save.store(); re(); });
    bind(el, '[data-ch]', e => { c.char = +e.dataset.ch; XC.Save.store(); re(); });
    const dr = $('diff'); if (dr) dr.oninput = () => { c.diff = +dr.value; XC.Save.store(); re(); };
    $('back').onclick = () => UI.show('menu');
    $('go').onclick = () => {
      XC.Save.store();
      const cfg = Object.assign({}, c, { mode });
      if (mode === 'champ') cfg.champ = { round: 0, total: 4, points: {}, names: {} };
      if (mode !== 'champ' && mode !== 'quick') cfg.field = 1;
      XC.G.start(cfg);
    };
  }

  function renderSettings() {
    const el = $('s-settings'), st = S().settings;
    el.innerHTML = `<div class="wrap"><h1>SETTINGS</h1>
      <h2>ENERGY RECOVERY THRESHOLD: ${st.recoverThreshold}%</h2>
      <input type="range" id="thr" min="40" max="90" step="5" value="${st.recoverThreshold}">
      <p class="note">Below this energy you can regenerate, but only while running at an easy effort. Running flat out never regenerates.</p>
      <h2>SPEED UNITS</h2><div class="chips"><button class="opt ${st.units === 'mph' ? 'sel' : ''}" data-u="mph">MPH</button><button class="opt ${st.units === 'kmh' ? 'sel' : ''}" data-u="kmh">KM/H</button></div>
      <h2>SOUND</h2><div class="chips"><button class="opt ${st.sound ? 'sel' : ''}" data-snd="1">ON</button><button class="opt ${!st.sound ? 'sel' : ''}" data-snd="0">OFF</button></div>
      <h2>OPPONENT NAME TAGS</h2><div class="chips"><button class="opt ${st.names ? 'sel' : ''}" data-nm="1">ON</button><button class="opt ${!st.names ? 'sel' : ''}" data-nm="0">OFF</button></div>
      <p><button class="btn" id="back">DONE</button><button class="btn alt" id="reset">RESET SAVE DATA</button></p></div>`;
    $('thr').oninput = () => { st.recoverThreshold = +$('thr').value; XC.Save.store(); renderSettings(); };
    bind(el, '[data-u]', e => { st.units = e.dataset.u; XC.Save.store(); renderSettings(); });
    bind(el, '[data-snd]', e => { st.sound = e.dataset.snd === '1'; XC.Save.store(); renderSettings(); });
    bind(el, '[data-nm]', e => { st.names = e.dataset.nm === '1'; XC.Save.store(); renderSettings(); });
    $('back').onclick = () => UI.show(XC.G.race && XC.G.running ? 'pause' : 'menu', !!(XC.G.race && XC.G.running));
    $('reset').onclick = () => { if (confirm('Erase progress, look and settings?')) { localStorage.removeItem('xc_save'); XC.Save.load(); renderSettings(); } };
  }

  function renderPause() {
    $('s-pause').innerHTML = `<div class="wrap" style="text-align:center;padding-top:12vh"><h1>PAUSED</h1>
      <button class="btn go" id="p-res">RESUME</button><button class="btn" id="p-rs">RESTART</button><button class="btn alt" id="p-set">SETTINGS</button><button class="btn alt" id="p-menu">QUIT TO MENU</button></div>`;
    $('p-res').onclick = () => XC.G.togglePause(); $('p-rs').onclick = () => { XC.G.paused = false; XC.G.restart(); };
    $('p-set').onclick = () => UI.show('settings', true); $('p-menu').onclick = () => { XC.G.paused = false; XC.G.toMenu(); };
  }

  function renderCustom() {
    const el = $('s-custom'), L = S().look;
    const sw = (arr, key, cur) => arr.map((c, i) => `<span class="swatch ${cur === (key === 'skin' || key === 'hairColor' ? i : c) ? 'sel' : ''}" data-k="${key}" data-v="${key === 'skin' || key === 'hairColor' ? i : c}" style="display:inline-block;background:${c}"></span>`).join(' ');
    const colorIn = (k, lab) => `<label class="note">${lab} <input type="color" data-col="${k}" value="${hex(L[k])}"></label> `;
    el.innerHTML = `<div class="wrap"><h1>CUSTOMIZE</h1><div class="cols"><div>
      <canvas id="prev" width="64" height="64" style="width:256px;height:256px"></canvas>
      <p class="note">Your look shows on the track, in the pack and on the results.</p></div><div>
      <h2>UNIFORM</h2><div class="grid">${XC.UNIFORMS.map(u => { const ok = XC.isUnlocked(u); return `<button class="opt ${L.uniform === u.id && !L.custom ? 'sel' : ''} ${ok ? '' : 'locked'}" data-u="${u.id}"><b>${u.name}</b><small>${ok ? '' : XC.unlockText(u.unlock)}</small></button>`; }).join('')}</div>
      <h2>SKIN</h2>${sw(XC.SKINS, 'skin', L.skin)}
      <h2>HAIR</h2><div class="chips">${XC.HAIRS.map(h => { const ok = XC.isUnlocked(h); return `<button class="opt ${L.hair === h.id ? 'sel' : ''} ${ok ? '' : 'locked'}" data-h="${h.id}">${h.name}<small>${ok ? '' : XC.unlockText(h.unlock)}</small></button>`; }).join('')}</div>
      <h2>HAIR COLOR</h2>${sw(XC.HAIR_COLORS, 'hairColor', L.hairColor)}
      <h2>COLORS</h2>${colorIn('singlet', 'Singlet')}${colorIn('trim', 'Trim')}${colorIn('shorts', 'Shorts')}
      <h2>SHOES</h2>${sw(XC.SHOES, 'shoes', L.shoes)}
      <h2>BIB NUMBER</h2><input type="number" id="bib" min="1" max="99" value="${L.bib}" style="font:inherit;padding:.6em;width:6em">
      <label class="note"> <input type="checkbox" id="tat" ${L.tattoos ? 'checked' : ''}> Tattoos</label></div></div>
      <p><button class="btn" id="back">DONE</button></p></div>`;
    const keep = el.scrollTop, re = () => { renderCustom(); $('s-custom').scrollTop = keep; };
    const upd = () => { XC.Save.store(); drawPrev(); };
    bind(el, '[data-u]', e => { const u = XC.UNIFORMS.find(x => x.id === e.dataset.u); if (!XC.isUnlocked(u)) return; Object.assign(L, { uniform: u.id, singlet: u.singlet, trim: u.trim, shorts: u.shorts, shoes: u.shoes, custom: false, tattoos: u.id === 'r13' }); XC.Save.store(); re(); });
    bind(el, '.swatch', e => { const k = e.dataset.k; L[k] = (k === 'skin' || k === 'hairColor') ? +e.dataset.v : e.dataset.v; if (k === 'shoes') L.custom = true; XC.Save.store(); re(); });
    bind(el, '[data-h]', e => { const h = XC.HAIRS.find(x => x.id === e.dataset.h); if (XC.isUnlocked(h)) { L.hair = h.id; XC.Save.store(); re(); } });
    el.querySelectorAll('[data-col]').forEach(i => i.oninput = () => { L[i.dataset.col] = i.value; L.custom = true; upd(); });
    $('bib').oninput = () => { L.bib = Math.max(1, Math.min(99, +$('bib').value || 1)); upd(); };
    $('tat').onchange = () => { L.tattoos = $('tat').checked; upd(); };
    $('back').onclick = () => UI.show('menu');
    drawPrev();
    if (prevAnim) clearInterval(prevAnim);
    let f = 0;
    prevAnim = setInterval(() => { f = (f + 1) % XC.FRAMES; drawPrev(f); }, 70);
  }
  function drawPrev(f) {
    const c = $('prev'); if (!c) return; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 64, 64);
    g.drawImage(XC.Sprites.getFrames(XC.G.playerLook(), XC.G.playerLook().artKey)[f || 0], 0, 0);
  }
  function hex(c) { if (/^#[0-9a-f]{6}$/i.test(c)) return c; const g = document.createElement('canvas').getContext('2d'); g.fillStyle = c; return g.fillStyle; }

  // ---------------- results ----------------
  UI.results = function (r) {
    const el = $('s-results'), cfg = r.cfg;
    const course = XC.COURSES[cfg.course].name;
    const suf = n => n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
    const rows = r.table.slice(0, 12), me = r.table.findIndex(x => x.me);
    if (me >= 12) rows.push(r.table[me]);
    const placeOf = row => r.table.indexOf(row) + 1;
    let champ = '';
    if (r.champ) {
      const ch = r.champ, st = Object.keys(ch.points).map(id => ({ id, n: ch.names[id], p: ch.points[id] })).sort((a, b) => b.p - a.p);
      champ = `<h2>CHAMPIONSHIP STANDINGS: RACE ${ch.round + 1}/${ch.total}</h2><table>${st.slice(0, 8).map((x, i) => `<tr class="${x.id === 'player' ? 'me' : ''}"><td>${i + 1}</td><td>${x.n}</td><td>${x.p} pts</td></tr>`).join('')}</table>`;
    }
    const lastRound = r.champ && r.champ.round + 1 >= r.champ.total;
    el.innerHTML = `<div class="wrap"><h1>${r.pos === 1 && r.n > 1 ? 'VICTORY!' : 'RACE COMPLETE'}</h1>
      <div class="big">${r.pos}${suf(r.pos)} of ${r.n} &middot; ${XC.fmtTime(r.time)}${r.isPb ? ' &middot; NEW PB!' : ''}</div>
      <p class="note">${course} &middot; ${cfg.dist / 1000}K &middot; ${XC.STYLES[cfg.style].short} &middot; Difficulty ${cfg.diff} (${XC.DIFF_LABELS(cfg.diff)})</p>
      <div class="kv"><div>FINAL TIME<b>${XC.fmtTime(r.time)}</b></div><div>POSITION<b>${r.pos}/${r.n}</b></div>
        <div>AVG SPEED<b>${(r.avg * 2.23694).toFixed(1)} mph</b></div><div>MAX SPEED<b>${(r.max * 2.23694).toFixed(1)} mph</b></div>
        <div>ENERGY LEFT<b>${Math.round(r.energy)}%</b></div><div>FATIGUE<b>${Math.round(r.fatigue)}%</b></div>
        <div>PERSONAL BEST<b>${XC.fmtTime(r.pb)}</b></div><div>GAP TO WINNER<b>${r.pos === 1 ? '--' : '+' + (r.time - r.winnerT).toFixed(2) + 's'}</b></div></div>
      ${r.unlocked.length ? `<p class="big">UNLOCKED: ${r.unlocked.join(', ')}</p>` : ''}
      ${r.n > 1 ? `<h2>RESULTS</h2><table><tr><th>#</th><th>RUNNER</th><th>TIME</th><th>GAP</th></tr>${rows.map(x => `<tr class="${x.me ? 'me' : ''}"><td>${placeOf(x)}</td><td>${x.name}</td><td>${XC.fmtTime(x.t)}</td><td>${placeOf(x) === 1 ? '' : '+' + (x.t - r.winnerT).toFixed(2)}</td></tr>`).join('')}</table>` : ''}
      ${champ}
      <p>${r.champ && !lastRound ? '<button class="btn go" id="r-next">NEXT RACE &#9654;</button>' : ''}${!r.champ ? '<button class="btn go" id="r-again">RACE AGAIN</button>' : ''}<button class="btn alt" id="r-menu">MENU</button></p></div>`;
    UI.hideAll(); el.classList.remove('hidden'); el.classList.remove('over');
    XC.G.running = false; $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); document.body.classList.remove('racing'); $('rotate').classList.add('hidden');
    if ($('r-next')) $('r-next').onclick = () => XC.G.nextChampRound();
    if ($('r-again')) $('r-again').onclick = () => XC.G.start(Object.assign({}, cfg, { roster: null }));
    $('r-menu').onclick = () => XC.G.toMenu();
  };
})(window.XC);
