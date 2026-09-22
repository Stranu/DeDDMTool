// Impostazioni: import CSV e backup JSON locali, senza backend.
import { el, ICON, escapeHtml } from '../util.js';
import { parseConditions, parseSpells } from '../csv.js';
import {
  BACKUP_CATEGORIES,
  categoryLabel,
  filenameFor,
  parseBackup,
  serializeBackup
} from '../backup.js';

export function renderSettings(root, api) {
  const { state, db, toast, save, reloadDatasets, refresh, updateTabs } = api;
  root.innerHTML = '';

  root.appendChild(el('div', { class: 'section-title', text: 'Dati importati' }));

  root.appendChild(dataCard({
    title: 'Condizioni',
    count: state.conditions.length,
    icon: ICON.sparkle,
    hint: 'CSV con colonne: Name, Original Name, Description',
    onImport: (file) => importFile(file, 'conditions'),
    onClear: () => clearData('conditions')
  }));

  root.appendChild(dataCard({
    title: 'Magie',
    count: state.spells.length,
    icon: ICON.sparkle,
    hint: 'CSV con colonne: Name, Original Name, Level, School, Casting Time, Range, Components, Duration, Description, Class',
    onImport: (file) => importFile(file, 'spells'),
    onClear: () => clearData('spells')
  }));

  root.appendChild(backupSection());
  root.appendChild(el('hr', { class: 'sep' }));
  root.appendChild(el('div', { class: 'section-title', text: 'PG/Alleati e Mostri/PNG' }));
  root.appendChild(el('p', { class: 'muted', text: 'I personaggi giocanti e gli alleati ricorrenti si gestiscono dal pulsante "PG/Alleati"; le schede Mostri/PNG hanno una sezione dedicata.' }));

  root.appendChild(el('hr', { class: 'sep' }));
  const help = el('details', { class: 'help' });
  help.appendChild(el('summary', { text: 'Privacy e funzionamento offline' }));
  help.appendChild(el('p', {
    class: 'muted',
    html: 'I file CSV e i backup non lasciano mai il dispositivo: vengono letti e salvati solo in locale (IndexedDB del browser). ' +
      "L'app funziona offline dopo la prima apertura. Conserva una copia del backup JSON fuori dal browser per evitare perdite accidentali."
  }));
  root.appendChild(help);

  function dataCard({ title, count, icon, hint, onImport, onClear }) {
    const present = count > 0;
    const status = present
      ? el('span', { class: 'badge', style: 'background:rgba(75,191,123,.15);border-color:rgba(75,191,123,.5);color:#8fe6b0', text: `${count} voci` })
      : el('span', { class: 'badge', text: 'nessun dato' });

    const fileInput = el('input', { type: 'file', accept: '.csv,text/csv', style: 'display:none' });
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (file) onImport(file);
      fileInput.value = '';
    });
    const importBtn = el('button', { class: 'btn primary', type: 'button', html: ICON.import + '<span>Importa CSV</span>' });
    importBtn.addEventListener('click', () => fileInput.click());
    const actions = el('div', { class: 'row wrap', style: 'margin-top:10px' }, [importBtn, fileInput]);
    if (present) {
      const clearBtn = el('button', { class: 'btn danger', type: 'button', html: ICON.trash + '<span>Rimuovi</span>' });
      clearBtn.addEventListener('click', onClear);
      actions.appendChild(clearBtn);
    }
    return el('div', { class: 'card' }, [
      el('div', { class: 'row', style: 'gap:10px' }, [
        el('span', { html: icon, style: 'color:var(--accent-2)' }),
        el('div', { class: 'grow' }, [
          el('div', { style: 'font-weight:700;font-size:16px', text: title }),
          el('div', { class: 'muted', style: 'font-size:12px', html: escapeHtml(hint) })
        ]),
        status
      ]),
      actions
    ]);
  }

  function backupSection() {
    const section = el('section', { class: 'card backup-card' });
    section.appendChild(el('div', { style: 'font-weight:700;font-size:16px', text: 'Backup locale' }));
    section.appendChild(el('p', { class: 'muted', style: 'font-size:13px;margin-top:4px', text: 'Esporta o ripristina tutto oppure una singola categoria. L’import sostituisce i dati della categoria selezionata.' }));

    const exportTitle = el('div', { class: 'mini-title', text: 'Esporta' });
    const exportRow = el('div', { class: 'row wrap' });
    exportRow.appendChild(exportButton('Backup completo', BACKUP_CATEGORIES));
    for (const category of BACKUP_CATEGORIES) exportRow.appendChild(exportButton(categoryLabel(category), [category]));

    const importTitle = el('div', { class: 'mini-title', text: 'Importa backup JSON' });
    const importRow = el('div', { class: 'row wrap' });
    importRow.appendChild(importButton('Backup completo', BACKUP_CATEGORIES));
    for (const category of BACKUP_CATEGORIES) importRow.appendChild(importButton(categoryLabel(category), [category]));
    section.append(exportTitle, exportRow, importTitle, importRow);
    return section;
  }

  function exportButton(label, categories) {
    const button = el('button', { class: 'btn ghost sm', type: 'button', html: ICON.import + `<span>${label}</span>` });
    button.addEventListener('click', () => {
      try {
        const text = serializeBackup(state, categories);
        const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filenameFor(categories);
        anchor.click();
        URL.revokeObjectURL(url);
        toast(`Backup ${categories.length === BACKUP_CATEGORIES.length ? 'completo' : categoryLabel(categories[0])} esportato`);
      } catch (error) {
        reportError('Esportazione backup fallita', error);
      }
    });
    return button;
  }

  function importButton(label, categories) {
    const input = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    const button = el('button', { class: 'btn ghost sm', type: 'button', html: ICON.import + `<span>${label}</span>` });
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (file) importBackup(file, categories);
      input.value = '';
    });
    button.addEventListener('click', () => input.click());
    return el('span', { class: 'row' }, [button, input]);
  }

  async function importBackup(file, expectedCategories) {
    try {
      const backup = parseBackup(await file.text());
      const missing = expectedCategories.filter((category) => !Object.prototype.hasOwnProperty.call(backup.categories, category));
      if (missing.length) throw new Error(`Il backup non contiene: ${missing.map(categoryLabel).join(', ')}.`);
      const labels = expectedCategories.map(categoryLabel).join(', ');
      if (!confirm(`Sostituire i dati di ${labels}? Questa operazione non può essere annullata.`)) return;
      await applyBackup(backup, expectedCategories);
      toast(`Backup importato: ${labels}`);
    } catch (error) {
      reportError('Importazione backup fallita', error);
    }
  }

  async function applyBackup(backup, categories) {
    const data = backup.categories;
    validateBackupData(data, categories);
    if (categories.includes('encounter')) {
      state.encounter = data.encounter;
    }
    if (categories.includes('roster')) {
      state.roster = { ...state.roster, pcs: data.roster.pcs, allies: data.roster.allies };
    }
    if (categories.includes('monsters')) {
      state.roster.archive = data.monsters;
    }
    if (categories.includes('conditions')) {
      await db.bulkPut('conditions', data.conditions);
    }
    if (categories.includes('spells')) {
      await db.bulkPut('spells', data.spells);
    }
    if (categories.includes('encounter') || categories.includes('roster') || categories.includes('monsters')) {
      if (!await save()) throw new Error('Salvataggio locale non riuscito.');
    }
    await reloadDatasets();
    updateTabs();
    refresh('settings');
  }

  function validateBackupData(data, categories) {
    if (categories.includes('encounter') && (!data.encounter || !Array.isArray(data.encounter.combatants))) {
      throw new Error('Categoria iniziativa non valida.');
    }
    if (categories.includes('roster') && (!data.roster || !validItems(data.roster.pcs) || !validItems(data.roster.allies))) {
      throw new Error('Categoria PG/Alleati non valida.');
    }
    if (categories.includes('monsters') && !validItems(data.monsters)) throw new Error('Categoria Mostri/PNG non valida.');
    if (categories.includes('conditions') && !validItems(data.conditions)) throw new Error('Categoria condizioni non valida.');
    if (categories.includes('spells') && !validItems(data.spells)) throw new Error('Categoria magie non valida.');
  }

  function validItems(items) {
    return Array.isArray(items) && items.every((item) => item && typeof item === 'object' && typeof item.id === 'string' && item.id.length > 0);
  }

  async function importFile(file, kind) {
    try {
      const text = await file.text();
      if (kind === 'conditions') {
        const items = parseConditions(text);
        if (!items.length) throw new Error('Nessuna condizione trovata nel file.');
        await db.bulkPut('conditions', items);
        toast(`Importate ${items.length} condizioni`);
      } else {
        const items = parseSpells(text);
        if (!items.length) throw new Error('Nessuna magia trovata nel file.');
        await db.bulkPut('spells', items);
        toast(`Importate ${items.length} magie`);
      }
      await reloadDatasets();
      refresh('settings');
    } catch (error) {
      reportError('Importazione CSV fallita', error);
    }
  }

  async function clearData(kind) {
    const label = kind === 'conditions' ? 'le condizioni' : 'le magie';
    if (!confirm(`Rimuovere ${label} importate? I riferimenti nell'iniziativa resteranno come testo.`)) return;
    try {
      await db.clearStore(kind);
      await reloadDatasets();
      refresh('settings');
      toast('Dati rimossi');
    } catch (error) {
      reportError('Rimozione dati fallita', error);
    }
  }

  function reportError(message, error) {
    console.error(message, error);
    toast(`${message}: ${error?.message || 'errore sconosciuto'}`);
  }
}
