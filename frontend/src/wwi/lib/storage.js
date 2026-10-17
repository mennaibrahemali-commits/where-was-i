// Local persistence: IndexedDB (sturdier and larger than localStorage), with a
// localStorage fallback when IndexedDB is unavailable (some private modes).
// Data lives on this device only — it does not sync between devices.

const DB_NAME = 'where-was-i';
const STORE = 'kv';
const MAIN_KEY = 'state';
const LS_PREFIX = 'wwi:';
const BACKUP_DAYS = 5;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') throw new Error('no indexedDB');
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    } catch (e) {
      reject(e);
    }
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function idbKeys() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = () => resolve(req.result.map(String));
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function lsGet(key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function lsSet(key, value) {
  localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
}

export async function get(key) {
  try {
    const v = await idbGet(key);
    if (v !== undefined) return v;
  } catch { /* fall through */ }
  return lsGet(key);
}

export async function set(key, value) {
  try {
    await idbSet(key, value);
    return 'idb';
  } catch {
    lsSet(key, value); // throws if both fail — caller shows an error
    return 'ls';
  }
}

export async function loadState() {
  return get(MAIN_KEY);
}

export async function saveState(state) {
  return set(MAIN_KEY, state);
}

// One automatic snapshot per day, keeping the last few days.
export async function dailyBackup(state, todayISO) {
  const key = 'backup-' + todayISO;
  try {
    const keys = (await idbKeys()).filter((k) => k.startsWith('backup-')).sort();
    if (!keys.includes(key)) {
      await idbSet(key, { ...state, backedUpAt: new Date().toISOString() });
      keys.push(key);
    }
    const old = keys.sort().slice(0, Math.max(0, keys.length - BACKUP_DAYS));
    await Promise.all(old.map(idbDelete));
  } catch { /* backups are a bonus, never block the app */ }
}

export async function listBackups() {
  try {
    const keys = (await idbKeys()).filter((k) => k.startsWith('backup-')).sort().reverse();
    const out = [];
    for (const k of keys) {
      const v = await idbGet(k);
      out.push({ key: k, date: k.slice(7), count: (v?.items || []).length, data: v });
    }
    return out;
  } catch {
    return [];
  }
}

// Ask the browser not to clear this site's data under storage pressure.
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch { /* not supported */ }
  return false;
}
