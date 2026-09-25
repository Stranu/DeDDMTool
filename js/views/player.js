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
const ITEM_PRESETS = [
  ['lightArmor', 'Armatura leggera', { category: 'armor', armorCategory: 'light', armorBase: 11, maxDexBonus: '' }],
  ['mediumArmor', 'Armatura media', { category: 'armor', armorCategory: 'medium', armorBase: 14, maxDexBonus: 2 }],
  ['heavyArmor', 'Armatura pesante', { category: 'armor', armorCategory: 'heavy', armorBase: 16, maxDexBonus: 0 }],
  ['shield', 'Scudo', { category: 'armor', armorCategory: 'shield', shieldBonus: 2 }],
  ['weapon', 'Arma semplice', { category: 'weapon', damage: '1d8', damageType: 'tagliente', weaponAbility: 'strength' }],
  ['potion', 'Pozione', { category: 'magic', description: 'Effetto della pozione…' }]
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
    spellbook: { castingAbility: '', knownSpellIds: [], preparedSpellIds: [], slots: createSpellSlots() }
  };
}

function createSpellSlots() {
  const slots = {};
  for (let level = 1; level <= 9; level += 1) slots[level] = { max: 0, used: 0 };
  return slots;
}

function normalizeSlotValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function isAbilityKey(value) {
  return ABILITIES.some(([key]) => key === value);
}

function abilityLabel(key) {
  return ABILITIES.find(([value]) => value === key)?.[1] || 'Non impostata';
}

function spellValue(value, signedValue = false) {
  if (value == null) return '—';
  return signedValue ? signed(value) : String(value);
}

function requiresConcentration(spell) {
  return /\b(?:concentrazione|concentration)\b/i.test(spell.duration || '');
}

function spellSummaryMetadata(spell) {
  return [spell.castingTime, spell.range, requiresConcentration(spell) ? 'C' : ''].filter(Boolean).join(' · ') || 'Dettagli non disponibili';
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
  const attunementMax = Number(character.attunement.max);
  character.attunement.max = Number.isFinite(attunementMax) ? Math.max(0, Math.floor(attunementMax)) : 3;
  syncAttunement(character);
  character.spellbook = character.spellbook && typeof character.spellbook === 'object' ? character.spellbook : {};
  character.spellbook.castingAbility = isAbilityKey(character.spellbook.castingAbility) ? character.spellbook.castingAbility : '';
  character.spellbook.knownSpellIds = Array.isArray(character.spellbook.knownSpellIds) ? character.spellbook.knownSpellIds : [];
  character.spellbook.preparedSpellIds = Array.isArray(character.spellbook.preparedSpellIds) ? character.spellbook.preparedSpellIds : [];
  const storedSlots = character.spellbook.slots && typeof character.spellbook.slots === 'object' ? character.spellbook.slots : {};
  character.spellbook.slots = createSpellSlots();
  for (let level = 1; level <= 9; level += 1) {
    const stored = storedSlots[level] && typeof storedSlots[level] === 'object' ? storedSlots[level] : {};
    const max = normalizeSlotValue(stored.max);
    character.spellbook.slots[level] = {
      max,
      used: Math.min(max, normalizeSlotValue(stored.used))
    };
  }
  return character;
}

function createItem() {
  return {
    id: uid(), name: '', category: 'item', quantity: 1, weight: '', value: '', description: '',
    equipped: false, requiresAttunement: false, attuned: false, savingThrowBonus: 0, skillBonus: 0,
    attackBonus: '', damage: '', damageType: '', damageBonus: 0, weaponAbility: 'strength', finesse: false,
    armorCategory: 'light', armorBase: '', maxDexBonus: '', shieldBonus: ''
  };
}

function optionalNumber(value) {
  if (value === '' || value == null) return '';
  const number = Number(value);
  return Number.isFinite(number) ? number : '';
}

function numericValue(input, fallback = 0) {
  const number = Number(input.value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeItem(item) {
  const defaults = createItem();
  for (const key of Object.keys(defaults)) if (item[key] === undefined) item[key] = defaults[key];
  if (!item.id) item.id = uid();
  item.category = ITEM_CATEGORIES.some(([value]) => value === item.category) ? item.category : 'item';
  item.quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
  item.equipped = Boolean(item.equipped);
  item.requiresAttunement = Boolean(item.requiresAttunement);
  item.attuned = item.requiresAttunement && Boolean(item.attuned);
  item.finesse = Boolean(item.finesse);
  item.weaponAbility = isAbilityKey(item.weaponAbility) ? item.weaponAbility : 'strength';
  item.armorCategory = ['light', 'medium', 'heavy', 'shield'].includes(item.armorCategory) ? item.armorCategory : 'light';
  item.savingThrowBonus = optionalNumber(item.savingThrowBonus) || 0;
  item.skillBonus = optionalNumber(item.skillBonus) || 0;
  item.damageBonus = optionalNumber(item.damageBonus) || 0;
  item.attackBonus = optionalNumber(item.attackBonus);
  item.armorBase = optionalNumber(item.armorBase);
  item.maxDexBonus = optionalNumber(item.maxDexBonus);
  item.shieldBonus = optionalNumber(item.shieldBonus);
  return item;
}

function itemCategoryLabel(category) {
  return ITEM_CATEGORIES.find(([value]) => value === category)?.[1] || 'Oggetto';
}

function armorItemSummary(item) {
  if (item.category !== 'armor') return '';
  if (item.armorCategory === 'shield') return item.shieldBonus !== '' ? `Scudo ${signed(item.shieldBonus)}` : '';
  return item.armorBase !== '' ? `CA base ${item.armorBase}` : '';
}

function itemInlineSummary(item, character) {
  const values = [];
  const armor = armorItemSummary(item);
  if (armor) values.push(armor);
  if (item.savingThrowBonus) values.push(`TS ${signed(item.savingThrowBonus)}`);
  if (item.skillBonus) values.push(`Abilità ${signed(item.skillBonus)}`);
  if (item.category === 'weapon') values.push(weaponSummary(item, character));
  if (!values.length && item.quantity > 1) values.push(`Quantità ${item.quantity}`);
  return values.join(' · ') || itemCategoryLabel(item.category);
}

function itemEffectsActive(item) {
  return item.equipped && (!item.requiresAttunement || item.attuned);
}

function equipmentWarning(character) {
  const armorCount = character.inventory.filter((item) => itemEffectsActive(item) && item.category === 'armor' && item.armorCategory !== 'shield').length;
  const shieldCount = character.inventory.filter((item) => itemEffectsActive(item) && item.category === 'armor' && item.armorCategory === 'shield').length;
  if (armorCount > 1 || shieldCount > 1) {
    const parts = [];
    if (armorCount > 1) parts.push(`${armorCount} armature`);
    if (shieldCount > 1) parts.push(`${shieldCount} scudi`);
    return el('div', { class: 'equipment-warning', role: 'status', text: `Attenzione: ${parts.join(' e ')} attivi. La CA usa il primo elemento di ogni tipo.` });
  }
  return null;
}

export function calculateDerived(character) {
  const mod = (key) => Math.floor((Number(character.stats[key]) - 10) / 2);
  const proficiency = 2 + Math.floor((Math.max(1, Number(character.level) || 1) - 1) / 4);
  const equippedItems = character.inventory.filter(itemEffectsActive);
  const savingThrowBonus = (Number(character.bonuses.savingThrows) || 0) + equippedItems.reduce((sum, item) => sum + (Number(item.savingThrowBonus) || 0), 0);
  const skillBonus = (Number(character.bonuses.skills) || 0) + equippedItems.reduce((sum, item) => sum + (Number(item.skillBonus) || 0), 0);
  const armor = character.inventory.find((item) => itemEffectsActive(item) && item.category === 'armor' && item.armorCategory !== 'shield');
  const shield = character.inventory.find((item) => itemEffectsActive(item) && item.category === 'armor' && item.armorCategory === 'shield');
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
  const modifiers = Object.fromEntries(ABILITIES.map(([key]) => [key, mod(key)]));
  const castingAbility = isAbilityKey(character.spellbook?.castingAbility) ? character.spellbook.castingAbility : '';
  const spellcastingModifier = castingAbility ? modifiers[castingAbility] : null;
  return {
    modifiers,
    proficiency,
    spellcastingModifier,
    spellSaveDc: spellcastingModifier == null ? null : 8 + proficiency + spellcastingModifier,
    spellAttackBonus: spellcastingModifier == null ? null : proficiency + spellcastingModifier,
    savingThrows,
    skills,
    savingThrowBonus,
    skillBonus,
    armorClass: baseArmor + dexterityPart + shieldBonus,
    initiativeBonus: dexterity + (Number(character.initiativeBonus) || 0),
    passivePerception: 10 + mod('wisdom') + (character.skillProficiencies.includes('perception') ? proficiency : 0) + (character.skillExpertise.includes('perception') ? proficiency : 0) + skillBonus
  };
}

export function renderPlayer(root, api) {
  const { state } = api;
  normalizePlayerState(state);
  root.innerHTML = '';
  const add = el('button', { class: 'btn primary', type: 'button', html: ICON.plus + '<span>Nuovo personaggio</span>' });
  add.addEventListener('click', () => openCharacterEditor(createPlayerCharacter(), api, root, true, { inline: true }));
  root.appendChild(el('div', { class: 'row', style: 'margin-bottom:10px' }, [el('div', { class: 'grow' }), add]));

  if (!state.player.characters.length) {
    root.appendChild(el('div', { class: 'empty' }, [
      el('div', { html: ICON.sparkle }),
      el('strong', { text: 'Nessun personaggio Player.' }),
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
        derivedStat('Bonus iniziativa', signed(derived.initiativeBonus)), derivedStat('Percezione', derived.passivePerception),
        derivedStat('Inventario', character.inventory.length), derivedStat('Magie', character.spellbook.knownSpellIds.length)
      ])
    ]);
    open.addEventListener('click', () => openCharacterView(character, api, root));
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

export function renderInventory(root, api) {
  normalizePlayerState(api.state);
  root.innerHTML = '';
  const characters = api.state.player.characters;
  if (!characters.length) {
    root.appendChild(el('div', { class: 'empty', text: 'Crea prima un personaggio nella sezione Personaggi.' }));
    return;
  }
  const select = el('select', { class: 'input', 'aria-label': 'Seleziona personaggio' });
  for (const character of characters) select.appendChild(el('option', { value: character.id, text: character.name }));
  select.value = api.state.player.activeId && characters.some((character) => character.id === api.state.player.activeId)
    ? api.state.player.activeId : characters[0].id;
  api.state.player.activeId = select.value;
  const search = el('input', { class: 'input', type: 'search', placeholder: 'Cerca oggetto…', 'aria-label': 'Cerca oggetto' });
  const categoryFilter = el('select', { class: 'input', 'aria-label': 'Filtra per categoria' }, [el('option', { value: '', text: 'Tutte le categorie' })]);
  for (const [value, label] of ITEM_CATEGORIES) categoryFilter.appendChild(el('option', { value, text: label }));
  const statusFilter = el('select', { class: 'input', 'aria-label': 'Filtra per stato' }, [
    el('option', { value: '', text: 'Tutti gli stati' }),
    el('option', { value: 'equipped', text: 'Equipaggiati' }),
    el('option', { value: 'carried', text: 'Non equipaggiati' }),
    el('option', { value: 'attuned', text: 'Sintonizzati' }),
    el('option', { value: 'requiresAttunement', text: 'Richiedono sintonia' })
  ]);
  const sort = el('select', { class: 'input', 'aria-label': 'Ordina inventario' }, [
    el('option', { value: 'name', text: 'Nome A-Z' }),
    el('option', { value: 'category', text: 'Categoria' }),
    el('option', { value: 'weight', text: 'Peso' })
  ]);
  root.appendChild(el('div', { class: 'inventory-toolbar' }, [el('div', { class: 'grow' }, [select]), search, categoryFilter, statusFilter, sort]));
  const content = el('div', {}); root.appendChild(content);

  const matchesFilters = (item) => {
    const query = search.value.trim().toLocaleLowerCase('it');
    if (query && ![item.name, item.description, itemCategoryLabel(item.category)].join(' ').toLocaleLowerCase('it').includes(query)) return false;
    if (categoryFilter.value && item.category !== categoryFilter.value) return false;
    if (statusFilter.value === 'equipped' && !item.equipped) return false;
    if (statusFilter.value === 'carried' && item.equipped) return false;
    if (statusFilter.value === 'attuned' && !item.attuned) return false;
    if (statusFilter.value === 'requiresAttunement' && !item.requiresAttunement) return false;
    return true;
  };
  const sortItems = (items) => items.sort((a, b) => {
    if (sort.value === 'category') return itemCategoryLabel(a.category).localeCompare(itemCategoryLabel(b.category), 'it') || a.name.localeCompare(b.name, 'it');
    if (sort.value === 'weight') return String(a.weight || '').localeCompare(String(b.weight || ''), 'it') || a.name.localeCompare(b.name, 'it');
    return a.name.localeCompare(b.name, 'it');
  });
  const draw = () => {
    const character = characters.find((item) => item.id === select.value) || characters[0];
    api.state.player.activeId = character.id;
    content.innerHTML = '';
    content.appendChild(el('div', { class: 'player-hero', style: `--player-color:${character.color}` }, [
      el('span', { class: 'player-color-dot large' }),
      el('div', { class: 'grow' }, [el('h2', { text: character.name }), el('div', { class: 'muted', text: 'Inventario ed equipaggiamento' })])
    ]));
    const warning = equipmentWarning(character);
    if (warning) content.appendChild(warning);
    const visible = character.inventory.filter(matchesFilters);
    content.appendChild(el('div', { class: 'result-count', text: `${visible.length} oggett${visible.length === 1 ? 'o' : 'i'}` }));
    for (const [category, label] of ITEM_CATEGORIES) {
      const items = sortItems(visible.filter((item) => item.category === category));
      if (!items.length && (search.value || categoryFilter.value || statusFilter.value)) continue;
      const section = el('section', { class: 'inventory-category' });
      section.appendChild(el('div', { class: 'mini-title', text: `${label} (${items.length})` }));
      if (!items.length) section.appendChild(el('div', { class: 'muted', style: 'font-size:13px', text: 'Nessun oggetto.' }));
      for (const item of items) {
        const row = el('div', { class: `inventory-row${item.equipped ? ' equipped' : ''}` });
        const open = el('button', { class: 'inventory-name', type: 'button' }, [
          el('strong', { text: item.name || 'Oggetto senza nome' }),
          el('span', { class: 'muted', text: itemInlineSummary(item, character) })
        ]);
        open.addEventListener('click', () => openItemDetails(character, item, api, root, 'inventory'));
        row.appendChild(open);
        const quantity = el('div', { class: 'quantity-controls', title: 'Quantità' });
        const minusQuantity = el('button', { class: 'quantity-adjust', type: 'button', text: '−', 'aria-label': `Riduci quantità di ${item.name}` });
        const quantityValue = el('strong', { text: `x${item.quantity}` });
        const plusQuantity = el('button', { class: 'quantity-adjust', type: 'button', text: '+', 'aria-label': `Aumenta quantità di ${item.name}` });
        minusQuantity.disabled = item.quantity <= 1;
        minusQuantity.addEventListener('click', () => { item.quantity = Math.max(1, item.quantity - 1); api.save(); draw(); });
        plusQuantity.addEventListener('click', () => { item.quantity += 1; api.save(); draw(); });
        quantity.append(minusQuantity, quantityValue, plusQuantity);
        row.appendChild(quantity);
        const equip = el('button', { class: `chip${item.equipped ? ' on' : ''}`, type: 'button', text: item.equipped ? 'Equipaggiato' : 'Equipaggia' });
        equip.addEventListener('click', () => { item.equipped = !item.equipped; api.save(); draw(); });
        row.appendChild(equip);
        if (item.requiresAttunement) {
          const attune = el('label', { class: 'checkline compact-check' });
          const attuneCheck = el('input', { type: 'checkbox' }); attuneCheck.checked = item.attuned;
          attuneCheck.addEventListener('change', () => toggleAttunement(character, item, attuneCheck, api, draw));
          attune.append(attuneCheck, document.createTextNode('Sint.')); row.appendChild(attune);
        }
        const duplicate = el('button', { class: 'chip ghost', type: 'button', text: 'Duplica' });
        duplicate.addEventListener('click', () => { duplicateItem(character, item); api.save(); draw(); });
        row.appendChild(duplicate);
        if (item.requiresAttunement) row.appendChild(el('span', { class: `badge${item.attuned ? ' cond' : ''}`, text: item.attuned ? 'Sintonizzato' : 'Richiede sintonia' }));
        section.appendChild(row);
      }
      content.appendChild(section);
    }
    if (!visible.length) content.appendChild(el('div', { class: 'empty', text: 'Nessun oggetto corrisponde ai filtri.' }));
    const add = el('button', { class: 'btn primary block', type: 'button', style: 'margin-top:18px', html: ICON.plus + '<span>Aggiungi oggetto</span>' });
    add.addEventListener('click', () => openItemEditor(character, createItem(), api, root, true, 'inventory'));
    content.appendChild(add);
  };
  select.addEventListener('change', () => { api.state.player.activeId = select.value; api.save(); draw(); });
  search.addEventListener('input', draw);
  categoryFilter.addEventListener('change', draw);
  statusFilter.addEventListener('change', draw);
  sort.addEventListener('change', draw);
  draw();
}

function openCharacterView(character, api, root) {
  normalizeCharacter(character);
  let currentSection = 'summary';
  const page = el('div', { class: 'player-sheet-page' });
  const content = el('main', { class: 'player-sheet-content' });
  const summary = calculateDerived(character);

  const header = el('header', { class: 'player-sheet-header', style: `--player-color:${character.color}` });
  const back = el('button', { class: 'sheet-back-btn', type: 'button', title: 'Torna ai personaggi', html: '<span>‹</span>' });
  back.addEventListener('click', () => api.refresh('player'));
  const identity = el('div', { class: 'player-sheet-identity' }, [
    el('span', { class: 'player-avatar', text: initials(character.name) }),
    el('div', { class: 'grow' }, [
      el('h1', { text: character.name }),
      el('p', { text: [character.species, character.classes, `Livello ${character.level}`].filter(Boolean).join(' · ') })
    ])
  ]);
  const edit = el('button', { class: 'btn primary', type: 'button', html: ICON.edit + '<span>Modifica</span>' });
  edit.addEventListener('click', () => openCharacterEditor(character, api, root, false, { inline: true }));
  header.append(back, identity, edit);

  const summaryBar = el('section', { class: 'player-summary-bar' }, [
    summaryCard('CA', summary.armorClass), summaryCard('Bonus iniziativa', signed(summary.initiativeBonus)),
    summaryCard('PF', `${character.hpCurrent}/${character.hpMax}`), summaryCard('Percezione', summary.passivePerception)
  ]);

  const sectionBar = el('div', { class: 'sheet-section-bar' });
  const sectionTitle = el('strong', { text: 'Riepilogo' });
  const menuToggle = el('button', { class: 'sheet-menu-toggle', type: 'button', text: '☷', title: 'Cambia sezione', 'aria-expanded': 'false' });
  const menu = el('div', { class: 'sheet-section-menu', hidden: true });
  const sections = [
    ['summary', 'Riepilogo'], ['abilities', 'Caratteristiche e TS'], ['skills', 'Abilità'],
    ['inventory', 'Inventario/equipaggiamento'], ['spells', 'Magie'], ['notes', 'Note']
  ];
  for (const [id, label] of sections) {
    const option = el('button', { class: `sheet-section-option${id === currentSection ? ' active' : ''}`, type: 'button', text: label });
    option.addEventListener('click', () => {
      currentSection = id;
      sectionTitle.textContent = label;
      menu.hidden = true;
      menuToggle.setAttribute('aria-expanded', 'false');
      menu.querySelectorAll('.sheet-section-option').forEach((node) => node.classList.toggle('active', node === option));
      renderSection();
    });
    menu.appendChild(option);
  }
  menuToggle.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    menuToggle.setAttribute('aria-expanded', String(!menu.hidden));
  });
  sectionBar.append(sectionTitle, menuToggle, menu);

  function renderSection() {
    content.innerHTML = '';
    if (currentSection === 'summary') {
      content.append(abilitySheetSection(character, calculateDerived(character)), equippedSection(character, api, root), spellbookSection(character, api, root, { editable: false }));
    } else if (currentSection === 'abilities') {
      content.append(abilitySheetSection(character, calculateDerived(character)), sensesSection(character));
    } else if (currentSection === 'skills') {
      content.append(skillsReadOnlySection(character, calculateDerived(character)));
    } else if (currentSection === 'inventory') {
      content.append(equippedSection(character, api, root));
      const openInventory = el('button', { class: 'btn primary block', type: 'button', text: 'Apri inventario completo' });
      openInventory.addEventListener('click', () => api.goTo('inventory'));
      content.appendChild(openInventory);
    } else if (currentSection === 'spells') {
      content.append(spellbookSection(character, api, root, { editable: false }));
    } else {
      content.append(readOnlySection('Note', character.notes || 'Nessuna nota.', true));
    }
  }

  page.append(header, summaryBar, sectionBar, content);
  root.innerHTML = '';
  root.appendChild(page);
  renderSection();
}

function abilitySheetSection(character, derived) {
  const section = el('section', { class: 'player-section' });
  section.appendChild(el('div', { class: 'sheet-section-heading' }, [el('span', { class: 'sheet-section-icon', text: '✦' }), el('h2', { text: 'Caratteristiche e tiri salvezza' })]));
  const grid = el('div', { class: 'ability-sheet-grid' });
  for (const [ability, label] of ABILITIES) {
    const block = el('section', { class: 'ability-sheet-block' });
    block.appendChild(el('h3', { text: label }));
    block.appendChild(el('div', { class: 'ability-score', text: `${character.stats[ability]} / ${signed(derived.modifiers[ability])}` }));
    block.appendChild(el('div', { class: 'ability-sheet-row' }, [el('span', { text: 'Tiro salvezza' }), el('strong', { text: signed(derived.savingThrows[ability]) })]));
    grid.appendChild(block);
  }
  section.appendChild(grid); return section;
}

function skillsReadOnlySection(character, derived) {
  const section = el('section', { class: 'player-section' });
  section.appendChild(el('div', { class: 'sheet-section-heading' }, [el('span', { class: 'sheet-section-icon', text: '✧' }), el('h2', { text: 'Abilità' })]));
  const grid = el('div', { class: 'skills-sheet-grid' });
  for (const [ability, label] of ABILITIES) {
    const block = el('section', { class: 'skills-sheet-block' });
    block.appendChild(el('h3', { text: label }));
    for (const [skill, skillLabel] of SKILLS.filter((item) => item[2] === ability)) {
      const prof = character.skillExpertise.includes(skill) ? ' · doppia competenza' : character.skillProficiencies.includes(skill) ? ' · competenza' : '';
      block.appendChild(el('div', { class: 'ability-sheet-row' }, [el('span', { text: skillLabel + prof }), el('strong', { text: signed(derived.skills[skill]) })]));
    }
    grid.appendChild(block);
  }
  section.appendChild(grid); return section;
}

function sensesSection(character) {
  const derived = calculateDerived(character);
  return el('section', { class: 'player-section' }, [
    el('div', { class: 'sheet-section-heading' }, [el('span', { class: 'sheet-section-icon', text: '◉' }), el('h2', { text: 'Sensi' })]),
    el('div', { class: 'senses-grid' }, [
      derivedStat('Percezione passiva', derived.passivePerception),
      derivedStat('Indagine passiva', 10 + derived.modifiers.intelligence),
      derivedStat('Intuizione passiva', 10 + derived.modifiers.wisdom)
    ])
  ]);
}

function summaryCard(label, value) {
  return el('div', { class: 'summary-card' }, [el('span', { text: label }), el('strong', { text: String(value) })]);
}

function initials(name) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function readOnlySection(title, text, multiline = false) {
  return el('section', { class: 'player-section' }, [el('div', { class: 'mini-title', text: title }), el('div', { class: `readonly-value${multiline ? ' readonly-note' : ''}`, text })]);
}

function equippedSection(character, api, root) {
  const section = el('section', { class: 'player-section' });
  section.appendChild(el('div', { class: 'mini-title', text: 'Equipaggiamento' }));
  const warning = equipmentWarning(character);
  if (warning) section.appendChild(warning);
  const equipped = character.inventory.filter((item) => item.equipped);
  if (!equipped.length) {
    section.appendChild(el('div', { class: 'muted', style: 'font-size:13px', text: 'Nessun oggetto equipaggiato.' }));
    return section;
  }
  const list = el('div', {});
  for (const item of equipped) {
    const row = el('div', { class: 'inventory-row equipped' });
    const open = el('button', { class: 'inventory-name', type: 'button' }, [
      el('strong', { text: item.name || 'Oggetto senza nome' }),
      el('span', { class: 'muted', text: itemInlineSummary(item, character) })
    ]);
    open.addEventListener('click', () => openItemDetails(character, item, api, root, 'player-sheet-view'));
    row.appendChild(open);
    if (item.requiresAttunement) row.appendChild(el('span', { class: `badge${item.attuned ? ' cond' : ''}`, text: item.attuned ? 'Sintonizzato' : 'Richiede sintonia' }));
    list.appendChild(row);
  }
  section.appendChild(list); return section;
}

function syncAttunement(character) {
  const ids = [];
  for (const item of character.inventory) {
    if (!item.requiresAttunement || !item.attuned) continue;
    if (ids.length >= character.attunement.max) {
      item.attuned = false;
      continue;
    }
    ids.push(item.id);
  }
  character.attunement.itemIds = ids;
}

function toggleAttunement(character, item, control, api, onDone) {
  const next = control.checked;
  if (next && character.inventory.filter((entry) => entry.attuned && entry.id !== item.id).length >= character.attunement.max) {
    control.checked = item.attuned;
    api.toast(`Sintonizzazione massima: ${character.attunement.max}`);
    return;
  }
  item.attuned = next;
  syncAttunement(character);
  api.save();
  if (onDone) onDone();
}

function duplicateItem(character, item) {
  const copy = normalizeItem({ ...item, id: uid(), name: `${item.name || 'Oggetto'} (copia)`, equipped: false, attuned: false });
  character.inventory.push(copy);
  syncAttunement(character);
  return copy;
}

function refreshItemView(returnView, character, api, root) {
  if (returnView === 'player-sheet' || returnView === 'player-sheet-view') openCharacterView(character, api, root);
  else api.refresh(returnView);
}

function detailValue(value, fallback = 'Non impostato') {
  return value === '' || value == null ? fallback : String(value);
}

function itemDetailRow(label, value) {
  return el('div', { class: 'item-detail-row' }, [el('span', { text: label }), el('strong', { text: detailValue(value) })]);
}

function itemDetailSection(title, rows) {
  return el('section', { class: 'item-detail-section' }, [el('h3', { text: title }), el('div', { class: 'item-detail-grid' }, rows)]);
}

function itemDetails(item, character) {
  const wrap = el('div', { class: 'item-details' });
  wrap.appendChild(el('div', { class: 'item-detail-heading' }, [
    el('strong', { text: item.name || 'Oggetto senza nome' }),
    el('span', { class: 'badge', text: itemCategoryLabel(item.category) })
  ]));
  wrap.appendChild(itemDetailSection('Informazioni', [
    itemDetailRow('Quantità', item.quantity), itemDetailRow('Peso', item.weight), itemDetailRow('Valore', item.value),
    itemDetailRow('Equipaggiato', item.equipped ? 'Sì' : 'No'), itemDetailRow('Richiede sintonia', item.requiresAttunement ? 'Sì' : 'No'),
    itemDetailRow('Sintonizzato', item.attuned ? 'Sì' : 'No')
  ]));
  wrap.appendChild(itemDetailSection('Bonus', [
    itemDetailRow('Bonus a tutti i TS', item.savingThrowBonus ? signed(item.savingThrowBonus) : 'Nessuno'),
    itemDetailRow('Bonus alle abilità', item.skillBonus ? signed(item.skillBonus) : 'Nessuno')
  ]));
  if (item.category === 'weapon') {
    wrap.appendChild(itemDetailSection('Dati arma', [
      itemDetailRow('Danno', item.damage), itemDetailRow('Tipo danno', item.damageType),
      itemDetailRow('Bonus attacco', item.attackBonus === '' ? '' : signed(item.attackBonus)),
      itemDetailRow('Bonus danni', item.damageBonus ? signed(item.damageBonus) : 'Nessuno'),
      itemDetailRow('Caratteristica', abilityLabel(item.weaponAbility)), itemDetailRow('Accuratezza', item.finesse ? 'Sì' : 'No'),
      itemDetailRow('Riepilogo', weaponSummary(item, character))
    ]));
  }
  if (item.category === 'armor') {
    wrap.appendChild(itemDetailSection('Dati armatura', [
      itemDetailRow('Tipo', item.armorCategory === 'shield' ? 'Scudo' : capArmorCategory(item.armorCategory)),
      itemDetailRow('CA base', item.armorCategory === 'shield' ? 'Non applicabile' : item.armorBase),
      itemDetailRow('Massimo bonus DES', item.armorCategory === 'shield' ? 'Non applicabile' : item.maxDexBonus === '' ? 'Nessun limite' : item.maxDexBonus),
      itemDetailRow('Bonus scudo', item.armorCategory === 'shield' ? item.shieldBonus : 'Non applicabile')
    ]));
  }
  wrap.appendChild(itemDetailSection('Descrizione', [itemDetailRow('Testo', item.description)]));
  return wrap;
}

function capArmorCategory(value) {
  return ({ light: 'Leggera', medium: 'Media', heavy: 'Pesante', shield: 'Scudo' })[value] || 'Non impostato';
}

function openItemDetails(character, item, api, root, returnView = 'player-sheet-view') {
  normalizeItem(item);
  const body = el('div', {});
  body.appendChild(itemDetails(item, character));
  const actions = el('div', { class: 'row wrap item-detail-actions' });
  const edit = el('button', { class: 'btn primary', type: 'button', html: ICON.edit + '<span>Modifica</span>' });
  edit.addEventListener('click', () => { api.closeDrawer(); openItemEditor(character, item, api, root, false, returnView); });
  const equip = el('button', { class: `btn ${item.equipped ? 'accent' : 'ghost'}`, type: 'button', text: item.equipped ? 'Disequipaggia' : 'Equipaggia' });
  equip.addEventListener('click', () => { item.equipped = !item.equipped; api.save(); api.closeDrawer(); refreshItemView(returnView, character, api, root); });
  const duplicate = el('button', { class: 'btn ghost', type: 'button', text: 'Duplica' });
  duplicate.addEventListener('click', () => { duplicateItem(character, item); api.save(); api.closeDrawer(); refreshItemView(returnView, character, api, root); });
  actions.append(edit, equip, duplicate);
  if (item.requiresAttunement) {
    const attune = el('button', { class: `btn ${item.attuned ? 'accent' : 'ghost'}`, type: 'button', text: item.attuned ? 'Desintonizza' : 'Sintonizza' });
    attune.addEventListener('click', () => {
      const control = { checked: !item.attuned };
      toggleAttunement(character, item, control, api, () => { api.closeDrawer(); refreshItemView(returnView, character, api, root); });
    });
    actions.appendChild(attune);
  }
  body.appendChild(actions);
  api.openDrawer(item.name || 'Dettagli oggetto', body);
}

function openCharacterEditor(character, api, root, isNew, options = {}) {
  const inline = options.inline === true;
  normalizeCharacter(character);
  const body = el('div', {});
  const save = () => { normalizeCharacter(character); api.save(); if (!inline) api.refresh('player'); };
  const name = textInput('Nome personaggio *', character.name, 'es. Arannis');
  const playerName = textInput('Nome giocatore', character.playerName, 'Nome del giocatore');
  const level = numberInput('Livello', character.level, 1);
  const classes = textInput('Classe/i', character.classes, 'es. Mago 5 / Guerriero 2');
  const species = textInput('Specie', character.species, 'es. Elfo');
  const background = textInput('Background', character.background, 'es. Sapiente');
  const alignment = textInput('Allineamento', character.alignment, 'Opzionale');
  const castingAbility = el('select', { class: 'input' });
  castingAbility.appendChild(el('option', { value: '', text: 'Seleziona una caratteristica' }));
  for (const [key, label] of ABILITIES) castingAbility.appendChild(el('option', { value: key, text: label }));
  castingAbility.value = character.spellbook.castingAbility;
  castingAbility.addEventListener('change', () => { character.spellbook.castingAbility = castingAbility.value; updateDerived(); });
  const color = el('input', { class: 'input color-input', type: 'color', value: character.color });
  color.addEventListener('input', () => { character.color = color.value; save(); });
  body.append(name.field, playerName.field, level.field, classes.field, species.field, background.field, alignment.field, field('Caratteristica da incantatore', castingAbility), field('Colore identificativo', color));
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
    derivedValues.append(
      derivedStat('Bonus competenza', `+${d.proficiency}`),
      derivedStat('CA calcolata', d.armorClass),
      derivedStat('Bonus iniziativa', signed(d.initiativeBonus)),
      derivedStat('Percezione passiva', d.passivePerception),
      derivedStat('Caratteristica incantatore', abilityLabel(character.spellbook.castingAbility)),
      derivedStat('CD TS incantesimi', spellValue(d.spellSaveDc)),
      derivedStat('Bonus txc incantesimi', spellValue(d.spellAttackBonus, true))
    );
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
  const attunementMax = numberInput('Slot sintonia massimi', character.attunement.max, 0);
  attunementMax.input.addEventListener('input', () => {
    character.attunement.max = Math.max(0, Math.floor(numericValue(attunementMax.input, 0)));
    const wasOverLimit = character.attunement.itemIds.length > character.attunement.max;
    syncAttunement(character);
    if (wasOverLimit) api.toast('Il limite è inferiore: alcune sintonizzazioni sono state rimosse.');
    save();
  });
  body.appendChild(attunementMax.field);
  const notes = textareaInput('Note personaggio', character.notes, 'Talenti, tratti, obiettivi…');
  notes.input.addEventListener('input', () => { character.notes = notes.input.value; save(); });
  body.appendChild(notes.field);

  body.appendChild(inventorySection(character, api, root, inline ? 'player-sheet' : 'player'));
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
  if (inline) {
    const page = el('div', { class: 'player-sheet-page editing' });
    const toolbar = el('div', { class: 'player-sheet-toolbar' });
    const back = el('button', { class: 'btn ghost', type: 'button', html: '<span>← Personaggi</span>' });
    const view = el('button', { class: 'btn primary', type: 'button', html: '<span>Visualizza scheda</span>' });
    back.addEventListener('click', () => api.refresh('player'));
    view.addEventListener('click', () => openCharacterView(character, api, root));
    toolbar.append(back, el('div', { class: 'grow' }), view);
    page.append(toolbar, body);
    root.innerHTML = '';
    root.appendChild(page);
    updateDerived();
  } else {
    api.openDrawer(isNew ? 'Nuovo personaggio' : `Scheda: ${character.name}`, body);
    updateDerived();
  }
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

function inventorySection(character, api, root, returnView = 'player') {
  const section = el('section', { class: 'player-section' });
  const header = el('div', { class: 'row' }, [el('div', { class: 'mini-title grow', text: 'Inventario ed equipaggiamento' })]);
  const add = el('button', { class: 'btn sm primary', type: 'button', html: ICON.plus + '<span>Aggiungi oggetto</span>' });
  add.addEventListener('click', () => openItemEditor(character, createItem(), api, root, true, returnView));
  header.appendChild(add); section.appendChild(header);
  const list = el('div', {}); section.appendChild(list);
  const redraw = () => {
    list.innerHTML = '';
    if (!character.inventory.length) { list.appendChild(el('div', { class: 'muted', style: 'font-size:13px', text: 'Inventario vuoto.' })); return; }
    for (const item of character.inventory) {
      const row = el('div', { class: `inventory-row${item.equipped ? ' equipped' : ''}` });
      const open = el('button', { class: 'inventory-name', type: 'button' }, [el('strong', { text: item.name || 'Oggetto senza nome' }), el('span', { class: 'muted', text: `${item.category} · x${item.quantity}` })]);
      open.addEventListener('click', () => openItemEditor(character, item, api, root, false, returnView));
      row.appendChild(open);
      const equipped = el('label', { class: 'checkline compact-check' });
      const equipCheck = el('input', { type: 'checkbox' }); equipCheck.checked = Boolean(item.equipped);
      equipCheck.addEventListener('change', () => { item.equipped = equipCheck.checked; api.save(); redraw(); });
      equipped.append(equipCheck, document.createTextNode('Equip.')); row.appendChild(equipped);
      if (item.requiresAttunement) {
        const attune = el('label', { class: 'checkline compact-check' });
        const attuneCheck = el('input', { type: 'checkbox' }); attuneCheck.checked = Boolean(item.attuned);
        attuneCheck.addEventListener('change', () => toggleAttunement(character, item, attuneCheck, api, redraw));
        attune.append(attuneCheck, document.createTextNode('Sint.')); row.appendChild(attune);
      }
      list.appendChild(row);
    }
  };
  redraw(); return section;
}

function spellbookSection(character, api, root, options = { editable: true }) {
  const editable = options.editable !== false;
  const section = el('section', { class: 'player-section' });
  section.appendChild(el('div', { class: 'mini-title', text: `Magie assegnate (${character.spellbook.knownSpellIds.length})` }));

  const derived = calculateDerived(character);
  section.appendChild(el('div', { class: 'derived-grid spellcasting-stats' }, [
    derivedStat('Caratteristica incantatore', abilityLabel(character.spellbook.castingAbility)),
    derivedStat('CD TS incantesimi', spellValue(derived.spellSaveDc)),
    derivedStat('Bonus txc incantesimi', spellValue(derived.spellAttackBonus, true))
  ]));

  const grouped = new Map();
  for (const spellId of character.spellbook.knownSpellIds) {
    const spell = api.state.spells.find((item) => item.id === spellId);
    if (!spell) continue;
    const level = spell.level ?? 0;
    if (!grouped.has(level)) grouped.set(level, []);
    grouped.get(level).push(spell);
  }

  const refreshSlotViews = (level) => {
    const slots = character.spellbook.slots[level];
    section.querySelectorAll(`[data-slot-level="${level}"]`).forEach((container) => {
      if (container.classList.contains('spell-level-group')) updateSlotGroup(container, slots);
      else {
        const slot = container.querySelector('.slot-used-box');
        if (slot) slot.textContent = `${slots.used}/${slots.max}`;
      }
    });
  };

  if (editable) {
    const slotsSection = el('section', { class: 'spell-slots-editor' });
    slotsSection.appendChild(el('div', { class: 'mini-title', text: 'Slot totali per livello' }));
    for (let level = 1; level <= 9; level += 1) {
      const slots = character.spellbook.slots[level];
      const max = el('input', {
        class: 'slot-input', type: 'number', min: '0', value: slots.max,
        'aria-label': `Slot totali livello ${level}`
      });
      max.addEventListener('change', () => {
        slots.max = normalizeSlotValue(max.value);
        slots.used = Math.min(slots.used, slots.max);
        max.value = slots.max;
        refreshSlotViews(level);
        api.save();
      });
      slotsSection.appendChild(el('div', { class: 'spell-slot-config', dataset: { slotLevel: String(level) } }, [
        el('strong', { text: `${level}° livello` }),
        el('span', { class: 'slot-used-box', text: `${slots.used}/${slots.max}`, title: 'Slot usati / slot totali' }),
        el('label', { class: 'slot-total-control' }, [document.createTextNode('Totali'), max])
      ]));
    }
    section.appendChild(slotsSection);
  }

  if (!grouped.size) {
    section.appendChild(el('div', { class: 'muted', style: 'font-size:13px', text: 'Nessuna magia assegnata. Usa Assegna nella sezione Magie.' }));
    return section;
  }

  for (const level of [...grouped.keys()].sort((a, b) => a - b)) {
    const group = el('section', { class: 'spell-level-group', dataset: { slotLevel: String(level) } });
    const slots = level > 0 ? character.spellbook.slots[level] : null;
    const heading = el('div', { class: 'row spell-level-heading' }, [el('strong', { text: level === 0 ? 'Trucchetti' : `${level}° livello` })]);
    if (level > 0) {
      const slotText = el('span', { class: 'slot-used-box', text: `${slots.used}/${slots.max}`, title: 'Slot usati / slot totali' });
      if (editable) {
        heading.appendChild(slotText);
      } else {
        const minus = el('button', { class: 'slot-adjust', type: 'button', text: '−', 'aria-label': `Riduci slot usati livello ${level}` });
        const plus = el('button', { class: 'slot-adjust', type: 'button', text: '+', 'aria-label': `Aumenta slot usati livello ${level}` });
        minus.addEventListener('click', () => {
          slots.used = Math.max(0, slots.used - 1);
          updateSlotGroup(group, slots);
          api.save();
        });
        plus.addEventListener('click', () => {
          slots.used = Math.min(slots.max, slots.used + 1);
          updateSlotGroup(group, slots);
          api.save();
        });
        heading.appendChild(el('div', { class: 'slot-controls' }, [minus, slotText, plus]));
      }
    }
    group.appendChild(heading);
    for (const spell of grouped.get(level).sort((a, b) => a.name.localeCompare(b.name, 'it'))) {
      const row = el('div', { class: 'inventory-row spellbook-row' });
      const name = el('button', { class: 'inventory-name', type: 'button' }, [
        el('strong', { text: spell.name }),
        el('span', { class: 'spellbook-meta', text: spellSummaryMetadata(spell), title: 'Tempo di lancio · gittata · C = concentrazione' }),
        spell.favorite ? el('span', { class: 'manual-spell-marker', text: ' ★ preferita' }) : null
      ]);
      name.addEventListener('click', () => api.openDrawer(spell.name, spellDetails(spell)));
      row.appendChild(name);
      if (editable) {
        const prep = el('label', { class: 'checkline compact-check' });
        const check = el('input', { type: 'checkbox' }); check.checked = character.spellbook.preparedSpellIds.includes(spell.id);
        check.addEventListener('change', () => { if (check.checked && !character.spellbook.preparedSpellIds.includes(spell.id)) character.spellbook.preparedSpellIds.push(spell.id); else character.spellbook.preparedSpellIds = character.spellbook.preparedSpellIds.filter((id) => id !== spell.id); api.save(); });
        prep.append(check, document.createTextNode('Preparata')); row.appendChild(prep);
      } else if (character.spellbook.preparedSpellIds.includes(spell.id)) {
        row.appendChild(el('span', { class: 'badge', text: 'Preparata' }));
      }
      if (level > 0 && !editable) {
        const launch = el('button', { class: 'chip on spell-launch', type: 'button', text: slots.used < slots.max ? 'Lancia' : 'Scarico' });
        launch.disabled = slots.used >= slots.max;
        launch.addEventListener('click', () => {
          if (!consumeSpellSlot(character, level)) return;
          api.save();
          updateSlotGroup(group, slots);
        });
        row.appendChild(launch);
      }
      group.appendChild(row);
    }
    if (level > 0 && !editable) updateSlotGroup(group, slots);
    section.appendChild(group);
  }
  return section;
}

function consumeSpellSlot(character, level) {
  const slots = character.spellbook?.slots?.[level];
  if (!slots || level <= 0) return false;
  slots.max = normalizeSlotValue(slots.max);
  slots.used = Math.min(slots.max, normalizeSlotValue(slots.used));
  if (slots.used >= slots.max) return false;
  slots.used += 1;
  return true;
}

function updateSlotGroup(group, slots) {
  const slot = group.querySelector('.slot-used-box');
  if (slot) slot.textContent = `${slots.used}/${slots.max}`;
  const adjust = group.querySelectorAll('.slot-adjust');
  if (adjust.length) {
    adjust[0].disabled = slots.used <= 0;
    adjust[adjust.length - 1].disabled = slots.used >= slots.max;
  }
  group.querySelectorAll('.spell-launch').forEach((button) => {
    button.disabled = slots.used >= slots.max;
    button.textContent = slots.used < slots.max ? 'Lancia' : 'Scarico';
  });
}

export function openItemEditor(character, item, api, root, isNew, returnView = 'player') {
  normalizeItem(item);
  const body = el('div', {});
  const name = textInput('Nome oggetto *', item.name, 'es. Spada lunga +1');
  const preset = el('select', { class: 'input', 'aria-label': 'Preset oggetto' }, [el('option', { value: '', text: 'Nessun preset' })]);
  for (const [presetId, label] of ITEM_PRESETS) preset.appendChild(el('option', { value: presetId, text: label }));
  const category = el('select', { class: 'input' });
  for (const [categoryValue, label] of ITEM_CATEGORIES) category.appendChild(el('option', { value: categoryValue, text: label }));
  category.value = item.category;
  const quantity = numberInput('Quantità', item.quantity, 1);
  const weight = textInput('Peso', item.weight, 'es. 1,5 kg');
  const value = textInput('Valore', item.value, 'es. 50 mo');
  const description = textareaInput('Descrizione', item.description, 'Dettagli dell’oggetto…');
  const equipped = checkboxField('Equipaggiato', item.equipped);
  const requires = checkboxField('Richiede sintonizzazione', item.requiresAttunement);
  const attuned = checkboxField('Sintonizzato', item.attuned);
  attuned.input.disabled = !requires.input.checked;
  const savingThrowBonus = numberInput('Bonus a tutti i TS', item.savingThrowBonus, -20);
  const skillBonus = numberInput('Bonus alle abilità', item.skillBonus, -20);

  const weapon = textInput('Danno arma', item.damage, 'es. 1d8');
  const damageType = textInput('Tipo danno', item.damageType, 'es. tagliente');
  const attackBonus = numberInput('Bonus attacco', item.attackBonus, -20);
  const damageBonus = numberInput('Bonus danni', item.damageBonus, -20);
  const weaponAbility = el('select', { class: 'input' });
  for (const [key, label] of ABILITIES) weaponAbility.appendChild(el('option', { value: key, text: label }));
  weaponAbility.value = item.weaponAbility || 'strength';
  const finesse = checkboxField('Accuratezza (usa FOR o DES migliore)', item.finesse);

  const armorCategory = el('select', { class: 'input' });
  for (const [v, l] of [['light', 'Leggera'], ['medium', 'Media'], ['heavy', 'Pesante'], ['shield', 'Scudo']]) armorCategory.appendChild(el('option', { value: v, text: l }));
  armorCategory.value = item.armorCategory;
  const armorBase = numberInput('CA base armatura', item.armorBase, 0);
  const maxDex = numberInput('Massimo bonus DES', item.maxDexBonus, 0);
  const shieldBonus = numberInput('Bonus scudo', item.shieldBonus, 0);

  const weaponSection = el('section', { class: 'item-editor-section' }, [el('div', { class: 'mini-title', text: 'Dati arma' })]);
  weaponSection.append(weapon.field, damageType.field, attackBonus.field, damageBonus.field, field('Statistica arma', weaponAbility), finesse.field);
  const armorSection = el('section', { class: 'item-editor-section' }, [el('div', { class: 'mini-title', text: 'Dati armatura/scudo' })]);
  armorSection.append(field('Categoria armatura', armorCategory), armorBase.field, maxDex.field, shieldBonus.field);

  const readDraft = () => ({
    ...item,
    name: name.input.value.trim(), category: category.value, quantity: Math.max(1, Math.floor(numericValue(quantity.input, 1))),
    weight: weight.input.value.trim(), value: value.input.value.trim(), description: description.input.value,
    equipped: equipped.input.checked, requiresAttunement: requires.input.checked, attuned: requires.input.checked && attuned.input.checked,
    savingThrowBonus: numericValue(savingThrowBonus), skillBonus: numericValue(skillBonus), damage: weapon.input.value.trim(),
    damageType: damageType.input.value.trim(), attackBonus: optionalNumber(attackBonus.input.value), damageBonus: numericValue(damageBonus.input, 0),
    weaponAbility: weaponAbility.value, finesse: finesse.input.checked, armorCategory: armorCategory.value,
    armorBase: optionalNumber(armorBase.input.value), maxDexBonus: optionalNumber(maxDex.input.value), shieldBonus: optionalNumber(shieldBonus.input.value)
  });
  const preview = el('div', { class: 'card item-preview' });
  const updatePreview = () => {
    const draft = readDraft();
    const previewInventory = character.inventory.filter((entry) => entry.id !== draft.id);
    previewInventory.push(draft);
    const previewCharacter = { ...character, inventory: previewInventory };
    const derived = calculateDerived(previewCharacter);
    preview.innerHTML = '';
    preview.appendChild(el('div', { class: 'mini-title', text: 'Anteprima effetti' }));
    if (!draft.equipped) {
      preview.appendChild(el('div', { class: 'muted', text: 'Equipaggia l’oggetto per applicare i suoi bonus.' }));
      return;
    }
    preview.appendChild(el('div', { class: 'derived-grid compact' }, [
      derivedStat('CA totale', derived.armorClass), derivedStat('TS totali', derived.savingThrowBonus ? signed(derived.savingThrowBonus) : '—'),
      derivedStat('Abilità', derived.skillBonus ? signed(derived.skillBonus) : '—')
    ]));
    if (draft.category === 'weapon') preview.appendChild(el('div', { class: 'muted item-preview-line', text: weaponSummary(draft, previewCharacter) }));
  };
  const updateCategoryFields = () => {
    weaponSection.hidden = category.value !== 'weapon';
    armorSection.hidden = category.value !== 'armor';
    updatePreview();
  };
  category.addEventListener('change', updateCategoryFields);
  requires.input.addEventListener('change', () => { attuned.input.disabled = !requires.input.checked; if (!requires.input.checked) attuned.input.checked = false; updatePreview(); });
  const watchedControls = [name.input, quantity.input, weight.input, value.input, description.input, equipped.input, requires.input, attuned.input, savingThrowBonus.input, skillBonus.input, weapon.input, damageType.input, attackBonus.input, damageBonus.input, weaponAbility, finesse.input, armorCategory, armorBase.input, maxDex.input, shieldBonus.input];
  watchedControls.forEach((control) => control.addEventListener(control.type === 'checkbox' || control.tagName === 'SELECT' ? 'change' : 'input', updatePreview));
  preset.addEventListener('change', () => {
    const selected = ITEM_PRESETS.find(([presetId]) => presetId === preset.value);
    if (!selected) return;
    const patch = selected[2];
    if (patch.category) category.value = patch.category;
    if (patch.armorCategory) armorCategory.value = patch.armorCategory;
    if (patch.armorBase !== undefined) armorBase.input.value = patch.armorBase;
    if (patch.maxDexBonus !== undefined) maxDex.input.value = patch.maxDexBonus;
    if (patch.shieldBonus !== undefined) shieldBonus.input.value = patch.shieldBonus;
    if (patch.damage !== undefined) weapon.input.value = patch.damage;
    if (patch.damageType !== undefined) damageType.input.value = patch.damageType;
    if (patch.weaponAbility !== undefined) weaponAbility.value = patch.weaponAbility;
    if (patch.description !== undefined) description.input.value = patch.description;
    updateCategoryFields();
  });

  body.append(
    name.field, field('Preset rapido', preset), field('Categoria', category), quantity.field, weight.field, value.field,
    description.field, equipped.field, requires.field, attuned.field, savingThrowBonus.field, skillBonus.field, weaponSection, armorSection, preview
  );
  updateCategoryFields();

  const finishItemEdit = () => {
    api.save();
    api.closeDrawer();
    if (returnView === 'player-sheet') openCharacterEditor(character, api, root, false, { inline: true });
    else if (returnView === 'player-sheet-view') openCharacterView(character, api, root);
    else api.refresh(returnView);
  };
  const saveButton = el('button', { class: 'btn primary block', type: 'button', style: 'margin-top:12px', text: isNew ? 'Aggiungi oggetto' : 'Salva oggetto' });
  saveButton.addEventListener('click', () => {
    const draft = readDraft();
    if (!draft.name) { api.toast('Il nome dell’oggetto è obbligatorio.'); return; }
    const otherAttuned = character.inventory.filter((entry) => entry.id !== item.id && entry.attuned).length;
    if (draft.attuned && !item.attuned && otherAttuned >= character.attunement.max) {
      api.toast(`Sintonizzazione massima: ${character.attunement.max}`);
      return;
    }
    Object.assign(item, draft);
    if (isNew) character.inventory.push(item);
    syncAttunement(character);
    finishItemEdit();
  });
  body.appendChild(saveButton);
  if (!isNew) {
    const remove = el('button', { class: 'btn danger block', type: 'button', style: 'margin-top:10px', html: ICON.trash + '<span>Rimuovi oggetto</span>' });
    remove.addEventListener('click', () => {
      if (!confirm(`Rimuovere "${item.name}" dall’inventario?`)) return;
      character.inventory = character.inventory.filter((entry) => entry.id !== item.id);
      syncAttunement(character);
      finishItemEdit();
    });
    body.appendChild(remove);
  }
  api.openDrawer(isNew ? 'Nuovo oggetto' : `Modifica: ${item.name}`, body);
}

function textInput(label, value, placeholder) { const input = el('input', { class: 'input', type: 'text', placeholder }); input.value = value ?? ''; return { input, field: field(label, input) }; }
function textareaInput(label, value, placeholder) { const input = el('textarea', { class: 'input', rows: '4', placeholder }); input.value = value ?? ''; return { input, field: field(label, input) }; }
function numberInput(label, value, min = 0) { const input = el('input', { class: 'input', type: 'number', min: String(min) }); input.value = value ?? ''; return { input, field: field(label, input) }; }
function checkboxField(label, value) { const input = el('input', { type: 'checkbox' }); input.checked = Boolean(value); return { input, field: el('label', { class: 'checkline' }, [input, document.createTextNode(label)]) }; }
function field(label, control) { return el('div', { class: 'field' }, [el('label', { text: label }), control]); }
function derivedStat(label, value) { return el('div', { class: 'derived-stat' }, [el('span', { text: label }), el('strong', { text: String(value) })]); }
function weaponSummary(item, character) {
  const derived = calculateDerived(character);
  const selectedAbility = item.weaponAbility || 'strength';
  const ability = item.finesse
    ? (derived.modifiers.dexterity > derived.modifiers.strength ? 'dexterity' : 'strength')
    : selectedAbility;
  const abilityMod = derived.modifiers[ability] || 0;
  const attack = abilityMod + (Number(item.attackBonus) || 0) + derived.proficiency;
  const damageBonus = abilityMod + (Number(item.damageBonus) || 0);
  return `TxC ${signed(attack)} · ${item.damage || 'danno'} ${signed(damageBonus)}${item.damageType ? ` ${item.damageType}` : ''}`;
}

function signed(value) { return Number(value) >= 0 ? `+${value}` : String(value); }
