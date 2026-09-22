// Gestore di iniziativa e dettaglio combattente.
// Tutte le mutazioni chiamano api.save(), così lo stato resta in IndexedDB anche
// dopo una chiusura accidentale della PWA.
import { el, ICON, uid, fold } from '../util.js';
import { spellDetails } from './spells.js';

const KIND_LABELS = { pc: 'PG', ally: 'PNG', monster: 'Mostro' };

export function renderInitiative(root, api) {
  const { state } = api;
  normalizeState(state);
  hydrateSnapshots(state);
  root.innerHTML = '';

  const toolbar = el('div', { class: 'init-toolbar' });
  const nextBtn = el('button', { class: 'btn primary grow', title: 'Prossimo turno', html: ICON.play + '<span>Prossimo turno</span>' });
  const addBtn = el('button', { class: 'btn accent', title: 'Aggiungi combattente', html: ICON.plus + '<span>Aggiungi</span>' });
  const rosterBtn = el('button', { class: 'btn ghost', title: 'Gestisci roster', html: '<span>Roster</span>' });
  const resetBtn = el('button', { class: 'btn ghost', title: 'Azzera iniziativa', html: ICON.reset + '<span>Reset</span>' });
  toolbar.append(nextBtn, addBtn, rosterBtn, resetBtn);
  root.appendChild(toolbar);

  const status = el('div', { class: 'row', style: 'justify-content:space-between;margin:4px 2px 12px' });
  const round = el('span', { class: 'round-pill', text: `Round ${state.encounter.round || 1}` });
  const count = el('span', { class: 'muted', style: 'font-size:13px', text: `${state.encounter.combatants.length} combattenti` });
  status.append(round, count);
  root.appendChild(status);

  const list = el('div', {});
  root.appendChild(list);

  nextBtn.addEventListener('click', nextTurn);
  addBtn.addEventListener('click', () => openAddMenu(api));
  rosterBtn.addEventListener('click', () => openRoster(api));
  resetBtn.addEventListener('click', resetEncounter);

  if (!state.encounter.combatants.length) {
    list.appendChild(emptyEncounter());
  } else {
    for (const combatant of state.encounter.combatants) list.appendChild(combatantCard(combatant));
  }

  function combatantCard(c) {
    const active = c.id === state.encounter.activeId;
    const hpMax = number(c.hpMax);
    const hpCurrent = number(c.hpCurrent);
    const hpPercent = hpMax > 0 ? Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100)) : 0;
    const card = el('article', { class: `combatant${active ? ' active' : ''}${c.dead ? ' dead' : ''}` });

    const init = el('input', {
      class: 'c-init-input', type: 'number', inputmode: 'numeric', min: '-99', max: '99',
      placeholder: '—', value: c.initiative == null ? '' : c.initiative,
      'aria-label': `Iniziativa di ${c.name}`
    });
    init.addEventListener('change', () => {
      c.initiative = init.value === '' ? null : Number(init.value);
      sortCombatants(state.encounter);
      api.save();
      renderInitiative(root, api);
    });

    const kind = el('span', { class: 'kind', text: KIND_LABELS[c.kind] || 'PNG' });
    const name = el('div', { class: 'c-name' }, [el('span', { text: c.name || 'Senza nome' }), kind]);
    const sub = el('div', { class: 'c-sub' });
    if (c.ac !== '' && c.ac != null) {
      const ac = el('span', {});
      ac.append('CA ', el('b', { text: safeNumberText(c.ac) }));
      sub.appendChild(ac);
    }
    if (hpMax || hpCurrent) {
      const hp = el('span', { class: 'hp-mini' }, [
        el('span', { html: ICON.heart }),
        el('span', { text: `${safeNumberText(c.hpCurrent)} / ${safeNumberText(c.hpMax)}` })
      ]);
      sub.appendChild(hp);
      if (hpMax) {
        const bar = el('span', { class: 'hp-bar' });
        bar.appendChild(el('i', {}));
        bar.firstChild.style.width = `${hpPercent}%`;
        sub.appendChild(bar);
      }
    }
    if (c.save) sub.appendChild(el('span', { text: `TS ${c.save}` }));
    const conditionLine = el('div', { class: 'c-conditions' });
    for (const conditionId of c.conditions || []) {
      const condition = state.conditions.find((item) => item.id === conditionId);
      conditionLine.appendChild(el('span', { class: 'badge cond', text: condition?.name || c.conditionNames?.[conditionId] || conditionId }));
    }
    const knownCount = (c.knownSpells || []).length;
    const affectedCount = (c.affectedSpells || []).length;
    if (knownCount || affectedCount) {
      sub.appendChild(el('span', { text: `✦ ${knownCount} magie${knownCount === 1 ? '' : 'he'} · ${affectedCount} effet${affectedCount === 1 ? 'to' : 'ti'}` }));
    }
    const main = el('div', { class: 'c-main' }, [name, sub, conditionLine]);
    main.addEventListener('click', () => openCombatantDrawer(c, api));

    const actions = el('div', { class: 'c-actions' });
    const deadBtn = el('button', { class: 'dot-btn', title: c.dead ? 'Rianima' : 'Segna come sconfitto', html: ICON.skull });
    deadBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      c.dead = !c.dead;
      api.save();
      renderInitiative(root, api);
    });
    const deleteBtn = el('button', { class: 'dot-btn', title: 'Rimuovi dall’iniziativa', html: ICON.trash });
    deleteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      state.encounter.combatants = state.encounter.combatants.filter((item) => item.id !== c.id);
      if (state.encounter.activeId === c.id) state.encounter.activeId = null;
      api.save();
      renderInitiative(root, api);
    });
    actions.append(deadBtn, deleteBtn);
    card.append(init, main, actions);
    return card;
  }

  function emptyEncounter() {
    return el('div', { class: 'empty' }, [
      el('div', { html: ICON.play }),
      el('div', { text: 'Nessun combattente nell’iniziativa.' }),
      el('div', { class: 'muted', text: 'Aggiungi PG, PNG ricorrenti o mostri per iniziare.' }),
      el('button', { class: 'btn primary', style: 'margin-top:14px', html: ICON.plus + '<span>Aggiungi combattente</span>', onclick: () => openAddMenu(api) })
    ]);
  }

  function resetEncounter() {
    if (!state.encounter.combatants.length) return;
    if (!confirm('Azzerare i valori di iniziativa e il turno corrente? I combattenti resteranno nell’elenco.')) return;
    state.encounter.round = 1;
    state.encounter.activeId = null;
    for (const c of state.encounter.combatants) c.initiative = null;
    api.save();
    renderInitiative(root, api);
  }

  function nextTurn() {
    const list = state.encounter.combatants;
    if (!list.length) return;
    sortCombatants(state.encounter);
    let index = list.findIndex((c) => c.id === state.encounter.activeId);
    if (index < 0) index = -1;
    const next = (index + 1) % list.length;
    if (index >= 0 && next === 0) state.encounter.round = (state.encounter.round || 1) + 1;
    state.encounter.activeId = list[next].id;
    api.save();
    renderInitiative(root, api);
  }
}

// ---------- Drawer combattente ----------
function openCombatantDrawer(c, api) {
  const { state } = api;
  const body = el('div', {});
  const saveAndRefresh = () => { api.save(); api.refresh('initiative'); };

  body.appendChild(el('div', { class: 'field' }, [
    el('label', { text: 'Nome' }),
    inputField(c.name, 'text', (value) => { c.name = value; saveAndRefresh(); })
  ]));

  const stats = el('div', { class: 'stat-grid' });
  stats.append(
    statField('CA', c.ac, (v) => { c.ac = v; saveAndRefresh(); }),
    statField('PF attuali', c.hpCurrent, (v) => { c.hpCurrent = v; saveAndRefresh(); }),
    statField('PF massimi', c.hpMax, (v) => { c.hpMax = v; saveAndRefresh(); })
  );
  body.appendChild(stats);
  body.appendChild(el('div', { class: 'field', style: 'margin-top:12px' }, [
    el('label', { text: 'Tiri salvezza / note' }),
    inputField(c.save, 'text', (value) => { c.save = value; saveAndRefresh(); }, 'es. For +5, Des +2')
  ]));

  if (state.conditions.length) body.appendChild(conditionSection(c, api));
  if (state.spells.length) body.appendChild(spellSection(c, api));

  const remove = el('button', { class: 'btn danger block', style: 'margin-top:20px', html: ICON.trash + '<span>Rimuovi dall’iniziativa</span>' });
  remove.addEventListener('click', () => {
    state.encounter.combatants = state.encounter.combatants.filter((item) => item.id !== c.id);
    if (state.encounter.activeId === c.id) state.encounter.activeId = null;
    api.save();
    api.closeDrawer();
    api.refresh('initiative');
  });
  body.appendChild(remove);

  api.openDrawer(c.name || 'Dettagli combattente', body);
}

function conditionSection(c, api) {
  const section = el('section', {});
  section.appendChild(el('div', { class: 'mini-title', text: 'Condizioni' }));
  const chips = el('div', { class: 'row wrap' });
  for (const condition of api.state.conditions) {
    const chip = el('button', { class: `chip${c.conditions.includes(condition.id) ? ' on' : ''}`, text: condition.name });
    chip.title = condition.original || condition.name;
    chip.addEventListener('click', () => {
      const index = c.conditions.indexOf(condition.id);
      if (index >= 0) c.conditions.splice(index, 1);
      else {
        c.conditions.push(condition.id);
        c.conditionNames[condition.id] = condition.name;
      }
      chip.classList.toggle('on', c.conditions.includes(condition.id));
      api.save();
      api.refresh('initiative');
    });
    chips.appendChild(chip);
  }
  section.appendChild(chips);
  return section;
}

function spellSection(c, api) {
  const section = el('section', {});
  section.appendChild(el('div', { class: 'mini-title', text: 'Magie associate' }));
  section.appendChild(el('p', { class: 'muted', style: 'font-size:12px;margin-top:0', text: 'Aggiungi magie che il combattente conosce/lancia oppure effetti attivi su di lui.' }));

  const search = el('input', { class: 'input', type: 'search', placeholder: 'Cerca una magia da associare…' });
  const results = el('div', { style: 'margin-top:8px' });
  section.append(search, results);

  const knownTitle = el('div', { class: 'mini-title', text: 'Magie che può lanciare' });
  const knownList = el('div', {});
  const affectedTitle = el('div', { class: 'mini-title', text: 'Effetti sul bersaglio' });
  const affectedList = el('div', {});
  section.append(knownTitle, knownList, affectedTitle, affectedList);

  const redrawLists = () => {
    knownList.innerHTML = '';
    affectedList.innerHTML = '';
    if (!c.knownSpells.length) knownList.appendChild(el('div', { class: 'muted', style: 'font-size:13px', text: 'Nessuna magia associata.' }));
    for (const link of c.knownSpells) {
      const spell = api.state.spells.find((s) => s.id === link.spellId) || missingSpell(link);
      knownList.appendChild(spellLink(spell, link, 'known'));
    }
    if (!c.affectedSpells.length) affectedList.appendChild(el('div', { class: 'muted', style: 'font-size:13px', text: 'Nessun effetto attivo.' }));
    for (const link of c.affectedSpells) {
      const spell = api.state.spells.find((s) => s.id === link.spellId) || missingSpell(link);
      affectedList.appendChild(spellLink(spell, link, 'affected'));
    }
  };

  search.addEventListener('input', () => {
    const q = fold(search.value);
    results.innerHTML = '';
    if (!q) return;
    const existing = new Set([...c.knownSpells, ...c.affectedSpells].map((link) => link.spellId));
    const matches = api.state.spells.filter((spell) => spell.search.includes(q) && !existing.has(spell.id)).slice(0, 8);
    if (!matches.length) {
      results.appendChild(el('div', { class: 'muted', style: 'font-size:13px;padding:6px 0', text: 'Nessuna magia trovata.' }));
      return;
    }
    for (const spell of matches) {
      const row = el('div', { class: 'list-linkitem' });
      row.append(
        el('div', { class: 'grow' }, [
          el('div', { style: 'font-weight:600', text: spell.name }),
          el('div', { class: 'muted', style: 'font-size:11px', text: spell.original })
        ]),
        actionButton('Conosciuta', () => addSpell(c, spell, 'known')),
        actionButton('Effetto', () => addSpell(c, spell, 'affected'))
      );
      results.appendChild(row);
    }
  });

  function addSpell(combatant, spell, type) {
    const target = type === 'known' ? combatant.knownSpells : combatant.affectedSpells;
    if (!target.some((link) => link.spellId === spell.id)) {
      target.push({ spellId: spell.id, name: spell.name, original: spell.original || '', cast: false });
    }
    api.save();
    search.value = '';
    results.innerHTML = '';
    redrawLists();
    api.refresh('initiative');
  }

  function missingSpell(link) {
    return {
      id: link.spellId,
      name: link.name || link.spellId || 'Magia non disponibile',
      original: link.original || '',
      level: null,
      school: '',
      ritual: false,
      castingTime: '',
      range: '',
      components: '',
      duration: '',
      description: 'Il dataset da cui proveniva questa magia non è attualmente importato.',
      classes: [],
      search: ''
    };
  }

  function spellLink(spell, link, type) {
    const row = el('div', { class: `list-linkitem${link.cast ? ' cast' : ''}` });
    const open = el('div', { class: 'grow' }, [
      el('div', { style: 'font-weight:600', text: spell.name }),
      el('div', { class: 'muted', style: 'font-size:11px', text: type === 'known' ? (link.cast ? 'Lanciata' : 'Disponibile') : 'Effetto attivo' })
    ]);
    open.addEventListener('click', () => {
      const detail = el('div', {});
      detail.appendChild(spellDetails(spell));
      api.openDrawer(spell.name, detail);
    });
    const cast = type === 'known'
      ? el('button', { class: `chip${link.cast ? ' on' : ''}`, text: link.cast ? 'Lanciata' : 'Da lanciare' })
      : null;
    if (cast) cast.addEventListener('click', () => {
      link.cast = !link.cast;
      row.classList.toggle('cast', link.cast);
      cast.classList.toggle('on', link.cast);
      cast.textContent = link.cast ? 'Lanciata' : 'Da lanciare';
      api.save();
    });
    const remove = el('button', { class: 'dot-btn', title: 'Scollega magia', html: ICON.x });
    remove.addEventListener('click', () => {
      const target = type === 'known' ? c.knownSpells : c.affectedSpells;
      const index = target.indexOf(link);
      if (index >= 0) target.splice(index, 1);
      api.save();
      redrawLists();
      api.refresh('initiative');
    });
    row.append(open);
    if (cast) row.append(cast);
    row.append(remove);
    return row;
  }

  redrawLists();
  return section;
}

// ---------- Add / roster drawer ----------
function openAddMenu(api) {
  const body = el('div', {});
  body.appendChild(el('p', { class: 'muted', text: 'Aggiungi un combattente manualmente oppure scegli un elemento dal roster.' }));
  const form = el('form', {});
  const name = el('input', { class: 'input', required: '', placeholder: 'Nome (es. Goblin 1)' });
  const kind = el('select', { class: 'input', style: 'margin-top:8px' }, [
    el('option', { value: 'monster', text: 'Mostro' }),
    el('option', { value: 'ally', text: 'PNG' }),
    el('option', { value: 'pc', text: 'PG' })
  ]);
  const submit = el('button', { class: 'btn primary block', style: 'margin-top:10px', type: 'submit', html: ICON.plus + '<span>Aggiungi all’iniziativa</span>' });
  form.append(name, kind, submit);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = name.value.trim();
    if (!value) return;
    addToEncounter(api, makeCombatant(value, kind.value));
    api.closeDrawer();
    api.refresh('initiative');
  });
  body.appendChild(form);
  body.appendChild(el('div', { class: 'mini-title', text: 'Aggiunta rapida dal roster' }));
  const roster = [...api.state.roster.pcs.map((x) => ({ ...x, kind: 'pc' })), ...api.state.roster.allies.map((x) => ({ ...x, kind: 'ally' }))];
  if (!roster.length) body.appendChild(el('div', { class: 'muted', style: 'font-size:13px', text: 'Il roster è vuoto.' }));
  for (const item of roster) {
    const button = el('button', { class: 'list-linkitem', style: 'width:100%;text-align:left', type: 'button' }, [
      el('span', { class: 'grow', text: item.name }),
      el('span', { class: 'badge', text: KIND_LABELS[item.kind] })
    ]);
    button.addEventListener('click', () => {
      addToEncounter(api, cloneCombatant(item));
      api.closeDrawer();
      api.refresh('initiative');
    });
    body.appendChild(button);
  }
  api.openDrawer('Aggiungi combattente', body);
}

function openRoster(api) {
  const body = el('div', {});
  body.appendChild(el('p', { class: 'muted', text: 'Salva qui i PG e i PNG ricorrenti. I dati restano disponibili tra un incontro e l’altro.' }));
  const addRosterForm = (kind, title, collection) => {
    const section = el('section', {});
    section.appendChild(el('div', { class: 'mini-title', text: title }));
    const form = el('form', { class: 'row' });
    const input = el('input', { class: 'input grow', required: '', placeholder: kind === 'pc' ? 'Nome del PG' : 'Nome del PNG' });
    const button = el('button', { class: 'btn primary', type: 'submit', html: ICON.plus });
    form.append(input, button);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = input.value.trim();
      if (!name) return;
      collection.push(makeCombatant(name, kind));
      api.save();
      input.value = '';
      redrawRoster();
    });
    section.appendChild(form);
    return section;
  };
  const pcs = addRosterForm('pc', 'PG', api.state.roster.pcs);
  const allies = addRosterForm('ally', 'PNG ricorrenti', api.state.roster.allies);
  body.append(pcs, allies);
  const lists = el('div', {});
  body.appendChild(lists);

  function redrawRoster() {
    lists.innerHTML = '';
    drawRosterList('PG', api.state.roster.pcs, 'pc');
    drawRosterList('PNG ricorrenti', api.state.roster.allies, 'ally');
  }
  function drawRosterList(title, collection, kind) {
    if (!collection.length) return;
    lists.appendChild(el('div', { class: 'mini-title', text: title }));
    for (const item of collection) {
      const row = el('div', { class: 'list-linkitem' });
      row.append(el('span', { class: 'grow', text: item.name }));
      const add = el('button', { class: 'chip on', text: 'Iniziativa' });
      add.addEventListener('click', () => {
        addToEncounter(api, cloneCombatant({ ...item, kind }));
        api.closeDrawer();
        api.refresh('initiative');
      });
      const remove = el('button', { class: 'dot-btn', title: 'Rimuovi dal roster', html: ICON.trash });
      remove.addEventListener('click', () => {
        const index = collection.indexOf(item);
        if (index >= 0) collection.splice(index, 1);
        api.save();
        redrawRoster();
      });
      row.append(add, remove);
      lists.appendChild(row);
    }
  }
  redrawRoster();
  api.openDrawer('Roster', body);
}

// ---------- Data helpers ----------
function makeCombatant(name, kind = 'monster') {
  return {
    id: uid(), name, kind,
    initiative: null, ac: '', hpCurrent: '', hpMax: '', save: '', dead: false,
    conditions: [], conditionNames: {}, affectedSpells: [], knownSpells: []
  };
}

function cloneCombatant(source) {
  const copy = makeCombatant(source.name, source.kind);
  for (const key of ['ac', 'hpCurrent', 'hpMax', 'save']) copy[key] = source[key] ?? '';
  copy.conditions = [...(source.conditions || [])];
  copy.conditionNames = { ...(source.conditionNames || {}) };
  copy.affectedSpells = (source.affectedSpells || []).map((x) => ({ ...x }));
  copy.knownSpells = (source.knownSpells || []).map((x) => ({ ...x }));
  return copy;
}

function addToEncounter(api, combatant) {
  api.state.encounter.combatants.push(combatant);
  sortCombatants(api.state.encounter);
  api.save();
}

function hydrateSnapshots(state) {
  const combatants = [...state.encounter.combatants, ...state.roster.pcs, ...state.roster.allies];
  for (const c of combatants) {
    for (const conditionId of c.conditions) {
      const condition = state.conditions.find((item) => item.id === conditionId);
      if (condition && !c.conditionNames[conditionId]) c.conditionNames[conditionId] = condition.name;
    }
    for (const link of [...c.knownSpells, ...c.affectedSpells]) {
      const spell = state.spells.find((item) => item.id === link.spellId);
      if (spell) {
        if (!link.name) link.name = spell.name;
        if (!link.original) link.original = spell.original || '';
      }
    }
  }
}

function normalizeState(state) {
  if (!state.encounter || typeof state.encounter !== 'object') state.encounter = { round: 1, activeId: null, combatants: [] };
  if (!Array.isArray(state.encounter.combatants)) state.encounter.combatants = [];
  if (!state.encounter.round) state.encounter.round = 1;
  if (!state.roster || typeof state.roster !== 'object') state.roster = { pcs: [], allies: [] };
  if (!Array.isArray(state.roster.pcs)) state.roster.pcs = [];
  if (!Array.isArray(state.roster.allies)) state.roster.allies = [];
  for (const c of state.encounter.combatants) normalizeCombatant(c);
  for (const c of [...state.roster.pcs, ...state.roster.allies]) normalizeCombatant(c);
}

function normalizeCombatant(c) {
  if (!c.id) c.id = uid();
  if (!c.kind) c.kind = 'monster';
  if (!Array.isArray(c.conditions)) c.conditions = [];
  if (!c.conditionNames || typeof c.conditionNames !== 'object' || Array.isArray(c.conditionNames)) c.conditionNames = {};
  if (!Array.isArray(c.affectedSpells)) c.affectedSpells = [];
  if (!Array.isArray(c.knownSpells)) c.knownSpells = [];
  c.affectedSpells = normalizeSpellLinks(c.affectedSpells);
  c.knownSpells = normalizeSpellLinks(c.knownSpells);
  if (c.initiative === undefined) c.initiative = null;
  if (c.dead === undefined) c.dead = false;
}

function normalizeSpellLinks(links) {
  let changed = false;
  const normalized = [];
  for (const link of links) {
    if (!link) { changed = true; continue; }
    if (typeof link === 'string') {
      normalized.push({ spellId: link, name: link, original: '', cast: false });
      changed = true;
      continue;
    }
    if (!link.spellId && link.id) {
      normalized.push({ ...link, spellId: link.id });
      changed = true;
      continue;
    }
    normalized.push(link);
  }
  return changed ? normalized : links;
}

function sortCombatants(encounter) {
  const before = encounter.combatants.map((c) => c.id);
  encounter.combatants.sort((a, b) => {
    const ai = a.initiative == null || a.initiative === '' ? -Infinity : Number(a.initiative);
    const bi = b.initiative == null || b.initiative === '' ? -Infinity : Number(b.initiative);
    return bi - ai;
  });
  // Se l'activeId non è più presente, lasciamo che Prossimo turno scelga il primo.
  return before.join('|') !== encounter.combatants.map((c) => c.id).join('|');
}

function inputField(value, type, onChange, placeholder = '') {
  const input = el('input', { class: 'input', type, value: value ?? '', placeholder });
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

function statField(label, value, onChange) {
  const wrapper = el('div', { class: 'field' });
  wrapper.appendChild(el('label', { text: label }));
  wrapper.appendChild(inputField(value, 'number', onChange));
  return wrapper;
}

function actionButton(label, onClick) {
  const button = el('button', { class: 'chip', type: 'button', text: label });
  button.addEventListener('click', onClick);
  return button;
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeNumberText(value) { return value === '' || value == null ? '—' : String(value); }
