// App shell: stato condiviso, navigazione, drawer, auto-save, registrazione SW.
import { $, $$, toast } from './util.js';
import * as db from './db.js';
import { renderInitiative } from './views/initiative.js';
import { renderConditions } from './views/conditions.js';
import { renderSpells } from './views/spells.js';
import { renderSettings } from './views/settings.js';

// ---------------- Stato condiviso ----------------
// encounter: stato del gestore iniziativa (persistito su ogni evento).
// roster:    PG e PNG ricorrenti (persistiti).
// conditions/spells: dataset importati (in memoria, fonte = IndexedDB).
export const state = {
  encounter: { round: 1, activeId: null, combatants: [] },
  roster: { pcs: [], allies: [] }, // allies = PNG ricorrenti
  conditions: [],
  spells: [],
  hasConditions: false,
  hasSpells: false
};

const views = {
  initiative: { el: $('#view-initiative'), render: renderInitiative },
  conditions: { el: $('#view-conditions'), render: renderConditions },
  spells: { el: $('#view-spells'), render: renderSpells },
  settings: { el: $('#view-settings'), render: renderSettings }
};

let current = 'initiative';

// ---------------- Persistenza / auto-save ----------------
let saveQueued = false;
export function save() {
  // Debounce leggero: coalesce piu' eventi ravvicinati in una scrittura.
  if (saveQueued) return;
  saveQueued = true;
  queueMicrotask(async () => {
    saveQueued = false;
    await Promise.all([
      db.kvSet('encounter', state.encounter),
      db.kvSet('roster', state.roster)
    ]);
  });
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
  $('#tab-spells').hidden = !state.hasSpells;
  // Se ero su una tab ora nascosta, torna all'iniziativa.
  if ((current === 'conditions' && !state.hasConditions) ||
      (current === 'spells' && !state.hasSpells)) {
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

  // Registra service worker (solo su http/https, non file://).
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

boot();
