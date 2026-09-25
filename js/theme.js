// Gestione tema dinamico.
// I colori veri stanno nel CSS (blocchi :root[data-theme="..."]); qui teniamo
// solo l'elenco dei temi disponibili, i loro metadati e le utility di
// applicazione/persistenza. Cambiare tema = impostare data-theme su <html>.

// L'ordine determina come appaiono nella schermata Impostazioni.
// I colori "swatch" servono solo all'anteprima nella UI: devono rispecchiare
// bg / accent / accent-2 del tema corrispondente nel CSS.
export const THEMES = [
  {
    id: 'purple-gold',
    name: 'Arcano',
    description: 'Viola e oro (predefinito)',
    swatch: { bg: '#14101f', accent: '#8a5cf6', accent2: '#c9a24b' }
  },
  {
    id: 'ember',
    name: 'Ferro e Brace',
    description: 'Antracite e brace calda',
    swatch: { bg: '#14110f', accent: '#e2652b', accent2: '#c9a24b' }
  },
  {
    id: 'emerald',
    name: 'Smeraldo',
    description: 'Verde bosco e rame',
    swatch: { bg: '#0f1613', accent: '#2fb37a', accent2: '#d08c4a' }
  },
  {
    id: 'nightblue',
    name: 'Blu Notte',
    description: 'Acciaio e ambra',
    swatch: { bg: '#0e1420', accent: '#3d8bff', accent2: '#f0b429' }
  },
  {
    id: 'parchment',
    name: 'Pergamena Scura',
    description: 'Cuoio e ottone',
    swatch: { bg: '#191510', accent: '#b5842f', accent2: '#8a5a2b' }
  }
];

export const DEFAULT_THEME = 'purple-gold';

export function isValidTheme(id) {
  return THEMES.some((theme) => theme.id === id);
}

export function themeById(id) {
  return THEMES.find((theme) => theme.id === id) || null;
}

// Applica il tema al documento e aggiorna la meta theme-color (barra di stato mobile).
const STORAGE_KEY = 'dm-toolkit-theme';

export function applyTheme(id) {
  const theme = isValidTheme(id) ? id : DEFAULT_THEME;
  document.documentElement.setAttribute('data-theme', theme);
  // Cache sincrona per evitare il "flash" del tema al prossimo avvio,
  // prima che IndexedDB (asincrono) risponda. La fonte autorevole resta IndexedDB.
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* storage non disponibile */ }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    // Legge il colore dell'header effettivo dopo l'applicazione del tema.
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue('--theme-color')
      .trim();
    if (color) meta.setAttribute('content', color);
  }
  return theme;
}

// Applica subito, in modo sincrono, il tema in cache (se presente) per evitare
// il flash all'avvio. Va chiamata il prima possibile nel bootstrap.
export function initThemeEarly() {
  let cached = null;
  try { cached = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
  applyTheme(cached);
}
