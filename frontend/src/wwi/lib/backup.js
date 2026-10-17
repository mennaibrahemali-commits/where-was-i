// Export / import of everything as one JSON file.
import { normalizeItem } from './model.js';

export const APP_ID = 'where-was-i';
export const FORMAT_VERSION = 1;

export function buildExport(state, now = new Date()) {
  return {
    app: APP_ID,
    version: FORMAT_VERSION,
    exportedAt: now.toISOString(),
    items: state.items,
    settings: state.settings,
    stickers: state.stickers || [],
  };
}

export function exportFileName(now = new Date()) {
  const d = now.toISOString().slice(0, 10);
  return `where-was-i-backup-${d}.json`;
}

// Returns { ok: true, data } or { ok: false, error: <i18n key> }.
export function parseImport(text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'importNotJson' };
  }
  if (!json || typeof json !== 'object' || json.app !== APP_ID || !Array.isArray(json.items)) {
    return { ok: false, error: 'importWrongFile' };
  }
  if (json.version > FORMAT_VERSION) {
    return { ok: false, error: 'importNewer' };
  }
  const items = json.items
    .filter((it) => it && typeof it === 'object' && typeof it.id === 'string')
    .map(normalizeItem);
  return {
    ok: true,
    data: {
      items,
      settings: json.settings && typeof json.settings === 'object' ? json.settings : null,
      stickers: Array.isArray(json.stickers) ? json.stickers : [],
    },
  };
}

// Merge keeps everything: same id → the more recently updated copy wins.
export function mergeItems(current, incoming) {
  const map = new Map(current.map((it) => [it.id, it]));
  for (const it of incoming) {
    const have = map.get(it.id);
    if (!have || (it.updatedAt || '') > (have.updatedAt || '')) map.set(it.id, it);
  }
  return [...map.values()];
}
