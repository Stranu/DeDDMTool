// Parser CSV robusto (RFC-4180-ish): gestisce campi tra virgolette con
// virgole, newline e virgolette raddoppiate ("") al loro interno.
// Necessario perche' i CSV di magie/condizioni hanno descrizioni multi-riga.

import { fold, uid } from './util.js';

export function parseCSV(text) {
  // Rimuove BOM.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const endField = () => { row.push(field); field = ''; };
  const endRow = () => { endField(); rows.push(row); row = []; };

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ',') { endField(); i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { endRow(); i++; continue; }
    field += ch; i++;
  }
  // Ultimo campo/riga se il file non termina con newline.
  if (field.length > 0 || row.length > 0) endRow();

  // Scarta righe completamente vuote.
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// Converte righe in oggetti usando la prima riga come header.
function toObjects(rows) {
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o = {};
    header.forEach((h, idx) => { o[h] = (r[idx] ?? '').trim(); });
    return o;
  });
}

function slugify(s) {
  return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || uid();
}

// ---------- Condizioni ----------
// Header atteso: Name, Original Name, Description
export function parseConditions(text) {
  const objs = toObjects(parseCSV(text));
  const out = [];
  const seen = new Set();
  for (const o of objs) {
    const name = o['Name'] || o['Nome'] || '';
    if (!name) continue;
    let id = slugify(name);
    while (seen.has(id)) id += '-2';
    seen.add(id);
    out.push({
      id,
      name,
      original: o['Original Name'] || o['Original'] || '',
      description: (o['Description'] || o['Descrizione'] || '').trim(),
      search: fold(name + ' ' + (o['Original Name'] || '') + ' ' + (o['Description'] || ''))
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  return out;
}

// ---------- Magie ----------
// Header atteso: Name, Original Name, Level, School, Casting Time, Range,
//                Components, Duration, Description, Class

// Estrae il numero di livello. Trucchetto -> 0. "2° livello" -> 2.
export function parseLevel(raw) {
  const s = fold(raw);
  if (s.includes('trucchetto') || s.includes('cantrip')) return 0;
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export function levelLabel(lvl) {
  if (lvl === 0) return 'Trucchetto';
  if (lvl == null) return '—';
  return `${lvl}° livello`;
}

// La scuola puo' avere " (rituale)". Separiamo scuola e flag rituale.
function parseSchool(raw) {
  const ritual = /rituale|ritual/i.test(raw);
  const school = raw.replace(/\s*\((?:rituale|ritual)\)\s*/i, '').trim();
  return { school, ritual };
}

// La classe e' del tipo "|chierico|paladino" oppure "chierico, paladino".
function parseClasses(raw) {
  return (raw || '')
    .split(/[|,]/)
    .map((c) => c.trim())
    .filter(Boolean);
}

export function parseSpells(text) {
  const objs = toObjects(parseCSV(text));
  const out = [];
  const seen = new Set();
  for (const o of objs) {
    const name = o['Name'] || o['Nome'] || '';
    if (!name) continue;
    let id = slugify(name);
    while (seen.has(id)) id += '-2';
    seen.add(id);

    const { school, ritual } = parseSchool(o['School'] || o['Scuola'] || '');
    const level = parseLevel(o['Level'] || o['Livello'] || '');
    const classes = parseClasses(o['Class'] || o['Classi'] || o['Classe'] || '');
    const original = o['Original Name'] || o['Original'] || '';
    const description = (o['Description'] || o['Descrizione'] || '').trim();

    out.push({
      id,
      name,
      original,
      level,
      levelRaw: o['Level'] || '',
      school,
      ritual,
      castingTime: o['Casting Time'] || o['Tempo di lancio'] || '',
      range: o['Range'] || o['Gittata'] || '',
      components: o['Components'] || o['Componenti'] || '',
      duration: o['Duration'] || o['Durata'] || '',
      description,
      classes,
      search: fold([name, original, description, school, classes.join(' ')].join(' '))
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name, 'it'));
  return out;
}
