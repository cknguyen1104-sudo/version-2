/* Cross Country Speed Stars - shared config. Classic scripts + one global namespace so index.html works from file://. */
window.XC = window.XC || {};
(function (XC) {
  XC.DT = 1 / 120;            // fixed physics step
  XC.W = 640; XC.H = 360;     // internal pixel-art resolution
  XC.PXM = 22;                // screen px per world metre (horizontal)
  XC.PXV = 22 * 1.8;          // screen px per metre of elevation (exaggerated)
  XC.CAD_REF = 4.4;           // taps/sec that equals 100% cadence
  XC.FRAMES = 20;             // run-cycle frames per character
  XC.DISTANCES = [1000, 2000, 3000, 5000, 8000];

  // Terrain: speed = target speed multiplier, eff = stride efficiency, drain = energy cost, recov = recovery multiplier
  XC.TERRAIN = {
    grass:  { name: 'Grass',  speed: 1.00, eff: 1.00, drain: 1.00, recov: 1.00 },
    dirt:   { name: 'Dirt',   speed: 1.00, eff: 1.00, drain: 1.00, recov: 0.95 },
    gravel: { name: 'Gravel', speed: 0.96, eff: 0.93, drain: 1.12, recov: 0.85 },
    mud:    { name: 'Mud',    speed: 0.86, eff: 0.80, drain: 1.40, recov: 0.55 },
    rough:  { name: 'Uneven', speed: 0.97, eff: 0.92, drain: 1.10, recov: 0.80 }
  };

  XC.CHARACTERS = [
    { id: 'balanced',  name: 'Balanced',  speed: 75, stamina: 75, tag: 'All-around' },
    { id: 'sprinter',  name: 'Sprinter',  speed: 95, stamina: 55, tag: 'Short races' },
    { id: 'endurance', name: 'Endurance', speed: 60, stamina: 95, tag: 'Long races' },
    { id: 'finisher',  name: 'Finisher',  speed: 90, stamina: 70, tag: 'Final kick' }
  ];

  XC.SKINS = ['#f2c9a0', '#d9a074', '#b97a50', '#8d5a36', '#5e3a22'];
  XC.HAIRS = [
    { id: 'short', name: 'Short', unlock: null },
    { id: 'buzz', name: 'Buzz', unlock: null },
    { id: 'band', name: 'Headband', unlock: null },
    { id: 'afro', name: 'Afro', unlock: { races: 3 } },
    { id: 'pony', name: 'Ponytail', unlock: { races: 6 } }
  ];
  XC.HAIR_COLORS = ['#1b1210', '#4a2a14', '#a8651e', '#e8c15a', '#c8402a'];
  // Uniform presets (singlet / trim / shorts / shoes)
  XC.UNIFORMS = [
    { id: 'r8',      name: 'Teal Club',  singlet: '#f4f4ee', trim: '#16b3a8', shorts: '#16161a', shoes: '#f6f6f6', unlock: null },
    { id: 'r13',     name: 'Sunburst',   singlet: '#ffd23f', trim: '#16b3a8', shorts: '#16b3a8', shoes: '#c9b3f0', unlock: null },
    { id: 'crimson', name: 'Crimson',    singlet: '#d8344a', trim: '#f4f4ee', shorts: '#2a1020', shoes: '#f4f4ee', unlock: { races: 2 } },
    { id: 'royal',   name: 'Royal',      singlet: '#2d5be3', trim: '#ffd23f', shorts: '#1a2a6a', shoes: '#ffd23f', unlock: { races: 4 } },
    { id: 'gold',    name: 'Gold Medal', singlet: '#f2b705', trim: '#16161a', shorts: '#16161a', shoes: '#ffffff', unlock: { wins: 2 } },
    { id: 'neon',    name: 'Neon Night', singlet: '#2b2b3a', trim: '#ff4f81', shorts: '#2b2b3a', shoes: '#4ff0ff', unlock: { races: 10 } }
  ];
  XC.SHOES = ['#f6f6f6', '#c9b3f0', '#ffd23f', '#4ff0ff', '#ff4f81', '#222222'];
  XC.DEFAULT_LOOK = {
    skin: 1, hair: 'short', hairColor: 0, uniform: 'r8',
    singlet: '#f4f4ee', trim: '#16b3a8', shorts: '#16161a', shoes: '#f6f6f6', bib: 8, tattoos: false
  };

  // Course definitions. amp = elevation amplitude (m), wl = wavelength range (m)
  XC.COURSES = [
    { id: 'fields', name: 'Open Fields', theme: 'fields', seed: 11, amp: 5, wl: [420, 900], turns: 0, unlock: 0,
      surf: { grass: 0.78, dirt: 0.14, rough: 0.08 }, mud: 0,
      desc: 'Mostly flat grass with gentle rollers. Beginner friendly.' },
    { id: 'forest', name: 'Forest Trail', theme: 'forest', seed: 27, amp: 9, wl: [230, 520], turns: 1, unlock: 1,
      surf: { dirt: 0.55, rough: 0.25, grass: 0.12, gravel: 0.08 }, mud: 0.05,
      desc: 'Packed dirt, roots, sharp turns and rolling hills.' },
    { id: 'champ', name: 'Championship', theme: 'champ', seed: 53, amp: 12, wl: [320, 760], turns: 0.5, unlock: 2,
      surf: { grass: 0.58, dirt: 0.12, gravel: 0.08, rough: 0.07 }, mud: 0.18, finalClimb: true,
      desc: 'Big open fields, muddy sections and a brutal final stretch.' },
    { id: 'hilly', name: 'Hilly Course', theme: 'hilly', seed: 91, amp: 26, wl: [520, 1150], turns: 0.3, unlock: 3,
      surf: { grass: 0.4, dirt: 0.3, gravel: 0.18, rough: 0.12 }, mud: 0.04,
      desc: 'Huge elevation swings: long climbs and fast descents.' }
  ];

  XC.PERSONAS = [
    { id: 'starter',   name: 'Fast Starter' },
    { id: 'steady',    name: 'Consistent' },
    { id: 'strategic', name: 'Strategic' },
    { id: 'hill',      name: 'Hill Runner' },
    { id: 'finisher',  name: 'Fast Finisher' }
  ];

  XC.DIFF_LABELS = function (d) {
    return d <= 2 ? 'Very Easy' : d <= 4 ? 'Easy' : d <= 6 ? 'Normal' : d <= 8 ? 'Hard' : 'Elite';
  };

  XC.STYLES = {
    tactical: { name: 'Tactical Race', short: 'Tactical',
      desc: 'Controlled start, compact pack, patience pays. Effort builds through the middle and the race is won in the final kick.' },
    fast: { name: 'Fast-Paced Race', short: 'Fast-Paced',
      desc: 'Hot start, aggressive middle, constant passing. Runners really run faster, but energy still catches up with them.' }
  };

  XC.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  XC.lerp = (a, b, t) => a + (b - a) * t;
  XC.smooth = t => { t = XC.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  XC.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  XC.hash = function (n) { // cheap deterministic 0..1 hash
    n = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  XC.fmtTime = function (s) {
    if (!isFinite(s)) return '--:--.--';
    const m = Math.floor(s / 60), r = s - m * 60;
    return (m > 0 ? m + ':' + (r < 10 ? '0' : '') : '') + r.toFixed(2);
  };
})(window.XC);
