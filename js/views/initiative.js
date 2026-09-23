// Gestore di iniziativa e dettaglio combattente.
// Tutte le mutazioni chiamano api.save(), così lo stato resta in IndexedDB anche
// dopo una chiusura accidentale della PWA.
import { el, ICON, uid, fold } from '../util.js';
import { spellDetails } from './spells.js';

const KIND_LABELS = { pc: 'PG', ally: 'Alleato', monster: 'Mostro/PNG' };

export function renderInitiative(root, api) {
  const { state } = api;
  normalizeState(state);
  linkSharedRosterEntities(state);
  hydrateSnapshots(state);
  root.innerHTML = '';

  const toolbar = el('div', { class: 'init-toolbar' });
  const nextBtn = el('button', { class: 'btn primary grow', title: 'Prossimo turno', html: ICON.play + '<span>Prossimo turno</span>' });
  const addBtn = el('button', { class: 'btn accent', title: 'Aggiungi Mostri/PNG temporaneo o da archivio', html: '<span>+ Mostri</span>' });
  const rosterBtn = el('button', { class: 'btn accent', title: 'Gestisci PG e alleati ricorrenti', html: '<span>+ PG/Alleati</span>' });
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
  resetBtn.addEventListener('click', () => openResetMenu(api, resetEncounter, resetComplete));

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
    const card = el('article', {
      class: `combatant${active ? ' active' : ''}${c.dead ? ' dead' : ''}`,
      tabindex: '-1',
      dataset: { combatantId: c.id },
      'aria-current': active ? 'true' : false
    });

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
    if (number(c.tempHp) > 0) sub.appendChild(el('span', { class: 'temp-hp', text: `🛡 PF temp ${c.tempHp}` }));
    if (c.creatureType) sub.appendChild(el('span', { text: c.creatureType }));
    if (c.cr !== '' && c.cr != null) sub.appendChild(el('span', { text: `GS ${c.cr}` }));
    if (c.notes) sub.appendChild(el('span', { text: '📝 Note' }));
    const conditionLine = el('div', { class: 'c-conditions' });
    for (const conditionId of c.conditions || []) {
      const condition = state.conditions.find((item) => item.id === conditionId);
      conditionLine.appendChild(el('span', { class: 'badge cond', text: condition?.name || c.conditionNames?.[conditionId] || conditionId }));
    }
    const knownCount = (c.knownSpells || []).length;
    const affectedCount = (c.affectedSpells || []).length;
    if (knownCount) sub.appendChild(el('span', { class: 'magic-prepared-marker', title: `Magie preparate: ${knownCount}`, 'aria-label': `Magie preparate: ${knownCount}`, text: `✦ ${knownCount}` }));
    if (affectedCount) {
      sub.appendChild(el('span', {
        class: 'active-spells-marker',
        title: `Magie attive: ${affectedCount}`,
        'aria-label': `Magie attive: ${affectedCount}`,
        text: '✧'
      }));
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
      if (!confirm(`Rimuovere "${c.name}" dall’iniziativa? I dati della scheda archivio/roster non verranno modificati.`)) return;
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
      el('div', { class: 'muted', text: 'Usa + Mostri per inserire una scheda Mostri/PNG o PG/Alleati per i ricorrenti.' })
    ]);
  }

  function resetEncounter() {
    if (!state.encounter.combatants.length) return;
    if (!confirm('Azzerare iniziative e round mantenendo tutti i partecipanti?')) return;
    state.encounter.round = 1;
    state.encounter.activeId = null;
    for (const c of state.encounter.combatants) c.initiative = null;
    api.save();
    renderInitiative(root, api);
  }

  function resetComplete() {
    if (!state.encounter.combatants.length) return;
    if (!confirm('Svuotare completamente l’iniziativa? I PG/Alleati e le schede Mostri/PNG salvati resteranno intatti.')) return;
    state.encounter.round = 1;
    state.encounter.activeId = null;
    state.encounter.combatants = [];
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
    focusActiveCombatant(root, state.encounter.activeId);
  }
}

function focusActiveCombatant(root, combatantId) {
  requestAnimationFrame(() => {
    const card = Array.from(root.querySelectorAll('[data-combatant-id]'))
      .find((node) => node.dataset.combatantId === combatantId);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    card.focus({ preventScroll: true });
  });
}

// ---------- Drawer reset ----------
function openResetMenu(api, resetEncounter, resetComplete) {
  const body = el('div', {});
  body.appendChild(el('p', { class: 'muted', text: 'Scegli se azzerare solo i turni o rimuovere tutti i partecipanti dall’iniziativa.' }));
  const keep = el('button', { class: 'btn primary block', type: 'button', html: '<span>Reset iniziativa · mantieni partecipanti</span>' });
  keep.addEventListener('click', () => { resetEncounter(); api.closeDrawer(); });
  const clear = el('button', { class: 'btn danger block', type: 'button', style: 'margin-top:10px', html: '<span>Reset completo · svuota iniziativa</span>' });
  clear.addEventListener('click', () => { resetComplete(); api.closeDrawer(); });
  body.append(keep, clear);
  api.openDrawer('Reset iniziativa', body);
}

// ---------- Drawer combattente ----------
function openCombatantDrawer(c, api, options = {}) {
  const { state } = api;
  const body = el('div', {});
  const saveAndRefresh = () => {
    if (options.shared) syncRosterMemberToEncounter(c, api);
    else syncEncounterToRoster(c, api);
    api.save();
    api.refresh('initiative');
  };

  body.appendChild(el('div', { class: 'field' }, [
    el('label', { text: 'Nome' }),
    inputField(c.name, 'text', (value) => { c.name = value; saveAndRefresh(); })
  ]));

  const stats = el('div', { class: 'stat-grid' });
  stats.append(
    statField('CA', c.ac, (v) => { c.ac = v; saveAndRefresh(); }),
    statField('PF attuali', c.hpCurrent, (v) => { c.hpCurrent = v; saveAndRefresh(); }),
    statField('PF massimi', c.hpMax, (v) => { c.hpMax = v; saveAndRefresh(); }),
    statField('PF temporanei', c.tempHp, (v) => { c.tempHp = v === '' ? 0 : Math.max(0, Number(v)); saveAndRefresh(); })
  );
  body.appendChild(stats);
  body.appendChild(el('div', { class: 'field', style: 'margin-top:12px' }, [
    el('label', { text: 'Note / attacchi / capacità' }),
    textareaField(c.notes, (value) => { c.notes = value; saveAndRefresh(); }, 'es. Multiattacco, morso +5, danni 1d6+3')
  ]));

  if (state.conditions.length) body.appendChild(conditionSection(c, api, saveAndRefresh));
  if (state.spells.length) body.appendChild(spellSection(c, api, saveAndRefresh));

  const remove = el('button', {
    class: 'btn danger block', style: 'margin-top:20px',
    html: options.shared
      ? ICON.trash + '<span>Rimuovi da PG/Alleati</span>'
      : ICON.trash + '<span>Rimuovi dall’iniziativa</span>'
  });
  remove.addEventListener('click', () => {
    if (options.shared) {
      if (!confirm(`Rimuovere "${c.name}" da PG/Alleati? Le copie già presenti nei combattimenti resteranno utilizzabili.`)) return;
      const collection = state.roster.pcs.includes(c) ? state.roster.pcs : state.roster.allies;
      const index = collection.indexOf(c);
      if (index >= 0) collection.splice(index, 1);
      for (const combatant of state.encounter.combatants) {
        if (combatant.rosterId === c.id) delete combatant.rosterId;
      }
    } else {
      if (!confirm(`Rimuovere "${c.name}" dall’iniziativa? I dati della scheda archivio/roster non verranno modificati.`)) return;
      state.encounter.combatants = state.encounter.combatants.filter((item) => item.id !== c.id);
      if (state.encounter.activeId === c.id) state.encounter.activeId = null;
    }
    api.save();
    api.closeDrawer();
    api.refresh('initiative');
  });
  body.appendChild(remove);

  api.openDrawer(c.name || 'Dettagli combattente', body);
}

function conditionSection(c, api, onChange = () => api.save()) {
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
      onChange();
      api.refresh('initiative');
    });
    chips.appendChild(chip);
  }
  section.appendChild(chips);
  return section;
}

function spellSection(c, api, onChange = () => api.save()) {
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
    onChange();
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
      onChange();
    });
    const remove = el('button', { class: 'dot-btn', title: 'Scollega magia', html: ICON.x });
    remove.addEventListener('click', () => {
      const target = type === 'known' ? c.knownSpells : c.affectedSpells;
      const index = target.indexOf(link);
      if (index >= 0) target.splice(index, 1);
      onChange();
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
  body.appendChild(el('p', { class: 'muted', text: 'Aggiungi un Mostro/PNG temporaneo all’iniziativa oppure cerca una scheda Mostri/PNG esistente.' }));
  const form = el('form', {});
  const name = el('input', { class: 'input', required: '', placeholder: 'Nome Mostri/PNG (es. Goblin 1)' });
  const submit = el('button', { class: 'btn primary block', style: 'margin-top:10px', type: 'submit', html: ICON.plus + '<span>Aggiungi all’iniziativa</span>' });
  form.append(name, submit);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = name.value.trim();
    if (!value) return;
    const combatant = makeCombatant(value, 'monster');
    combatant.name = uniqueEncounterName(api.state.encounter.combatants, combatant.name);
    addToEncounter(api, combatant);
    api.closeDrawer();
    api.refresh('initiative');
  });
  body.appendChild(form);

  body.appendChild(el('div', { class: 'mini-title', text: 'Aggiunta rapida da roster e archivio' }));
  const quickSearch = el('input', { class: 'input', type: 'search', placeholder: 'Cerca Mostri/PNG…', 'aria-label': 'Cerca nelle schede Mostri e PNG' });
  const quickList = el('div', { style: 'margin-top:8px' });
  body.append(quickSearch, quickList);

  const sources = () => api.state.roster.archive;
  function drawQuickList() {
    const query = fold(quickSearch.value);
    const matches = sources().filter((item) => !query || fold(item.name).includes(query));
    quickList.innerHTML = '';
    if (!matches.length) {
      quickList.appendChild(el('div', { class: 'muted', style: 'font-size:13px;padding:6px 0', text: query ? 'Nessun elemento trovato.' : 'Roster e archivio Mostri/PNG sono vuoti.' }));
      return;
    }
    for (const item of matches) {
      const row = el('div', { class: 'list-linkitem quick-add-item' });
      const nameButton = el('button', { class: 'grow quick-sheet-name', type: 'button', title: 'Visualizza scheda', text: item.name });
      nameButton.addEventListener('click', () => openArchiveReadOnly(item, api));
      const addButton = el('button', { class: 'chip on', type: 'button', text: 'Iniziativa' });
      addButton.addEventListener('click', () => {
        const added = addMonsterToEncounter(api, item);
        api.toast(`${added.name} aggiunto all’iniziativa`);
        api.refresh('initiative');
      });
      row.append(nameButton, el('span', { class: 'badge', text: 'Mostri/PNG' }), addButton);
      quickList.appendChild(row);
    }
  }
  quickSearch.addEventListener('input', drawQuickList);
  drawQuickList();
  api.openDrawer('+ Mostri', body);
}

function openArchiveReadOnly(entry, api) {
  const body = el('div', {});
  body.appendChild(readOnlyField('Tipo creatura', entry.creatureType || '—'));
  body.appendChild(readOnlyField('GS', entry.cr === '' || entry.cr == null ? '—' : String(entry.cr)));
  const stats = el('div', { class: 'stat-grid' }, [
    readOnlyField('CA', entry.ac === '' || entry.ac == null ? '—' : String(entry.ac)),
    readOnlyField('PF', `${entry.hpCurrent || '—'} / ${entry.hpMax || '—'}`),
    readOnlyField('TS', entry.save || '—')
  ]);
  body.appendChild(stats);
  body.appendChild(readOnlyField('Note / attacchi / capacità', entry.notes || '—', true));

  if (entry.conditions?.length) {
    body.appendChild(el('div', { class: 'mini-title', text: 'Condizioni' }));
    body.appendChild(el('div', { class: 'row wrap' }, entry.conditions.map((id) => {
      const condition = api.state.conditions.find((item) => item.id === id);
      return el('span', { class: 'badge cond', text: condition?.name || entry.conditionNames?.[id] || id });
    })));
  }
  appendReadOnlySpells(body, 'Magie conosciute', entry.knownSpells || [], api);
  appendReadOnlySpells(body, 'Effetti attivi', entry.affectedSpells || [], api);
  api.openDrawer(`Mostri/PNG: ${entry.name}`, body);
}

function readOnlyField(label, value, multiline = false) {
  return el('div', { class: `field${multiline ? ' readonly-note' : ''}` }, [
    el('label', { text: label }),
    el('div', { class: 'readonly-value', text: value })
  ]);
}

function appendReadOnlySpells(body, title, links, api) {
  if (!links.length) return;
  body.appendChild(el('div', { class: 'mini-title', text: title }));
  for (const link of links) {
    const spell = api.state.spells.find((item) => item.id === link.spellId);
    const row = el('button', { class: 'list-linkitem', type: 'button' }, [
      el('span', { class: 'grow', text: spell?.name || link.name || link.spellId || 'Magia non disponibile' }),
      el('span', { class: 'muted', text: link.cast ? 'Lanciata' : '' })
    ]);
    if (spell) row.addEventListener('click', () => api.openDrawer(spell.name, spellDetails(spell)));
    else row.disabled = true;
    body.appendChild(row);
  }
}

function openRoster(api) {
  const body = el('div', {});
  body.appendChild(el('p', { class: 'muted', text: 'PG e alleati ricorrenti restano disponibili tra gli incontri. Le loro statistiche sono condivise con le copie presenti nell’iniziativa.' }));

  const addRosterForm = (kind, title, collection) => {
    const section = el('section', {});
    section.appendChild(el('div', { class: 'mini-title', text: title }));
    const form = el('form', { class: 'row' });
    const input = el('input', { class: 'input grow', required: '', placeholder: kind === 'pc' ? 'Nome del PG' : 'Nome del PNG' });
    const button = el('button', { class: 'btn primary', type: 'submit', title: `Aggiungi ${title}`, html: ICON.plus });
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
  const allies = addRosterForm('ally', 'Alleati ricorrenti', api.state.roster.allies);
  body.append(pcs, allies);

  const lists = el('div', {});
  body.appendChild(lists);

  function redrawRoster() {
    lists.innerHTML = '';
    drawRosterList('PG', api.state.roster.pcs, 'pc');
    drawRosterList('Alleati ricorrenti', api.state.roster.allies, 'ally');
  }
  function drawRosterList(title, collection, kind) {
    if (!collection.length) return;
    lists.appendChild(el('div', { class: 'mini-title', text: title }));
    for (const item of collection) {
      const row = el('div', { class: 'list-linkitem' });
      const name = el('span', { class: 'grow', text: item.name, title: 'Apri e modifica scheda' });
      name.addEventListener('click', () => openCombatantDrawer(item, api, { shared: true }));
      row.append(name);
      const add = el('button', { class: 'chip on', type: 'button', text: 'Iniziativa' });
      add.addEventListener('click', () => {
        if (!addRosterMemberToEncounter(api, item)) return;
        api.toast(`${item.name} aggiunto all’iniziativa`);
        api.refresh('initiative');
      });
      const remove = el('button', { class: 'dot-btn', type: 'button', title: 'Rimuovi dal roster', html: ICON.trash });
      remove.addEventListener('click', () => {
        if (!confirm(`Rimuovere "${item.name}" dal roster? La scheda verrà eliminata dal roster, ma non dai combattimenti già creati.`)) return;
        const index = collection.indexOf(item);
        if (index >= 0) collection.splice(index, 1);
        for (const combatant of api.state.encounter.combatants) {
          if (combatant.rosterId === item.id) delete combatant.rosterId;
        }
        api.save();
        redrawRoster();
      });
      row.append(add, remove);
      lists.appendChild(row);
    }
  }
  redrawRoster();
  api.openDrawer('PG/Alleati', body);
}

export function openArchiveDrawer(entry, api, returnView = 'initiative') {
  const body = el('div', {});
  const saveArchive = () => { api.save(); api.refresh(returnView); };
  body.appendChild(el('div', { class: 'field' }, [
    el('label', { text: 'Nome scheda' }),
    inputField(entry.name, 'text', (value) => { entry.name = value; saveArchive(); })
  ]));

  const crInput = inputField(entry.cr, 'number', (value) => { entry.cr = value === '' ? '' : Number(value); saveArchive(); }, '0');
  crInput.step = 'any';
  crInput.min = '0';
  body.appendChild(el('div', { class: 'row' }, [
    el('div', { class: 'field grow' }, [
      el('label', { text: 'Tipo creatura' }),
      inputField(entry.creatureType, 'text', (value) => { entry.creatureType = value; saveArchive(); }, 'es. umanoide, bestia, non morto')
    ]),
    el('div', { class: 'field cr-field' }, [
      el('label', { text: 'GS' }),
      crInput
    ])
  ]));

  const stats = el('div', { class: 'stat-grid' });
  stats.append(
    statField('CA', entry.ac, (v) => { entry.ac = v; saveArchive(); }),
    statField('PF attuali', entry.hpCurrent, (v) => { entry.hpCurrent = v; saveArchive(); }),
    statField('PF massimi', entry.hpMax, (v) => { entry.hpMax = v; saveArchive(); })
  );
  body.appendChild(stats);
  body.appendChild(el('div', { class: 'field', style: 'margin-top:12px' }, [
    el('label', { text: 'Tiri salvezza' }),
    inputField(entry.save, 'text', (value) => { entry.save = value; saveArchive(); }, 'es. For +5, Des +2')
  ]));
  body.appendChild(el('div', { class: 'field' }, [
    el('label', { text: 'Note / attacchi / capacità' }),
    textareaField(entry.notes, (value) => { entry.notes = value; saveArchive(); }, 'es. Multiattacco, morso +5, danni 1d6+3')
  ]));
  if (api.state.spells.length) body.appendChild(spellSection(entry, api));

  const remove = el('button', { class: 'btn danger block', style: 'margin-top:20px', html: ICON.trash + '<span>Rimuovi dalla sezione Mostri/PNG</span>' });
  remove.addEventListener('click', () => {
    if (!confirm(`Rimuovere "${entry.name}" dall’archivio?`)) return;
    const index = api.state.roster.archive.indexOf(entry);
    if (index >= 0) api.state.roster.archive.splice(index, 1);
    api.state.hasMonsters = api.state.roster.archive.length > 0;
    api.updateTabs();
    api.save();
    api.closeDrawer();
    api.refresh(returnView);
  });
  body.appendChild(remove);
  api.openDrawer(`Mostri/PNG: ${entry.name}`, body);
}

// ---------- Data helpers ----------
export function makeCombatant(name, kind = 'monster') {
  return {
    id: uid(), name, kind,
    initiative: null, ac: '', hpCurrent: '', hpMax: '', tempHp: 0, save: '', notes: '', creatureType: '', cr: '', dead: false,
    conditions: [], conditionNames: {}, affectedSpells: [], knownSpells: []
  };
}

export function cloneCombatant(source) {
  const copy = makeCombatant(source.name, source.kind);
  for (const key of ['ac', 'hpCurrent', 'hpMax', 'save', 'notes', 'creatureType', 'cr']) copy[key] = source[key] ?? '';
  copy.conditions = [...(source.conditions || [])];
  copy.conditionNames = { ...(source.conditionNames || {}) };
  copy.affectedSpells = (source.affectedSpells || []).map((x) => ({ ...x }));
  copy.knownSpells = (source.knownSpells || []).map((x) => ({ ...x }));
  return copy;
}

const SHARED_FIELDS = [
  'name', 'kind', 'ac', 'hpCurrent', 'hpMax', 'tempHp', 'save', 'notes',
  'creatureType', 'cr', 'conditions', 'conditionNames', 'affectedSpells', 'knownSpells'
];

function copySharedFields(source, target) {
  for (const key of SHARED_FIELDS) {
    if (Array.isArray(source[key])) target[key] = source[key].map((item) => (typeof item === 'object' && item !== null ? { ...item } : item));
    else if (source[key] && typeof source[key] === 'object') target[key] = { ...source[key] };
    else target[key] = source[key] ?? '';
  }
}

function rosterMembers(api) {
  return [...api.state.roster.pcs, ...api.state.roster.allies];
}

function findRosterMember(api, id) {
  return rosterMembers(api).find((member) => member.id === id);
}

function syncEncounterToRoster(combatant, api) {
  if (!combatant.rosterId) return;
  const member = findRosterMember(api, combatant.rosterId);
  if (!member) return;
  copySharedFields(combatant, member);
  for (const other of api.state.encounter.combatants) {
    if (other !== combatant && other.rosterId === member.id) copySharedFields(member, other);
  }
}

function syncRosterMemberToEncounter(member, api) {
  for (const combatant of api.state.encounter.combatants) {
    if (combatant.rosterId === member.id) copySharedFields(member, combatant);
  }
}

function linkSharedRosterEntities(state) {
  const members = [...state.roster.pcs, ...state.roster.allies];
  for (const combatant of state.encounter.combatants) {
    if (!combatant.rosterId) continue;
    const member = members.find((item) => item.id === combatant.rosterId);
    if (member) copySharedFields(member, combatant);
  }
}

function addRosterMemberToEncounter(api, member) {
  if (api.state.encounter.combatants.some((combatant) => combatant.rosterId === member.id)) {
    api.toast(`${member.name} è già presente nell’iniziativa.`);
    return false;
  }
  const combatant = cloneCombatant(member);
  combatant.tempHp = member.tempHp ?? 0;
  combatant.rosterId = member.id;
  addToEncounter(api, combatant);
  return true;
}

export function addMonsterToEncounter(api, source) {
  const combatant = cloneCombatant(source);
  combatant.name = uniqueEncounterName(api.state.encounter.combatants, combatant.name);
  addToEncounter(api, combatant);
  return combatant;
}

function uniqueEncounterName(combatants, originalName) {
  const base = (originalName || 'Mostri/PNG').trim() || 'Mostri/PNG';
  const used = new Set(combatants.map((combatant) => fold(combatant.name)));
  if (!used.has(fold(base))) return base;
  let sequence = 2;
  while (used.has(fold(`${base} ${sequence}`))) sequence += 1;
  return `${base} ${sequence}`;
}

export function addToEncounter(api, combatant) {
  api.state.encounter.combatants.push(combatant);
  sortCombatants(api.state.encounter);
  api.save();
}

function hydrateSnapshots(state) {
  const combatants = [...state.encounter.combatants, ...state.roster.pcs, ...state.roster.allies, ...state.roster.archive];
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
  if (!state.roster || typeof state.roster !== 'object') state.roster = { pcs: [], allies: [], archive: [] };
  if (!Array.isArray(state.roster.pcs)) state.roster.pcs = [];
  if (!Array.isArray(state.roster.allies)) state.roster.allies = [];
  if (!Array.isArray(state.roster.archive)) state.roster.archive = [];
  for (const c of state.encounter.combatants) normalizeCombatant(c);
  for (const c of [...state.roster.pcs, ...state.roster.allies, ...state.roster.archive]) normalizeCombatant(c);
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
  if (c.tempHp === undefined) c.tempHp = 0;
  if (c.notes === undefined) c.notes = '';
  if (c.creatureType === undefined) c.creatureType = '';
  if (c.cr === undefined) c.cr = '';
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

function textareaField(value, onChange, placeholder = '') {
  const textarea = el('textarea', { class: 'input', rows: '5', placeholder });
  textarea.value = value ?? '';
  textarea.addEventListener('input', () => onChange(textarea.value));
  return textarea;
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
