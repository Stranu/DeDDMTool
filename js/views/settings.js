// Sezione Impostazioni: import separato di condizioni e magie da file CSV locali.
import { el, ICON, escapeHtml } from '../util.js';
import { parseConditions, parseSpells } from '../csv.js';

export function renderSettings(root, api) {
  const { state, db, toast, reloadDatasets, refresh } = api;
  root.innerHTML = '';

  root.appendChild(el('div', { class: 'section-title', text: 'Dati importati' }));

  // ---- Blocco Condizioni ----
  root.appendChild(dataCard({
    title: 'Condizioni',
    count: state.conditions.length,
    icon: ICON.sparkle,
    hint: 'CSV con colonne: Name, Original Name, Description',
    onImport: (file) => importFile(file, 'conditions'),
    onClear: () => clearData('conditions')
  }));

  // ---- Blocco Magie ----
  root.appendChild(dataCard({
    title: 'Magie',
    count: state.spells.length,
    icon: ICON.sparkle,
    hint: 'CSV con colonne: Name, Original Name, Level, School, Casting Time, Range, Components, Duration, Description, Class',
    onImport: (file) => importFile(file, 'spells'),
    onClear: () => clearData('spells')
  }));

  root.appendChild(el('hr', { class: 'sep' }));

  // ---- Roster PG / PNG ricorrenti ----
  root.appendChild(el('div', { class: 'section-title', text: 'Roster' }));
  root.appendChild(el('p', { class: 'muted', text: 'I personaggi giocanti e gli alleati ricorrenti si gestiscono dal pulsante "PG/Alleati"; le schede Mostri/PNG hanno una sezione dedicata.' }));

  // ---- Info ----
  root.appendChild(el('hr', { class: 'sep' }));
  const help = el('details', { class: 'help' });
  help.appendChild(el('summary', { text: 'Privacy e funzionamento offline' }));
  help.appendChild(el('p', {
    class: 'muted',
    html: 'I file CSV importati non lasciano mai il dispositivo: vengono salvati solo in locale (IndexedDB del browser). ' +
      "L'app funziona offline dopo la prima apertura. Per liberare spazio puoi rimuovere i dati con i pulsanti qui sopra."
  }));
  root.appendChild(help);

  // ---------- helper ----------
  function dataCard({ title, count, icon, hint, onImport, onClear }) {
    const present = count > 0;
    const status = present
      ? el('span', { class: 'badge', style: 'background:rgba(75,191,123,.15);border-color:rgba(75,191,123,.5);color:#8fe6b0', text: `${count} voci` })
      : el('span', { class: 'badge', text: 'nessun dato' });

    const fileInput = el('input', { type: 'file', accept: '.csv,text/csv', style: 'display:none' });
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (f) onImport(f);
      fileInput.value = '';
    });

    const importBtn = el('button', { class: 'btn primary', html: ICON.import + '<span>Importa CSV</span>' });
    importBtn.addEventListener('click', () => fileInput.click());

    const actions = el('div', { class: 'row wrap', style: 'margin-top:10px' }, [importBtn, fileInput]);
    if (present) {
      const clearBtn = el('button', { class: 'btn danger', html: ICON.trash + '<span>Rimuovi</span>' });
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

  async function importFile(file, kind) {
    try {
      const text = await file.text();
      if (kind === 'conditions') {
        const items = parseConditions(text);
        if (!items.length) { toast('Nessuna condizione trovata nel file'); return; }
        await db.bulkPut('conditions', items);
        toast(`Importate ${items.length} condizioni`);
      } else {
        const items = parseSpells(text);
        if (!items.length) { toast('Nessuna magia trovata nel file'); return; }
        await db.bulkPut('spells', items);
        toast(`Importate ${items.length} magie`);
      }
      await reloadDatasets();
      refresh('settings');
    } catch (err) {
      console.error(err);
      toast('Errore durante l\'import del file');
    }
  }

  async function clearData(kind) {
    const label = kind === 'conditions' ? 'le condizioni' : 'le magie';
    if (!confirm(`Rimuovere ${label} importate? I riferimenti nell'iniziativa resteranno come testo.`)) return;
    await db.clearStore(kind);
    await reloadDatasets();
    refresh('settings');
    toast('Dati rimossi');
  }
}
