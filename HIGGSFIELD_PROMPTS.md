# Higgsfield Asset Plan: Cross Country Speed Stars

**Status: no Higgsfield art has been generated yet.** The Higgsfield connector available to Claude can browse and check credits but cannot generate or upload media. The game ships with a built-in pixel-art rig that draws the same 20-frame cycle, so it is fully playable now. Generate the assets below in Higgsfield, drop them in `assets/`, edit `assets/manifest.js`, and they replace the stand-ins automatically.

## Global art direction (paste at the start of every prompt)
> Retro arcade pixel art, polished evolution of the mobile game "Speed Stars". Bold dark-navy (#14101c) 1px outlines, readable pixel shading with 3 tones per colour, exaggerated athletic running poses, vibrant saturated colours, side view facing right, no anti-aliasing, no gradients inside sprites, transparent background. Consistent proportions: runner is 50 px tall inside a 64x64 canvas, feet on row 60.

Use your reference photos / model sheets as image references for every character prompt (Higgsfield "character reference").

## 1. Characters (two sets, 20 frames each)
Output: `assets/chars/runner8/run_00.png ... run_19.png` and `assets/chars/runner13/run_00.png ... run_19.png`, 64x64 transparent PNG each (downscale with nearest-neighbour). Also export a 1280x64 sprite sheet for reference.

**Runner 8 prompt:** `[global direction] Side-view running cycle, frame N of 20. Athlete with the exact hairstyle, skin tone and build from the reference. White and teal running singlet, black shorts, white running shoes, white race bib with number 8. Same camera, same size, same colours in every frame.`

**Runner 13 prompt:** same, but `yellow and teal singlet, teal shorts, lavender shoes, bib number 13, tattoos exactly as in the reference`.

**Frame convention (important: this is what ties taps to hands and legs):**
- Frame 00 = **LEFT tap pose**: left leg pushing off behind, right knee driving high, **left hand/arm punched forward-up**, right arm back.
- Frame 10 = **RIGHT tap pose**: exact mirror (right leg push-off, left knee high, **right hand forward**).
- Frames 01-09 transition 00 to 10 (hand swings back, knee lifts, flight phase around 05); frames 11-19 transition back. Frame 19 must loop seamlessly into frame 00.
- In-game, every tap snaps the animation to frame 00 or 10, so those two frames should be the most exaggerated.

Suggested workflow: generate frames 00 and 10 first, then use them as start/end keyframes for an image-to-video or frame-interpolation pass, extract 20 evenly spaced frames, clean up, and match colours across frames.

## 2. Environments (separate layers, tileable horizontally)
Each course gets: `sky_<id>.png` (640x240, no ground), `ridge_far_<id>.png` and `ridge_mid_<id>.png` (1280x160, transparent, seamless horizontal loop), `tree_<id>_a/b/c.png` (props, transparent). Courses: `fields`, `forest`, `champ`, `hilly`.

- fields: bright blue sky, soft clouds, rolling green hills, round bushy trees, wildflowers.
- forest: teal-green mist, dense layered pine trunks and canopy, dappled light.
- champ: crisp blue sky, large green fields, spectator stands with colourful crowd, banners and flags.
- hilly: purple-to-orange sunset sky, rocky mountains with snow caps, scattered pines.

Ground tiles (256x64, seamless): `ground_grass`, `ground_dirt`, `ground_gravel`, `ground_mud` (with puddle highlights), `ground_rough` (stones and roots).
Props: `start_gantry.png`, `finish_gantry.png` (checkered), `sign_distance.png`, `sign_turn_left/right.png`, `cloud_a/b/c.png`.

## 3. UI kit (retro arcade, matches the HUD already coded)
`logo.png` ("CROSS COUNTRY SPEED STARS"), `panel_9slice.png`, `button_9slice_yellow/teal.png`, `bar_energy_frame.png`, `hand_icon_L/R.png`, `touch_button_left/right/kick.png`, `medal_gold/silver/bronze.png`. Text stays live HTML; Higgsfield provides the frames and icons only.

## 4. FX
`fx_dust_puff` (4 frames), `fx_hand_whoosh` (3 frames, yellow/cyan), `fx_kick_flames` (4 frames), `fx_confetti`.

## 5. Wiring it in
Edit `assets/manifest.js`:
```js
chars: { r8: { dir: 'assets/chars/runner8' }, r13: { dir: 'assets/chars/runner13' } },
```
The loader needs all 20 frames for a character; otherwise it keeps the stand-in. Art is used when the player's uniform is the unmodified Teal Club (r8) or Sunburst (r13). Custom colours use the built-in rig, which recolours cleanly. Environment and UI images are loaded into `XC.Sprites.env` / `XC.Sprites.ui`; hooking them into `js/render.js` is the next integration step once the files exist (the draw functions for sky, ridges, trees and ground are the places to swap in).
