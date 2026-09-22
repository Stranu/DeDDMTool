// Formato di backup locale dell'app.
// Il file è JSON leggibile e può contenere tutte le categorie oppure una sola.

export const BACKUP_FORMAT = 'dm-toolkit-backup';
export const BACKUP_VERSION = 1;
export const BACKUP_CATEGORIES = ['encounter', 'roster', 'monsters', 'conditions', 'spells'];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createBackup(state, categories = BACKUP_CATEGORIES) {
  const selected = [...new Set(categories)].filter((category) => BACKUP_CATEGORIES.includes(category));
  if (!selected.length) throw new Error('Nessuna categoria selezionata per il backup.');

  const data = {};
  if (selected.includes('encounter')) data.encounter = clone(state.encounter);
  if (selected.includes('roster')) {
    data.roster = {
      pcs: clone(state.roster?.pcs || []),
      allies: clone(state.roster?.allies || [])
    };
  }
  if (selected.includes('monsters')) data.monsters = clone(state.roster?.archive || []);
  if (selected.includes('conditions')) data.conditions = clone(state.conditions || []);
  if (selected.includes('spells')) data.spells = clone(state.spells || []);

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    categories: data
  };
}

export function serializeBackup(state, categories) {
  return JSON.stringify(createBackup(state, categories), null, 2);
}

export function parseBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('Il file non contiene JSON valido.');
  }
  if (!backup || backup.format !== BACKUP_FORMAT) {
    throw new Error('Formato backup non riconosciuto.');
  }
  if (backup.version !== BACKUP_VERSION) {
    throw new Error(`Versione backup non supportata: ${backup.version ?? 'sconosciuta'}.`);
  }
  if (!backup.categories || typeof backup.categories !== 'object') {
    throw new Error('Il backup non contiene categorie valide.');
  }
  const present = BACKUP_CATEGORIES.filter((category) => Object.prototype.hasOwnProperty.call(backup.categories, category));
  if (!present.length) throw new Error('Il backup non contiene dati importabili.');
  return backup;
}

export function categoryLabel(category) {
  return {
    encounter: 'iniziativa',
    roster: 'PG/Alleati',
    monsters: 'Mostri/PNG',
    conditions: 'condizioni',
    spells: 'magie'
  }[category] || category;
}

export function filenameFor(categories) {
  const selected = [...new Set(categories)];
  const suffix = selected.length === BACKUP_CATEGORIES.length ? 'completo' : selected.join('-');
  const stamp = new Date().toISOString().slice(0, 10);
  return `dm-toolkit-${suffix}-${stamp}.json`;
}
