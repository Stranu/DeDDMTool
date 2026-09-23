// App shell: stato condiviso, navigazione, drawer, auto-save, registrazione SW.
import { $, $$, toast } from './util.js';
import * as db from './db.js';
import { renderInitiative } from './views/initiative.js';
import { renderConditions } from './views/conditions.js';
import { renderSpells } from './views/spells.js';
import { renderSettings } from './views/settings.js';
import { renderMonsters } from './views/monsters.js';
import { renderPlayer, normalizePlayerState } from './views/player.js';

// ---------------- Stato condiviso ----------------
// encounter: stato del gestore iniziativa (persistito su ogni evento).
// roster:    PG e alleati ricorrenti (persistiti).
// conditions/spells: dataset importati (in memoria, fonte = IndexedDB).
export const state = {
  mode: 'gm',
  player: { activeId: null, characters: [] },
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
  player: { el: $('#view-player'), render: renderPlayer },
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
          db.kvSet('roster', state.roster),
          db.kvSet('player', state.player),
          db.kvSet('mode', state.mode)
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
  const playerMode = state.mode === 'player';
  $$('.gm-only').forEach((tab) => { tab.hidden = playerMode; });
  $$('.player-only').forEach((tab) => { tab.hidden = !playerMode; });
  $('#tab-conditions').hidden = playerMode || !state.hasConditions;
  // Magie, Personaggi e Impostazioni sono disponibili anche in modalità Player.
  $('#tab-spells').hidden = false;
  $('#tab-monsters').hidden = playerMode;
  // Se la vista corrente non appartiene alla modalità attiva, torna alla vista principale.
  if (playerMode && ['initiative', 'conditions', 'monsters'].includes(current)) goTo('player');
  if (!playerMode && current === 'player') goTo('initiative');
  if (!playerMode && current === 'conditions' && !state.hasConditions) goTo('initiative');
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

function setMode(mode) {
  if (mode !== 'gm' && mode !== 'player') return;
  state.mode = mode;
  normalizePlayerState(state);
  save();
  updateTabs();
  closeDrawer();
  goTo(mode === 'player' ? 'player' : 'initiative');
}

function openModeMenu() {
  const body = elModeMenu();
  openDrawer('Modalità app', body);
}

function elModeMenu() {
  const body = document.createElement('div');
  const intro = document.createElement('p');
  intro.className = 'muted';
  intro.textContent = 'Scegli l’area di lavoro. I dati GM e Player restano locali sul dispositivo.';
  const gm = document.createElement('button');
  gm.className = `btn block ${state.mode === 'gm' ? 'primary' : 'ghost'}`;
  gm.type = 'button';
  gm.textContent = 'GM · Strumenti di gestione';
  gm.addEventListener('click', () => setMode('gm'));
  const player = document.createElement('button');
  player.className = `btn block ${state.mode === 'player' ? 'primary' : 'ghost'}`;
  player.type = 'button';
  player.style.marginTop = '10px';
  player.textContent = 'Player · Schede personaggi';
  player.addEventListener('click', () => setMode('player'));
  body.append(intro, gm, player);
  return body;
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
  const [enc, roster, player, mode] = await Promise.all([
    db.kvGet('encounter', null),
    db.kvGet('roster', null),
    db.kvGet('player', null),
    db.kvGet('mode', null)
  ]);
  if (enc) state.encounter = enc;
  if (roster) state.roster = roster;
  if (player) state.player = player;
  if (mode === 'player' || mode === 'gm') state.mode = mode;
  normalizePlayerState(state);
  await reloadDatasets();

  // Eventi di navigazione.
  $$('.tab').forEach((t) => t.addEventListener('click', () => goTo(t.dataset.view)));
  $('#settings-btn').addEventListener('click', () => goTo('settings'));
  $('#menu-toggle').addEventListener('click', openModeMenu);
  $('#drawer-close').addEventListener('click', closeDrawer);
  $('#drawer-backdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  goTo(state.mode === 'player' ? 'player' : 'initiative');

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
