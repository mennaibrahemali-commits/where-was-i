import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store.jsx';
import { Sheet } from './ui.jsx';
import { Icon } from './art.jsx';
import { classifyCapture } from '../lib/classify.js';
import { AREAS, toISODate } from '../lib/model.js';
import { dueLabel } from '../format.js';

const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export default function Capture() {
  const { t, lang, capture, captureOpen, setCaptureOpen, addItem, toast, setOpenItemId } = useApp();
  // Defaults to where you are (Work screen → work), until you switch it.
  const [spaceChoice, setSpace] = useState(null);
  const space = spaceChoice || capture?.space || 'life';
  const [text, setText] = useState('');
  const [area, setArea] = useState(null);        // null = use the guess
  const [due, setDue] = useState(undefined);     // undefined = use the guess
  const [saved, setSaved] = useState([]);
  const [listening, setListening] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState('');
  const recRef = useRef(null);
  const inputRef = useRef(null);

  const today = toISODate();
  const guess = classifyCapture(text, today);
  const finalArea = area || guess.area;
  const finalDue = due === undefined ? guess.dueAt : due;

  useEffect(() => {
    if (!captureOpen) {
      setText(''); setArea(null); setDue(undefined); setSaved([]); setVoiceMsg(''); setSpace(null);
      recRef.current?.abort?.();
      setListening(false);
    }
  }, [captureOpen]);

  const save = () => {
    const title = text.trim();
    if (!title) return;
    const it = space === 'work'
      ? addItem({ title, area: 'work', space: 'work', stage: 'new', dueAt: finalDue, inbox: false })
      : addItem({ title, area: finalArea === 'work' ? 'other' : finalArea, dueAt: finalDue });
    setSaved((s) => [{ id: it.id, title, area: it.area }, ...s].slice(0, 4));
    setText(''); setArea(null); setDue(undefined);
    toast(t('captureSaved'), { key: 'capture' });
    inputRef.current?.focus();
  };

  const startVoice = () => {
    if (!SpeechRecognition) { setVoiceMsg(t('voiceUnsupported')); return; }
    try {
      const rec = new SpeechRecognition();
      rec.lang = lang === 'ar' ? 'ar-EG' : 'en-US';
      rec.interimResults = true;
      rec.continuous = false;
      const base = text ? text.trim() + ' ' : '';
      rec.onresult = (e) => {
        let s = '';
        for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
        setText(base + s);
      };
      rec.onerror = () => { setVoiceMsg(t('voiceError')); setListening(false); };
      rec.onend = () => { setListening(false); inputRef.current?.focus(); };
      recRef.current = rec;
      rec.start();
      setListening(true);
      setVoiceMsg('');
    } catch {
      setVoiceMsg(t('voiceError'));
      setListening(false);
    }
  };

  const stopVoice = () => { recRef.current?.stop?.(); setListening(false); };

  return (
    <Sheet open={captureOpen} onClose={() => setCaptureOpen(false)} title={t('addNew')} labelClose={t('close')} className="capture-sheet">
      <form className="capture-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <div className="lang-switch small space-switch" role="radiogroup" aria-label={t('spaceLabel')}>
          {['life', 'work'].map((sp) => (
            <button key={sp} type="button" role="radio" aria-checked={space === sp} className={`seg ${space === sp ? 'on' : ''}`} onClick={() => setSpace(sp)}>{t('space_' + sp)}</button>
          ))}
        </div>
        <div className="capture-input-wrap">
          <textarea
            ref={inputRef}
            data-autofocus
            className="capture-input"
            rows={2}
            value={text}
            placeholder={t('capturePlaceholder')}
            aria-label={t('capturePlaceholder')}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } }}
          />
          <button
            type="button"
            className={`icon-btn mic ${listening ? 'listening' : ''}`}
            onClick={listening ? stopVoice : startVoice}
            aria-label={listening ? t('voiceStop') : t('voiceStart')}
            aria-pressed={listening}
          >
            <Icon.mic />
          </button>
        </div>
        {listening && <p className="hint live" aria-live="polite">{t('voiceListening')}</p>}
        {voiceMsg && <p className="hint warn" role="status">{voiceMsg}</p>}

        {text.trim() && (
          <div className="capture-guess">
            {space === 'life' && <span className="hint">{t('captureGuess')}</span>}
            {space === 'life' && <div className="chips scroll-x" role="radiogroup" aria-label={t('areaLabel')}>
              {AREAS.filter((a) => a !== 'work').map((a) => (
                <button key={a} type="button" role="radio" aria-checked={finalArea === a} className={`chip small ${finalArea === a ? 'on' : ''}`} onClick={() => setArea(a)}>
                  <span className={`dot area-${a}`} aria-hidden="true" />{t('area_' + a)}
                </button>
              ))}
            </div>}
            <div className="chips" role="radiogroup" aria-label={t('dueLabel')}>
              {[null, today, (() => { const d = new Date(); d.setDate(d.getDate() + 1); return toISODate(d); })()].map((d) => (
                <button key={String(d)} type="button" role="radio" aria-checked={finalDue === d} className={`chip small ${finalDue === d ? 'on' : ''}`} onClick={() => setDue(d)}>
                  {d ? dueLabel(d, t, lang) : t('captureNoDate')}
                </button>
              ))}
              {finalDue && finalDue !== today && daysAway(finalDue, today) > 1 && (
                <span className="chip small on">{dueLabel(finalDue, t, lang)}</span>
              )}
            </div>
          </div>
        )}

        <div className="capture-actions">
          <p className="hint">{t('captureHint')}</p>
          <button type="submit" className="btn primary" disabled={!text.trim()}>{t('captureSave')}</button>
        </div>
        {!SpeechRecognition && <p className="hint subtle">{t('voiceUnsupported')}</p>}
        {SpeechRecognition && lang === 'ar' && <p className="hint subtle">{t('voiceNote')}</p>}
      </form>

      {saved.length > 0 && (
        <ul className="just-saved" aria-label={t('captureSaved')}>
          {saved.map((s) => (
            <li key={s.id}>
              <span className={`dot area-${s.area}`} aria-hidden="true" />
              <span className="just-saved-title">{s.title}</span>
              <button type="button" className="link-btn" onClick={() => { setCaptureOpen(false); setOpenItemId(s.id); }}>{t('captureMore')}</button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function daysAway(iso, today) {
  return Math.round((new Date(iso) - new Date(today)) / 86400000);
}
