# "Prova gli altri servizi" cross-promotion section in DeDDMTool settings

A new section is appended to the bottom of the Impostazioni view linking out to the author's other two GitHub Pages apps, GymBro and IndiSpesabile. It reuses the view's existing `el()` DOM builder, the `section-title`/`card`/`sep`/`muted` class vocabulary, and the per-theme CSS variables, so it reads as native DeDDMTool UI. The '?' affordance beside the title is a native `<button>` disclosure wired with `aria-expanded`/`aria-controls` against a description paragraph that starts `hidden`. The service worker cache constant is bumped so returning users pick up the changed assets.

Watch for: nothing blocking. Links, icon URLs, new-tab attributes, the exact title and description text, and the accessible toggle all match the spec. The only unverified aspect is the runtime/browser walkthrough, which the coder could not run in a headless environment — acceptable for a change whose only logic is the toggle.

**Verdict**: APPROVED

## High-level view

The section is added entirely in `renderSettings` as the last block, after the "Privacy e funzionamento offline" disclosure and its own `hr.sep`, following the established section-boundary pattern. The two rows are generated from a two-entry `OTHER_SERVICES` array holding name/url/icon, so the markup is data-driven and DeDDMTool is structurally absent from the list.

Each row is a single full-width `<a>` with `target="_blank"` and `rel="noopener noreferrer"`, carrying a decorative (`alt=""`) lazy-loaded 40x40 icon and the app name. URLs and icon URLs are the exact absolute GitHub Pages paths required, so they resolve regardless of which host serves DeDDMTool. There is no auth, token, or network-transport code here despite the "stesso account" wording — the shared-account note is purely descriptive text, so there is no security surface to review.

The '?' disclosure is a native button beside the title with `aria-expanded` kept in sync and `aria-controls` pointing at the description `<p id="other-services-desc">`, which is `hidden` by default. Native button semantics give keyboard activation and focus handling for free, and the CSS adds a visible `:focus-visible` outline.

Styling pulls exclusively from existing theme variables and namespaced `other-services-*` classes, so the section recolors with the active theme and collides with nothing. The only non-UI change is the `sw.js` cache bump from `v39` to `v40`, with the `ASSETS` list untouched (the cross-origin icons are correctly not precached). `util.js` was left unmodified, as planned.

<details>
<summary>Issues (0)</summary>

No actionable findings. Every spec requirement is met; the one gap (runtime/browser walkthrough not executed) is informational and does not block.

</details>

<details>
<summary>Details</summary>

### Section placement and data-driven rows

The new block is appended after `root.appendChild(help)` (the Privacy disclosure) with a leading `el('hr', { class: 'sep' })`, matching how every prior section in this view is separated. The two links come from an `OTHER_SERVICES` array of `{ name, url, icon }` mapped to anchors, so there is no DeDDMTool self-entry — the self-exclusion requirement is satisfied structurally, not by a filter that could regress. (confirmed)

```js
const OTHER_SERVICES = [
  { name: 'GymBro', url: 'https://stranu.github.io/GymBro', icon: 'https://stranu.github.io/GymBro/icons/icon-192.png' },
  { name: 'IndiSpesabile', url: 'https://stranu.github.io/IndiSpesabile', icon: 'https://stranu.github.io/IndiSpesabile/icons/icon-192.png' }
];
```

Both target URLs and both icon URLs match the required values character-for-character. Each anchor carries `target="_blank"` with `rel="noopener noreferrer"`, so the whole row is one click target opening in a new tab without leaking the opener. (confirmed)

### Accessible '?' disclosure

The toggle is a native `<button type="button">` beside the title, so keyboard activation comes for free. Its click handler flips the description's `hidden` and keeps `aria-expanded` in sync, and `aria-controls="other-services-desc"` matches the paragraph id. The description is created with `hidden: true` (which `el()` maps to `setAttribute('hidden','')`), so it is genuinely collapsed on first render with `aria-expanded="false"`. The description text is the exact Italian string required — `Altri strumenti gratuiti che ho realizzato. GymBro e IndiSpesabile condividono lo stesso account.` — and the title text node is exactly `Prova gli altri servizi`. (confirmed)

### Theming and class reuse

The appended CSS references only `--border`, `--bg`, `--bg-elev-2`, `--text`, `--text-dim`, `--accent`, and `--accent-rgb`, all of which are defined in `:root` and redefined in each `:root[data-theme="..."]` block at the top of `styles.css` (verified by reading the base file). No hardcoded colors are introduced, so the section tracks the active theme. The row visual mirrors the app's existing accent-border-on-hover convention and adds a `:focus-visible` outline for keyboard users; the icon has a `--bg-elev-2` background that shows while the cross-origin image loads or if it fails. New classes are namespaced `other-services-*`, avoiding collisions with existing rules. (confirmed)

### Service worker and scope discipline

`sw.js` changes only the `CACHE` constant (`dm-toolkit-v39` -> `dm-toolkit-v40`); the `ASSETS` array is unchanged, and the two cross-origin icon URLs are correctly kept out of the precache list. `settings.js` and `styles.css` are already in `ASSETS`, so no entry needed to be added. `util.js` was not touched — the existing `el()` helper already supports every prop used here. No unrelated refactors appear in the diff. All changes are left uncommitted. (confirmed)

### Verification evidence

The coder's note records `node --check` passing (exit 0) on both `js/views/settings.js` and `sw.js`, plus a code trace of the toggle and anchor construction. CSS has no compiler in this repo, so a code trace against the existing variable definitions is the appropriate check, which I independently re-confirmed by reading the base `styles.css`. The runtime/browser walkthrough was not executed (no interactive browser in that environment); this is a reasonable gap for a static markup+CSS change with no logic beyond the toggle, and the toggle logic is simple enough to verify by inspection. I did not re-run `node --check` — no articulable doubt remained after reading the diff and evidence. (confirmed)

</details>

<details>
<summary>Files changed</summary>

- `js/views/settings.js` — appends the "Prova gli altri servizi" section (separator, '?' toggle button, collapsed description, and the two data-driven app-link rows) at the end of `renderSettings`; adds the local `otherServicesSection()` builder.
- `css/styles.css` — new namespaced `.other-services*` rules (title row, '?' toggle, link rows, icon) using theme variables, appended after `.backup-card`.
- `sw.js` — `CACHE` bumped `dm-toolkit-v39` -> `dm-toolkit-v40`; `ASSETS` unchanged.
- `js/util.js` — not modified (confirmed; existing `el()` helper sufficient).

Full diff: `git diff` in `c:\Tools\external\DeDDMTool`.

</details>
