// Modalità Player: personaggi, calcoli derivati, inventario, equipaggiamento,
// sintonizzazione e magie assegnate.
import { el, ICON, uid } from '../util.js';
import { spellDetails } from './spells.js';

const ABILITIES = [
  ['strength', 'Forza', 'FOR'], ['dexterity', 'Destrezza', 'DES'], ['constitution', 'Costituzione', 'COS'],
  ['intelligence', 'Intelligenza', 'INT'], ['wisdom', 'Saggezza', 'SAG'], ['charisma', 'Carisma', 'CAR']
];
const SAVING_THROWS = ABILITIES.map(([key, label]) => [key, label]);
const SKILLS = [
  ['acrobatics', 'Acrobazia', 'dexterity'], ['animalHandling', 'Addestrare animali', 'wisdom'],
  ['arcana', 'Arcano', 'intelligence'], ['athletics', 'Atletica', 'strength'], ['deception', 'Inganno', 'charisma'],
  ['history', 'Storia', 'intelligence'], ['insight', 'Intuizione', 'wisdom'], ['intimidation', 'Intimidire', 'charisma'],
  ['investigation', 'Indagare', 'intelligence'], ['medicine', 'Medicina', 'wisdom'], ['nature', 'Natura', 'intelligence'],
  ['perception', 'Percezione', 'wisdom'], ['performance', 'Intrattenere', 'charisma'], ['persuasion', 'Persuasione', 'charisma'],
  ['religion', 'Religione', 'intelligence'], ['sleightOfHand', 'Rapidità di mano', 'dexterity'], ['stealth', 'Furtività', 'dexterity'],
  ['survival', 'Sopravvivenza', 'wisdom']
];
const PLAYER_COLORS = ['#8a5cf6', '#e05669', '#4bbf7b', '#c9a24b', '#4ca6d8', '#e879c9', '#f28f3b', '#7bd6c1'];
const ITEM_CATEGORIES = [
  ['item', 'Oggetto'], ['weapon', 'Arma'], ['armor', 'Armatura/scudo'], ['magic', 'Oggetto magico']
];

function randomPlayerColor() {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

export function normalizePlayerState(state) {
  if (!state.player || typeof state.player !== 'object') state.player = { activeId: null, characters: [] };
  if (!Array.isArray(state.player.characters)) state.player.characters = [];
  for (const character of state.player.characters) normalizeCharacter(character);
}

export function createPlayerCharacter(name = 'Nuovo personaggio') {
  return {
    id: uid(), name, color: randomPlayerColor(), playerName: '', level: 1, classes: '', species: '', background: '', alignment: '',
    stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    savingThrowProficiencies: [], skillProficiencies: [], skillExpertise: [], bonuses: { savingThrows: 0, skills: 0 },
    hpMax: 1, hpCurrent: 1, tempHp: 0, speed: 9, initiativeBonus: 0,
    perceptionProficient: false, perceptionExpertise: false, notes: '',
    inventory: [],
    attunement: { max: 3, itemIds: [] },
    spellbook: { knownSpellIds: [], preparedSpellIds: [], slots: createSpellSlots() }
  };
}

function createSpellSlots() {
  const slots = {};
  for (let level = 1; level <= 9; level += 1) slots[level] = { max: 0, used: 0 };
  return slots;
}

function normalizeCharacter(character) {
  const defaults = createPlayerCharacter(character.name || 'Nuovo personaggio');
  for (const key of ['id', 'name', 'color', 'playerName', 'level', 'classes', 'species', 'background', 'alignment', 'hpMax', 'hpCurrent', 'tempHp', 'speed', 'initiativeBonus', 'notes']) {
    if (character[key] === undefined) character[key] = defaults[key];
  }
  character.color = /^#[0-9a-f]{6}$/i.test(character.color) ? character.color : randomPlayerColor();
  character.level = Math.max(1, Number(character.level) || 1);
  character.stats = character.stats && typeof character.stats === 'object' ? character.stats : {};
  for (const [key] of ABILITIES) character.stats[key] = Number(character.stats[key]) || 10;
  character.savingThrowProficiencies = Array.isArray(character.savingThrowProficiencies) ? character.savingThrowProficiencies : [];
  character.skillProficiencies = Array.isArray(character.skillProficiencies) ? character.skillProficiencies : [];
  character.skillExpertise = Array.isArray(character.skillExpertise) ? character.skillExpertise : [];
  if (character.perceptionProficient && !character.skillProficiencies.includes('perception')) character.skillProficiencies.push('perception');
  if (character.perceptionExpertise && !character.skillExpertise.includes('perception')) character.skillExpertise.push('perception');
  character.bonuses = character.bonuses && typeof character.bonuses === 'object' ? character.bonuses : { savingThrows: 0, skills: 0 };
  character.bonuses.savingThrows = Number(character.bonuses.savingThrows) || 0;
  character.bonuses.skills = Number(character.bonuses.skills) || 0;
  character.inventory = Array.isArray(character.inventory) ? character.inventory : [];
  character.inventory.forEach(normalizeItem);
  character.attunement = character.attunement && typeof character.attunement === 'object' ? character.attunement : { max: 3, itemIds: [] };
  character.attunement.max = Number(character.attunement.max) || 3;
  character.attunement.itemIds = Array.isArray(character.attunement.itemIds) ? character.attunement.itemIds : [];
  character.spellbook = character.spellbook && typeof character.spellbook === 'object' ? character.spellbook : {};
  character.spellbook.knownSpellIds = Array.isArray(character.spellbook.knownSpellIds) ? character.spellbook.knownSpellIds : [];
  character.spellbook.preparedSpellIds = Array.isArray(character.spellbook.preparedSpellIds) ? character.spellbook.preparedSpellIds : [];
  character.spellbook.slots = character.spellbook.slots && typeof character.spellbook.slots === 'object' ? character.spellbook.slots : createSpellSlots();
  return character;
}

function createItem() {
  return {
    id: uid(), name: '', category: 'item', quantity: 1, weight: '', value: '', description: '',
    equipped: false, requiresAttunement: false, attuned: false, savingThrowBonus: 0, skillBonus: 0,
    attackBonus: '', damage: '', damageType: '', finesse: false,
    armorCategory: 'light', armorBase: '', maxDexBonus: '', shieldBonus: ''
  };
}

function normalizeItem(item) {
  const defaults = createItem();
  for (const key of Object.keys(defaults)) if (item[key] === undefined) item[key] = defaults[key];
  if (!item.id) item.id = uid();
  item.quantity = Math.max(1, Number(item.quantity) || 1);
  return item;
}

export function calculateDerived(character) {
  const mod = (key) => Math.floor((Number(character.stats[key]) - 10) / 2);
  const proficiency = 2 + Math.floor((Math.max(1, Number(character.level) || 1) - 1) / 4);
  const equippedItems = character.inventory.filter((item) => item.equipped);
  const savingThrowBonus = (Number(character.bonuses.savingThrows) || 0) + equippedItems.reduce((sum, item) => sum + (Number(item.savingThrowBonus) || 0), 0);
  const skillBonus = (Number(character.bonuses.skills) || 0) + equippedItems.reduce((sum, item) => sum + (Number(item.skillBonus) || 0), 0);
  const armor = character.inventory.find((item) => item.equipped && item.category === 'armor' && item.armorCategory !== 'shield');
  const shield = character.inventory.find((item) => item.equipped && item.category === 'armor' && item.armorCategory === 'shield');
  const dexterity = mod('dexterity');
  const dexterityPart = armor?.armorCategory === 'heavy'
    ? 0
    : Math.min(dexterity, armor?.maxDexBonus === '' ? dexterity : Number(armor?.maxDexBonus ?? dexterity));
  const baseArmor = armor ? Number(armor.armorBase) || 10 : 10;
  const shieldBonus = shield ? Number(shield.shieldBonus) || 0 : 0;
  const savingThrows = Object.fromEntries(SAVING_THROWS.map(([key]) => [
    key, mod(key) + (character.savingThrowProficiencies.includes(key) ? proficiency : 0) + savingThrowBonus
  ]));
  const skills = Object.fromEntries(SKILLS.map(([key, , ability]) => [
    key,
    mod(ability) + (character.skillExpertise.includes(key) ? proficiency * 2 : character.skillProficiencies.includes(key) ? proficiency : 0) + skillBonus
  ]));
  return {
    modifiers: Object.fromEntries(ABILITIES.map(([key]) => [key, mod(key)])),
    proficiency,
    savingThrows,
    skills,
    savingThrowBonus,
    skillBonus,
    armorClass: baseArmor + dexterityPart + shieldBonus,
    initiative: dexterity + (Number(character.initiativeBonus) || 0),
    passivePerception: 10 + mod('wisdom') + (character.skillProficiencies.includes('perception') ? proficiency : 0) + (character.skillExpertise.includes('perception') ? proficiency : 0) + skillBonus
  };
}

export function renderPlayer(root, api) {
  const { state } = api;
  normalizePlayerState(state);
  root.innerHTML = '';
  const add = el('button', { class: 'btn primary', type: 'button', html: ICON.plus + '<span>Nuovo personaggio</span>' });
  add.addEventListener('click', () => openCharacterEditor(createPlayerCharacter(), api, root, true));
  root.appendChild(el('div', { class: 'row', style: 'margin-bottom:10px' }, [el('div', { class: 'grow' }), add]));

  if (!state.player.characters.length) {
    root.appendChild(el('div', { class: 'empty' }, [
      el('div', { html: ICON.sparkle }),
      el('div', { text: 'Nessun personaggio Player.' }),
      el('div', { class: 'muted', text: 'Crea la prima scheda personaggio per iniziare.' })
    ]));
    return;
  }
  for (const character of state.player.characters) root.appendChild(characterCard(character));

  function characterCard(character) {
    const derived = calculateDerived(character);
    const card = el('article', { class: 'card player-card' });
    card.style.setProperty('--player-color', character.color);
    const colorDot = el('span', { class: 'player-color-dot', title: `Colore di ${character.name}`, style: `background:${character.color}` });
    const open = el('button', { class: 'player-card-main', type: 'button' }, [
      el('div', { class: 'player-card-title' }, [colorDot, el('strong', { text: character.name }), el('span', { class: 'badge', text: `Livello ${character.level}` })]),
      el('div', { class: 'muted', text: [character.species, character.classes].filter(Boolean).join(' · ') || 'Scheda da completare' }),
      el('div', { class: 'derived-grid compact' }, [
        derivedStat('CA', derived.armorClass), derivedStat('PF', `${character.hpCurrent}/${character.hpMax}`),
        derivedStat('Iniziativa', signed(derived.initiative)), derivedStat('Percezione', derived.passivePerception),
        derivedStat('Inventario', character.inventory.length), derivedStat('Magie', character.spellbook.knownSpellIds.length)
      ])
    ]);
    open.addEventListener('click', () => openCharacterEditor(character, api, root, false));
    const remove = el('button', { class: 'dot-btn', type: 'button', title: 'Elimina personaggio', html: ICON.trash });
    remove.addEventListener('click', () => {
      if (!confirm(`Eliminare la scheda di "${character.name}"?`)) return;
      state.player.characters = state.player.characters.filter((item) => item.id !== character.id);
      if (state.player.activeId === character.id) state.player.activeId = null;
      api.save();
      renderPlayer(root, api);
    });
    card.append(open, remove);
    return card;
  }
}

function openCharacterEditor(character, api, root, isNew) {
  normalizeCharacter(character);
  const body = el('div', {});
  const save = () => { normalizeCharacter(character); api.save(); api.refresh('player'); };
  const name = textInput('Nome personaggio *', character.name, 'es. Arannis');
  const playerName = textInput('Nome giocatore', character.playerName, 'Nome del giocatore');
  const level = numberInput('Livello', character.level, 1);
  const classes = textInput('Classe/i', character.classes, 'es. Mago 5 / Guerriero 2');
  const species = textInput('Specie', character.species, 'es. Elfo');
  const background = textInput('Background', character.background, 'es. Sapiente');
  const alignment = textInput('Allineamento', character.alignment, 'Opzionale');
  const color = el('input', { class: 'input color-input', type: 'color', value: character.color });
  color.addEventListener('input', () => { character.color = color.value; save(); });
  body.append(name.field, playerName.field, level.field, classes.field, species.field, background.field, alignment.field, field('Colore identificativo', color));
  for (const [control, key] of [[name.input, 'name'], [playerName.input, 'playerName'], [classes.input, 'classes'], [species.input, 'species'], [background.input, 'background'], [alignment.input, 'alignment']]) {
    control.addEventListener('input', () => { character[key] = control.value; save(); });
  }
  level.input.addEventListener('input', () => { character.level = Math.max(1, Number(level.input.value) || 1); updateDerived(); });
  const statGrid = el('div', { class: 'player-stat-grid' });
  for (const [key, label, abbr] of ABILITIES) {
    const input = numberInput(abbr, character.stats[key], 0);
    input.input.addEventListener('input', () => { character.stats[key] = Number(input.input.value) || 0; updateDerived(); });
    statGrid.appendChild(input.field);
  }
  body.appendChild(statGrid);

  const derivedBox = el('div', { class: 'card derived-card' });
  const derivedValues = el('div', { class: 'derived-grid' });
  const updateDerived = () => {
    const d = calculateDerived(character);
    derivedValues.innerHTML = '';
    derivedValues.append(derivedStat('Bonus competenza', `+${d.proficiency}`), derivedStat('CA calcolata', d.armorClass), derivedStat('Iniziativa', signed(d.initiative)), derivedStat('Percezione passiva', d.passivePerception));
    save();
  };
  derivedBox.append(el('div', { class: 'mini-title', text: 'Calcolati' }), derivedValues);
  body.appendChild(derivedBox);
  body.appendChild(savingThrowsSection(character, updateDerived));
  body.appendChild(skillsSection(character, updateDerived));

  const combatGrid = el('div', { class: 'stat-grid' });
  for (const [key, label] of [['hpMax', 'PF massimi'], ['hpCurrent', 'PF attuali'], ['tempHp', 'PF temporanei'], ['speed', 'Velocità'], ['initiativeBonus', 'Bonus iniziativa']]) {
    const input = numberInput(label, character[key], 0);
    input.input.addEventListener('input', () => { character[key] = Number(input.input.value) || 0; save(); });
    combatGrid.appendChild(input.field);
  }
  body.appendChild(combatGrid);
  const bonusGrid = el('div', { class: 'stat-grid' });
  for (const [key, label] of [['savingThrows', 'Bonus TS temporaneo'], ['skills', 'Bonus abilità temporaneo']]) {
    const input = numberInput(label, character.bonuses[key], 0);
    input.input.addEventListener('input', () => { character.bonuses[key] = Number(input.input.value) || 0; updateDerived(); });
    bonusGrid.appendChild(input.field);
  }
  body.appendChild(bonusGrid);
  const notes = textareaInput('Note personaggio', character.notes, 'Talenti, tratti, obiettivi…');
  notes.input.addEventListener('input', () => { character.notes = notes.input.value; save(); });
  body.appendChild(notes.field);

  body.appendChild(inventorySection(character, api, root));
  body.appendChild(spellbookSection(character, api, root));

  const remove = el('button', { class: 'btn danger block', type: 'button', style: 'margin-top:20px', html: ICON.trash + '<span>Elimina personaggio</span>' });
  remove.addEventListener('click', () => {
    if (!confirm(`Eliminare la scheda di "${character.name}"?`)) return;
    api.state.player.characters = api.state.player.characters.filter((item) => item.id !== character.id);
    api.state.player.activeId = null;
    api.save(); api.closeDrawer(); api.refresh('player');
  });
  body.appendChild(remove);
  api.state.player.activeId = character.id;
  if (isNew && !api.state.player.characters.includes(character)) api.state.player.characters.push(character);
  api.save();
  api.openDrawer(isNew ? 'Nuovo personaggio' : `Scheda: ${character.name}`, body);
  updateDerived();
}

function savingThrowsSection(character, onChange) {
  const section = el('section', { class: 'player-section' });
  section.appendChild(el('div', { class: 'mini-title', text: 'Tiri salvezza calcolati' }));
  const list = el('div', { class: 'derived-list' });
  const redraw = () => {
    const derived = calculateDerived(character).savingThrows;
    list.innerHTML = '';
    for (const [key, label] of SAVING_THROWS) {
      const row = el('div', { class: 'proficiency-row' });
      const checkbox = el('input', { type: 'checkbox' });
      checkbox.checked = character.savingThrowProficiencies.includes(key);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) character.savingThrowProficiencies.push(key);
        else character.savingThrowProficiencies = character.savingThrowProficiencies.filter((item) => item !== key);
        redraw(); onChange();
      });
      row.append(el('label', { class: 'checkline compact-check' }, [checkbox, document.createTextNode(label)]), el('strong', { text: signed(derived[key]) }));
      list.appendChild(row);
    }
  };
  redraw(); section.appendChild(list); return section;
}

function skillsSection(character, onChange) {
  const section = el('section', { class: 'player-section' });
  section.appendChild(el('div', { class: 'mini-title', text: 'Abilità calcolate' }));
  const list = el('div', { class: 'derived-list' });
  const redraw = () => {
    const derived = calculateDerived(character).skills;
    list.innerHTML = '';
    for (const [key, label] of SKILLS) {
      const row = el('div', { class: 'proficiency-row skill-row' });
      const proficient = el('input', { type: 'checkbox' });
      const expertise = el('input', { type: 'checkbox' });
      proficient.checked = character.skillProficiencies.includes(key);
      expertise.checked = character.skillExpertise.includes(key);
      expertise.disabled = !proficient.checked;
      proficient.addEventListener('change', () => {
        if (proficient.checked) character.skillProficiencies.push(key);
        else {
          character.skillProficiencies = character.skillProficiencies.filter((item) => item !== key);
          character.skillExpertise = character.skillExpertise.filter((item) => item !== key);
        }
        redraw(); onChange();
      });
      expertise.addEventListener('change', () => {
        if (expertise.checked) character.skillExpertise.push(key);
        else character.skillExpertise = character.skillExpertise.filter((item) => item !== key);
        redraw(); onChange();
      });
      row.append(
        el('span', { class: 'skill-label', text: label }),
        el('label', { class: 'checkline compact-check' }, [proficient, document.createTextNode('Comp.')]),
        el('label', { class: 'checkline compact-check' }, [expertise, document.createTextNode('Doppia')]),
        el('strong', { text: signed(derived[key]) })
      );
      list.appendChild(row);
    }
  };
  redraw(); section.appendChild(list); return section;
}

function inventorySection(character, api, root) {
  const section = el('section', { class: 'player-section' });
  const header = el('div', { class: 'row' }, [el('div', { class: 'mini-title grow', text: 'Inventario ed equipaggiamento' })]);
  const add = el('button', { class: 'btn sm primary', type: 'button', html: ICON.plus + '<span>Aggiungi oggetto</span>' });
  add.addEventListener('click', () => openItemEditor(character, createItem(), api, root, true));
  header.appendChild(add); section.appendChild(header);
  const list = el('div', {}); section.appendChild(list);
  const redraw = () => {
    list.innerHTML = '';
    if (!character.inventory.length) { list.appendChild(el('div', { class: 'muted', style: 'font-size:13px', text: 'Inventario vuoto.' })); return; }
    for (const item of character.inventory) {
      const row = el('div', { class: `inventory-row${item.equipped ? ' equipped' : ''}` });
      const open = el('button', { class: 'inventory-name', type: 'button' }, [el('strong', { text: item.name || 'Oggetto senza nome' }), el('span', { class: 'muted', text: `${item.category} · x${item.quantity}` })]);
      open.addEventListener('click', () => openItemEditor(character, item, api, root, false));
      row.appendChild(open);
      const equipped = el('label', { class: 'checkline compact-check' });
      const equipCheck = el('input', { type: 'checkbox' }); equipCheck.checked = Boolean(item.equipped);
      equipCheck.addEventListener('change', () => { item.equipped = equipCheck.checked; api.save(); redraw(); });
      equipped.append(equipCheck, document.createTextNode('Equip.')); row.appendChild(equipped);
      if (item.requiresAttunement) {
        const attune = el('label', { class: 'checkline compact-check' });
        const attuneCheck = el('input', { type: 'checkbox' }); attuneCheck.checked = Boolean(item.attuned);
        attuneCheck.addEventListener('change', () => {
          if (attuneCheck.checked && character.attunement.itemIds.filter((id) => id !== item.id).length >= character.attunement.max) {
            attuneCheck.checked = false; api.toast(`Sintonizzazione massima: ${character.attunement.max}`); return;
          }
          item.attuned = attuneCheck.checked;
          character.attunement.itemIds = character.inventory.filter((x) => x.attuned).map((x) => x.id);
          api.save(); redraw();
        });
        attune.append(attuneCheck, document.createTextNode('Sint.')); row.appendChild(attune);
      }
      list.appendChild(row);
    }
  };
  redraw(); return section;
}

function spellbookSection(character, api, root) {
  const section = el('section', { class: 'player-section' });
  section.appendChild(el('div', { class: 'mini-title', text: `Magie assegnate (${character.spellbook.knownSpellIds.length})` }));
  const list = el('div', {});
  for (const spellId of character.spellbook.knownSpellIds) {
    const spell = api.state.spells.find((item) => item.id === spellId);
    if (!spell) continue;
    const row = el('div', { class: 'inventory-row' });
    const name = el('button', { class: 'inventory-name', type: 'button', text: spell.name });
    name.addEventListener('click', () => api.openDrawer(spell.name, spellDetails(spell)));
    const prep = el('label', { class: 'checkline compact-check' });
    const check = el('input', { type: 'checkbox' }); check.checked = character.spellbook.preparedSpellIds.includes(spellId);
    check.addEventListener('change', () => { if (check.checked) character.spellbook.preparedSpellIds.push(spellId); else character.spellbook.preparedSpellIds = character.spellbook.preparedSpellIds.filter((id) => id !== spellId); api.save(); });
    prep.append(check, document.createTextNode('Preparata')); row.append(name, prep); list.appendChild(row);
  }
  if (!list.children.length) list.appendChild(el('div', { class: 'muted', style: 'font-size:13px', text: 'Nessuna magia assegnata. Usa Assegna nella sezione Magie.' }));
  section.appendChild(list); return section;
}

function openItemEditor(character, item, api, root, isNew) {
  normalizeItem(item);
  const body = el('div', {});
  const name = textInput('Nome oggetto *', item.name, 'es. Spada lunga +1');
  const category = el('select', { class: 'input' });
  for (const [value, label] of ITEM_CATEGORIES) category.appendChild(el('option', { value, text: label })); category.value = item.category;
  const quantity = numberInput('Quantità', item.quantity, 1);
  const weight = textInput('Peso', item.weight, 'es. 1,5 kg');
  const value = textInput('Valore', item.value, 'es. 50 mo');
  const description = textareaInput('Descrizione', item.description, 'Dettagli dell’oggetto…');
  body.append(name.field, field('Categoria', category), quantity.field, weight.field, value.field, description.field);
  const equipped = checkboxField('Equipaggiato', item.equipped);
  const requires = checkboxField('Richiede sintonizzazione', item.requiresAttunement);
  const attuned = checkboxField('Sintonizzato', item.attuned);
  const savingThrowBonus = numberInput('Bonus a tutti i TS', item.savingThrowBonus, 0);
  body.append(equipped.field, requires.field, attuned.field, savingThrowBonus.field);
  const weapon = textInput('Danno arma', item.damage, 'es. 1d8');
  const damageType = textInput('Tipo danno', item.damageType, 'es. tagliente');
  const attackBonus = textInput('Bonus attacco', item.attackBonus, 'es. +5');
  const finesse = checkboxField('Accuratezza', item.finesse);
  const armorCategory = el('select', { class: 'input' });
  for (const [v, l] of [['light','Leggera'],['medium','Media'],['heavy','Pesante'],['shield','Scudo']]) armorCategory.appendChild(el('option', { value: v, text: l })); armorCategory.value = item.armorCategory;
  const armorBase = numberInput('CA armatura', item.armorBase, 0);
  const maxDex = numberInput('Massimo bonus DES', item.maxDexBonus === '' ? 99 : item.maxDexBonus, 0);
  const shieldBonus = numberInput('Bonus scudo', item.shieldBonus, 0);
  body.append(field('Dati arma', weapon.field), damageType.field, attackBonus.field, finesse.field, field('Categoria armatura', armorCategory), armorBase.field, maxDex.field, shieldBonus.field);
  const saveButton = el('button', { class: 'btn primary block', type: 'button', style: 'margin-top:12px', text: isNew ? 'Aggiungi oggetto' : 'Salva oggetto' });
  saveButton.addEventListener('click', () => {
    if (!name.input.value.trim()) { api.toast('Il nome dell’oggetto è obbligatorio.'); return; }
    item.name = name.input.value.trim(); item.category = category.value; item.quantity = Number(quantity.input.value) || 1;
    item.weight = weight.input.value.trim(); item.value = value.input.value.trim(); item.description = description.input.value;
    item.equipped = equipped.input.checked; item.requiresAttunement = requires.input.checked; item.attuned = item.requiresAttunement && attuned.input.checked; item.savingThrowBonus = Number(savingThrowBonus.input.value) || 0;
    item.damage = weapon.input.value.trim(); item.damageType = damageType.input.value.trim(); item.attackBonus = attackBonus.input.value.trim(); item.finesse = finesse.input.checked;
    item.armorCategory = armorCategory.value; item.armorBase = Number(armorBase.input.value) || ''; item.maxDexBonus = Number(maxDex.input.value) || ''; item.shieldBonus = Number(shieldBonus.input.value) || '';
    if (item.attuned && character.attunement.itemIds.filter((id) => id !== item.id).length >= character.attunement.max) { api.toast(`Sintonizzazione massima: ${character.attunement.max}`); return; }
    if (isNew) character.inventory.push(item);
    character.attunement.itemIds = character.inventory.filter((x) => x.attuned).map((x) => x.id);
    api.save(); api.closeDrawer(); api.refresh('player');
  });
  body.appendChild(saveButton);
  if (!isNew) {
    const remove = el('button', { class: 'btn danger block', type: 'button', style: 'margin-top:10px', html: ICON.trash + '<span>Rimuovi oggetto</span>' });
    remove.addEventListener('click', () => {
      if (!confirm(`Rimuovere "${item.name}" dall’inventario?`)) return;
      character.inventory = character.inventory.filter((entry) => entry.id !== item.id);
      character.attunement.itemIds = character.inventory.filter((entry) => entry.attuned).map((entry) => entry.id);
      api.save(); api.closeDrawer(); api.refresh('player');
    });
    body.appendChild(remove);
  }
  api.openDrawer(isNew ? 'Nuovo oggetto' : `Oggetto: ${item.name}`, body);
}

function textInput(label, value, placeholder) { const input = el('input', { class: 'input', type: 'text', placeholder }); input.value = value ?? ''; return { input, field: field(label, input) }; }
function textareaInput(label, value, placeholder) { const input = el('textarea', { class: 'input', rows: '4', placeholder }); input.value = value ?? ''; return { input, field: field(label, input) }; }
function numberInput(label, value, min = 0) { const input = el('input', { class: 'input', type: 'number', min: String(min) }); input.value = value ?? ''; return { input, field: field(label, input) }; }
function checkboxField(label, value) { const input = el('input', { type: 'checkbox' }); input.checked = Boolean(value); return { input, field: el('label', { class: 'checkline' }, [input, document.createTextNode(label)]) }; }
function field(label, control) { return el('div', { class: 'field' }, [el('label', { text: label }), control]); }
function derivedStat(label, value) { return el('div', { class: 'derived-stat' }, [el('span', { text: label }), el('strong', { text: String(value) })]); }
function signed(value) { return Number(value) >= 0 ? `+${value}` : String(value); }
