/* Input: keyboard (A/D + Left/Right, interchangeable) and multi-touch buttons. Taps are timestamped at event time. */
(function (XC) {
  const In = XC.Input = {
    queue: [], kick: false, onPause: null, onBack: null, held: { L: false, R: false }, lastTap: { L: 0, R: 0 }, enabled: false,
    onTap: null
  };
  function push(side) {
    if (!In.enabled) return;
    const t = performance.now();
    In.queue.push({ side, t });
    In.lastTap[side] = t;
    if (In.onTap) In.onTap(side);
  }
  const KEYS = { KeyA: 'L', ArrowLeft: 'L', KeyD: 'R', ArrowRight: 'R' };
  const KICK = { Space: 1, ShiftLeft: 1, ShiftRight: 1, ArrowUp: 1, KeyW: 1 };
  window.addEventListener('keydown', e => {
    if (e.code in KEYS) {
      if (In.enabled) e.preventDefault();
      if (!e.repeat) push(KEYS[e.code]);
    } else if (e.code in KICK) { if (In.enabled) e.preventDefault(); In.kick = true; }
    else if ((e.code === 'Escape' || e.code === 'KeyP') && In.onPause) In.onPause();
    else if (e.code === 'KeyR' && In.onRestart && In.enabled) In.onRestart();
  });
  window.addEventListener('keyup', e => { if (e.code in KICK) In.kick = false; });
  window.addEventListener('blur', () => { In.kick = false; });

  XC.bindTouch = function () {
    const mk = (id, down, up) => {
      const el = document.getElementById(id);
      const dn = e => { e.preventDefault(); el.classList.add('down'); down(); };
      const upf = e => { e.preventDefault(); el.classList.remove('down'); if (up) up(); };
      el.addEventListener('pointerdown', dn, { passive: false });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => el.addEventListener(n, upf, { passive: false }));
      el.addEventListener('contextmenu', e => e.preventDefault());
    };
    mk('btn-left', () => push('L'));
    mk('btn-right', () => push('R'));
    mk('btn-kick', () => { In.kick = true; }, () => { In.kick = false; });
    // Stop pinch/scroll/double-tap-zoom during a race
    ['touchmove', 'gesturestart', 'gesturechange', 'dblclick'].forEach(n =>
      document.addEventListener(n, e => { if (In.enabled) e.preventDefault(); }, { passive: false }));
  };
  In.drain = function () { const q = In.queue; In.queue = []; return q; };
})(window.XC);
