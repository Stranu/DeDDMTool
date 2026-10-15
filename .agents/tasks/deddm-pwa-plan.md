# Implementation Plan — DeDDMTool PWA cross-promo fixes

Scope: fix the "Prova gli altri servizi" cross-promo links so installed sibling PWAs open standalone on mobile and in a new tab on desktop, align DeDDMTool's own manifest identity, and bump the SW cache so the edited JS is re-fetched.

Authoritative source: `c:\Tools\external\GymBro\.agents\tasks\pwa-standalone-open-diagnosis.md` (its concrete before/after values win over any paraphrase).

Project facts (from exploration):
- Static vanilla-JS PWA on GitHub Pages. No `package.json`, no build step, no automated test runner. Verification is manual via a local static server, per `README.md`: `python -m http.server 8080` then open `http://localhost:8080`.
- Release convention (`README.md` "Pubblicare aggiornamenti"): when HTML/CSS/JS change, increment the `CACHE` constant in `sw.js`.
- Touch ONLY `js/views/settings.js`, `manifest.webmanifest`, and `sw.js`. Do NOT touch `css/styles.css`. Do NOT change the cross-promo description text. Leave everything uncommitted (no `git add`/`git commit`).

Design decisions (grounded in the diagnosis):
- Link to the trailing-slash URLs so the clicked URL is already inside the target app's resolved scope with no 301 redirect — this is the primary fix for mobile standalone capture (diagnosis Fix A, priority 1).
- Re-add `target="_blank"` + `rel="noopener noreferrer"` so desktop opens a new tab; current Chrome navigation-capturing still launches an in-scope installed app for `_blank` links, so this does not break mobile capture (diagnosis Fix B, priority 2).
- Add explicit `id: "/DeDDMTool/"` to decouple identity from `start_url` (diagnosis Fix D). DeDDMTool's `start_url` is already `./` (diagnosis table and the actual file both confirm `"start_url": "./"`), so no `start_url` change is needed — keep it as-is to avoid regressing identity.

Dependency note: items are independent edits but are ordered so the SW cache bump (item 5) comes last, after all asset edits, which is the correct release order for the cache to pick up the changed files.

---

- [ ] 1. In `js/views/settings.js`, change the two cross-promo entry URLs in the `OTHER_SERVICES` array (inside `otherServicesSection`) to the trailing-slash form. Leave the `icon` URLs and `name` values unchanged.
      Files: `c:\Tools\external\DeDDMTool\js\views\settings.js`
      Before:
      ```js
      const OTHER_SERVICES = [
        { name: 'GymBro', url: 'https://stranu.github.io/GymBro', icon: 'https://stranu.github.io/GymBro/icons/icon-192.png' },
        { name: 'IndiSpesabile', url: 'https://stranu.github.io/IndiSpesabile', icon: 'https://stranu.github.io/IndiSpesabile/icons/icon-192.png' }
      ];
      ```
      After:
      ```js
      const OTHER_SERVICES = [
        { name: 'GymBro', url: 'https://stranu.github.io/GymBro/', icon: 'https://stranu.github.io/GymBro/icons/icon-192.png' },
        { name: 'IndiSpesabile', url: 'https://stranu.github.io/IndiSpesabile/', icon: 'https://stranu.github.io/IndiSpesabile/icons/icon-192.png' }
      ];
      ```
      Verify: start a local static server (`python -m http.server 8080` in `c:\Tools\external\DeDDMTool`), open `http://localhost:8080`, go to Impostazioni → "Prova gli altri servizi", and confirm each link's `href` ends with a trailing slash (inspect the anchors in DevTools Elements). Expected: `https://stranu.github.io/GymBro/` and `https://stranu.github.io/IndiSpesabile/`.

- [ ] 2. In the same `otherServicesSection`, re-add `target: '_blank'` and `rel: 'noopener noreferrer'` to the anchor built in the `OTHER_SERVICES.map(...)`, and rewrite the preceding code comment (which currently claims `target="_blank"` would keep the link in the browser / that same-tab is required for capture) to state the current behavior: trailing-slash in-scope links are still captured by an installed PWA under current Chrome, while `_blank` gives a new tab on desktop.
      Files: `c:\Tools\external\DeDDMTool\js\views\settings.js`
      Before:
      ```js
      // Navigazione top-level nella stessa scheda (senza target="_blank"): un link
      // in-scope verso una PWA installata viene "catturato" dal browser/OS e aperto
      // nell'app installata in standalone. Con target="_blank" resterebbe nel browser.
      const rows = OTHER_SERVICES.map((service) => el('a', {
        class: 'other-service-link',
        href: service.url
      }, [
      ```
      After:
      ```js
      // I link usano l'URL con slash finale, quindi sono gia' in-scope rispetto alla
      // PWA di destinazione: su mobile il browser/OS cattura il link e apre l'app
      // installata in standalone, mentre target="_blank" fa aprire una nuova scheda
      // su desktop (il capturing di Chrome funziona comunque per i link in-scope).
      const rows = OTHER_SERVICES.map((service) => el('a', {
        class: 'other-service-link',
        href: service.url,
        target: '_blank',
        rel: 'noopener noreferrer'
      }, [
      ```
      Verify: reload `http://localhost:8080`, go to Impostazioni → "Prova gli altri servizi", inspect each anchor in DevTools and confirm it has `target="_blank"` and `rel="noopener noreferrer"`. Clicking a link in a desktop browser opens the target in a new tab, leaving the current tab in place.

- [ ] 3. Confirm (do NOT edit) `manifest.webmanifest` `start_url`. The diagnosis table and the current file both show `"start_url": "./"`; keep it as-is so the derived identity is not regressed. No change required for this item.
      Files: `c:\Tools\external\DeDDMTool\manifest.webmanifest` (read-only check)
      Verify: open the file and confirm the line reads `"start_url": "./",`. Expected: unchanged `./`.

- [ ] 4. In `manifest.webmanifest`, add an explicit `"id"` field with the exact diagnosis-recommended value `"/DeDDMTool/"`. Place it adjacent to `start_url`/`scope` for clarity; keep valid JSON (comma handling).
      Files: `c:\Tools\external\DeDDMTool\manifest.webmanifest`
      Before:
      ```json
        "description": "Suite di strumenti per Dungeon Master di D&D: gestore iniziativa, condizioni e magie.",
        "start_url": "./",
        "scope": "./",
      ```
      After:
      ```json
        "description": "Suite di strumenti per Dungeon Master di D&D: gestore iniziativa, condizioni e magie.",
        "id": "/DeDDMTool/",
        "start_url": "./",
        "scope": "./",
      ```
      Verify: run `python -c "import json; json.load(open('manifest.webmanifest', encoding='utf-8'))"` in `c:\Tools\external\DeDDMTool` and confirm it exits 0 (valid JSON). Then with the local server running, open `http://localhost:8080`, DevTools → Application → Manifest, and confirm the parsed manifest shows `id` resolving to `https://stranu.github.io/DeDDMTool/` (served locally it resolves against localhost, so confirm the raw value is `/DeDDMTool/`).

- [ ] 5. In `sw.js`, bump the precache cache version once per repo convention: `dm-toolkit-v41` → `dm-toolkit-v42`. This forces the updated `settings.js` to be re-fetched on reload. Do this LAST, after items 1–4.
      Files: `c:\Tools\external\DeDDMTool\sw.js`
      Before:
      ```js
      const CACHE = 'dm-toolkit-v41';
      ```
      After:
      ```js
      const CACHE = 'dm-toolkit-v42';
      ```
      Verify: with the local server running, hard-reload `http://localhost:8080`, open DevTools → Application → Cache Storage, and confirm a cache named `dm-toolkit-v42` exists and older `dm-toolkit-v41` is removed after the new SW activates. Confirm the app still loads (Impostazioni renders) with no console errors.

---

Final check (all items): the only modified files are `js/views/settings.js`, `manifest.webmanifest`, and `sw.js`. `css/styles.css` is untouched, the cross-promo description text is unchanged, and nothing is staged or committed (run `git status` to confirm the three files appear as modified and are NOT staged).

Notes / assumptions:
- No automated test suite exists for this static PWA, so verification is the local static-server + DevTools procedure from `README.md`. OS-level PWA link capturing (mobile standalone vs. desktop new tab) can only be fully confirmed on-device after deploy, per the diagnosis's stated limitation; the repo-side edits above remove the redirect-timing ambiguity that caused the bug.
- No discrepancies found between this plan and the diagnosis: all before/after values match the diagnosis Fixes A, B, and D, and `start_url` is confirmed already `./`.
