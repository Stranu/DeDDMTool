# Verification — "Prova gli altri servizi" (DeDDMTool)

First iteration (no `other-services-review.json` present at start). Implemented from
scratch per `other-services-plan.md`. No git state was changed; all edits are uncommitted.

## Files changed

- `js/views/settings.js` — new section builder + append in `renderSettings` + '?' toggle.
- `css/styles.css` — new `.other-services*` rules (appended after `.backup-card`).
- `sw.js` — `CACHE` bumped `dm-toolkit-v39` -> `dm-toolkit-v40`; `ASSETS` unchanged.
- `js/util.js` — NOT modified (existing `el` helper was sufficient).

## 1. Syntax check (what was run + result)

Command (PowerShell, repo root `c:\Tools\external\DeDDMTool`):

```
node --check "c:\Tools\external\DeDDMTool\js\views\settings.js"   -> exit 0 (no output)
node --check "c:\Tools\external\DeDDMTool\sw.js"                   -> exit 0 (no output)
```

Both parsed cleanly. `css/styles.css` has no compiler in this repo; it is verified by
code trace below (variables/classes resolved against existing definitions in the file).

## 2. renderSettings trace (section appended + toggle shows/hides description)

In `renderSettings`, after the existing `details.help` ("Privacy e funzionamento
offline") block and its `root.appendChild(help)`, the new code appends, in order:

1. `el('hr', { class: 'sep' })` — the separator above the section (matches every other
   section boundary in this view).
2. The description `<p id="other-services-desc" class="muted other-services-desc"
   hidden ...>` holding the exact Italian text:
   `Altri strumenti gratuiti che ho realizzato. GymBro e IndiSpesabile condividono lo
   stesso account.`
   `el` sets `hidden` as a boolean attribute (its `v === true` branch), so the paragraph
   is collapsed by default.
3. The title `el('div', { class: 'section-title other-services-title' }, ['Prova gli
   altri servizi', toggleButton])`. The first child is a plain string, which `el` turns
   into a text node, so the title text is exactly `Prova gli altri servizi`; the '?'
   button sits beside it.
4. `otherServicesSection(otherServicesDesc)` — the `.card` containing the description
   paragraph (as first child) followed by the two link rows.

Toggle handler (`otherServicesToggle` click):
```
const collapsed = otherServicesDesc.hidden;      // true on first click
otherServicesDesc.hidden = !collapsed;           // -> false (shown)
otherServicesToggle.setAttribute('aria-expanded', String(collapsed)); // -> "true"
```
- Load: `hidden` present, `aria-expanded="false"` — description NOT shown.
- 1st click: `hidden` removed, `aria-expanded="true"` — description shown.
- 2nd click: `hidden` set again, `aria-expanded="false"` — description hidden.
The toggle is a native `<button type="button">` (Enter/Space activate it for free) with
`aria-controls="other-services-desc"` pointing at the paragraph and an `aria-label`/`title`
"Mostra descrizione". Accessible disclosure requirements satisfied.

## 3. Anchors: URLs, icon URLs, and new-tab attributes

`otherServicesSection` builds one row per entry in `OTHER_SERVICES`:

- GymBro: `href="https://stranu.github.io/GymBro"`,
  icon `src="https://stranu.github.io/GymBro/icons/icon-192.png"`.
- IndiSpesabile: `href="https://stranu.github.io/IndiSpesabile"`,
  icon `src="https://stranu.github.io/IndiSpesabile/icons/icon-192.png"`.

Each row is a single `el('a', { class: 'other-service-link', href, target: '_blank',
rel: 'noopener noreferrer' }, [icon, name])` — the whole row is the anchor (one click
target), opens in a new tab, with `rel="noopener noreferrer"`. The icon `<img>` is
decorative (`alt=""`, `loading="lazy"`, 40x40) and the name is a `<span>` with the app
name. DeDDMTool itself is NOT listed (only the two other apps).

## 4. Styling / theming trace

New CSS uses only existing theme variables (`--border`, `--bg`, `--bg-elev-2`, `--text`,
`--text-dim`, `--accent`, `--accent-rgb`) — all defined per-theme in `:root[...]` blocks
at the top of `styles.css`, so the section recolors with the active theme. The link row
echoes the existing `.list-linkitem.row-clickable` hover (accent border) and adds a
`:focus-visible` outline; the '?' is a small round button beside the title. The `.card`,
`.sep`, `.section-title`, `.muted` classes used are the project's existing ones.

## Notes

- Runtime/visual browser check from the plan (serve + open Impostazioni) was NOT executed
  here; this environment has no interactive browser session. All claims above are from
  `node --check` output and a direct code trace of the committed source. Full SW
  update/visual behavior only manifests on a deployed HTTPS host (per README).
- No files other than the three listed were modified. All changes left uncommitted.
