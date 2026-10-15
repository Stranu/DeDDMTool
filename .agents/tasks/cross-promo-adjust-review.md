# Cross-promo links open standalone, per-app purpose descriptions

The DeDDMTool "Prova gli altri servizi" section gets two follow-up adjustments. The cross-promo anchors to GymBro and IndiSpesabile drop `target="_blank"` and `rel="noopener noreferrer"` so an in-scope link to an installed sibling PWA is captured by the browser/OS and opened in that app's standalone window instead of staying in the current page. The `?` disclosure text is rebuilt: the old single line that mentioned a shared account is replaced by an intro line plus one bold-named purpose line per app, using the exact Italian strings specified. The service-worker cache constant is bumped v40 → v41 so the updated bundle is re-fetched. Only `js/views/settings.js` and `sw.js` are modified; `util.js` and `css/styles.css` are untouched, matching the expected scope.

Watch for: the standalone-open behavior cannot be verified headlessly and depends on the device's installed-app and link-capture state — the author documented this correctly as a manual-test item, not a code defect (confirmed).

**Verdict**: APPROVED

## High-level view

The open-behavior fix rests on a correct diagnosis. The author checked that all three apps render `target="_blank"` and that the manifests share `display: standalone` / `scope: "./"`, so the difference the user saw was never a rendering difference between apps — it was the device's per-site link-capture state. Dropping `target="_blank"` for a plain same-tab top-level navigation is the treatment that lets an installed in-scope PWA capture the link, applied consistently to both anchors, with an Italian code comment recording the reasoning.

The description change swaps the former `<p>` for a `<div>` containing an intro paragraph and two per-app purpose paragraphs. The two purpose strings match the required wording verbatim, and no "stesso account" text survives anywhere in DeDDMTool's live code. The disclosure's accessibility is preserved: the element id, `aria-controls` target, and the toggle that flips `hidden` and syncs `aria-expanded` all work unchanged because a `<div>` exposes the same `hidden` property the old `<p>` did.

The cache bump is a single-line v40 → v41 change following the repo's existing `dm-toolkit-vNN` convention. No security surface is involved — these are static outbound links to the author's own GitHub Pages origins with no auth, token, or data-handling code.

<details>
<summary>Issues (0)</summary>

No blocking or non-blocking action items. The one caveat (standalone-open behavior requires manual device testing) is inherent to the platform, already documented by the author, and not a code defect.

</details>

<details>
<summary>Details</summary>

### Open behavior: dropping target="_blank" for link capture

The two cross-promo anchors change from `{ class, href, target: '_blank', rel: 'noopener noreferrer' }` to `{ class, href }`. The diagnosis behind this is sound and documented in the verification note: all three sibling apps actually render `target="_blank"`, and the manifests all declare `display: standalone` with `scope: "./"`, so the user-observed asymmetry (IndiSpesabile opening standalone, the others opening inline) was not a difference in how the apps build their links. It was the device's installed-app and per-site link-capture state. A `target="_blank"` navigation opens a new browser tab/WebView, which tends to defeat the browser's link-capture into an installed PWA; a plain same-tab top-level navigation to an in-scope URL is what gets captured and routed to the installed standalone app. An Italian comment above the anchor builder records this rationale, so the next reader understands why `target="_blank"` is intentionally absent rather than forgotten (confirmed).

Removing `rel="noopener noreferrer"` alongside `target="_blank"` reintroduces no risk — `noopener` only matters when a new browsing context is created, and these point at the author's own `stranu.github.io` origins, so there is no reverse-tabnabbing exposure (confirmed).

### Disclosure description: verbatim strings and residual-text check

The two per-app lines wrap the app name in `<strong>` followed by a plain-string purpose, rendering as "GymBro: App per tracciare i tuoi allenamenti e progressi in palestra." and "IndiSpesabile: Lista della spesa condivisa, semplice e veloce." Both match the required wording character-for-character (confirmed). A repo-wide search for "stesso account" returns matches only in planning/old-review markdown under `.agents/tasks/` and in the out-of-scope GymBro app; DeDDMTool's live `settings.js` carries none (confirmed).

### Verification evidence

The author recorded `node --check js/views/settings.js` and `node --check sw.js` both exiting 0 in the verification note. The diff is small, syntactically plain, and I read the resulting `settings.js` and the `el` helper directly, so no re-run was warranted. The only unverifiable item — whether a real click opens the installed standalone PWA — is a platform/device behavior the author flagged honestly as manual-test-only, not a gap in the code (confirmed).

</details>

<details>
<summary>Files changed</summary>

- `js/views/settings.js` — cross-promo anchors drop `target="_blank"`/`rel`; description `<p>` becomes a `<div>` with intro + two per-app purpose lines; Italian comment documents the open-behavior rationale.
- `sw.js` — cache constant `dm-toolkit-v40` → `dm-toolkit-v41`.

Full diff: `git diff` in `c:\Tools\external\DeDDMTool`.

</details>
