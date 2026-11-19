# VATRA — page-owned assets

Shared social pages retain `base.css`, the existing shared `feed.css` shell and `social-shell.js`. Clips, Marketplace and VATRA ID share only the new section helpers (`core.js` / `core.css`) and load their own feature files; `sections.js` and `sections.css` are removed.

- The community directory and individual club share `community-core.js` and `communities.css` but load `communities.js` and `club.js` separately. The directory never imports post media or post interactions. Optional business tools load their JavaScript only inside a club; their active styles live in `communities.css`, scoped to the community tool view. There is no standalone business page or stylesheet.
- Marketplace's creation form and clip composer are imported on demand.
- `account-guard.js` checks restrictions for every member. Only a verified owner-role response exposes the ADMIN PANEL entry, and only clicking it imports `admin.js` and `admin.css`. The server RPC/RLS remains the authorization boundary.
- Marketplace images obtain signed URLs near the viewport. Identical photo paths reuse in-flight requests and a bounded 60-second browser-memory cache cleared on auth changes. No signed URLs or private results go to Redis.
- Clip author labels use batched public-name lookups and the existing optional Redis-backed public-name endpoint. Header avatar paths reuse the existing viewer-local cache.
- Content-versioned JS/CSS use a Git blob fingerprint in the URL. The service worker caches only body-matching versions without revalidation, capped at 80 entries. Unversioned resources retain network revalidation; HTML and private data are not cached by the worker.
- When updating a versioned module, run `node tools/revision-assets.mjs --write` and commit changed references in the same commit.

## Production build

Run from the repository root:

```sh
npm install --no-save --no-package-lock esbuild@0.28.2
node tools/build-static.mjs
```

The build copies only public site files into `dist/`, minifies CSS and JS without bundling page modules together, updates content fingerprints after minification and emits `build-summary.json`. Source files remain readable and there are no tracked .min copies. The build does not change Supabase, Redis credentials or GitHub Pages deployment settings. A separate manual Pages source change to GitHub Actions and a validated deployment workflow are necessary before the generated artifact can replace the current branch-based site.

The shared social stylesheet still needs a browser-verified split; music and messaging do not yet have standalone HTML routes in this repository.
