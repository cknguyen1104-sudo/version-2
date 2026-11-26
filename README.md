# Cross Country Speed Stars

Browser game: HTML + CSS + JS (canvas), no build step, no dependencies.

## Run
- **Desktop:** open `index.html` in Chrome/Edge/Firefox (works from file://). For best results serve it: `python3 -m http.server 8000` then visit http://localhost:8000
- **Phone:** serve the folder from your computer and open `http://<your-computer-ip>:8000` on the phone (same Wi-Fi), landscape. Touch buttons appear automatically. Or host the folder on any static host (GitHub Pages, Netlify).

## Controls
- **Left:** A or Left Arrow &nbsp; **Right:** D or Right Arrow (interchangeable, alternate them)
- **Finishing kick:** hold Space / Shift / Up / W (available in the final stretch) &nbsp; **Pause:** Esc &nbsp; **Restart:** R
- Touch: LEFT / RIGHT buttons bottom corners, KICK above the right button.

## How taps map to the runner
Each accepted tap snaps the run cycle onto a tap pose: the tapped side's **hand punches forward** (with a streak effect and a lamp on the HUD) while the same-side **leg pushes off** and the opposite knee drives. Phase advances between taps from your cadence, so legs and arms stay in sync and slow when you slow.
Rhythm: even intervals = efficiency. Same side twice = stumble. Taps closer than 70 ms are ignored (no mash-to-win), and cadence above ~110% of the reference overstrides and loses speed.

## Layout
`js/config.js` constants/courses/characters, `course.js` elevation+surfaces, `runner.js` physics/energy/fatigue/kick, `ai.js` opponents, `input.js`, `sprites.js` (Higgsfield loader + stand-in rig), `render.js`, `ui.js` menus, `game.js` loop/modes/results. Physics is a fixed 120 Hz step.
Art: see `HIGGSFIELD_PROMPTS.md`.
