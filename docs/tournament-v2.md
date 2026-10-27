# Inkbreak competitive roadmap

This is a plan for future releases, not a list of features currently live. Keep the existing solo game playable while adding network competition in verified milestones. Use original characters, abilities, and environments inspired by the pace and readability of arena shooters.

## Match rules

- **Solo free-for-all:** each player competes independently; respawns remain on until the match timer ends.
- **Team tournament:** support **2–7 teams**. A team leader chooses a roster cap before opening the lobby and shares an invite code. The server enforces the cap, team membership, and match start rules. Players respawn during the round; the highest verified score at the end wins. Define a deterministic tie-breaker before ranked play.
- **Scoring:** award points for painted territory, eliminations, assists, and support actions such as healing or protecting teammates. Show the score breakdown in the HUD and results. Limit repeat rewards from the same opponent or action to prevent farming.
- **Arena:** build a larger tactical map with useful cover, height changes, downhill sliding, paintable routes, clear spawn exits, and landmarks. Measure sightlines and traversal times with real players before enlarging all four arenas.
- **Roles:** give each fighter one readable, original skill that supports a distinct play style. Prototype mobility, area paint, defense, healing/support, and precision roles with cooldowns and counterplay; avoid pay-to-win upgrades.
- **Progression:** tokens are earned through verified play only and spent on cosmetic items or balanced sidegrades. No token purchases are planned. Keep token grants and balances on the server.
- **Paint-zone vehicle:** a temporary optional skill may summon a ride within a qualifying painted zone. Display its remaining duration, prevent use outside valid zones, and let opponents counter it. Ship only after the base movement and scoring are stable.
- **Boards:** expose daily, weekly, monthly, tournament, and all-time rankings for the relevant modes. Specify UTC rollover, eligibility, tie order, anti-cheat review, and season archival before launch.

## Delivery sequence

1. **Feel and access:** polish camera, movement, ink economy, map cover, mobile touch aiming/movement, readable HUD, and performance. Verify on actual phones and desktop browsers.
2. **Network foundation:** build an authoritative match service for identity-bound lobbies, invite codes, leader-selected roster caps, presence, reconnects, team assignment, respawns, and match state. Release private unranked tests first.
3. **Competitive MVP:** ship solo free-for-all and 2-team matches, one tactical map, scoring breakdown, result verification, and basic roles. Run load, latency, abuse, and fairness tests before public tournaments.
4. **Tournament expansion:** extend to 3–7 teams and larger maps only after the 2-team flow is reliable. Add tournament scheduling, leader tools, standings, moderation, and the five time-scoped boards.
5. **Progression and variety:** add play-earned tokens, cosmetics, more balanced roles, and the optional timed paint-zone vehicle. Tune from match telemetry and player feedback.
6. **Later releases:** controller support, teammate voice/tactics, phone-as-controller, console porting, and solo/co-op story mode.

## Platform and security boundary

The [current start.ng game documentation](https://start.ng/docs) documents a movement/wave realtime socket, not a combat-authoritative multiplayer API. Its built-in leaderboard stores one signed-in player's all-time best run with up to five integer statistics; it does not provide daily, weekly, monthly, or tournament boards. Inkbreak can use that board for a verified all-time best summary, but competitive matches, scoped boards, token balances, and tournaments need a separate authoritative service and persistent database. The game client must never decide match outcomes or award its own tokens. Bind service sessions to verified start.ng identity using a documented trust mechanism; do not treat iframe display data or client-submitted scores as proof of identity or results. Keep guests in unranked play unless the service has a supported guest policy.

## Acceptance criteria

- Solo and team test matches synchronize movement, paint, damage, scoring, respawns, and results across independent browsers under realistic latency; reconnects and disconnects have defined outcomes.
- Lobby tests cover 2–7 teams, invite-code expiry, roster cap enforcement, leader departure, duplicate joins, and late joins.
- Server tests reject forged scores, duplicate rewards, invalid skills, replayed results, and token spending beyond the earned balance.
- Each score category is visible and matches the server result. Daily/weekly/monthly/tournament/all-time boards use documented time boundaries and deterministic ties.
- Mobile players can aim, move, shoot, use a skill, and navigate results without a mouse or keyboard. Touch controls do not obscure essential play.
- The tactical map provides multiple cover routes and slide paths without unfair spawn firing lines; role and vehicle balance are tested with human players.
- Frame pacing and input latency are measured on target devices. A 120 fps target is a performance goal, not a blanket guarantee.
