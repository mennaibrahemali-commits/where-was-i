import { useCallback, useEffect, useRef, useState } from 'react';
import { AppProvider, useApp, readUiLang } from './store.jsx';
import { Icon, Sticker } from './components/art.jsx';
import Today from './components/Today.jsx';
import Everything from './components/Everything.jsx';
import Work from './components/Work.jsx';
import More from './components/More.jsx';
import Capture from './components/Capture.jsx';
import ItemSheet from './components/ItemSheet.jsx';
import Focus from './components/Focus.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import * as cloud from './lib/cloud.js';
import { makeT } from './i18n.js';

const SCREENS = ['today', 'all', 'work', 'more'];

function readHash() {
  let [screen, sub] = window.location.hash.replace('#', '').split('/');
  if (screen === 'projects') { screen = 'all'; sub = 'projects'; }
  return { screen: SCREENS.includes(screen) ? screen : 'today', sub: sub || null };
}

function Loading({ text }) {
  return (
    <div className="loading" role="status">
      <div className="loading-dot" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

function Shell() {
  const { t, loaded, toasts, dismissToast, setCapture, saveError, openItemId, setOpenItemId, focus, captureOpen } = useApp();
  const [{ screen, sub }, setRoute] = useState(readHash);
  const [filter, setFilter] = useState(sub && screen === 'all' ? sub : 'open');

  const go = useCallback((s, subKey) => {
    window.location.hash = subKey ? `${s}/${subKey}` : s;
    if (s === 'all' && subKey) setFilter(subKey);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const on = () => {
      const r = readHash();
      setRoute(r);
      if (r.screen === 'all' && r.sub) setFilter(r.sub);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  // On the Work board, "add" adds work; everywhere else it adds to daily life.
  const openCapture = useCallback(() => setCapture({ space: screen === 'work' ? 'work' : 'life' }), [screen, setCapture]);

  // "N" opens quick capture from anywhere (when not typing).
  useEffect(() => {
    const on = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (openItemId || focus || captureOpen) return;
      if (e.key === 'n' || e.key === 'N' || e.key === 'ى') { e.preventDefault(); openCapture(); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [openCapture, openItemId, focus, captureOpen]);

  const nav = [
    { id: 'today', label: t('navToday'), icon: Icon.today },
    { id: 'all', label: t('navMine'), icon: Icon.all },
    { id: 'work', label: t('navWork'), icon: Icon.work },
    { id: 'more', label: t('navMore'), icon: Icon.more },
  ];

  if (!loaded) return <Loading text={t('loading')} />;

  return (
    <div className={`app screen-${screen}`}>
      <a href="#main" className="skip-link">{t('skipToContent')}</a>
      <aside className="rail" aria-label="where was i?">
        <div className="wordmark" aria-hidden="true">
          <span className="wm-en">where was i?</span>
          {t('appNameLocal') !== 'where was i?' && <span className="wm-ar">{t('appNameLocal')}</span>}
        </div>
        <nav className="nav" aria-label={t('navLabel')}>
          {nav.map((n) => (
            <button key={n.id} type="button" className={`nav-btn ${screen === n.id ? 'on' : ''}`} aria-current={screen === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
              <n.icon /><span>{n.label}</span>
            </button>
          ))}
        </nav>
        <button type="button" className="btn primary rail-add" onClick={openCapture}><Icon.plus />{t('addNew')}</button>
      </aside>

      <main id="main" className="main" tabIndex={-1}>
        {saveError && <div className="banner warn" role="alert">{t('toastSaveError')}</div>}
        {screen === 'today' && <Today go={go} />}
        {screen === 'all' && <Everything filter={filter} setFilter={(f) => { setFilter(f); window.location.hash = 'all/' + f; }} />}
        {screen === 'work' && <Work />}
        {screen === 'more' && <More section={sub} />}
      </main>

      <button type="button" className={`fab ${screen === 'work' ? 'fab-work' : ''}`} onClick={openCapture} aria-label={t('addNew')}>
        <Icon.plus />
      </button>

      <nav className="tabbar" aria-label={t('navLabel')}>
        {nav.map((n) => (
          <button key={n.id} type="button" className={`tab-btn ${screen === n.id ? 'on' : ''}`} aria-current={screen === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
            <n.icon /><span>{n.label}</span>
          </button>
        ))}
      </nav>

      <Capture />
      <ItemSheet />
      <Focus />

      <div className="toasts" aria-live="polite" aria-atomic="false">
        {toasts.map((tt) => (
          <div key={tt.id} className={`toast ${tt.celebrate ? 'celebrate' : ''}`} role="status">
            {tt.sticker && !tt.undo && <Sticker kind={tt.sticker.kind} size={30} tilt={-8} />}
            <span className="toast-text">{tt.text}</span>
            {tt.undo && <button type="button" className="toast-undo" onClick={() => { tt.undo(); dismissToast(tt.id); }}>{t('undo')}</button>}
            {tt.openId && <button type="button" className="toast-undo" onClick={() => { setOpenItemId(tt.openId); dismissToast(tt.id); }}>{t('look')}</button>}
            <button type="button" className="toast-x" onClick={() => dismissToast(tt.id)} aria-label={t('close')}><Icon.close /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// With accounts: show the sign-in screen until someone is signed in.
function CloudRoot() {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [recovery, setRecovery] = useState(false);
  const [notice, setNotice] = useState(null);
  const userRef = useRef(null);

  useEffect(() => {
    let alive = true;
    cloud.getSession().then((s) => { if (alive) setSession(s); }).catch(() => alive && setSession(null));
    const off = cloud.onAuthChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setSession(null);
      else if (s) setSession(s);
    });
    return () => { alive = false; off(); };
  }, []);

  const onSignOut = useCallback(async ({ expired } = {}) => {
    if (expired) setNotice('authExpired');
    await cloud.signOut();
    userRef.current = null;
    setSession(null);
  }, []);

  if (session === undefined) return <Loading text={makeT(readUiLang())('loading')} />;
  if (recovery) return <AuthScreen initialMode="recovery" onRecovered={() => setRecovery(false)} />;
  if (!session) return <AuthScreen initialMode={notice ? 'signin' : 'signup'} notice={notice} />;

  // keep the same user object across token refreshes so the app doesn't reload
  if (!userRef.current || userRef.current.id !== session.user.id) userRef.current = { id: session.user.id, email: session.user.email };
  return (
    <AppProvider key={userRef.current.id} user={userRef.current} onSignOut={onSignOut}>
      <Shell />
    </AppProvider>
  );
}

export default function WhereWasI() {
  if (cloud.cloudEnabled) return <CloudRoot />;
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
