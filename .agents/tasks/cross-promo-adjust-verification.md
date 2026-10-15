# Cross-promo adjustment — verification note (DeDDMTool)

Two follow-up changes to the already-implemented "Prova gli altri servizi" section in
`js/views/settings.js`, styled in `css/styles.css`. No git operations performed; all changes
left uncommitted.

## CHANGE 1 — open cross-promo links as the installed standalone PWA

### Diagnosis of the standalone-open mechanism
The user reported that opening IndiSpesabile from the other two apps launches the installed
standalone PWA, while opening GymBro/DeDDMTool stays inside the current page / in-app browser.

Investigation:
- Read DeDDMTool's own anchors (`otherServicesSection` in `settings.js`): they used
  `target="_blank" rel="noopener noreferrer"`.
- Read the working reference, IndiSpesabile's `js/views/other-services.js`: its anchors ALSO use
  `target="_blank" rel="noopener noreferrer"`. So the difference the user saw is NOT a
  rendering difference between the apps — all three render `target="_blank"`.
- Compared the three `manifest.webmanifest` files (GymBro, IndiSpesabile, DeDDMTool): all use
  `display: standalone` and `scope: "./"`; none declares `capture_links` or `launch_handler`.
  The only cosmetic difference is `start_url` (`./index.html` for GymBro vs `./` for the other
  two), which does not govern link-capture behavior.

Conclusion on the mechanism (confirmed against browser documentation):
- Per Chrome's navigation-management model, a link pointing to a URL **inside an installed PWA's
  scope** is captured by the browser/OS and opened in the corresponding installed app, falling
  back to a browser tab only when the app is not installed or the user opted out.
  (https://developer.chrome.com/docs/capabilities/pwa-navigation-management ,
  https://stackoverflow.com/questions/53173797/target-blank-link-opening-in-pwa-and-not-in-browser-in-android)
- A `target="_blank"` link opens a NEW browser tab / WebView, which tends to defeat that
  capture and keep the navigation in the browser context
  (https://stackoverflow.com/questions/68993320/links-with-target-blank-opens-in-browser).
  Content was rephrased for compliance with licensing restrictions.
- Therefore the user-observed difference was incidental to that device's installed-app /
  link-capture state, not to how any app renders its links. The reliable fix that makes the
  installed standalone PWA open is to make each cross-promo anchor a plain **top-level,
  same-tab navigation** (drop `target="_blank"` and the now-unneeded `rel`).

### Change made
In `js/views/settings.js`, `otherServicesSection()`, the anchor builder changed from:

```js
el('a', { class: 'other-service-link', href: service.url, target: '_blank', rel: 'noopener noreferrer' }, [ ... ])
```

to:

```js
el('a', { class: 'other-service-link', href: service.url }, [ ... ])
```

An Italian comment documents why `target="_blank"` was dropped. No CSS change was needed for
this (the `.other-service-link` rule does not depend on `target`).

## CHANGE 2 — "?" disclosure description text

Removed the previous single line that referenced "stesso account". The description element
(`#other-services-desc`) is now a `<div>` containing one intro line plus one line per linked
app, each showing the app name (bold) and its exact purpose string:

- Intro: "Altri strumenti gratuiti che ho realizzato."
- **GymBro**: App per tracciare i tuoi allenamenti e progressi in palestra.
- **IndiSpesabile**: Lista della spesa condivisa, semplice e veloce.

The purpose strings match the exact wording specified for cross-app consistency. The element id
`other-services-desc`, the `aria-controls` target, and the `?` toggle logic (which flips
`.hidden`) are unchanged and still work because a `<div>` exposes the same `hidden` property as
the former `<p>`.

A grep for "stesso account" across the whole DeDDMTool repo returns no matches.

## Service worker cache bump
`sw.js`: `const CACHE = 'dm-toolkit-v40';` -> `'dm-toolkit-v41';`, following the repo's existing
versioning convention, so the updated JS/CSS are re-fetched on reload.

## Files touched
- `js/views/settings.js` (anchor open behavior + description text)
- `sw.js` (cache version bump)
- `css/styles.css` was reviewed; no change required.
- `js/util.js` not touched.

## Commands run and results
- `node --check js/views/settings.js` -> exit 0 (no syntax errors)
- `node --check sw.js` -> exit 0 (no syntax errors)

## Render-path trace
`renderSettings(root, api)` builds `otherServicesDesc`, appends the "Prova gli altri servizi"
title with the `?` toggle, then appends `otherServicesSection(otherServicesDesc)`. That function
maps `OTHER_SERVICES` (GymBro, IndiSpesabile) to whole-row `<a>` elements that now have only
`class` + `href` (no `target`/`rel`), and places `desc` first inside the `.other-services`
card. Toggling `?` flips `otherServicesDesc.hidden`, revealing the two per-app purpose lines.

## Verified vs. not verifiable
- Verified: JS syntax (`node --check`); the anchors no longer carry `target="_blank"`/`rel`;
  the description renders the two exact per-app purpose strings with no "stesso account" text
  anywhere in the repo; the sw.js cache constant is now v41.
- Cannot be verified headlessly: the actual standalone-open behavior. Whether a given click
  opens the installed PWA standalone depends on the browser/OS, whether the target app is
  installed, and the user's per-site link-capture setting. This can only be confirmed by manual
  testing on a device with the sibling PWAs installed.
