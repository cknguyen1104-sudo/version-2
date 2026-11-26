/* Higgsfield asset manifest. Drop exported PNGs into the folders below and uncomment/edit entries.
   Anything missing falls back to the built-in pixel-art stand-ins, so the game always runs.
   Character frames: <dir>/run_00.png ... run_19.png (64x64 transparent, facing right, feet on row 60).
   Frame 00 = LEFT tap pose, frame 10 = RIGHT tap pose. See HIGGSFIELD_PROMPTS.md. */
window.XC_ASSETS = {
  chars: {
    // r8:  { dir: 'assets/chars/runner8'  },   // white/teal singlet, black shorts, #8
    // r13: { dir: 'assets/chars/runner13' }    // yellow/teal singlet, teal shorts, lavender shoes, #13
  },
  env: {
    // sky_fields: 'assets/env/sky_fields.png', ridge_fields: 'assets/env/ridge_fields.png', ...
  },
  ui: {
    // logo: 'assets/ui/logo.png'
  }
};
