/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { completeItem, createItem, toISODate, wakeLaterItems, addDays, normalizeItem, uid } from './lib/model.js';
import * as storage from './lib/storage.js';
import { makeT } from './i18n.js';
import { dueLabel } from './format.js';

export const STICKER_KINDS = ['star', 'flower', 'moon', 'leaf', 'sun', 'cloud', 'heart', 'cup', 'lantern', 'mango'];

const DEFAULT_SETTINGS = {
  lang: 'ar',
  theme: 'butter',
  mode: 'system',
  playful: true,
  energy: null,      // 'low' | 'normal' | 'high' | 'skip'
  energyDate: null,  // energy is asked fresh each day, never nagged
  lastOpen: null,
  lastStickerDate: null,
};

const Ctx = createContext(null);

export function useApp() {
  return useContext(Ctx);
}

export function AppProvider({ children }) {
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [stickers, setStickers] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [saveError, setSaveError] = useState(false);
  const [previousOpen, setPreviousOpen] = useState(null);

  // UI-level shared state
  const [openItemId, setOpenItemId] = useState(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [focus, setFocus] = useState(null); // { itemId, mins }

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const stickersRef = useRef(stickers);
  stickersRef.current = stickers;

  const t = useMemo(() => makeT(settings.lang), [settings.lang]);

  // ── load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      let saved;
      try {
        saved = await storage.loadState();
      } catch {
        saved = null;
      }
      if (!alive) return;
      const today = toISODate();
      const loadedItems = Array.isArray(saved?.items) ? saved.items.map(normalizeItem) : [];
      const s = { ...DEFAULT_SETTINGS, ...(saved?.settings || {}) };
      setPreviousOpen(s.lastOpen);
      if (s.energyDate !== today) {
        s.energy = null;
        s.energyDate = null;
      }
      s.lastOpen = new Date().toISOString();
      setItems(wakeLaterItems(loadedItems, today));
      setSettings(s);
      setStickers(Array.isArray(saved?.stickers) ? saved.stickers : []);
      setLoaded(true);
      storage.requestPersistence();
    })();
    return () => { alive = false; };
  }, []);

  // ── save (debounced, flushed when the page is hidden) ───────────────────
  const saveTimer = useRef(null);
  const backedUp = useRef(false);
  const persist = useCallback(async () => {
    clearTimeout(saveTimer.current);
    const state = { version: 1, items: itemsRef.current, settings: settingsRef.current, stickers: stickersRef.current };
    try {
      await storage.saveState(state);
      setSaveError(false);
      if (!backedUp.current) {
        backedUp.current = true;
        storage.dailyBackup(state, toISODate());
      }
    } catch {
      setSaveError(true);
    }
  }, []);
  useEffect(() => {
    if (!loaded) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 250);
  }, [items, settings, stickers, loaded, persist]);

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
    root.dir = settings.lang === 'ar' ? 'rtl' : 'ltr';
    root.dataset.palette = settings.theme;
    if (settings.mode === 'system') delete root.dataset.theme;
    else root.dataset.theme = settings.mode;
    document.title = settings.lang === 'ar' ? 'where was i? · كنت فين؟' : 'where was i?';
  }, [settings.lang, settings.theme, settings.mode]);

  // ── toasts ──────────────────────────────────────────────────────────────
  const dismissToast = useCallback((id) => setToasts((ts) => ts.filter((x) => x.id !== id)), []);
  const toast = useCallback((text, opts = {}) => {
    const id = uid();
    // Never more than two at once; a toast with a `key` replaces its older twin.
    setToasts((ts) => [...ts.filter((x) => !opts.key || x.key !== opts.key).slice(-1), { id, text, ...opts }]);
    setTimeout(() => dismissToast(id), opts.undo ? 7000 : 3200);
    return id;
  }, [dismissToast]);

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
        setItems((list) => {
          const ids = new Set(list.map((i) => i.id));
          const restored = replaceById(list, before.filter((b) => ids.has(b.id)));
          return restored;
        });
        toast(makeT(settingsRef.current.lang)('toastUndone'));
      },
    });
  }, [toast]);

  const getItem = useCallback((id) => itemsRef.current.find((i) => i.id === id), []);

  const addItem = useCallback((partial) => {
    const it = createItem(partial);
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
    const after = completeItem(before);
    setItems((list) => replaceById(list, [after]));
    const tt = makeT(settingsRef.current.lang);
    const sticker = awardSticker();
    const msg = before.recurrence ? tt('toastDoneRecurring', { d: dueLabel(after.dueAt, tt, settingsRef.current.lang) }) : tt('toastDone');
    withUndo([before], msg, { celebrate: true, sticker });
    if (sticker) setTimeout(() => toast(tt('toastSticker'), { sticker }), 600);
  }, [getItem, withUndo, awardSticker, toast]);

  const setStatus = useCallback((id, status, extra = {}, message) => {
    const before = getItem(id);
    if (!before) return;
    const stamp = new Date().toISOString();
    const after = { ...before, status, inbox: false, updatedAt: stamp, ...extra };
    if (status === 'archived') after.archivedAt = stamp;
    if (status === 'trash') { after.deletedAt = stamp; after.prevStatus = before.status; }
    if (status === 'open') { after.completedAt = null; }
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
    updateItem(id, (it) => ({ ...it, inbox: false, startedAt: it.startedAt || stamp, touchedAt: stamp }));
  }, [updateItem]);

  const replaceAll = useCallback((data) => {
    setItems(data.items.map(normalizeItem));
    if (data.settings) setSettings((s) => ({ ...s, ...data.settings }));
    if (Array.isArray(data.stickers)) setStickers(data.stickers);
  }, []);

  const mergeIn = useCallback((merged, newStickers = []) => {
    setItems(merged);
    if (newStickers.length) {
      setStickers((list) => {
        const ids = new Set(list.map((s) => s.id));
        return [...list, ...newStickers.filter((s) => !ids.has(s.id))];
      });
    }
  }, []);

  const updateSettings = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);

  const value = {
    loaded, items, settings, stickers, toasts, saveError, previousOpen, t,
    lang: settings.lang,
    addItem, updateItem, complete, setStatus, later, trash, restore, purge, markStarted,
    replaceAll, mergeIn, updateSettings, toast, dismissToast, getItem, persist,
    openItemId, setOpenItemId, captureOpen, setCaptureOpen, focus, setFocus,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
