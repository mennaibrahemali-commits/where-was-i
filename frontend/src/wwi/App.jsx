import { useCallback, useEffect, useState } from 'react';
import { AppProvider, useApp } from './store.jsx';
import { Icon, Sticker } from './components/art.jsx';
import Today from './components/Today.jsx';
import Everything from './components/Everything.jsx';
import Projects from './components/Projects.jsx';
import More from './components/More.jsx';
import Capture from './components/Capture.jsx';
import ItemSheet from './components/ItemSheet.jsx';
import Focus from './components/Focus.jsx';

const SCREENS = ['today', 'all', 'projects', 'more'];

function readHash() {
  const [screen, sub] = window.location.hash.replace('#', '').split('/');
  return { screen: SCREENS.includes(screen) ? screen : 'today', sub: sub || null };
}

function Shell() {
  const { t, loaded, toasts, dismissToast, setCaptureOpen, saveError, openItemId, focus, captureOpen } = useApp();
  const [{ screen, sub }, setRoute] = useState(readHash);
  const [filter, setFilter] = useState(sub && screen === 'all' ? sub : 'open');

  const go = useCallback((s, subKey) => {
    window.location.hash = subKey ? `${s}/${subKey}` : s;
    if (s === 'all' && subKey) setFilter(subKey);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const on = () => setRoute(readHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  // "N" opens quick capture from anywhere (when not typing).
  useEffect(() => {
    const on = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (openItemId || focus || captureOpen) return;
      if (e.key === 'n' || e.key === 'N' || e.key === 'ى') { e.preventDefault(); setCaptureOpen(true); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [setCaptureOpen, openItemId, focus, captureOpen]);

  const nav = [
    { id: 'today', label: t('navToday'), icon: Icon.today },
    { id: 'all', label: t('navAll'), icon: Icon.all },
    { id: 'projects', label: t('navProjects'), icon: Icon.projects },
    { id: 'more', label: t('navMore'), icon: Icon.more },
  ];

  if (!loaded) {
    return (
      <div className="loading" role="status">
        <div className="loading-dot" aria-hidden="true" />
        <p>{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="app">
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
        <button type="button" className="btn primary rail-add" onClick={() => setCaptureOpen(true)}><Icon.plus />{t('addNew')}</button>
      </aside>

      <main id="main" className="main" tabIndex={-1}>
        {saveError && <div className="banner warn" role="alert">{t('toastSaveError')}</div>}
        {screen === 'today' && <Today go={go} />}
        {screen === 'all' && <Everything filter={filter} setFilter={(f) => { setFilter(f); window.location.hash = 'all/' + f; }} />}
        {screen === 'projects' && <Projects />}
        {screen === 'more' && <More section={sub} />}
      </main>

      <button type="button" className="fab" onClick={() => setCaptureOpen(true)} aria-label={t('addNew')}>
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
            <button type="button" className="toast-x" onClick={() => dismissToast(tt.id)} aria-label={t('close')}><Icon.close /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WhereWasI() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
