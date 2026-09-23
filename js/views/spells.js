// Sezione Magie: ricerca, filtri, ordinamento, creazione e modifica.
import { el, ICON, fold, debounce, uid } from '../util.js';
import { levelLabel, normalizeDescription, buildSpellSearch } from '../csv.js';

const filters = { q: '', levels: new Set(), classes: new Set(), schools: new Set(), sort: 'name', manual: false, favorite: false };
const BASE_CLASSES = ['bardo', 'chierico', 'druido', 'mago', 'paladino', 'ranger', 'stregone', 'warlock'];

export function renderSpells(root, api) {
  const { state } = api;
  state.spells.forEach(normalizeSpellRecord);
  root.innerHTML = '';

  const newButton = el('button', { class: 'btn primary', type: 'button', html: ICON.plus + '<span>Nuova magia</span>' });
  newButton.addEventListener('click', () => openSpellEditor(null, api, root));
  root.appendChild(el('div', { class: 'row', style: 'margin-bottom:8px' }, [el('div', { class: 'grow' }), newButton]));

  if (!state.spells.length) {
    root.appendChild(el('div', { class: 'empty' }, [
      el('div', { html: ICON.sparkle }),
      el('div', { text: 'Nessuna magia importata o creata.' }),
      el('div', { class: 'muted', text: 'Importa un CSV oppure crea una magia manuale.' })
    ]));
    return;
  }

  const levels = [...new Set(state.spells.map((s) => s.level).filter((v) => v != null))].sort((a, b) => a - b);
  const classes = availableClasses(state.spells);
  const schools = [...new Set(state.spells.map((s) => s.school).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));

  const searchWrap = el('div', { class: 'search-wrap' });
  const search = el('input', {
    class: 'input', type: 'search', value: filters.q,
    placeholder: 'Cerca per nome (IT/EN) o testo…', 'aria-label': 'Cerca magia'
  });
  const toggleFiltersBtn = el('button', {
    class: 'btn sm ghost', type: 'button', title: 'Mostra o nascondi filtri',
    'aria-expanded': 'false', 'aria-controls': 'spell-filters', html: ICON.search
  });
  const resetBtn = el('button', { class: 'btn sm ghost', type: 'button', html: ICON.reset + '<span>Reset</span>' });
  searchWrap.appendChild(el('div', { class: 'row' }, [el('div', { class: 'grow' }, [search]), toggleFiltersBtn]));

  const filtersBox = el('div', { class: 'filters filter-panel', id: 'spell-filters', hidden: true });
  filtersBox.appendChild(chipGroup('Livello', levels, filters.levels, (v) => levelLabel(v)));
  filtersBox.appendChild(chipGroup('Classe', classes, filters.classes, (v) => cap(v)));
  filtersBox.appendChild(chipGroup('Scuola', schools, filters.schools, (v) => cap(v)));
  const manualButton = el('button', { class: `chip${filters.manual ? ' on' : ''}`, type: 'button', text: 'Create a mano' });
  manualButton.addEventListener('click', () => {
    filters.manual = !filters.manual;
    manualButton.classList.toggle('on', filters.manual);
    draw();
    updateFilterToggle();
  });
  const favoriteButton = el('button', { class: `chip${filters.favorite ? ' on' : ''}`, type: 'button', text: 'Preferite' });
  favoriteButton.addEventListener('click', () => {
    filters.favorite = !filters.favorite;
    favoriteButton.classList.toggle('on', filters.favorite);
    draw();
    updateFilterToggle();
  });
  filtersBox.appendChild(el('div', { class: 'filter-group' }, [el('span', { class: 'lbl', text: 'Stato' }), manualButton, favoriteButton]));

  const sortSelect = el('select', { class: 'input', 'aria-label': 'Ordina magie' }, [
    el('option', { value: 'name', text: 'Nome A-Z' }),
    el('option', { value: 'level', text: 'Livello crescente' })
  ]);
  sortSelect.value = filters.sort;
  filtersBox.appendChild(el('div', { class: 'filter-field' }, [el('label', { text: 'Ordina' }), sortSelect]));
  filtersBox.appendChild(el('div', { style: 'width:100%' }, [resetBtn]));
  searchWrap.appendChild(filtersBox);
  root.appendChild(searchWrap);

  const count = el('div', { class: 'result-count' });
  const list = el('div', {});
  root.append(count, list);

  function updateFilterToggle() {
    const active = filters.levels.size + filters.classes.size + filters.schools.size + (filters.manual ? 1 : 0) + (filters.favorite ? 1 : 0);
    toggleFiltersBtn.innerHTML = ICON.search;
    toggleFiltersBtn.appendChild(el('span', { text: active ? `Filtri (${active})` : 'Filtri' }));
    toggleFiltersBtn.setAttribute('aria-expanded', String(!filtersBox.hidden));
  }

  toggleFiltersBtn.addEventListener('click', () => {
    filtersBox.hidden = !filtersBox.hidden;
    updateFilterToggle();
  });
  resetBtn.addEventListener('click', () => {
    filters.q = ''; filters.levels.clear(); filters.classes.clear(); filters.schools.clear();
    filters.sort = 'name'; filters.manual = false; filters.favorite = false;
    search.value = '';
    renderSpells(root, api);
  });
  sortSelect.addEventListener('change', () => { filters.sort = sortSelect.value; draw(); });
  search.addEventListener('input', debounce(() => { filters.q = search.value; draw(); }, 140));
  updateFilterToggle();

  function draw() {
    const results = applyFilters(state.spells, filters).sort((a, b) => {
      if (filters.sort === 'level') {
        const levelDiff = (a.level ?? 99) - (b.level ?? 99);
        if (levelDiff) return levelDiff;
      }
      return a.name.localeCompare(b.name, 'it');
    });
    count.textContent = `${results.length} magi${results.length === 1 ? 'a' : 'e'}` + activeFilterLabel();
    list.innerHTML = '';
    const MAX = 300;
    for (const spell of results.slice(0, MAX)) list.appendChild(spellItem(spell));
    if (results.length > MAX) list.appendChild(el('div', { class: 'muted', style: 'text-align:center;padding:12px', text: `…e altre ${results.length - MAX}. Affina la ricerca.` }));
    if (!results.length) list.appendChild(el('div', { class: 'empty', text: 'Nessuna magia corrisponde ai criteri.' }));
  }

  function chipGroup(label, values, activeSet, fmt) {
    const group = el('div', { class: 'filter-group' });
    group.appendChild(el('span', { class: 'lbl', text: label }));
    for (const value of values) {
      const chip = el('button', { class: `chip${activeSet.has(value) ? ' on' : ''}`, type: 'button', text: fmt(value) });
      chip.addEventListener('click', () => {
        if (activeSet.has(value)) activeSet.delete(value); else activeSet.add(value);
        chip.classList.toggle('on');
        draw();
        updateFilterToggle();
      });
      group.appendChild(chip);
    }
    return group;
  }

  function spellItem(spell) {
    const item = el('div', { class: 'acc-item' });
    const title = el('div', { class: 'grow' }, [
      el('div', { class: 'title' }, [
        document.createTextNode(spell.name),
        spell.createdManually ? el('span', { class: 'manual-spell-marker', title: 'Creata a mano', 'aria-label': 'Creata a mano', text: ' ✎' }) : null
      ]),
      spell.original ? el('div', { class: 'en', text: spell.original }) : null
    ]);
    const favorite = el('button', {
      class: `favorite-toggle${spell.favorite ? ' on' : ''}`,
      type: 'button',
      title: spell.favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti',
      'aria-label': spell.favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti',
      'aria-pressed': String(spell.favorite),
      text: spell.favorite ? '★' : '☆'
    });
    favorite.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleFavorite(spell, favorite, api, root);
    });
    const head = el('div', { class: 'acc-head' }, [title, favorite, el('span', { class: 'badge', text: levelLabel(spell.level) }), el('span', { class: 'caret', html: ICON.caret })]);
    const body = el('div', { class: 'acc-body' });
    body.appendChild(spellDetails(spell));
    const edit = el('button', { class: 'btn sm ghost', type: 'button', html: ICON.edit + '<span>Modifica</span>' });
    edit.addEventListener('click', (event) => {
      event.stopPropagation();
      openSpellEditor(spell, api, root);
    });
    body.appendChild(el('div', { class: 'row', style: 'margin-top:12px' }, [edit]));
    head.addEventListener('click', () => item.classList.toggle('open'));
    item.append(head, body);
    return item;
  }

  draw();
}

function normalizeSpellRecord(spell) {
  spell.manual = (spell.manual || '').trim() || 'Manuale base';
  spell.createdManually = Boolean(spell.createdManually);
  spell.favorite = Boolean(spell.favorite);
  spell.classes = Array.isArray(spell.classes) ? spell.classes : [];
  spell.search = buildSpellSearch(spell);
}

async function toggleFavorite(spell, button, api, root) {
  const previous = spell.favorite;
  spell.favorite = !previous;
  updateFavoriteButton(button, spell);
  try {
    await api.db.bulkPut('spells', api.state.spells);
    api.toast(spell.favorite ? 'Magia aggiunta ai preferiti' : 'Magia rimossa dai preferiti');
    if (filters.favorite && !spell.favorite) renderSpells(root, api);
  } catch (error) {
    spell.favorite = previous;
    updateFavoriteButton(button, spell);
    console.error('Salvataggio preferito fallito:', error);
    api.toast(`Impossibile salvare il preferito: ${error?.message || 'errore sconosciuto'}`);
  }
}

function updateFavoriteButton(button, spell) {
  button.classList.toggle('on', spell.favorite);
  button.textContent = spell.favorite ? '★' : '☆';
  button.title = spell.favorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti';
  button.setAttribute('aria-label', button.title);
  button.setAttribute('aria-pressed', String(spell.favorite));
}

function availableClasses(spells) {
  return [...new Set([...BASE_CLASSES, ...spells.flatMap((spell) => spell.classes || [])])]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'it'));
}

export function spellDetails(spell) {
  const wrap = el('div', {});
  const meta = el('div', { class: 'spell-meta-grid' }, [
    metaRow('Scuola', cap(spell.school) + (spell.ritual ? ' (rituale)' : '')),
    metaRow('Livello', levelLabel(spell.level)),
    metaRow('Manuale', spell.manual || 'Manuale base'),
    metaRow('Tempo', spell.castingTime),
    metaRow('Gittata', spell.range),
    metaRow('Componenti', spell.components),
    metaRow('Durata', spell.duration)
  ].filter(Boolean));
  wrap.appendChild(meta);
  if (spell.classes?.length) wrap.appendChild(el('div', { class: 'acc-meta' }, spell.classes.map((c) => el('span', { class: 'badge', text: cap(c) }))));
  wrap.appendChild(el('p', { text: spell.description || '—' }));
  return wrap;
}

function metaRow(label, value) {
  if (!value) return null;
  return el('div', {}, [el('span', { text: label + ': ' }), document.createTextNode(value)]);
}

export function applyFilters(spells, f) {
  const q = fold(f.q || '');
  return spells.filter((spell) => {
    normalizeSpellRecord(spell);
    if (q && !spell.search.includes(q)) return false;
    if (f.manual && !spell.createdManually) return false;
    if (f.favorite && !spell.favorite) return false;
    if (f.levels.size && !f.levels.has(spell.level)) return false;
    if (f.schools.size && !f.schools.has(spell.school)) return false;
    if (f.classes.size && !spell.classes.some((c) => f.classes.has(c))) return false;
    return true;
  });
}

function activeFilterLabel() {
  const n = filters.levels.size + filters.classes.size + filters.schools.size + (filters.manual ? 1 : 0) + (filters.favorite ? 1 : 0);
  return n ? ` · ${n} filtr${n === 1 ? 'o' : 'i'} attiv${n === 1 ? 'o' : 'i'}` : '';
}

function cap(value) { return (value || '').charAt(0).toUpperCase() + (value || '').slice(1); }

function openSpellEditor(existing, api, root) {
  const isNew = !existing;
  const draft = existing || {
    id: uid(), name: '', original: '', level: 0, levelRaw: '', school: '', ritual: false,
    castingTime: '', range: '', components: '', duration: '', description: '', descriptionRaw: '',
    classes: [], manual: 'Manuale base', createdManually: true, favorite: false, search: ''
  };
  normalizeSpellRecord(draft);
  const body = el('div', {});
  const name = textInput('Nome', draft.name, 'Nome magia *');
  const original = textInput('Nome originale', draft.original, 'Nome inglese');
  const manual = textInput('Manuale', draft.manual, 'Manuale base');
  const level = el('select', { class: 'input' });
  for (let value = 0; value <= 9; value += 1) level.appendChild(el('option', { value: String(value), text: levelLabel(value) }));
  level.value = String(draft.level ?? 0);
  const castingTime = textInput('Tempo di lancio', draft.castingTime, 'es. 1 azione *');
  const school = textInput('Scuola', draft.school, 'es. abiurazione');
  const range = textInput('Gittata', draft.range, 'es. 18 metri');
  const components = textInput('Componenti', draft.components, 'es. V, S, M');
  const duration = textInput('Durata', draft.duration, 'es. Concentrazione, massimo 1 minuto');
  const description = el('textarea', { class: 'input', rows: '10', placeholder: 'Descrizione *' });
  description.value = draft.description || '';
  const ritual = el('input', { type: 'checkbox' });
  ritual.checked = Boolean(draft.ritual);

  body.append(
    name.field,
    original.field,
    manual.field,
    field('Livello *', level),
    castingTime.field,
    school.field,
    field('Rituale', el('label', { class: 'checkline' }, [ritual, document.createTextNode('La magia è un rituale')])),
    range.field,
    components.field,
    duration.field,
    field('Descrizione *', description)
  );

  const classes = new Set(draft.classes || []);
  const classButtons = el('div', { class: 'row wrap' });
  for (const className of availableClasses(api.state.spells)) {
    const chip = el('button', { class: `chip${classes.has(className) ? ' on' : ''}`, type: 'button', text: cap(className) });
    chip.addEventListener('click', () => {
      if (classes.has(className)) classes.delete(className); else classes.add(className);
      chip.classList.toggle('on', classes.has(className));
    });
    classButtons.appendChild(chip);
  }
  body.appendChild(field('Classi *', classButtons));

  const saveButton = el('button', { class: 'btn primary block', type: 'button', style: 'margin-top:12px', html: ICON.edit + `<span>${isNew ? 'Crea magia' : 'Salva modifiche'}</span>` });
  saveButton.addEventListener('click', async () => {
    const errors = [];
    const next = {
      ...draft,
      name: name.input.value.trim(),
      original: original.input.value.trim(),
      manual: manual.input.value.trim() || 'Manuale base',
      level: Number(level.value),
      levelRaw: levelLabel(Number(level.value)),
      castingTime: castingTime.input.value.trim(),
      school: school.input.value.trim(),
      ritual: ritual.checked,
      range: range.input.value.trim(),
      components: components.input.value.trim(),
      duration: duration.input.value.trim(),
      descriptionRaw: description.value,
      description: normalizeDescription(description.value, 'spell'),
      classes: [...classes],
      createdManually: isNew ? true : Boolean(draft.createdManually)
    };
    if (!next.name) errors.push('nome');
    if (!next.castingTime) errors.push('tempo di lancio');
    if (!next.classes.length) errors.push('almeno una classe');
    if (!next.description) errors.push('descrizione');
    if (errors.length) {
      api.toast(`Compila i campi obbligatori: ${errors.join(', ')}.`);
      return;
    }
    next.search = buildSpellSearch(next);
    try {
      if (isNew) api.state.spells.push(next); else Object.assign(existing, next);
      await api.db.bulkPut('spells', api.state.spells);
      api.state.hasSpells = api.state.spells.length > 0;
      api.updateTabs();
      api.closeDrawer();
      api.refresh('spells');
      api.toast(isNew ? 'Magia creata' : 'Magia modificata');
    } catch (error) {
      console.error('Salvataggio magia fallito:', error);
      api.toast(`Salvataggio magia fallito: ${error?.message || 'errore sconosciuto'}`);
    }
  });
  body.appendChild(saveButton);
  api.openDrawer(isNew ? 'Nuova magia' : `Modifica: ${draft.name}`, body);
}

function textInput(label, value, placeholder) {
  const input = el('input', { class: 'input', type: 'text', placeholder });
  input.value = value || '';
  return { input, field: field(label, input) };
}

function field(label, control) {
  return el('div', { class: 'field' }, [el('label', { text: label }), control]);
}
