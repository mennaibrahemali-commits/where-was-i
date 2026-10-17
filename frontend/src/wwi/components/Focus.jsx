import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store.jsx';
import { Sheet } from './ui.jsx';
import { Icon } from './art.jsx';
import { firstOpenStep } from '../lib/model.js';
import { formatNumber } from '../i18n.js';
import { unlockAudio, startAlarm, keepScreenOn, releaseScreen, notify } from '../lib/alarm.js';

// A gentle timer: pausing or stopping early is always fine, nothing is lost.
// Time is kept as an end timestamp so it stays right if the phone sleeps.
const MODES = [2, 5, 15, 25];

export default function Focus() {
  const { t, lang, focus, setFocus, items, markStarted, updateItem, complete, toast, settings } = useApp();
  const it = focus ? items.find((i) => i.id === focus.itemId) : null;
  const [stage, setStage] = useState('pick');   // pick | running | ended | memory
  const [total, setTotal] = useState(0);
  const [endAt, setEndAt] = useState(null);
  const [pausedLeft, setPausedLeft] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [lastAction, setLastAction] = useState('');
  const [nextStep, setNextStep] = useState('');
  const announced = useRef(false);
  const stopAlarmRef = useRef(null);

  const silence = () => { stopAlarmRef.current?.(); stopAlarmRef.current = null; };

  // Keep the screen on while timing; browsers drop the lock when the app is
  // hidden, so take it again on return.
  useEffect(() => {
    if (stage !== 'running') { releaseScreen(); return undefined; }
    keepScreenOn();
    const onVis = () => { if (document.visibilityState === 'visible') keepScreenOn(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [stage]);

  // Stop any ringing when the timer sheet goes away.
  useEffect(() => () => { silence(); releaseScreen(); }, []);

  useEffect(() => {
    if (focus) {
      setStage(focus.mins ? 'running' : 'pick');
      if (focus.mins) begin(focus.mins);
      setLastAction(''); setNextStep('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.itemId, focus?.mins]);

  const running = stage === 'running' && pausedLeft == null;
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);

  const left = stage === 'running' ? (pausedLeft ?? Math.max(0, endAt - now)) : 0;

  useEffect(() => {
    if (stage === 'running' && pausedLeft == null && endAt && now >= endAt && !announced.current) {
      announced.current = true;
      setStage('ended');
      stopAlarmRef.current = startAlarm({ sound: settings.alarmSound !== false });
      if (document.visibilityState === 'hidden') notify(t('timerDoneTitle'), it?.title || '', 'timer');
    }
  }, [now, endAt, stage, pausedLeft, settings.alarmSound, t, it?.title]);

  if (!focus || !it) return null;

  function begin(mins) {
    unlockAudio(); // must happen on the tap, so the alarm is allowed to ring later
    silence();
    const ms = mins * 60000;
    setTotal(ms);
    setEndAt(Date.now() + ms);
    setNow(Date.now());
    setPausedLeft(null);
    announced.current = false;
    setStage('running');
    markStarted(focus.itemId);
    toast(t('toastStarted'));
  }

  const pause = () => setPausedLeft(Math.max(0, endAt - Date.now()));
  const resume = () => { setEndAt(Date.now() + pausedLeft); setNow(Date.now()); setPausedLeft(null); };
  const extend = () => begin(5);
  const stopToMemory = () => {
    silence();
    const step = firstOpenStep(it);
    setLastAction(it.lastAction || '');
    setNextStep(it.nextStep || (step ? step.title : ''));
    setStage('memory');
  };
  const close = () => { silence(); releaseScreen(); setFocus(null); };
  const saveMemory = () => {
    updateItem(it.id, { lastAction: lastAction.trim() || it.lastAction, nextStep: nextStep.trim(), touchedAt: new Date().toISOString() });
    close();
  };
  const finishWhole = () => { complete(it.id); close(); };
  const stepDone = () => {
    const step = firstOpenStep(it);
    if (!step) return;
    updateItem(it.id, { steps: it.steps.map((s) => (s.id === step.id ? { ...s, done: true } : s)), lastAction: step.title, nextStep: it.nextStep === step.title ? '' : it.nextStep, touchedAt: new Date().toISOString() });
    toast(t('toastDone'));
  };

  const step = firstOpenStep(it);
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);
  const clock = `${formatNumber(mm, lang)}:${formatNumber(ss, lang).padStart(2, formatNumber(0, lang))}`;
  const frac = total ? 1 - left / total : 0;
  const R = 92;
  const C = 2 * Math.PI * R;

  return (
    <Sheet open onClose={stage === 'running' ? stopToMemory : close} title={t('focusTitle')} labelClose={t('close')} className="focus-sheet">
      <p className="focus-task">{it.title}</p>
      {step && <p className="focus-step"><span>{t('focusOnStep')}</span> {step.title}</p>}

      {stage === 'pick' && (
        <div className="focus-pick">
          <div className="field-label">{t('focusPick')}</div>
          <div className="focus-modes">
            {MODES.map((m) => (
              <button key={m} type="button" className={`mode-btn ${m === 2 ? 'suggested' : ''}`} onClick={() => begin(m)} data-autofocus={m === 2 ? true : undefined}>
                <span className="mode-num">{formatNumber(m, lang)}</span>
                <span className="mode-unit">{t('focus_' + m).replace(/[\d٠-٩]+\s*/, '')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 'running' && (
        <div className="focus-run">
          <div className="ring" role="timer" aria-live="off" aria-label={clock}>
            <svg viewBox="0 0 220 220" aria-hidden="true">
              <circle cx="110" cy="110" r={R} className="ring-track" />
              <circle cx="110" cy="110" r={R} className="ring-fill" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
            </svg>
            <div className="ring-clock" dir="ltr">{clock}</div>
          </div>
          {pausedLeft != null ? <p className="hint center">{t('focusPaused')}</p> : <p className="hint center">{t('timerKeepOpen')}</p>}
          <div className="focus-actions">
            {pausedLeft == null
              ? <button type="button" className="btn" onClick={pause}><Icon.pause />{t('pause')}</button>
              : <button type="button" className="btn primary" onClick={resume}><Icon.play />{t('resume')}</button>}
            {step && <button type="button" className="btn" onClick={stepDone}><Icon.check />{t('stepDone')}</button>}
            <button type="button" className="btn ghost" onClick={stopToMemory}>{t('enough')}</button>
          </div>
        </div>
      )}

      {stage === 'ended' && (
        <div className="focus-ended" role="alert">
          <h3>{t('focusEnd')}</h3>
          <button type="button" className="btn wide stop-alarm" onClick={silence}><Icon.bell />{t('stopAlarm')}</button>
          <p>{t('focusEndBody')}</p>
          <div className="focus-actions">
            <button type="button" className="btn" onClick={extend}>{t('keepGoing')}</button>
            <button type="button" className="btn primary" onClick={stopToMemory}>{t('enough')}</button>
          </div>
        </div>
      )}

      {stage === 'memory' && (
        <form className="focus-memory" onSubmit={(e) => { e.preventDefault(); saveMemory(); }}>
          <h3>{t('beforeYouGo')}</h3>
          <p className="hint">{t('beforeYouGoSub')}</p>
          <label className="field-label" htmlFor="fm-last">{t('whatDidYouDo')}</label>
          <input id="fm-last" data-autofocus type="text" value={lastAction} onChange={(e) => setLastAction(e.target.value)} />
          <label className="field-label" htmlFor="fm-next">{t('whatNextSmall')}</label>
          <input id="fm-next" type="text" value={nextStep} onChange={(e) => setNextStep(e.target.value)} />
          <div className="focus-actions">
            <button type="submit" className="btn primary">{t('saveMemory')}</button>
            <button type="button" className="btn ghost" onClick={close}>{t('skip')}</button>
          </div>
          <button type="button" className="btn wide done-whole" onClick={finishWhole}><Icon.check />{t('finishedWhole')}</button>
        </form>
      )}
    </Sheet>
  );
}
