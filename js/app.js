// App shell: stato condiviso, navigazione, drawer, auto-save, registrazione SW.
import { $, $$, toast } from './util.js';
import * as db from './db.js';
import { renderInitiative } from './views/initiative.js';
import { renderConditions } from './views/conditions.js';
import { renderSpells } from './views/spells.js';
import { renderSettings } from './views/settings.js';
import { renderMonsters } from './views/monsters.js';

// ---------------- Stato condiviso ----------------
// encounter: stato del gestore iniziativa (persistito su ogni evento).
// roster:    PG e alleati ricorrenti (persistiti).
// conditions/spells: dataset importati (in memoria, fonte = IndexedDB).
export const state = {
  encounter: { round: 1, activeId: null, combatants: [] },
  roster: { pcs: [], allies: [], archive: [] }, // archive = mostri/PNG riutilizzabili
  conditions: [],
  spells: [],
  hasConditions: false,
  hasSpells: false,
  hasMonsters: false
};

const views = {
  initiative: { el: $('#view-initiative'), render: renderInitiative },
  conditions: { el: $('#view-conditions'), render: renderConditions },
  spells: { el: $('#view-spells'), render: renderSpells },
  monsters: { el: $('#view-monsters'), render: renderMonsters },
  settings: { el: $('#view-settings'), render: renderSettings }
};

let current = 'initiative';

// ---------------- Persistenza / auto-save ----------------
let savePromise = null;
let saveRequested = false;
export function save() {
  saveRequested = true;
  if (savePromise) return savePromise;

  savePromise = (async () => {
    let success = true;
    while (saveRequested) {
      saveRequested = false;
      try {
        await Promise.all([
          db.kvSet('encounter', state.encounter),
          db.kvSet('roster', state.roster)
        ]);
      } catch (error) {
        success = false;
        console.error('Salvataggio locale fallito:', error);
        toast('Errore: dati non salvati localmente. Controlla lo spazio disponibile.');
        break;
      }
    }
    return success;
  })().finally(() => { savePromise = null; });
  return savePromise;
}

// Ridisegna la vista corrente (le altre vengono ridisegnate al cambio tab).
export function refresh(view = current) {
  if (views[view]) views[view].render(views[view].el, api);
}

// API passata alle viste per non creare dipendenze circolari sullo stato.
export const api = { state, save, refresh, openDrawer, closeDrawer, toast, db, reloadDatasets, updateTabs, goTo };

// ---------------- Navigazione ----------------
function goTo(view) {
  current = view;
  for (const [name, v] of Object.entries(views)) {
    const active = name === view;
    v.el.hidden = !active;
  }
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  refresh(view);
  window.scrollTo(0, 0);
}

function updateTabs() {
  $('#tab-conditions').hidden = !state.hasConditions;
  // Magie resta sempre accessibile anche senza dataset importato, per permettere la creazione manuale.
  $('#tab-spells').hidden = false;
  // Mostri/PNG resta sempre accessibile anche quando l'archivio è vuoto.
  $('#tab-monsters').hidden = false;
  // Se ero su una tab ora nascosta, torna all'iniziativa.
  if (current === 'conditions' && !state.hasConditions) {
    goTo('initiative');
  }
}

// ---------------- Drawer ----------------
function openDrawer(title, contentNode) {
  const drawer = $('#drawer');
  const backdrop = $('#drawer-backdrop');
  $('#drawer-title').textContent = title;
  const body = $('#drawer-body');
  body.innerHTML = '';
  if (contentNode) body.appendChild(contentNode);
  backdrop.hidden = false;
  drawer.hidden = false;
  drawer.setAttribute('aria-hidden', 'false');
}
function closeDrawer() {
  const drawer = $('#drawer');
  drawer.setAttribute('aria-hidden', 'true');
  drawer.hidden = true;
  $('#drawer-backdrop').hidden = true;
}

// ---------------- Caricamento dataset ----------------
export async function reloadDatasets() {
  const [conds, spells, cc, sc] = await Promise.all([
    db.getAll('conditions'),
    db.getAll('spells'),
    db.count('conditions'),
    db.count('spells')
  ]);
  state.conditions = conds || [];
  state.spells = spells || [];
  state.hasConditions = (cc || 0) > 0;
  state.hasSpells = (sc || 0) > 0;
  state.hasMonsters = Boolean(state.roster?.archive?.length);
  updateTabs();
}

// ---------------- Bootstrap ----------------
async function boot() {
  // Carica stato persistito.
  const [enc, roster] = await Promise.all([
    db.kvGet('encounter', null),
    db.kvGet('roster', null)
  ]);
  if (enc) state.encounter = enc;
  if (roster) state.roster = roster;
  await reloadDatasets();

  // Eventi di navigazione.
  $$('.tab').forEach((t) => t.addEventListener('click', () => goTo(t.dataset.view)));
  $('#settings-btn').addEventListener('click', () => goTo('settings'));
  $('#menu-toggle').addEventListener('click', () => goTo('initiative'));
  $('#drawer-close').addEventListener('click', closeDrawer);
  $('#drawer-backdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  goTo('initiative');

  registerServiceWorker();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;

  // Se esiste già un controller, un cambio indica che una nuova versione
  // ha terminato l'installazione. Sul primo avvio evitiamo un reload inutile.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  if (hadController) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      toast('Aggiornamento disponibile: ricarico l’app…');
      window.setTimeout(() => window.location.reload(), 650);
    });
  }

  navigator.serviceWorker.register('./sw.js').then((registration) => {
    const checkForUpdate = () => registration.update().catch(() => {});
    checkForUpdate();
    window.setInterval(checkForUpdate, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    });
  }).catch((error) => {
    console.warn('Service worker non disponibile:', error);
    toast('Aggiornamenti offline non disponibili in questa sessione.');
  });
}

boot().catch((error) => {
  console.error('Avvio app fallito:', error);
  toast('Impossibile caricare i dati locali. Ricarica la pagina o verifica i permessi del browser.');
  const root = document.getElementById('view-initiative');
  if (root) {
    root.hidden = false;
    root.innerHTML = '<div class="empty"><div>Si è verificato un errore durante l’avvio.</div><div class="muted">I dati locali non sono stati modificati. Prova a ricaricare la pagina.</div></div>';
  }
});
