# Inkbreak hybrid milestones

User chose both modes in separate milestones. The quality reference is immersive commercial shooters; this remains an original browser game, not an AAA production or a clone of either reference.

## Milestone 1 — Turf Clash

Preserve four arenas, painting, swimming/refill and three-minute turf scoring. Add five original class loadouts: Runner (dash), Anchor (shield), Breacher (burst), Medic (heal) and Ranger (precision). Select a class in the menu; F activates the class ability. Keep responsive keyboard/mouse control, the smooth skinned character and start.ng identity. Improve weapon sounds, impact reactions, ability feedback and arena readability without blocking the view or adding uncontrolled render cost.

## Milestone 2 — Squad Assault

Two teams of five fighters. Keys 1–5 switch to an available friendly fighter; all unselected fighters use AI. Preserve every fighter's health, ink, cooldown and respawn state across switches. Two opposing bunkers protect each team's core. Destroying the enemy core wins; at timeout compare remaining objective health, then painted territory, with an exact tie as a draw. Ink remains a tactical resource for movement/refill rather than decorative color.

Use one Rapier world and one fixed step per tick for all actors. Run AI decisions at a lower cadence, use walkable routes and line of sight, and bound projectiles/effects. The controlled fighter retains the player's start.ng body/colors/hair/hat/accessory; class identity is represented by gear and weapon behavior.

## Boundaries and verification

combat.ts owns pure match/hero/objective state and tests. engine.ts/physics.ts own motion, AI, actor switching, projectiles and camera integration. main.ts/style.css own mode/loadout/HUD/results. combat-view.ts owns objective visuals. audio.ts owns combat sound. Preserve a standalone local mode and the tested official start.ng adapter.

Verify class cooldowns and team damage, objective locks and win conditions, no stat reset on switching, paused time and reset behavior. Browser-test both modes, real keyboard abilities/switches, combat feedback, objectives, results and all arena choices. Measure actual frame timing separately from fixed simulation frequency. Test/build/static checks must pass before the owner pushes.

Controller input, network multiplayer, ranked progression, monetization and a large collectible roster are later scope. No GitHub push by the assistant. Publishing check/approval remains pending the user's public repository URL and push.
