# Owner-controlled start.ng release

Only the user may push to GitHub. No remote creation, GitHub upload or push has been performed by the assistant. No license file is included for the original code/art, per the user's explicit choice. Third-party notices remain with the bundled libraries and fonts.

## Prepare and review locally

```sh
cd /Users/henryuks/Documents/Splatoon3
npm run release:prepare
npm run preview -- --port 4173
```

Open http://127.0.0.1:4173/ for the production game or http://127.0.0.1:4173/character.html for the character preview. Character Lab choices are temporary previews; hosted gameplay uses the actual start.ng identity.

## User-only GitHub steps

For this new checkout (currently no Git repository), run these yourself. Review the staged file list before committing. These commands create a public repository named inkbreak on your authenticated account and push the built game.

```sh
cd /Users/henryuks/Documents/Splatoon3
git init -b main
git add .gitignore README.md PRODUCT.md DESIGN.md package.json package-lock.json tsconfig.json vite.config.ts app src public scripts dist docs
git diff --cached --stat
git status --short
git commit -m "Build Inkbreak Turf Clash and Squad Assault"
gh repo create inkbreak --public --source=. --remote=origin
git push -u origin main
gh repo view --json url --jq .url
```

If you already have a repository for this game, use that repository's existing remote instead of creating another. Share the resulting public URL after your push; no GitHub credentials are needed for the assistant to run start.ng's public-repository check.

## Check and publish, after the owner pushes

These commands do not push anything to GitHub. Replace OWNER with the account that owns the public repository:

```sh
node scripts/startng-publish.mjs https://github.com/OWNER/inkbreak
node scripts/startng-publish.mjs https://github.com/OWNER/inkbreak --publish
```

The first command calls POST https://api.start.ng/games/check. The second checks again and calls publish only if the check passes. Fix any reported errors before retrying. The helper uses the repository's default branch and requests the game name inkbreak; if that name is taken, choose another name deliberately in the helper before submitting again.

The first successful publish should return status pending and an actual approve_url. The owner opens that URL, signs in to start.ng and approves. Only then is the game live. The assistant must not claim a live URL or approval link before the API returns it.

Future updates also require the user to run the local build and push the refreshed dist/ output. start.ng then watches the published branch. Source-only pushes do not rebuild the game.

## Remaining proof gates

- Public repository and owner push: pending.
- POST /games/check and its actual result: pending public repository.
- Publish approval link: pending a successful check and publish request.
- Real signed-in/guest character rendering on *.start.ng: verify after hosting; localhost deliberately does not impersonate the connect origin.
- Live gameplay and measured 120 fps: report browser evidence separately; a fixed 120 Hz simulation is not a 120 fps hardware result.
