// Pure merge rules for keeping a device and the account copy in step.
// Rule: for each item, the copy with the later updatedAt wins — except that
// a change made on this device and not yet uploaded ("dirty") is never
// overwritten. Permanently deleted items leave a small "purged" marker so the
// deletion reaches other devices too.
import { normalizeItem } from './model.js';

export const SETTINGS_DOC = '__settings';
export const STICKERS_DOC = '__stickers';

// Settings that follow the person across devices (the rest is per device).
export const SYNCED_SETTINGS = ['lang', 'theme', 'mode', 'playful', 'alarmSound', 'nudgeTime'];

export function isMetaDoc(id) {
  return id === SETTINGS_DOC || id === STICKERS_DOC;
}

// Returns { items, changed, applied } where `applied` are the item objects
// that came from the server (so they aren't re-uploaded).
export function mergeRemoteItems(local, rows, dirty = new Set()) {
  const map = new Map(local.map((it) => [it.id, it]));
  const applied = [];
  let changed = false;
  for (const row of rows) {
    if (isMetaDoc(row.id)) continue;
    const data = row.data || {};
    const have = map.get(row.id);
    if (data.purged) {
      if (have && !dirty.has(row.id)) { map.delete(row.id); changed = true; }
      continue;
    }
    if (dirty.has(row.id)) continue;
    if (!have || (data.updatedAt || '') > (have.updatedAt || '')) {
      const it = normalizeItem({ ...data, id: row.id });
      map.set(row.id, it);
      applied.push(it);
      changed = true;
    }
  }
  return { items: changed ? [...map.values()] : local, changed, applied };
}

export function pickSyncedSettings(settings) {
  const out = {};
  for (const k of SYNCED_SETTINGS) if (k in settings) out[k] = settings[k];
  return out;
}

export function mergeStickers(local, remote) {
  const ids = new Set(local.map((s) => s.id));
  const extra = (remote || []).filter((s) => s && s.id && !ids.has(s.id));
  return extra.length ? [...local, ...extra] : local;
}

// Latest server timestamp seen, to only ask for newer rows next time.
export function latestStamp(rows, current) {
  return rows.reduce((m, r) => (r.updated_at && r.updated_at > (m || '') ? r.updated_at : m), current || null);
}
