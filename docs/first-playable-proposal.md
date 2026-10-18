# First playable proposal

Status: approved by the user with four arenas and a 120 fps target; implementation in progress.

## Evidence and objective
The user requests a Three.js game inspired by Splatoon 3, playable first with keyboard input, with controllers and multiplayer in later versions. The lesson PDF additionally requires publishing on start.ng, use of its logged-in users, and centrally controlled character appearance. The workspace was empty at inspection.

## Recommended scope
Build an original third-person ink arena shooter rather than attempt a full commercial-game recreation. Use original procedural characters, arena geometry, logos and audio; Splatoon 3 is the gameplay and movement reference. Working title: Inkbreak (proposed).

Four distinct original arenas inspired by Splatoon’s traversal and turf-control principles: an industrial skatepark, a waterfront cargo yard, a rooftop plaza, and a warehouse complex. Each has its own lane layout, ramps, cover, spawn protection and visual landmarks. Include arena selection and load only the selected arena. Cyan and coral ink, ramps and cover, a visible player character with ink weapon, aim reticle, paint splashes, responsive camera and movement. A three-minute turf round against two simple AI opponents, coverage scoring, refill/swim mechanics, splat and respawn, results and retry. A practice mode supports learning controls without bots.

Keyboard and mouse: WASD move, mouse aim, left mouse shoot, Space jump, Shift swim in owned ink and refill, Escape pause/unlock. Focus loss pauses and clears held input. Pointer-lock capture requires an explicit Start action. Controls and sensitivity are available in pause/settings.

## Technical recommendation
Vite + TypeScript + vanilla Three.js; Rapier kinematic collision for capsule, ramps and static arena geometry. Fixed-step simulation separate from scene objects and interpolated rendering. Independent input, physics, ink, combat, bots, match, camera, UI and platform-adapter modules. DOM HUD and menus. Ink grid is the authoritative floor ownership/score/swim state and drives a bounded texture representation; pool projectile/effect objects. Wall painting and wall swimming are later scope unless expanded explicitly.

## Visual direction
Experience mode: game fills the viewport, with minimal HUD, readable score/timer, ink gauge, reticle, and transient feedback. Bright ink against warm concrete and a dark graphic HUD; playful street-sport typography and original signage. Gameplay camera damping and character animation matter more than marketing scroll effects. Game Studio is the runtime authority; Design Director coordinates; Impeccable audits accessibility and performance. The selected landing-page taste skills contribute typography, legibility and motion restraint where relevant, not AIDA sections over the game.

## Acceptance and performance
Build/typecheck plus meaningful simulation tests for paint ownership/scoring, refill, input pause/reset, damage/respawn and match restart. Browser playtest actual keyboard movement, aiming, painting, refill, collision, pause, win/loss and restart. Inspect desktop and narrow viewport UI; touch gameplay is not first-version scope. Measure frame time and renderer draw calls on the available machine, target 120 fps (8.33 ms total frame budget) on capable desktop hardware and a compatible display, and report actual results for all four arenas. High-quality visuals and sharp resolution are separate goals from frame rate: provide independent resolution scale, pixel-ratio cap, shadow and effects settings, plus quality presets. Pool effects, bound ink resources, instance repeated geometry, and unload inactive arenas. Measure CPU and GPU bottlenecks where supported; record hardware, browser, resolution, graphics preset, average frame rate and frame-time percentiles. Do not guarantee 120 fps on all devices or imply that a 60 Hz display can show 120 distinct frames each second. Switch-equivalent responsiveness is a target, not a verified claim.

## start.ng delivery
Use a typed host adapter for verified user identity and centrally managed appearance. Standalone development mode is explicitly marked; it does not count as integrated start.ng authentication. Need the platform integration documentation/repository, auth and avatar contract, and publishing access. Validate the real identity and appearance flow before calling platform integration complete. Distinguish local runtime, preview hosting and actual start.ng publication. Do not invent an SDK, login token or publication endpoint.

## Alternatives
A: recommended scoped third-person arena: demonstrates the core ink loop and leaves clear expansion seams.
B: smaller shooting range first: faster and simpler but lacks a competitive match loop.
C: broad recreation with campaign, many weapons and online play: substantially larger, conflicts with the requested first-version focus.

## Tools and orchestration
Two planning agents investigated requirements and architecture. Ruflo MCP/ToolSearch was not exposed; documented CLI swarm initialization was attempted, outcome must be checked before claiming success. No paid media jobs submitted. Use relevant generators and plugins only for a concrete asset need; neural trading is unrelated to the game. Deployment authorization comes from the user request, but platform access and contracts remain prerequisites.

## Open approval
User revised the scope to four arenas and a 120 fps target with high-quality visuals. These supersede the earlier one-arena and 60 fps proposal. Arena themes above remain proposed original designs. Confirm the remaining first-playable design before implementation under the brainstorming workflow. Request the start.ng developer documentation/repository location alongside approval so platform work can proceed when available.
