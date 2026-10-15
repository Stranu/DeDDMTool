# DeDDMTool PWA cross-promo fixes — verification note

First iteration (no `deddm-pwa-review.json` present). Implemented from scratch per
`c:\Tools\external\DeDDMTool\.agents\tasks\deddm-pwa-plan.md`, with the authoritative
before/after values from `c:\Tools\external\GymBro\.agents\tasks\pwa-standalone-open-diagnosis.md`.

No conflicts found between the plan and the diagnosis: both specify the trailing-slash URLs,
re-adding `target="_blank"` + `rel="noopener noreferrer"`, keeping `start_url` at `./`, and
adding `"id": "/DeDDMTool/"`. All applied values match the diagnosis.

## Files changed (only these three)

1. `js/views/settings.js`
   - Both cross-promo URLs changed to trailing-slash form:
     - `https://stranu.github.io/GymBro/`
     - `https://stranu.github.io/IndiSpesabile/`
     (icon URLs unchanged)
   - Re-added `target: '_blank'` and `rel: 'noopener noreferrer'` on the cross-promo anchor
     (`el('a', { class: 'other-service-link', href: service.url, target: '_blank', rel: 'noopener noreferrer' }, ...)`).
   - Rewrote the preceding code comment: it previously claimed `target="_blank"` would keep the
     link in the browser / that same-tab is required for capture. It now states that the
     trailing-slash in-scope links are captured by the installed PWA on mobile while
     `target="_blank"` opens a new tab on desktop.
2. `manifest.webmanifest`
   - `start_url` kept at `"./"` (already correct per diagnosis table; not regressed).
   - Added `"id": "/DeDDMTool/"` adjacent to `start_url`/`scope`. File remains valid JSON.
3. `sw.js`
   - Precache cache version bumped once: `dm-toolkit-v41` -> `dm-toolkit-v42`, so the updated
     `settings.js` is re-fetched on reload.

`css/styles.css` was not touched. The cross-promo description text was not changed. No
unrelated code was refactored. Nothing was staged or committed.

## Commands run and results

- `node --check "c:\Tools\external\DeDDMTool\js\views\settings.js"`
  → exit code 0 (no syntax errors).
- `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "c:\Tools\external\DeDDMTool\manifest.webmanifest"`
  → printed `manifest JSON valid`, exit code 0 (manifest parses as valid JSON).

## Static confirmation of the changes

- Both anchors use trailing-slash URLs AND `target="_blank"` + `rel="noopener noreferrer"`
  (confirmed by re-reading `settings.js` lines around the `OTHER_SERVICES` map).
- `manifest.webmanifest`: `"start_url": "./"` retained and `"id": "/DeDDMTool/"` present
  (confirmed by re-reading the file).
- `sw.js`: `const CACHE = 'dm-toolkit-v42';` (confirmed by re-reading the file).

## Limitation

This is a static client-side PWA with no test runner. The checks above verify syntax, JSON
validity, and the exact edited values. Real OS-level standalone-open behavior (mobile launching
the installed sibling in standalone vs. desktop opening a new tab, and no IndiSpesabile
regression) can only be confirmed on-device after deploying to GitHub Pages.
