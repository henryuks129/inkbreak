# Standalone build verification

Start.ng is still being built by Team Cybertron, per the user. The game runs independently; the internal host adapter is a placeholder contract pending real platform documentation. No publication or real start.ng integration is claimed.

- `npm test`: 9 tests passed, including turf ownership, timer/reset, ink rules, input lifecycle, host validation, arena spawns and Rapier ramp traversal in all four arenas.
- `npm run build`: TypeScript and Vite production build passed. Rapier's bundled WASM produces a large physics chunk; Vite reports a size warning.
- Local development server: http://127.0.0.1:5173/ (started successfully outside the sandbox after a local Console Ninja connection was denied inside it).
- Browser QA is incomplete: the in-app browser failed to attach, Chrome creation timed out, and a subsequent browser inventory timed out. No rendered screenshots, keyboard/mouse playtest, mobile review, or measured FPS are claimed.
- 120 Hz is the simulation target. Actual rendering FPS and Nintendo Switch-like fluidity remain unverified and depend on hardware, display refresh rate and graphics settings.
- All characters, arenas and procedural visuals are original. This is an ink-shooter prototype inspired by the requested gameplay, not Nintendo's Splatoon 3 game or assets.
- Next: browser playtest all four arenas, movement/jump/fire/swim/refill, pause/settings, respawn, results/retry; measure frame timing at each quality setting and fix observed issues before publication.

Ruflo CLI initialization could not be verified because its installed package lacked a required module. Two built-in collaboration agents assisted with arena/world and simulation/physics work. A fresh source reviewer was requested; source review cannot substitute for visual approval.
