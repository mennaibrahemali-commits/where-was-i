/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { completeItem, createItem, toISODate, wakeLaterItems, addDays, normalizeItem, uid, setStage as stageItem } from './lib/model.js';
import * as storage from './lib/storage.js';
import * as cloud from './lib/cloud.js';
import { mergeRemoteItems, mergeStickers, latestStamp, pickSyncedSettings, SETTINGS_DOC, STICKERS_DOC } from './lib/sync.js';
import { dueReminders, reminderKey, importantLeftToday, shouldNudge } from './lib/reminders.js';
import { notify, playBellOnce, unlockAudio } from './lib/alarm.js';
import { makeT } from './i18n.js';
import { dueLabel } from './format.js';

export const STICKER_KINDS = ['star', 'flower', 'moon', 'leaf', 'sun', 'cloud', 'heart', 'cup', 'lantern', 'mango'];

const DEFAULT_SETTINGS = {
  lang: 'ar',
  theme: 'butter',
  mode: 'system',
  playful: true,
  alarmSound: true,     // ring when a focus timer ends
  nudgeTime: '18:00',   // daily check for important things left today (null = off)
  energy: null,         // 'low' | 'normal' | 'high' | 'skip'
  energyDate: null,     // energy is asked fresh each day, never nagged
  lastOpen: null,
  lastStickerDate: null,
  lastNudgeDate: null,
  firedReminders: [],
  guestImportAsked: false,
};

// The last language used, so the sign-in screen and a brand-new account
// open in it.
export function readUiLang() {
  try { return localStorage.getItem('wwi:ui-lang') === 'en' ? 'en' : 'ar'; } catch { return 'ar'; }
}
export function writeUiLang(lang) {
  try { localStorage.setItem('wwi:ui-lang', lang); } catch { /* ignore */ }
}

const Ctx = createContext(null);

export function useApp() {
  return useContext(Ctx);
}

// `user` is the signed-in account (or null when the app runs without accounts).
export function AppProvider({ user = null, onSignOut, children }) {
  const storeKey = storage.userKey(user?.id);
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [stickers, setStickers] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [saveError, setSaveError] = useState(false);
  const [previousOpen, setPreviousOpen] = useState(null);
  const [guestItems, setGuestItems] = useState([]);   // found on this device from before signing in
  const [syncState, setSyncState] = useState(user ? 'syncing' : 'local'); // local | syncing | synced | offline | error
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // UI-level shared state
  const [openItemId, setOpenItemId] = useState(null);
  const [capture, setCapture] = useState(null);        // null | { space }
  const [focus, setFocus] = useState(null);            // { itemId, mins }

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const stickersRef = useRef(stickers);
  stickersRef.current = stickers;

  // Sync bookkeeping (kept in the local copy so nothing is lost offline).
  const dirty = useRef(new Set());          // item ids changed here, not yet uploaded
  const purged = useRef(new Set());         // item ids deleted for good here
  const metaDirty = useRef({ settings: false, stickers: false });
  const fromServer = useRef(new WeakSet());  // item objects that came from the server
  const lastPull = useRef(null);
  const prevItems = useRef(new Map());
  const prevSettingsSynced = useRef(null);
  const prevStickers = useRef(null);

  const t = useMemo(() => makeT(settings.lang), [settings.lang]);

  // ── load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      let saved;
      try { saved = await storage.loadState(storeKey); } catch { saved = null; }
      let guest = null;
      if (user) {
        try { guest = await storage.loadState(storage.GUEST_KEY); } catch { guest = null; }
      }
      if (!alive) return;
      const today = toISODate();
      const loadedItems = Array.isArray(saved?.items) ? saved.items.map(normalizeItem) : [];
      const s = { ...DEFAULT_SETTINGS, ...(saved?.settings || {}) };
      if (!saved?.settings) s.lang = readUiLang();
      setPreviousOpen(s.lastOpen);
      if (s.energyDate !== today) { s.energy = null; s.energyDate = null; }
      s.lastOpen = new Date().toISOString();
      const woke = wakeLaterItems(loadedItems, today);
      dirty.current = new Set(saved?.sync?.dirty || []);
      purged.current = new Set(saved?.sync?.purged || []);
      metaDirty.current = saved?.sync?.meta || { settings: false, stickers: false };
      lastPull.current = saved?.sync?.lastPull || null;
      prevItems.current = new Map(woke.map((it) => [it.id, it]));
      woke.forEach((it) => { if (it !== loadedItems.find((x) => x.id === it.id)) dirty.current.add(it.id); });
      prevSettingsSynced.current = JSON.stringify(pickSyncedSettings(s));
      const st = Array.isArray(saved?.stickers) ? saved.stickers : [];
      prevStickers.current = st;
      setItems(woke);
      setSettings(s);
      setStickers(st);
      if (user && guest?.items?.length && !s.guestImportAsked) setGuestItems(guest.items.map(normalizeItem));
      setLoaded(true);
      storage.requestPersistence();
    })();
    return () => { alive = false; };
  }, [storeKey, user]);

  // ── track what changed, for uploading ───────────────────────────────────
  useEffect(() => {
    if (!loaded) return;
    const next = new Map(items.map((it) => [it.id, it]));
    for (const [id, it] of next) {
      if (prevItems.current.get(id) !== it && !fromServer.current.has(it)) dirty.current.add(id);
    }
    for (const id of prevItems.current.keys()) {
      if (!next.has(id)) { purged.current.add(id); dirty.current.delete(id); }
    }
    prevItems.current = next;
  }, [items, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const synced = JSON.stringify(pickSyncedSettings(settings));
    if (prevSettingsSynced.current !== null && synced !== prevSettingsSynced.current) metaDirty.current.settings = true;
    prevSettingsSynced.current = synced;
  }, [settings, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (prevStickers.current && prevStickers.current !== stickers && stickers.length !== prevStickers.current.length) metaDirty.current.stickers = true;
    prevStickers.current = stickers;
  }, [stickers, loaded]);

  // ── save on this device (debounced, flushed when the page is hidden) ────
  const saveTimer = useRef(null);
  const backedUp = useRef(false);
  const persist = useCallback(async () => {
    clearTimeout(saveTimer.current);
    const state = {
      version: 2,
      items: itemsRef.current,
      settings: settingsRef.current,
      stickers: stickersRef.current,
      sync: { dirty: [...dirty.current], purged: [...purged.current], meta: metaDirty.current, lastPull: lastPull.current },
    };
    try {
      await storage.saveState(state, storeKey);
      setSaveError(false);
      if (!backedUp.current) {
        backedUp.current = true;
        storage.dailyBackup(state, toISODate(), storeKey);
      }
    } catch {
      setSaveError(true);
    }
  }, [storeKey]);

  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 250);
  }, [items, settings, stickers, loaded, persist]);

  // ── sync with the account ───────────────────────────────────────────────
  const syncing = useRef(false);
  const syncAgain = useRef(false);
  const syncNow = useCallback(async () => {
    if (!user || !cloud.cloudEnabled) return true;
    if (syncing.current) { syncAgain.current = true; return false; }
    if (!navigator.onLine) { setSyncState('offline'); return false; }
    syncing.current = true;
    setSyncState('syncing');
    try {
      // 1) upload what changed here
      const sentAt = new Map();
      const docs = [];
      for (const id of dirty.current) {
        const it = itemsRef.current.find((x) => x.id === id);
        if (it) { docs.push({ id, data: it }); sentAt.set(id, it); }
      }
      for (const id of purged.current) docs.push({ id, data: { purged: true, updatedAt: new Date().toISOString() } });
      const sendSettings = metaDirty.current.settings;
      const sendStickers = metaDirty.current.stickers;
      if (sendSettings) docs.push({ id: SETTINGS_DOC, data: { ...pickSyncedSettings(settingsRef.current), updatedAt: new Date().toISOString() } });
      if (sendStickers) docs.push({ id: STICKERS_DOC, data: { list: stickersRef.current } });
      const purgedSent = [...purged.current];
      await cloud.pushDocs(user.id, docs);
      for (const [id, it] of sentAt) {
        // only clear if it hasn't changed again while uploading
        const now = itemsRef.current.find((x) => x.id === id);
        if (!now || now === it) dirty.current.delete(id);
      }
      purgedSent.forEach((id) => purged.current.delete(id));
      if (sendSettings) metaDirty.current.settings = false;
      if (sendStickers) metaDirty.current.stickers = false;

      // 2) download what changed elsewhere
      const rows = await cloud.pullSince(lastPull.current);
      lastPull.current = latestStamp(rows, lastPull.current);
      if (rows.length) {
        setItems((local) => {
          const r = mergeRemoteItems(local, rows, dirty.current);
          r.applied.forEach((it) => fromServer.current.add(it));
          // removals that came from the server are not new deletions
          if (r.changed) {
            const keep = new Set(r.items.map((i) => i.id));
            for (const it of local) if (!keep.has(it.id)) prevItems.current.delete(it.id);
          }
          return r.items;
        });
        const sRow = rows.find((r) => r.id === SETTINGS_DOC);
        if (sRow && !metaDirty.current.settings) {
          const incoming = pickSyncedSettings(sRow.data || {});
          prevSettingsSynced.current = JSON.stringify({ ...pickSyncedSettings(settingsRef.current), ...incoming });
          setSettings((s) => ({ ...s, ...incoming }));
        }
        const stRow = rows.find((r) => r.id === STICKERS_DOC);
        if (stRow) {
          setStickers((s) => {
            const m = mergeStickers(s, stRow.data?.list);
            if (m.length !== (stRow.data?.list || []).length) metaDirty.current.stickers = true;
            prevStickers.current = m;
            return m;
          });
        }
      }
      setSyncState('synced');
      setLastSyncedAt(new Date().toISOString());
      persist();
      return dirty.current.size === 0 && purged.current.size === 0;
    } catch (e) {
      setSyncState(navigator.onLine ? 'error' : 'offline');
      if (e?.status === 401 || /jwt/i.test(e?.message || '')) {
        // session expired and couldn't refresh: ask to sign in again
        const s = await cloud.getSession().catch(() => null);
        if (!s) onSignOut?.({ expired: true });
      }
      return false;
    } finally {
      syncing.current = false;
      if (syncAgain.current) { syncAgain.current = false; setTimeout(syncNow, 300); }
    }
  }, [user, persist, onSignOut]);

  // Upload a little after each change; pull on open, focus, reconnect and every 2 minutes.
  const pushTimer = useRef(null);
  useEffect(() => {
    if (!loaded || !user) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(syncNow, 1200);
  }, [items, settings, stickers, loaded, user, syncNow]);

  useEffect(() => {
    if (!loaded || !user) return undefined;
    syncNow();
    const onFocus = () => { if (document.visibilityState === 'visible') syncNow(); };
    const onOnline = () => syncNow();
    const onOffline = () => setSyncState('offline');
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const iv = setInterval(syncNow, 120000);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(iv);
    };
  }, [loaded, user, syncNow]);

  useEffect(() => {
    const flush = () => { if (document.visibilityState === 'hidden') persist(); };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', persist);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', persist);
    };
  }, [persist]);

  // ── document language, direction and theme ──────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    root.lang = settings.lang;
    if (loaded) writeUiLang(settings.lang);
    root.dir = settings.lang === 'ar' ? 'rtl' : 'ltr';
    root.dataset.palette = settings.theme;
    if (settings.mode === 'system') delete root.dataset.theme;
    else root.dataset.theme = settings.mode;
    document.title = settings.lang === 'ar' ? 'where was i? · كنت فين؟' : 'where was i?';
  }, [settings.lang, settings.theme, settings.mode, loaded]);

  // ── toasts ──────────────────────────────────────────────────────────────
  const dismissToast = useCallback((id) => setToasts((ts) => ts.filter((x) => x.id !== id)), []);
  const toast = useCallback((text, opts = {}) => {
    const id = uid();
    // Never more than two at once; a toast with a `key` replaces its older twin.
    setToasts((ts) => [...ts.filter((x) => !opts.key || x.key !== opts.key).slice(-1), { id, text, ...opts }]);
    setTimeout(() => dismissToast(id), opts.undo ? 7000 : opts.long ? 9000 : 3200);
    return id;
  }, [dismissToast]);

  // ── reminders (while the app is open or recently in the background) ─────
  useEffect(() => {
    if (!loaded) return undefined;
    const check = () => {
      const now = new Date();
      const s = settingsRef.current;
      const tt = makeT(s.lang);
      const due = dueReminders(itemsRef.current, now, s.firedReminders || []);
      if (due.length) {
        for (const it of due) {
          notify(tt('reminderTitle'), it.title, reminderKey(it));
          toast(`${tt('reminderTitle')}: ${it.title}`, { key: 'rem-' + it.id, long: true, openId: it.id });
        }
        if (s.alarmSound) playBellOnce();
        setSettings((st) => ({ ...st, firedReminders: [...(st.firedReminders || []), ...due.map(reminderKey)].slice(-200) }));
      }
      if (shouldNudge(now, s.nudgeTime, s.lastNudgeDate)) {
        const left = importantLeftToday(itemsRef.current, toISODate(now));
        if (left.length) {
          const body = left.slice(0, 3).map((i) => i.title).join('، ');
          notify(tt('nudgeTitle'), body, 'nudge');
          toast(`${tt('nudgeTitle')}: ${body}`, { key: 'nudge', long: true, openId: left[0].id });
        }
        setSettings((st) => ({ ...st, lastNudgeDate: toISODate(now) }));
      }
    };
    check();
    const iv = setInterval(check, 30000);
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
  }, [loaded, toast]);

  // ── item mutations ──────────────────────────────────────────────────────
  const replaceById = (list, updated) => {
    const map = new Map(updated.map((u) => [u.id, u]));
    return list.map((it) => map.get(it.id) || it);
  };

  // Undo restores the exact previous versions of the items an action touched.
  const withUndo = useCallback((before, message, extra = {}) => {
    toast(message, {
      ...extra,
      undo: () => {
        const stamp = new Date().toISOString();
        setItems((list) => {
          const ids = new Set(list.map((i) => i.id));
          // a fresh updatedAt so the undo also wins on other devices
          return replaceById(list, before.filter((b) => ids.has(b.id)).map((b) => ({ ...b, updatedAt: stamp })));
        });
        toast(makeT(settingsRef.current.lang)('toastUndone'));
      },
    });
  }, [toast]);

  const getItem = useCallback((id) => itemsRef.current.find((i) => i.id === id), []);

  const addItem = useCallback((partial) => {
    const it = createItem(partial.space === 'work' ? { stage: 'new', ...partial } : partial);
    setItems((list) => [it, ...list]);
    return it;
  }, []);

  const updateItem = useCallback((id, patch) => {
    setItems((list) => list.map((it) => {
      if (it.id !== id) return it;
      const next = typeof patch === 'function' ? patch(it) : { ...it, ...patch };
      return { ...next, updatedAt: new Date().toISOString() };
    }));
  }, []);

  const awardSticker = useCallback(() => {
    const s = settingsRef.current;
    if (!s.playful) return null;
    const today = toISODate();
    const first = s.lastStickerDate !== today;
    if (!first && Math.random() > 0.3) return null;
    const kind = STICKER_KINDS[Math.floor(Math.random() * STICKER_KINDS.length)];
    const sticker = { id: uid(), kind, at: new Date().toISOString() };
    setStickers((list) => [...list, sticker]);
    setSettings((st) => ({ ...st, lastStickerDate: today }));
    return sticker;
  }, []);

  const complete = useCallback((id) => {
    const before = getItem(id);
    if (!before) return;
    const after = before.space === 'work' ? stageItem(before, 'delivered') : completeItem(before);
    setItems((list) => replaceById(list, [after]));
    const tt = makeT(settingsRef.current.lang);
    const sticker = awardSticker();
    const msg = before.space === 'work' ? tt('toastDelivered') : before.recurrence ? tt('toastDoneRecurring', { d: dueLabel(after.dueAt, tt, settingsRef.current.lang) }) : tt('toastDone');
    withUndo([before], msg, { celebrate: true, sticker });
    if (sticker) setTimeout(() => toast(tt('toastSticker'), { sticker }), 600);
  }, [getItem, withUndo, awardSticker, toast]);

  const moveStage = useCallback((id, stage) => {
    const before = getItem(id);
    if (!before) return;
    if (stage === 'delivered') { complete(id); return; }
    setItems((list) => replaceById(list, [stageItem(before, stage)]));
  }, [getItem, complete]);

  const setStatus = useCallback((id, status, extra = {}, message) => {
    const before = getItem(id);
    if (!before) return;
    const stamp = new Date().toISOString();
    const after = { ...before, status, inbox: false, updatedAt: stamp, ...extra };
    if (status === 'archived') after.archivedAt = stamp;
    if (status === 'trash') { after.deletedAt = stamp; after.prevStatus = before.status; }
    if (status === 'open') {
      after.completedAt = null;
      if (before.space === 'work' && before.stage === 'delivered') after.stage = 'revisions';
    }
    setItems((list) => replaceById(list, [after]));
    if (message) withUndo([before], message);
  }, [getItem, withUndo]);

  const later = useCallback((id, when) => {
    const today = toISODate();
    const until = when === 'tomorrow' ? addDays(today, 1) : when === 'week' ? addDays(today, 7) : null;
    const before = getItem(id);
    setStatus(id, 'later', { laterUntil: until, skipCount: (before?.skipCount || 0) + 1 }, makeT(settingsRef.current.lang)('toastLater'));
  }, [setStatus, getItem]);

  const trash = useCallback((id) => setStatus(id, 'trash', {}, makeT(settingsRef.current.lang)('toastDeleted')), [setStatus]);

  const restore = useCallback((id) => {
    const it = getItem(id);
    if (!it) return;
    const back = it.prevStatus && it.prevStatus !== 'trash' ? it.prevStatus : 'open';
    setStatus(id, back, { deletedAt: null, prevStatus: null }, makeT(settingsRef.current.lang)('toastRestored'));
  }, [getItem, setStatus]);

  const purge = useCallback((ids) => {
    const set = new Set(ids);
    setItems((list) => list.filter((it) => !(set.has(it.id) && it.status === 'trash')));
  }, []);

  const markStarted = useCallback((id) => {
    const stamp = new Date().toISOString();
    updateItem(id, (it) => ({
      ...it,
      inbox: false,
      startedAt: it.startedAt || stamp,
      touchedAt: stamp,
      stage: it.space === 'work' && it.stage === 'new' ? 'doing' : it.stage,
    }));
  }, [updateItem]);

  const replaceAll = useCallback((data) => {
    setItems(data.items.map(normalizeItem));
    if (data.settings) setSettings((s) => ({ ...s, ...data.settings }));
    if (Array.isArray(data.stickers)) setStickers(data.stickers);
  }, []);

  const mergeIn = useCallback((merged, newStickers = []) => {
    setItems(merged);
    if (newStickers.length) setStickers((list) => mergeStickers(list, newStickers));
  }, []);

  const updateSettings = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);

  // Things saved on this device before signing in: add them to the account, or leave them.
  const resolveGuestItems = useCallback(async (add) => {
    if (add && guestItems.length) {
      setItems((list) => {
        const have = new Set(list.map((i) => i.id));
        return [...guestItems.filter((g) => !have.has(g.id)).map((g) => ({ ...g, updatedAt: new Date().toISOString() })), ...list];
      });
      await storage.removeState(storage.GUEST_KEY);
      await storage.removeBackups(storage.GUEST_KEY);
    }
    setGuestItems([]);
    setSettings((s) => ({ ...s, guestImportAsked: true }));
  }, [guestItems]);

  const pendingCount = () => dirty.current.size + purged.current.size;

  // Sign out: upload first; then remove this account's copy from the device.
  const signOut = useCallback(async ({ force = false } = {}) => {
    await persist();
    const ok = await syncNow();
    if (!ok && !force && pendingCount() > 0) return { pending: pendingCount() };
    await storage.removeState(storeKey);
    await storage.removeBackups(storeKey);
    onSignOut?.({});
    return { done: true };
  }, [persist, syncNow, storeKey, onSignOut]);

  const value = {
    loaded, items, settings, stickers, toasts, saveError, previousOpen, t,
    lang: settings.lang,
    user, syncState, lastSyncedAt, syncNow, signOut, guestItems, resolveGuestItems,
    addItem, updateItem, complete, setStatus, later, trash, restore, purge, markStarted, moveStage,
    replaceAll, mergeIn, updateSettings, toast, dismissToast, getItem, persist,
    openItemId, setOpenItemId,
    capture, setCapture,
    captureOpen: !!capture,
    setCaptureOpen: (v) => setCapture(v ? (typeof v === 'object' ? v : { space: 'life' }) : null),
    focus,
    // Starting a timer always comes from a tap: unlock sound right then, so
    // the alarm is allowed to ring when time is up (needed on iPhone).
    setFocus: (v) => { if (v) unlockAudio(); setFocus(v); },
    storeKey,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
