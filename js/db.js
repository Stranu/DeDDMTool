// Persistenza locale su IndexedDB con un piccolo wrapper a Promise.
// Store:
//  - kv:         chiave/valore per stato applicativo (encounter iniziativa, roster PG/PNG, prefs)
//  - conditions: condizioni importate (id = slug del nome)
//  - spells:     magie importate (id = slug del nome)
//
// Ogni evento significativo dell'app chiama una save su kv, così lo stato
// dell'incontro sopravvive a chiusure accidentali.

const DB_NAME = 'dm-toolkit';
const DB_VERSION = 1;
let _db = null;

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('conditions')) db.createObjectStore('conditions', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('spells')) db.createObjectStore('spells', { keyPath: 'id' });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    Promise.resolve(fn(s)).then((r) => { result = r; }).catch(reject);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---- KV ----
export function kvGet(key, fallback = null) {
  return tx('kv', 'readonly', (s) => reqToPromise(s.get(key)))
    .then((v) => (v === undefined ? fallback : v));
}
export function kvSet(key, value) {
  return tx('kv', 'readwrite', (s) => { s.put(value, key); });
}

// ---- Bulk stores (conditions / spells) ----
export function bulkPut(store, items) {
  return tx(store, 'readwrite', (s) => {
    s.clear();
    for (const it of items) s.put(it);
  });
}
export function getAll(store) {
  return tx(store, 'readonly', (s) => reqToPromise(s.getAll()));
}
export function count(store) {
  return tx(store, 'readonly', (s) => reqToPromise(s.count()));
}
export function clearStore(store) {
  return tx(store, 'readwrite', (s) => { s.clear(); });
}
export function getOne(store, id) {
  return tx(store, 'readonly', (s) => reqToPromise(s.get(id)));
}
