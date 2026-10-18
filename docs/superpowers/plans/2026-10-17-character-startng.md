# Character redesign and start.ng release

**Goal:** replace rigid character animation with smoothly skinned original characters, then connect and publish the existing four-arena game through start.ng's documented flow.

**Architecture:** preserve Three.js, Rapier and authoritative gameplay. A dedicated character module owns the skeleton, materials, host style and animation. The platform adapter owns the official connect iframe and identity lifecycle. Source HTML lives under app/; dist/ is committed ready to play.

**Approved scope:** smooth stylized skin, articulated movement, original visuals; all official player identity fields; four existing arenas; cover image; public repository; check before publish; return approval link. User explicitly chose no license file. Controller/multiplayer remain out of scope.

- [x] Read existing source and official https://start.ng/docs.md; verify GitHub authentication status.
- [x] Implement character mesh, normalized skin weights and bone animation in src/character.ts; test actual joint deformation and identity variants.
- [ ] Integrate updateAvatar for player and bots; remove rigid limb animation.
- [ ] Add character studio for inspecting animation, materials and identity variants.
- [ ] Implement official whoami iframe in src/platform.ts with origin/source/request correlation, bounded timeouts, refresh and disposal tests.
- [ ] Wire full character style, name, account, guest state and explicit sign-in link into main.ts.
- [ ] Move Vite entry to app/index.html, build committed dist/ with relative paths and cover.png. Verify no root source index can shadow the build.
- [ ] Run automated tests, build, browser gameplay/character review, static-file and secret checks. Record actual evidence and limits.
- [ ] Owner-only step: the user creates/chooses a public repository and pushes the reviewed source plus built output. The assistant must not push or upload files to GitHub.
- [ ] POST https://api.start.ng/games/check with repo_url/name/branch; fix errors and repeat only after changes.
- [ ] POST https://api.start.ng/games/publish and return the actual approve_url for the user to approve. Verify live hosting after user approval.

No platform passwords, account tokens or API keys are required in the game. No publication or measured FPS claim precedes the relevant verification.
