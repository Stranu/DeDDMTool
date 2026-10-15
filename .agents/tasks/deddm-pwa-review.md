# Cross-promo trailing-slash URLs, new-tab anchors, and manifest identity in DeDDMTool

The change fixes DeDDMTool's "Prova gli altri servizi" cross-promo so installed sibling PWAs open standalone on mobile and in a new tab on desktop. It points both anchors at the in-scope trailing-slash URLs (removing the GitHub Pages 301 redirect that made navigation capture depend on redirect timing), re-adds `target="_blank"` + `rel="noopener noreferrer"` for desktop new-tab behavior, corrects the now-stale comment that claimed `_blank` would keep the link in the browser, declares an explicit `id` so DeDDMTool's identity no longer rides on `start_url`, and bumps the service-worker cache so the edited JS is actually re-fetched. The scope was held to exactly the three files the plan allows. Watch for: nothing blocking — the diff matches the diagnosis before/after values precisely (confirmed), and the only verification gap is OS-level capture behavior that can only be confirmed on-device (acknowledged in both the diagnosis and the verification note).

**Verdict**: APPROVED

## High-level view

The behavioral fix lives in `settings.js`: both `OTHER_SERVICES` entries now carry the trailing slash, so the clicked URL is already inside the target app's resolved scope and the capture decision no longer hinges on whether the browser evaluates scope before or after the 301. The anchors regain `target="_blank"` + `rel="noopener noreferrer"`, giving desktop a new tab while, under current Chrome capturing, still letting an installed in-scope app launch on mobile. The misleading comment that justified the old same-tab anchor was rewritten to describe the current behavior.

Identity is decoupled from `start_url` in the manifest: `start_url` stays `./` (correct per the diagnosis, no regression) and a new `"id": "/DeDDMTool/"` pins the app identity to the recommended value. The service-worker cache constant moves `v41` → `v42` so the updated `settings.js` is picked up on reload rather than served stale from the old precache.

Scope discipline is clean: the diff touches only `settings.js`, `manifest.webmanifest`, and `sw.js`. `css/styles.css` is untouched, the cross-promo description text is unchanged, and the working tree holds all edits with nothing staged or committed.

<details>
<summary>Issues (0)</summary>

No blocking or actionable findings. The one residual item is a stated limitation, not a defect: OS-level navigation capturing (mobile standalone vs. desktop new tab) can only be confirmed on-device after deploy, as noted in the diagnosis and verification note.

</details>

<details>
<summary>Details</summary>

### Trailing-slash URLs remove the redirect-timing ambiguity

Both cross-promo entries now read `https://stranu.github.io/GymBro/` and `https://stranu.github.io/IndiSpesabile/` (confirmed in the diff). The diagnosis identifies the bare-URL form as the root cause: GitHub Pages answers `.../GymBro` with a 301 to `.../GymBro/`, and whether the browser hands the tap to the installed PWA depends on evaluating scope against the pre- or post-redirect URL. Linking directly to the slash form means the URL is in-scope with no redirect, so capture no longer depends on engine-specific timing. The `icon` URLs were left as-is (confirmed) — they already use `/App/icons/...` and were never part of the problem.

### Corrected comment, not just re-added attributes

Beyond re-adding `target: '_blank'` + `rel: 'noopener noreferrer'`, the preceding comment — which previously asserted that `target="_blank"` would keep the link in the browser and that same-tab was required for capture — was rewritten (confirmed in the diff). Leaving the old comment would have left a documented-but-wrong rationale in place, inviting a future regression that strips `_blank` again; the correction closes that trap.

### Manifest JSON validity after the id insertion

`start_url` stays `"./"` and a new `"id": "/DeDDMTool/"` is inserted adjacent to it (confirmed). The one thing worth checking here is comma handling: the insertion sits between two existing comma-terminated members, and the verification note records a successful `JSON.parse`, so the file remains valid JSON (confirmed by the diff shape plus the recorded parse).

### Scope and commit discipline

`git status --porcelain` shows exactly three modified files — `settings.js`, `manifest.webmanifest`, `sw.js` — all unstaged, with only the two task docs as untracked additions (confirmed). `css/styles.css` is absent from the diff, the cross-promo description text does not appear in the diff (unchanged), and no unrelated refactoring is present. Nothing is staged or committed, as required.

### Verification evidence

The coder's note records `node --check` on `settings.js` (exit 0) and a `JSON.parse` of the manifest (valid), which is the appropriate static verification for a build-less, test-runner-less static PWA. No test suite was expected or run. The sole open item — real OS-level capture behavior — is explicitly flagged as on-device-only in both the diagnosis and the verification note, so it is a known limitation rather than a missing check.

</details>

<details>
<summary>Files changed</summary>

- `js/views/settings.js` — both `OTHER_SERVICES` URLs switched to trailing-slash form; `target="_blank"` + `rel="noopener noreferrer"` re-added to the cross-promo anchor; preceding comment corrected.
- `manifest.webmanifest` — added `"id": "/DeDDMTool/"`; `start_url` left at `./`.
- `sw.js` — precache cache version `dm-toolkit-v41` → `dm-toolkit-v42`.

Full diff: `git diff` in `c:\Tools\external\DeDDMTool` (base: working tree vs. HEAD).

</details>
