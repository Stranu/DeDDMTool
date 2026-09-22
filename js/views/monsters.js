// Archivio separato di mostri e PNG riutilizzabili.
// Le schede vengono mantenute in state.roster.archive e ogni aggiunta
// all'iniziativa usa cloneCombatant(), quindi non modifica l'originale.
import { el, ICON, fold, debounce } from '../util.js';
import {
  makeCombatant,
  cloneCombatant,
  addToEncounter,
  openArchiveDrawer
} from './initiative.js';

const filters = { q: '', type: '', cr: '' };
const KIND_LABELS = { ally: 'Mostro/PNG', monster: 'Mostro/PNG' };

export function renderMonsters(root, api) {
  const { state } = api;
  if (!state.roster || !Array.isArray(state.roster.archive)) {
    state.roster = state.roster || { pcs: [], allies: [] };
    state.roster.archive = [];
  }
  root.innerHTML = '';

  const entries = state.roster.archive;
  const toolbar = el('div', { class: 'row', style: 'gap:8px;margin-bottom:8px' });
  const newButton = el('button', { class: 'btn primary', type: 'button', html: ICON.plus + '<span>Nuova scheda</span>' });
  const filterButton = el('button', {
    class: 'btn sm ghost', type: 'button', title: 'Mostra o nascondi filtri',
    'aria-expanded': 'false', 'aria-controls': 'monster-filters', html: ICON.search
  });
  toolbar.append(el('div', { class: 'grow' }, [newButton]), filterButton);
  root.appendChild(toolbar);

  const search = el('input', {
    class: 'input', type: 'search', value: filters.q,
    placeholder: 'Cerca Mostri/PNG per nome…', 'aria-label': 'Cerca Mostri e PNG'
  });
  root.insertBefore(search, toolbar.nextSibling);

  const filterPanel = el('div', { class: 'filters filter-panel', id: 'monster-filters', hidden: true });
  const typeSelect = el('select', { class: 'input', 'aria-label': 'Filtra per tipo creatura' });
  const crSelect = el('select', { class: 'input', 'aria-label': 'Filtra per grado di sfida' });
  const resetButton = el('button', { class: 'btn sm ghost', type: 'button', html: ICON.reset + '<span>Reset</span>' });
  filterPanel.append(
    el('div', { class: 'filter-field' }, [el('label', { text: 'Tipo' }), typeSelect]),
    el('div', { class: 'filter-field' }, [el('label', { text: 'GS' }), crSelect]),
    resetButton
  );
  root.insertBefore(filterPanel, search.nextSibling);

  const count = el('div', { class: 'result-count' });
  const list = el('div', {});
  root.append(count, list);

  newButton.addEventListener('click', openNewEntry);
  filterButton.addEventListener('click', () => {
    filterPanel.hidden = !filterPanel.hidden;
    filterButton.setAttribute('aria-expanded', String(!filterPanel.hidden));
  });
  resetButton.addEventListener('click', () => {
    filters.q = '';
    filters.type = '';
    filters.cr = '';
    search.value = '';
    draw();
    filterPanel.hidden = true;
    filterButton.setAttribute('aria-expanded', 'false');
    updateFilterButton();
  });
  search.addEventListener('input', debounce(() => {
    filters.q = search.value;
    draw();
  }, 120));
  typeSelect.addEventListener('change', () => { filters.type = typeSelect.value; draw(); updateFilterButton(); });
  crSelect.addEventListener('change', () => { filters.cr = crSelect.value; draw(); updateFilterButton(); });

  function refreshFilterOptions() {
    const types = [...new Set(entries.map((item) => (item.creatureType || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'it'));
    const crs = [...new Set(entries.map((item) => item.cr).filter((value) => value !== '' && value != null))]
      .sort((a, b) => Number(a) - Number(b));
    typeSelect.innerHTML = '';
    typeSelect.appendChild(el('option', { value: '', text: 'Tutti i tipi' }));
    for (const type of types) typeSelect.appendChild(el('option', { value: type, text: type }));
    typeSelect.value = types.includes(filters.type) ? filters.type : '';
    filters.type = typeSelect.value;

    crSelect.innerHTML = '';
    crSelect.appendChild(el('option', { value: '', text: 'Tutti i GS' }));
    for (const cr of crs) crSelect.appendChild(el('option', { value: String(cr), text: `GS ${cr}` }));
    crSelect.value = crs.map(String).includes(String(filters.cr)) ? String(filters.cr) : '';
    filters.cr = crSelect.value;
  }

  function updateFilterButton() {
    const active = (filters.type ? 1 : 0) + (filters.cr !== '' ? 1 : 0);
    filterButton.innerHTML = ICON.search;
    filterButton.appendChild(el('span', { text: active ? `Filtri (${active})` : 'Filtri' }));
  }

  function draw() {
    refreshFilterOptions();
    updateFilterButton();
    const query = fold(filters.q);
    const matches = entries.filter((item) => {
      if (query && !fold(item.name).includes(query)) return false;
      if (filters.type && (item.creatureType || '').trim() !== filters.type) return false;
      if (filters.cr !== '' && String(item.cr) !== String(filters.cr)) return false;
      return true;
    });
    count.textContent = `${matches.length} sched${matches.length === 1 ? 'a' : 'e'}`;
    list.innerHTML = '';
    if (!matches.length) {
      list.appendChild(el('div', { class: 'empty', text: entries.length ? 'Nessuna scheda corrisponde ai filtri.' : 'Archivio vuoto. Crea la prima scheda Mostri/PNG.' }));
      return;
    }
    for (const entry of matches) list.appendChild(entryCard(entry));
  }

  function entryCard(entry) {
    const row = el('article', { class: 'list-linkitem archive-item' });
    const meta = [];
    meta.push(KIND_LABELS[entry.kind] || 'Mostro');
    if (entry.creatureType) meta.push(entry.creatureType);
    if (entry.cr !== '' && entry.cr != null) meta.push(`GS ${entry.cr}`);
    if (entry.ac !== '' && entry.ac != null) meta.push(`CA ${entry.ac}`);
    if (entry.hpMax !== '' && entry.hpMax != null) meta.push(`PF ${entry.hpMax}`);
    if (entry.knownSpells?.length) meta.push(`${entry.knownSpells.length} magie`);
    const info = el('div', { class: 'grow' }, [
      el('div', { style: 'font-weight:700', text: entry.name }),
      el('div', { class: 'muted', style: 'font-size:11px', text: meta.join(' · ') || 'Scheda senza statistiche' })
    ]);
    const edit = el('button', { class: 'chip', type: 'button', text: 'Modifica' });
    edit.addEventListener('click', () => openArchiveDrawer(entry, api, 'monsters'));
    const add = el('button', { class: 'chip on', type: 'button', text: 'Iniziativa' });
    add.addEventListener('click', () => {
      addToEncounter(api, cloneCombatant(entry));
      api.toast(`${entry.name} aggiunto all’iniziativa`);
      api.refresh('monsters');
    });
    const remove = el('button', { class: 'dot-btn', type: 'button', title: 'Rimuovi scheda', html: ICON.trash });
    remove.addEventListener('click', () => {
      if (!confirm(`Rimuovere "${entry.name}" dall’archivio?`)) return;
      const index = entries.indexOf(entry);
      if (index >= 0) entries.splice(index, 1);
      state.hasMonsters = entries.length > 0;
      api.updateTabs();
      api.save();
      draw();
    });
    row.append(info, edit, add, remove);
    return row;
  }

  function openNewEntry() {
    const body = el('div', {});
    const form = el('form', {});
    const name = el('input', { class: 'input', required: '', placeholder: 'Nome scheda Mostri/PNG (es. Goblin)' });
    const submit = el('button', { class: 'btn primary block', type: 'submit', style: 'margin-top:10px', html: ICON.plus + '<span>Crea scheda</span>' });
    form.append(name, submit);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = name.value.trim();
      if (!value) return;
      const entry = makeCombatant(value, 'monster');
      entries.push(entry);
      state.hasMonsters = true;
      api.updateTabs();
      api.save();
      draw();
      openArchiveDrawer(entry, api, 'monsters');
    });
    body.append(
      el('p', { class: 'muted', text: 'Crea una scheda base, poi completa tipo creatura, GS, statistiche, note e magie conosciute.' }),
      form
    );
    api.openDrawer('Nuova scheda Mostri/PNG', body);
  }

  refreshFilterOptions();
  updateFilterButton();
  draw();
}
