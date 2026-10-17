import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store.jsx';
import { Chips, Toggle } from './ui.jsx';
import { Sticker, Icon } from './art.jsx';
import { buildExport, exportFileName, parseImport, mergeItems } from '../lib/backup.js';
import { listBackups, set as storageSet } from '../lib/storage.js';
import { formatNumber } from '../i18n.js';
import { formatDate } from '../format.js';
import { playBellOnce, unlockAudio, askNotificationPermission, notificationPermission } from '../lib/alarm.js';

const UPSTREAM = 'https://github.com/tanay9098/JumpyBrain';
// AGPL §13: if you host a modified version, point this at your own source.
const SOURCE_URL = import.meta.env.VITE_SOURCE_URL || UPSTREAM;

let deferredInstall = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
}

export default function More({ section }) {
  const app = useApp();
  const { t, lang, settings, updateSettings, items, stickers, toast } = app;
  const [pending, setPending] = useState(null);   // parsed import awaiting a choice
  const [importError, setImportError] = useState('');
  const [backups, setBackups] = useState([]);
  const [confirmBackup, setConfirmBackup] = useState(null);
  const [canInstall, setCanInstall] = useState(!!deferredInstall);
  const [backupText, setBackupText] = useState('');
  const [pasteText, setPasteText] = useState('');
  const fileRef = useRef(null);
  const backupTextRef = useRef(null);
  const jarRef = useRef(null);

  const [notif, setNotif] = useState(notificationPermission);
  const [signOutPending, setSignOutPending] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => { listBackups(app.storeKey).then(setBackups); }, [app.storeKey]);
  useEffect(() => {
    if (section === 'jar') jarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [section]);
  useEffect(() => {
    const on = () => setCanInstall(true);
    window.addEventListener('beforeinstallprompt', on);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);

  const doExport = () => {
    const data = buildExport({ items, settings, stickers });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName();
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // Always show the text (selectable), and also try the clipboard.
  // Some browsers neither allow nor refuse clipboard access, so never rely on it.
  const copyBackup = () => {
    const text = JSON.stringify(buildExport({ items, settings, stickers }));
    setBackupText(text);
    setTimeout(() => backupTextRef.current?.select(), 50);
    try {
      navigator.clipboard.writeText(text).then(() => toast(t('copied')), () => toast(t('copyFailed')));
    } catch {
      toast(t('copyFailed'));
    }
  };

  const fromPaste = () => {
    setImportError('');
    const res = parseImport(pasteText.trim());
    if (!res.ok) { setImportError(t(res.error)); return; }
    setPending(res.data);
    setPasteText('');
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError('');
    const res = parseImport(await file.text());
    if (!res.ok) { setImportError(t(res.error)); return; }
    setPending(res.data);
  };

  // Before any replace, keep a copy of what's here now.
  const safetyCopy = async () => {
    try { await storageSet('before-import-' + Date.now(), { items, settings, stickers }); } catch { /* best effort */ }
  };

  const applyImport = async (mode) => {
    if (!pending) return;
    if (mode === 'replace') {
      await safetyCopy();
      app.replaceAll(pending);
    } else {
      app.mergeIn(mergeItems(items, pending.items), pending.stickers);
    }
    toast(t('importDone', { n: formatNumber(pending.items.length, lang) }));
    setPending(null);
  };

  const restoreBackup = async (b) => {
    await safetyCopy();
    app.replaceAll(b.data);
    setConfirmBackup(null);
    toast(t('importDone', { n: formatNumber(b.count, lang) }));
  };

  const doSignOut = async (force = false) => {
    setSigningOut(true);
    const r = await app.signOut({ force });
    setSigningOut(false);
    if (r?.pending) setSignOutPending(r.pending);
  };

  return (
    <div className="screen more">
      <h1 className="screen-title">{t('moreTitle')}</h1>

      {app.user && (
        <section className="panel account" aria-labelledby="acct-h">
          <h2 id="acct-h" className="small-h">{t('accountTitle')}</h2>
          <p className="note" dir="auto">{t('signedInAs', { email: app.user.email })}</p>
          <p className={`sync-line s-${app.syncState}`} role="status"><span className="sync-dot" aria-hidden="true" />{t('sync_' + app.syncState)}</p>
          <div className="row-actions">
            <button type="button" className="btn small" onClick={() => app.syncNow()} disabled={app.syncState === 'syncing'}>{t('syncNow')}</button>
            <button type="button" className="btn ghost small" onClick={() => doSignOut(false)} disabled={signingOut}>{signingOut ? t('authWorking') : t('signOut')}</button>
          </div>
          {signOutPending > 0 && (
            <div className="confirm" role="alertdialog" aria-label={t('signOut')}>
              <p>{t('signOutPending', { n: formatNumber(signOutPending, lang) })}</p>
              <button type="button" className="btn primary small" onClick={() => setSignOutPending(0)}>{t('stay')}</button>
              <button type="button" className="btn ghost small danger" onClick={() => doSignOut(true)}>{t('signOutAnyway')}</button>
            </div>
          )}
        </section>
      )}

      <section className="panel" aria-labelledby="look-h">
        <h2 id="look-h" className="small-h">{t('language')}</h2>
        <div className="lang-switch" role="radiogroup" aria-label={t('language')}>
          <button type="button" role="radio" aria-checked={lang === 'ar'} lang="ar" className={`seg ${lang === 'ar' ? 'on' : ''}`} onClick={() => updateSettings({ lang: 'ar' })}>عربي</button>
          <button type="button" role="radio" aria-checked={lang === 'en'} lang="en" className={`seg ${lang === 'en' ? 'on' : ''}`} onClick={() => updateSettings({ lang: 'en' })}>English</button>
        </div>

        <div className="field-label">{t('colorTheme')}</div>
        <div className="swatches" role="radiogroup" aria-label={t('colorTheme')}>
          {['butter', 'lavender', 'mint', 'coral'].map((p) => (
            <button key={p} type="button" role="radio" aria-checked={settings.theme === p} className={`swatch sw-${p} ${settings.theme === p ? 'on' : ''}`} onClick={() => updateSettings({ theme: p })}>
              <span className="swatch-dot" aria-hidden="true" />{t('theme_' + p)}
            </button>
          ))}
        </div>

        <Chips
          label={t('mode')}
          options={['light', 'dark', 'system'].map((m) => ({ value: m, label: t('mode_' + m) }))}
          value={settings.mode}
          onChange={(v) => updateSettings({ mode: v })}
        />
        <Toggle label={t('playful')} hint={t('playfulHint')} checked={settings.playful} onChange={(v) => updateSettings({ playful: v })} />
      </section>

      <section className="panel" aria-labelledby="rem-h">
        <h2 id="rem-h" className="small-h">{t('remindersTitle')}</h2>
        <Toggle label={t('alarmSound')} checked={settings.alarmSound !== false} onChange={(v) => updateSettings({ alarmSound: v })} />
        <button type="button" className="btn small" onClick={() => { unlockAudio(); playBellOnce(0.35); }}><Icon.bell />{t('testAlarm')}</button>
        <Toggle label={t('nudgeLabel')} checked={!!settings.nudgeTime} onChange={(v) => updateSettings({ nudgeTime: v ? '18:00' : null })} />
        {settings.nudgeTime && (
          <div className="inline-field">
            <label className="field-label" htmlFor="nudge-time">{t('nudgeAt')}</label>
            <input id="nudge-time" type="time" value={settings.nudgeTime} onChange={(e) => updateSettings({ nudgeTime: e.target.value || '18:00', lastNudgeDate: null })} />
          </div>
        )}
        {notif === 'granted' && <p className="hint ok">{t('notifOn')}</p>}
        {notif === 'default' && <button type="button" className="btn small" onClick={async () => setNotif(await askNotificationPermission())}>{t('notifAllow')}</button>}
        {notif === 'denied' && <p className="hint">{t('notifBlocked')}</p>}
        {notif === 'unsupported' && <p className="hint">{t('notifUnsupported')}</p>}
        <p className="note">{t('remindersNote')}</p>
      </section>

      <section className="panel" aria-labelledby="backup-h">
        <h2 id="backup-h" className="small-h">{t('backupTitle')}</h2>
        <p className="note">{app.user ? t('storageNoteAccount') : t('storageNote')}</p>
        <div className="row-actions">
          <button type="button" className="btn primary" onClick={doExport}>{t('exportBtn')}</button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>{t('importBtn')}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} data-testid="import-file" />
        </div>
        {importError && <p className="hint warn" role="alert">{importError}</p>}
        {pending && (
          <div className="confirm" role="alertdialog" aria-label={t('importBtn')}>
            <p>{t('importAsk', { n: formatNumber(pending.items.length, lang) })}</p>
            <button type="button" className="btn primary small" onClick={() => applyImport('merge')}>{t('importMerge')}</button>
            <button type="button" className="btn small" onClick={() => applyImport('replace')}>{t('importReplace')}</button>
            <button type="button" className="btn ghost small" onClick={() => setPending(null)}>{t('cancel')}</button>
          </div>
        )}

        <details className="text-backup">
          <summary>{t('backupTextTitle')}</summary>
          <p className="hint">{t('backupTextNote')}</p>
          <button type="button" className="btn small" onClick={copyBackup}>{t('copyBackup')}</button>
          {backupText && <textarea id="backup-text" ref={backupTextRef} readOnly rows={4} value={backupText} dir="ltr" aria-label={t('copyBackup')} />}
          <label className="field-label" htmlFor="paste-backup">{t('pasteBackup')}</label>
          <textarea id="paste-backup" rows={3} dir="ltr" value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={t('pastePlaceholder')} />
          <button type="button" className="btn small" disabled={!pasteText.trim()} onClick={fromPaste}>{t('pasteGo')}</button>
        </details>

        <h3 className="tiny-h">{t('autoBackups')}</h3>
        <p className="hint">{t('autoBackupsNote')}</p>
        {backups.length === 0 ? <p className="hint">{t('noBackups')}</p> : (
          <ul className="backups">
            {backups.map((b) => (
              <li key={b.key}>
                <span>{formatDate(b.date, lang)}</span>
                <span className="hint">{t('itemsCount', { n: formatNumber(b.count, lang) })}</span>
                {confirmBackup === b.key ? (
                  <span className="confirm inline">
                    <span>{t('restoreConfirm', { d: formatDate(b.date, lang) })}</span>
                    <button type="button" className="btn small" onClick={() => restoreBackup(b)}>{t('confirmYes')}</button>
                    <button type="button" className="btn ghost small" onClick={() => setConfirmBackup(null)}>{t('confirmNo')}</button>
                  </span>
                ) : (
                  <button type="button" className="link-btn" onClick={() => setConfirmBackup(b.key)}>{t('restoreBackup')}</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel jar" aria-labelledby="jar-h" ref={jarRef}>
        <h2 id="jar-h" className="small-h">{t('stickersTitle')} {stickers.length > 0 && <span className="h-sub">{t('stickersCount', { n: formatNumber(stickers.length, lang) })}</span>}</h2>
        {stickers.length === 0 ? <p className="hint">{t('stickersEmpty')}</p> : (
          <div className="jar-glass">
            {stickers.map((s, i) => <Sticker key={s.id} kind={s.kind} size={40} tilt={((i * 37) % 30) - 15} />)}
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="install-h">
        <h2 id="install-h" className="small-h">{t('installTitle')}</h2>
        <p className="note">{t('installNote')}</p>
        {canInstall && (
          <button type="button" className="btn" onClick={async () => { deferredInstall?.prompt(); deferredInstall = null; setCanInstall(false); }}>{t('installBtn')}</button>
        )}
        <p className="hint">{t('keyboardHint')}</p>
      </section>

      <section className="panel about" aria-labelledby="about-h">
        <h2 id="about-h" className="small-h">{t('aboutTitle')}</h2>
        <p className="note">{t('aboutBody')}</p>
        <p className="note" dir="ltr" lang="en">
          Modified from JumpyBrain (© JumpyBrain contributors) in October 2026. Licensed under the GNU AGPL v3.
          This program comes with ABSOLUTELY NO WARRANTY.{' '}
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">Source code</a>
          {SOURCE_URL !== UPSTREAM && <> · <a href={UPSTREAM} target="_blank" rel="noopener noreferrer">{t('sourceLink')}</a></>}
          {' · '}<a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener noreferrer">AGPL-3.0</a>
        </p>
      </section>
    </div>
  );
}
