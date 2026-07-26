# rootcauseunlocked.com

Static site for Root Cause Unlocked. No build step.

- Pages are hand-written HTML with one shared stylesheet (`assets/styles.css`).
- Clean URLs use directory-style paths (`discovery/index.html` serves `/discovery`), which works identically on GitHub Pages, Vercel, Netlify, and the local static server.
- `quiz/index.html` is GENERATED. Do not edit it here. Edit the canonical assessment at the workspace root and re-run `node assemble.mjs`.
