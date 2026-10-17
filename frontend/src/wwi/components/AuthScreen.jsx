import { useEffect, useMemo, useState } from 'react';
import { makeT } from '../i18n.js';
import { readUiLang, writeUiLang } from '../store.jsx';
import * as cloud from '../lib/cloud.js';
import { Teacup } from './art.jsx';

// mode: 'signin' | 'signup' | 'forgot' | 'recovery'
export default function AuthScreen({ initialMode = 'signup', notice = null, onRecovered }) {
  const [lang, setLang] = useState(readUiLang);
  const t = useMemo(() => makeT(lang), [lang]);
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(notice);
  const [info, setInfo] = useState(null);
  const [sentTo, setSentTo] = useState(null);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
    writeUiLang(lang);
  }, [lang]);

  const go = (m) => { setMode(m); setError(null); setInfo(null); };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const mail = email.trim();
    if (mode !== 'recovery' && !/^\S+@\S+\.\S+$/.test(mail)) { setError('authBadEmail'); return; }
    if ((mode === 'signup' || mode === 'signin' || mode === 'recovery') && password.length < 6) { setError('authWeakPassword'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const r = await cloud.signUp(mail, password);
        if (r.error) setError(cloud.authErrorKey(r.error));
        else if (!r.session) setSentTo(mail); // email confirmation is on
        // with a session, the app opens by itself
      } else if (mode === 'signin') {
        const r = await cloud.signIn(mail, password);
        if (r.error) setError(cloud.authErrorKey(r.error));
      } else if (mode === 'forgot') {
        const r = await cloud.sendPasswordReset(mail);
        if (r.error && cloud.authErrorKey(r.error) !== 'authGeneric') setError(cloud.authErrorKey(r.error));
        else setInfo('authResetSent');
      } else if (mode === 'recovery') {
        const r = await cloud.setNewPassword(password);
        if (r.error) setError(cloud.authErrorKey(r.error));
        else { setInfo('authPasswordSaved'); setTimeout(() => onRecovered?.(), 900); }
      }
    } catch (err) {
      setError(cloud.authErrorKey(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-top">
        <div className="wordmark" aria-hidden="true">
          <span className="wm-en">where was i?</span>
          {lang === 'ar' && <span className="wm-ar">كنت فين؟</span>}
        </div>
        <div className="lang-switch small" role="radiogroup" aria-label="Language">
          <button type="button" role="radio" aria-checked={lang === 'ar'} lang="ar" className={`seg ${lang === 'ar' ? 'on' : ''}`} onClick={() => setLang('ar')}>عربي</button>
          <button type="button" role="radio" aria-checked={lang === 'en'} lang="en" className={`seg ${lang === 'en' ? 'on' : ''}`} onClick={() => setLang('en')}>English</button>
        </div>
      </div>

      <main className="auth-card">
        <Teacup size={96} />
        {sentTo ? (
          <div className="auth-sent" role="status">
            <h1 className="auth-title">{t('authWelcome')}</h1>
            <p>{t('authCheckEmail', { email: sentTo })}</p>
            <button type="button" className="btn primary" onClick={() => { setSentTo(null); go('signin'); }}>{t('authEnter')}</button>
          </div>
        ) : (
          <>
            <h1 className="auth-title">{mode === 'recovery' ? t('authNewPassword') : mode === 'forgot' ? t('authForgot') : t('authWelcome')}</h1>
            {(mode === 'signup' || mode === 'signin') && <p className="auth-sub">{t('authSub')}</p>}

            {(mode === 'signup' || mode === 'signin') && (
              <div className="auth-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={mode === 'signup'} className={`seg ${mode === 'signup' ? 'on' : ''}`} onClick={() => go('signup')}>{t('authSignUp')}</button>
                <button type="button" role="tab" aria-selected={mode === 'signin'} className={`seg ${mode === 'signin' ? 'on' : ''}`} onClick={() => go('signin')}>{t('authSignIn')}</button>
              </div>
            )}

            <form className="auth-form" onSubmit={submit} noValidate>
              {mode !== 'recovery' && (
                <div className="field">
                  <label className="field-label" htmlFor="auth-email">{t('authEmail')}</label>
                  <input id="auth-email" type="email" inputMode="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              )}
              {mode !== 'forgot' && (
                <div className="field">
                  <label className="field-label" htmlFor="auth-password">{mode === 'recovery' ? t('authNewPassword') : t('authPassword')}</label>
                  <div className="password-row">
                    <input
                      id="auth-password"
                      type={show ? 'text' : 'password'}
                      autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                    <button type="button" className="link-btn" onClick={() => setShow((v) => !v)} aria-pressed={show}>{show ? t('authHidePassword') : t('authShowPassword')}</button>
                  </div>
                  {mode !== 'signin' && <p className="hint">{t('authPasswordHint')}</p>}
                </div>
              )}

              {error && <p className="hint warn" role="alert">{t(error)}</p>}
              {info && <p className="auth-info" role="status">{t(info)}</p>}

              <button type="submit" className="btn primary big wide" disabled={busy}>
                {busy ? t('authWorking') : mode === 'signup' ? t('authCreate') : mode === 'signin' ? t('authEnter') : mode === 'forgot' ? t('authSendReset') : t('authSavePassword')}
              </button>
            </form>

            {mode === 'signin' && <button type="button" className="link-btn" onClick={() => go('forgot')}>{t('authForgot')}</button>}
            {mode === 'forgot' && <button type="button" className="link-btn" onClick={() => go('signin')}>{t('authBack')}</button>}
            <p className="hint auth-privacy">{t('authPrivacy')}</p>
          </>
        )}
      </main>
    </div>
  );
}
