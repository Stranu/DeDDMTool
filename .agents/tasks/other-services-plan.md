# Implementation Plan — "Prova gli altri servizi" (DeDDMTool)

Add a cross-promotion section to the DeDDMTool settings view linking to the other two
apps (GymBro, IndiSpesabile). Vanilla-JS static PWA, no build system, no backend.
Do NOT commit anything.

## Design decisions (grounded in the codebase)

- **Where**: append the new section at the END of `renderSettings` in
  `js/views/settings.js`, after the existing `details.help` "Privacy e funzionamento
  offline" block, preceded by an `<hr class="sep">` separator — this matches how every
  other section is introduced (section-title + content, separated by `hr.sep`).
- **DOM builder**: reuse the existing `el(tag, props, children)` helper from `js/util.js`
  (already imported in settings.js). No new helper is needed in util.js, so util.js is
  NOT modified. Rationale: the feature is pure markup + a tiny toggle; `el` already
  supports `html`, `text`, `class`, `on*` listeners, and boolean/omitted attributes.
- **'?' toggle mechanism** — chosen: a dedicated `<button type="button">` affordance
  placed BESIDE the title (not a `<details>/<summary>` wrapping the whole section). It
  uses `aria-expanded` + `aria-controls` pointing at the description `<p>`, which starts
  with the `hidden` attribute and is toggled on click. Rationale: the task requires the
  '?' to sit next to the title and the description to be collapsed by default; the app's
  native `<details class="help">` pattern wraps content under a summary and cannot place
  a small affordance beside a separate title, so a minimal accessible button toggle is
  the right fit. The button is keyboard-activatable for free (native `<button>` responds
  to Enter/Space) and gets a visible focus style via existing focus conventions.
- **Links**: each app is a single full-width `<a>` row (whole row clickable) with
  `target="_blank"` and `rel="noopener noreferrer"`, containing the app icon `<img>` and
  the app name. Icons are referenced by absolute GitHub Pages URL so they load regardless
  of which host DeDDMTool is served from. Only the OTHER TWO apps are listed (never
  DeDDMTool itself).
- **Styling**: reuse theme CSS variables (`--bg`, `--bg-elev`, `--border`, `--text`,
  `--text-dim`, `--accent`, `--accent-rgb`, `--radius`) and lean on the existing
  `section-title`, `card`, `sep`, `muted`, `row` conventions. New classes are namespaced
  `other-services-*` to avoid collisions. The link row visual echoes the existing
  `.list-linkitem.row-clickable` pattern (border, radius, accent border on hover).
- **Service worker cache**: because `css/styles.css` and `js/views/settings.js` change,
  bump the `CACHE` constant in `sw.js` (`dm-toolkit-v39` -> `dm-toolkit-v40`) per the
  README's "Pubblicare aggiornamenti" instructions, so returning users get the new assets.
  No files are added to the `ASSETS` list (settings.js and styles.css are already listed;
  the two icons are cross-origin and must NOT be precached).

## Verification baseline (no automated tests / linter exist)

This project has no package.json, test runner, or linter. Verification per item is:
1. **Syntax check** the changed JS with Node: `node --check js/views/settings.js`
   (expected: no output, exit code 0). This catches parse errors without a bundler.
2. **Runtime/visual check**: serve the folder statically and open Impostazioni in a
   browser. Start a server from the repo root with
   `python -m http.server 8080` (Python 3.14 confirmed available) and open
   `http://localhost:8080` → Impostazioni tab. Confirm the behaviors listed per item.
   CSS has no compiler, so its only meaningful verification is this visual check.

---

# Implementation Plan

- [ ] 1. Add the "Prova gli altri servizi" section builder and append it in `renderSettings`.
      In `js/views/settings.js`, after the existing `details.help` ("Privacy e funzionamento
      offline") block near the end of `renderSettings`, append `el('hr', { class: 'sep' })`,
      then `el('div', { class: 'section-title' })` whose children are the title text
      `'Prova gli altri servizi'` plus the '?' toggle button, then `otherServicesSection()`.
      Define a local function `otherServicesSection()` (sibling of `themeSection`,
      `dataCard`, `backupSection`) that returns the card described in items 2–3. Keep an
      `OTHER_SERVICES` array literal inside/near the function holding the two entries
      (name + url + iconUrl) so the two rows are generated from one list:
        - { name: 'GymBro', url: 'https://stranu.github.io/GymBro',
            icon: 'https://stranu.github.io/GymBro/icons/icon-192.png' }
        - { name: 'IndiSpesabile', url: 'https://stranu.github.io/IndiSpesabile',
            icon: 'https://stranu.github.io/IndiSpesabile/icons/icon-192.png' }
      Files: js/views/settings.js
      Verify: `node --check js/views/settings.js` passes (exit 0). Then serve and open
      Impostazioni: a new "PROVA GLI ALTRI SERVIZI" section appears at the bottom, after
      the Privacy disclosure, with its own separator above it.

- [ ] 2. Build the two clickable app-link rows inside `otherServicesSection()`.
      For each entry in `OTHER_SERVICES`, create an anchor:
      `el('a', { class: 'other-service-link', href: entry.url, target: '_blank',
      rel: 'noopener noreferrer' }, [ icon, label ])`.
      - icon: `el('img', { class: 'other-service-icon', src: entry.icon, alt: '',
        loading: 'lazy', width: 40, height: 40 })` (decorative; `alt=''` because the
        adjacent text already names the app).
      - label: `el('span', { class: 'other-service-name', text: entry.name })`.
      Wrap both rows in the section container `el('div', { class: 'card other-services' }, [...])`.
      Do NOT include a DeDDMTool self-link. The whole row (anchor) is the click target.
      Files: js/views/settings.js
      Verify: `node --check js/views/settings.js` passes. Serve and open Impostazioni:
      two rows (GymBro, IndiSpesabile) show icon + name; clicking either opens the correct
      GitHub Pages URL in a NEW browser tab; DeDDMTool is not listed. Confirm `target`/`rel`
      via DevTools element inspection (anchor has target="_blank" rel="noopener noreferrer").

- [ ] 3. Add the accessible '?' toggle and collapsed description in the section title.
      In the `section-title` div from item 1, after the title text node add
      `el('button', { type: 'button', class: 'other-services-help-toggle',
      'aria-expanded': 'false', 'aria-controls': 'other-services-desc',
      'aria-label': 'Mostra descrizione', title: 'Mostra descrizione', text: '?' })`.
      Place the description as the FIRST child inside `otherServicesSection()`'s card:
      `el('p', { id: 'other-services-desc', class: 'muted other-services-desc',
      hidden: true, style: 'font-size:13px;margin:0 0 10px',
      text: 'Altri strumenti gratuiti che ho realizzato. GymBro e IndiSpesabile condividono lo stesso account.' })`.
      Wire the button's click handler: toggle the paragraph's `hidden` attribute and keep
      `aria-expanded` in sync (`btn.setAttribute('aria-expanded', String(!collapsed))`).
      (The native `<button>` already handles Enter/Space, satisfying keyboard activation.)
      Files: js/views/settings.js
      Verify: `node --check js/views/settings.js` passes. Serve and open Impostazioni:
      the description is hidden on load; clicking '?' reveals it and clicking again hides
      it; in DevTools, `aria-expanded` flips between "false"/"true" and the `<p>` is
      referenced by `aria-controls`. Tab to the '?' button and press Enter/Space to confirm
      keyboard toggle works.

- [ ] 4. Add the section's CSS to `css/styles.css`, reusing theme variables.
      Append a small block (near the other settings-related rules, e.g. after
      `.backup-card`). Suggested rules:
        - `.other-services` — no override needed beyond `.card`; optional `display:grid;
          gap:8px` for row spacing (the card already supplies bg/border/radius/padding).
        - `.other-service-link` — `display:flex; align-items:center; gap:10px;
          padding:10px 12px; border:1px solid var(--border); border-radius:10px;
          background:var(--bg); color:var(--text); text-decoration:none;
          transition:border-color .18s ease, background .18s ease;` plus
          `:hover,:focus-visible { border-color:var(--accent);
          background:rgba(var(--accent-rgb),.08); }` and a visible focus outline
          (`outline:2px solid var(--accent); outline-offset:2px` on `:focus-visible`).
          This mirrors the existing `.list-linkitem.row-clickable` behavior.
        - `.other-service-icon` — `width:40px; height:40px; border-radius:10px;
          flex:0 0 auto; object-fit:cover; background:var(--bg-elev-2);`
          (background shows while the cross-origin image loads / if it fails).
        - `.other-service-name` — `font-weight:700; font-size:16px;` (optionally a trailing
          external-link glyph via `::after` using `--text-dim`, keep it subtle).
        - `.other-services-help-toggle` — small round affordance beside the title:
          `appearance:none; margin-left:8px; width:22px; height:22px; border-radius:999px;
          border:1px solid var(--border); background:var(--bg-elev-2); color:var(--text-dim);
          font-size:12px; font-weight:700; line-height:1; cursor:pointer; vertical-align:middle;
          display:inline-grid; place-items:center;` plus
          `:hover,:focus-visible { border-color:var(--accent); color:var(--text); }`.
          Note the `.section-title` currently sets `display` via its default (block); to
          keep the title text and the '?' on one baseline, either leave the title as inline
          flow (text node + inline-grid button already align via `vertical-align:middle`) or
          set the specific title container to `display:flex; align-items:center` — pick the
          flex approach only if the inline alignment looks off during the visual check.
      Files: css/styles.css
      Verify: serve and open Impostazioni: rows look native to DeDDMTool (card styling,
      hover highlights the border in the accent color, icons are 40px rounded squares, the
      '?' is a small round button beside the title). Switch themes from the Tema section and
      confirm the section recolors correctly (all colors come from CSS variables, no
      hardcoded hex). Keyboard-focus a row and the '?' button and confirm a visible focus
      ring appears.

- [ ] 5. Bump the service worker cache version in `sw.js`.
      Change the `CACHE` constant from `'dm-toolkit-v39'` to `'dm-toolkit-v40'`. Do NOT add
      the two cross-origin icon URLs to the `ASSETS` array (they are external and must not be
      precached); `css/styles.css` and `js/views/settings.js` are already listed.
      Files: sw.js
      Verify: `node --check sw.js` passes (exit 0). Confirm `ASSETS` is unchanged except the
      version string. (Full SW update behavior only manifests on a deployed HTTPS host, per
      README; local check is the syntax/constant verification.)

- [ ] 6. Final integration check across the touched files.
      Re-run `node --check js/views/settings.js` and `node --check sw.js` (both exit 0).
      Serve the repo (`python -m http.server 8080`) and walk the full acceptance list:
      section present and last in Impostazioni; description hidden by default and toggled by
      '?' (mouse + keyboard, aria-expanded in sync); two rows GymBro + IndiSpesabile only
      (no DeDDMTool self-link); each row opens its correct URL in a new tab with
      rel="noopener noreferrer"; icons load from the absolute GitHub Pages URLs; styling
      matches the app and follows the active theme. Confirm no files other than
      js/views/settings.js, css/styles.css, and sw.js were modified (util.js NOT changed).
      Files: (none changed — verification only)
      Verify: both `node --check` commands pass; the manual walkthrough above matches
      expectations. Leave ALL changes uncommitted (no git add/commit).

## Notes / assumptions

- util.js is intentionally left untouched: the existing `el` helper is sufficient, and the
  task says to touch util.js only "possibly" / if needed.
- The '?' description text is used verbatim as given in Italian.
- The app names and URLs are pinned exactly as specified; GymBro and IndiSpesabile share the
  same account (reflected in the description text), which is informational only — no auth or
  shared-session code is involved here.
- There is no linter/formatter config in the repo; match the surrounding 2-space indentation
  and single-quote style already used in settings.js.
