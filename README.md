# Inkbreak

An original Three.js ink arena shooter with two modes across four arenas. Turf Clash scores painted territory. Squad Assault fields five fighters per team, AI teammates and bunkers guarding each core. Smooth skinned characters use a 16-bone rig, joint deformation and personalized start.ng styles. All shipped art is original.

## Run

Node 22.12+ recommended.

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Select **Turf Clash** or **Squad Assault**, a class and one of four arenas; then click **Let it rip** to capture the mouse. WASD move, mouse aim, left click or J fire, Space jump, C recenter camera, Shift swim/refill in friendly ink, **X slide while moving and keep shooting**, F class ability, Escape pause/release pointer. Slopes add downhill momentum; cover pockets provide escape routes. In Squad Assault, 1–5 switch among living friendly fighters; their health, ink and cooldowns persist. Runner dashes, Anchor shields, Breacher bursts, Medic heals and Ranger takes precision shots. Practice disables enemies and the timer. Graphics settings offer performance/high/ultra, independent resolution scale, sensitivity, sound and frame-time monitor.

```sh
npm test
npm run build
npm run preview
```

## Architecture

- `simulation.ts`: authoritative floor grid, coverage, tank and timer rules.
- `combat.ts`: five classes, actor resources, objective rules, respawn and victory.
- `arenas.ts`: four arena data definitions.
- `slide.ts`: downhill surface sampling from the shared ramp geometry.
- `world.ts`: procedural assets, static batching, ink visualization.
- `character.ts`: smooth skeletal characters, animation and platform identity styling.
- `character-studio.ts`: interactive character/animation preview at `/character.html`.
- `physics.ts`: Rapier kinematic capsule and static world colliders.
- `engine.ts`: fixed-step game orchestration, shared actor physics, navigation, AI, camera, projectiles and effects.
- `input.ts`: keyboard, mouse capture, focus-loss handling.
- `main.ts` / `style.css`: DOM menu, HUD, settings, match results.
- `platform.ts`: validated host identity/appearance adapter boundary.

## start.ng integration

The game follows [start.ng's official contract](https://start.ng/docs.md). On a `*.start.ng` host it loads the official hidden connect frame and asks `startng:whoami`, validating origin, source and request correlation. The playable character uses the returned body, clothing/skin/hair colors, hair, hat and accessory. Focus/visibility refresh updates signed-in or guest identities. An explicit sign-in link returns players through start.ng; the game handles no passwords or account tokens. Localhost remains standalone. `window.inkbreakHost` remains a legacy integration seam.

Publication is **pending the owner's push** and start.ng's check and approval. Only the user may push to GitHub. See [release-ready.md](docs/release-ready.md) for the commands and proof states. No game-code license is included, as requested; bundled library/font notices are in `public/third-party-notices.txt`.

Source HTML is under `app/`, with no root source `index.html` to shadow `dist/`. `npm run release:prepare` tests, builds and checks the ready-to-play `dist/` output, cover dimensions/size, relative asset references and hosting limits. Commit the built `dist/` directory when publishing: start.ng does not run npm or Vite.

## Performance

Automatic resolution adjusts between 60–100% of the selected scale under sustained load. Responsive ground acceleration/braking, jump buffering/coyote time and a stable shoulder camera support keyboard/mouse play.

120 fps is the target, not a universal guarantee. Fixed simulation steps run at 120 Hz; rendering follows the display's `requestAnimationFrame`. A 60 Hz display cannot show 120 distinct frames per second. Graphics, resolution and hardware determine actual throughput. Use the monitor and `window.inkbreak.diagnostics()` to record frame time, p95, draw calls and resources in development. Do not equate CPU frame intervals in a throttled/headless environment with real GPU benchmark results.

## Current scope

Turf Clash and Squad Assault are local single-player modes with AI. Character Lab previews animation and style choices; the game uses the player's actual start.ng identity, not the lab's temporary selections. Controller input, network multiplayer, wall swimming and full commercial-game fidelity remain future work. Each arena includes two sloped ramps sharing vertices between rendering and Rapier collision.
