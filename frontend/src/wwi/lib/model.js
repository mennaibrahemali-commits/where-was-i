// Item model for "where was i?".
// Everything the person captures — a task, a grocery item, an idea, a call to
// make, a project — is one "item". Keeping one shape makes search, undo,
// export and import simple and keeps nothing hidden in a side table.

export const AREAS = [
  'groceries', 'errands', 'calls', 'messages', 'appointments',
  'home', 'self', 'work', 'creative', 'ideas', 'other',
];

// Statuses. Nothing is ever removed silently: "trash" is recoverable until the
// person empties it on purpose.
export const STATUSES = ['open', 'later', 'waiting', 'done', 'archived', 'trash'];

export const ENERGY = ['low', 'normal', 'high'];

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// ── Dates (local calendar days as YYYY-MM-DD strings) ──────────────────────
const pad = (n) => String(n).padStart(2, '0');

export function toISODate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function addMonths(iso, n) {
  const d = parseISODate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISODate(d);
}

// Whole days from a to b (b - a).
export function daysBetween(a, b) {
  const ms = parseISODate(b) - parseISODate(a);
  return Math.round(ms / 86400000);
}

// ── Items ──────────────────────────────────────────────────────────────────
export function createItem(partial = {}, now = new Date()) {
  const stamp = now.toISOString();
  return {
    id: uid(),
    title: '',
    area: 'other',
    status: 'open',
    inbox: true,            // just captured, not looked at yet
    isProject: false,
    dueAt: null,            // 'YYYY-MM-DD'
    recurrence: null,       // { freq: 'daily'|'weekly'|'monthly', interval: 1 }
    estimateMins: null,
    energy: null,           // energy the task needs: low | normal | high
    important: false,
    steps: [],              // [{ id, title, done }]
    waitingFor: '',
    waitingSince: null,
    laterUntil: null,       // 'YYYY-MM-DD' or null for "someday"
    lastAction: '',
    nextStep: '',
    notes: '',
    links: [],
    skipCount: 0,
    completions: [],        // ISO timestamps (recurring items keep their history)
    createdAt: stamp,
    updatedAt: stamp,
    startedAt: null,
    touchedAt: null,        // last time the person worked on it
    completedAt: null,
    archivedAt: null,
    deletedAt: null,
    prevStatus: null,       // where to restore from trash
    ...partial,
  };
}

// Next due date for a recurring item, strictly after `afterISO`, stepping from
// its current due date so the rhythm (e.g. every Monday) is kept.
export function nextOccurrence(dueISO, recurrence, afterISO) {
  if (!recurrence) return null;
  const interval = Math.max(1, Number(recurrence.interval) || 1);
  let next = dueISO || afterISO;
  const step = (iso) => {
    if (recurrence.freq === 'daily') return addDays(iso, interval);
    if (recurrence.freq === 'weekly') return addDays(iso, 7 * interval);
    if (recurrence.freq === 'monthly') return addMonths(iso, interval);
    return addDays(iso, interval);
  };
  next = step(next);
  let guard = 0;
  while (daysBetween(afterISO, next) <= 0 && guard < 1000) {
    next = step(next);
    guard++;
  }
  return next;
}

// Completing a recurring item rolls it forward instead of closing it.
export function completeItem(item, now = new Date()) {
  const stamp = now.toISOString();
  const today = toISODate(now);
  if (item.recurrence) {
    return {
      ...item,
      dueAt: nextOccurrence(item.dueAt || today, item.recurrence, today),
      steps: item.steps.map((s) => ({ ...s, done: false })),
      completions: [...(item.completions || []), stamp],
      status: 'open',
      inbox: false,
      touchedAt: stamp,
      updatedAt: stamp,
    };
  }
  return {
    ...item,
    status: 'done',
    inbox: false,
    completedAt: stamp,
    completions: [...(item.completions || []), stamp],
    touchedAt: stamp,
    updatedAt: stamp,
  };
}

// Items parked "later" with a return date come back by themselves, quietly.
export function wakeLaterItems(items, today) {
  let changed = false;
  const out = items.map((it) => {
    if (it.status === 'later' && it.laterUntil && daysBetween(today, it.laterUntil) <= 0) {
      changed = true;
      return { ...it, status: 'open', laterUntil: null, updatedAt: new Date().toISOString() };
    }
    return it;
  });
  return changed ? out : items;
}

export function isActive(it) {
  return it.status === 'open';
}

export function progress(it) {
  const total = it.steps.length;
  const done = it.steps.filter((s) => s.done).length;
  return { total, done };
}

export function firstOpenStep(it) {
  return it.steps.find((s) => !s.done) || null;
}

// Fill in anything missing on items from older exports or other versions.
export function normalizeItem(raw) {
  const base = createItem({}, new Date(raw.createdAt || Date.now()));
  const it = { ...base, ...raw };
  if (!AREAS.includes(it.area)) it.area = 'other';
  if (!STATUSES.includes(it.status)) it.status = 'open';
  it.steps = Array.isArray(it.steps)
    ? it.steps.filter((s) => s && typeof s.title === 'string').map((s) => ({ id: s.id || uid(), title: s.title, done: !!s.done }))
    : [];
  it.links = Array.isArray(it.links) ? it.links.filter((l) => typeof l === 'string') : [];
  it.completions = Array.isArray(it.completions) ? it.completions : [];
  it.title = String(it.title || '');
  return it;
}
