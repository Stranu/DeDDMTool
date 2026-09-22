// Sezione Magie: ricerca multi-criterio (nome IT/EN, testo, livello o combinazioni
// di livelli, classe, scuola). La tab e' visibile solo se esistono dati.
import { el, ICON, fold, debounce } from '../util.js';
import { levelLabel } from '../csv.js';

// Stato dei filtri, mantenuto tra i redraw della vista.
const filters = { q: '', levels: new Set(), classes: new Set(), schools: new Set(), sort: 'name' };

export function renderSpells(root, api) {
  const { state } = api;
  root.innerHTML = '';

  if (!state.spells.length) {
    root.appendChild(el('div', { class: 'empty' }, [
      el('div', { html: ICON.sparkle }),
      el('div', { text: 'Nessuna magia importata.' }),
      el('div', { class: 'muted', text: 'Importa un CSV dalla scheda Impostazioni.' })
    ]));
    return;
  }

  // Deriva i valori disponibili dai dati.
  const levels = [...new Set(state.spells.map((s) => s.level).filter((v) => v != null))].sort((a, b) => a - b);
  const classes = [...new Set(state.spells.flatMap((s) => s.classes))].sort((a, b) => a.localeCompare(b, 'it'));
  const schools = [...new Set(state.spells.map((s) => s.school).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));

  // --- Barra di ricerca + filtri ---
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

  searchWrap.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'grow' }, [search]),
    toggleFiltersBtn
  ]));

  const filtersBox = el('div', { class: 'filters filter-panel', id: 'spell-filters', hidden: true });

  filtersBox.appendChild(chipGroup('Livello', levels, filters.levels, (v) => levelLabel(v)));
  filtersBox.appendChild(chipGroup('Classe', classes, filters.classes, (v) => cap(v)));
  filtersBox.appendChild(chipGroup('Scuola', schools, filters.schools, (v) => cap(v)));
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
  root.appendChild(count);

  const list = el('div', {});
  root.appendChild(list);

  function updateFilterToggle() {
    const active = filters.levels.size + filters.classes.size + filters.schools.size;
    toggleFiltersBtn.innerHTML = ICON.search;
    toggleFiltersBtn.appendChild(el('span', { text: active ? `Filtri (${active})` : 'Filtri' }));
    toggleFiltersBtn.setAttribute('aria-expanded', String(!filtersBox.hidden));
  }

  toggleFiltersBtn.addEventListener('click', () => {
    filtersBox.hidden = !filtersBox.hidden;
    updateFilterToggle();
  });
  resetBtn.addEventListener('click', () => {
    filters.q = ''; filters.levels.clear(); filters.classes.clear(); filters.schools.clear(); filters.sort = 'name';
    search.value = '';
    renderSpells(root, api);
  });

  sortSelect.addEventListener('change', () => {
    filters.sort = sortSelect.value;
    draw();
  });

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
    count.textContent = `${results.length} magi${results.length === 1 ? 'a' : 'e'}` + (activeFilterLabel());
    list.innerHTML = '';
    // Cap di rendering per fluidita' su mobile; ordina gia' per nome.
    const MAX = 300;
    for (const s of results.slice(0, MAX)) list.appendChild(spellItem(s));
    if (results.length > MAX) list.appendChild(el('div', { class: 'muted', style: 'text-align:center;padding:12px', text: `…e altre ${results.length - MAX}. Affina la ricerca.` }));
    if (!results.length) list.appendChild(el('div', { class: 'empty', text: 'Nessuna magia corrisponde ai criteri.' }));
  }

  draw();

  // ---------- UI helpers ----------
  function chipGroup(label, values, activeSet, fmt) {
    const g = el('div', { class: 'filter-group' });
    g.appendChild(el('span', { class: 'lbl', text: label }));
    for (const v of values) {
      const chip = el('button', { class: 'chip' + (activeSet.has(v) ? ' on' : ''), text: fmt(v) });
      chip.addEventListener('click', () => {
        if (activeSet.has(v)) activeSet.delete(v); else activeSet.add(v);
        chip.classList.toggle('on');
        draw();
        updateFilterToggle();
      });
      g.appendChild(chip);
    }
    return g;
  }

  function spellItem(s) {
    const item = el('div', { class: 'acc-item' });
    const head = el('div', { class: 'acc-head' }, [
      el('div', { class: 'grow' }, [
        el('div', { class: 'title', text: s.name }),
        s.original ? el('div', { class: 'en', text: s.original }) : null
      ]),
      el('span', { class: 'badge', text: levelLabel(s.level) }),
      el('span', { class: 'caret', html: ICON.caret })
    ]);
    const body = el('div', { class: 'acc-body' });
    body.appendChild(spellDetails(s));
    head.addEventListener('click', () => item.classList.toggle('open'));
    item.append(head, body);
    return item;
  }
}

// Esportata per riuso nel drawer dell'iniziativa.
export function spellDetails(s) {
  const wrap = el('div', {});
  const meta = el('div', { class: 'spell-meta-grid' }, [
    metaRow('Scuola', cap(s.school) + (s.ritual ? ' (rituale)' : '')),
    metaRow('Livello', levelLabel(s.level)),
    metaRow('Tempo', s.castingTime),
    metaRow('Gittata', s.range),
    metaRow('Componenti', s.components),
    metaRow('Durata', s.duration)
  ].filter(Boolean));
  wrap.appendChild(meta);
  if (s.classes && s.classes.length) {
    wrap.appendChild(el('div', { class: 'acc-meta' }, s.classes.map((c) => el('span', { class: 'badge', text: cap(c) }))));
  }
  wrap.appendChild(el('p', { text: s.description || '—' }));
  return wrap;
}

function metaRow(label, value) {
  if (!value) return null;
  return el('div', {}, [el('span', { text: label + ': ' }), document.createTextNode(value)]);
}

export function applyFilters(spells, f) {
  const q = fold(f.q || '');
  return spells.filter((s) => {
    if (q && !s.search.includes(q)) return false;
    if (f.levels.size && !f.levels.has(s.level)) return false;
    if (f.schools.size && !f.schools.has(s.school)) return false;
    if (f.classes.size) {
      // La magia deve appartenere ad almeno una delle classi selezionate.
      if (!s.classes.some((c) => f.classes.has(c))) return false;
    }
    return true;
  });
}

function activeFilterLabel() {
  const n = filters.levels.size + filters.classes.size + filters.schools.size;
  return n ? ` · ${n} filtr${n === 1 ? 'o' : 'i'} attiv${n === 1 ? 'o' : 'i'}` : '';
}
function cap(s) { return (s || '').charAt(0).toUpperCase() + (s || '').slice(1); }
