import { useMemo, useState } from 'react';
import { useApp } from '../store.jsx';
import { Icon, Sun, Teacup, Sticker } from './art.jsx';
import { ItemRow } from './ItemRow.jsx';
import { rankWhatNext, quickWins, resumeCandidate } from '../lib/whatNext.js';
import { toISODate, AREAS, daysBetween, dueTodayOrPassed } from '../lib/model.js';
import { pickDaily, formatNumber } from '../i18n.js';
import { ago } from '../format.js';

function greetingKey(previousOpen) {
  if (previousOpen && daysBetween(toISODate(new Date(previousOpen)), toISODate()) >= 2) return 'greetBack';
  const h = new Date().getHours();
  if (h < 12) return 'greetMorning';
  if (h < 18) return 'greetAfternoon';
  return 'greetEvening';
}

export default function Today({ go }) {
  const app = useApp();
  const { t, lang, items, settings, updateSettings, previousOpen, stickers, guestItems, resolveGuestItems } = app;
  const today = toISODate();
  const [minutes, setMinutes] = useState(null);
  const [preferArea, setPreferArea] = useState(null);
  const [skipped, setSkipped] = useState(() => new Set());
  const [tuneOpen, setTuneOpen] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const energy = settings.energy && settings.energy !== 'skip' ? settings.energy : null;
  const askEnergy = !settings.energy;

  const ranked = useMemo(
    () => rankWhatNext(items, { today, energy, minutes, preferArea, skipped }),
    [items, today, energy, minutes, preferArea, skipped],
  );
  const pick = ranked[0] || null;
  const resume = useMemo(() => resumeCandidate(items), [items]);
  const resumeItem = resume && resume.id !== pick?.item.id ? resume : null;
  const wins = useMemo(() => quickWins(items, today, pick?.item.id), [items, today, pick]);
  // Due today (or forgotten from before), important first — a gentle nudge, never red.
  const todayList = useMemo(
    () => dueTodayOrPassed(items, today).filter((it) => it.id !== pick?.item.id && !wins.some((w) => w.id === it.id)).slice(0, 4),
    [items, today, pick, wins],
  );
  const anyImportant = todayList.some((i) => i.important);
  const waiting = items.filter((i) => i.status === 'waiting' && i.space !== 'work').length;
  const inbox = items.filter((i) => i.status === 'open' && i.inbox && i.space !== 'work').length;
  const anyOpen = items.some((i) => i.status === 'open' && i.space !== 'work');
  const allSkipped = !pick && anyOpen && skipped.size > 0;

  const setEnergy = (e) => updateSettings({ energy: e, energyDate: today });

  const skipPick = () => {
    if (!pick) return;
    app.updateItem(pick.item.id, (it) => ({ ...it, skipCount: (it.skipCount || 0) + 1 }));
    setSkipped((s) => new Set([...s, pick.item.id]));
    setShowWhy(false);
  };

  return (
    <div className="screen today">
      <header className="today-head">
        <Sun size={46} />
        <div>
          <h1 className="greeting">{pickDaily(lang, greetingKey(previousOpen))}</h1>
          <p className="sub">{pickDaily(lang, 'todaySub')}</p>
        </div>
      </header>

      {/* Energy check-in: optional, once a day, never blocks anything */}
      {askEnergy ? (
        <section className="energy-card" aria-labelledby="energy-q">
          <h2 id="energy-q" className="small-h">{t('energyQ')}</h2>
          <div className="energy-options">
            {['low', 'normal', 'high'].map((e) => (
              <button key={e} type="button" className={`energy-btn e-${e}`} onClick={() => setEnergy(e)}>
                <span className="energy-bars" aria-hidden="true"><i /><i /><i /></span>
                {t('energy_' + e)}
              </button>
            ))}
          </div>
          <button type="button" className="link-btn" onClick={() => setEnergy('skip')}>{t('energySkip')}</button>
        </section>
      ) : (
        <div className="energy-line">
          {energy && <span className={`energy-pill e-${energy}`}><span className="energy-bars" aria-hidden="true"><i /><i /><i /></span>{t('energyNow', { e: t('energy_' + energy) })}</span>}
          <button type="button" className="link-btn" onClick={() => updateSettings({ energy: null, energyDate: null })}>{energy ? t('energyChange') : t('energyQ')}</button>
        </div>
      )}

      {guestItems.length > 0 && (
        <div className="confirm guest" role="region" aria-label={t('accountTitle')}>
          <p>{t('guestFound', { n: formatNumber(guestItems.length, lang) })}</p>
          <button type="button" className="btn primary small" onClick={() => resolveGuestItems(true)}>{t('guestAdd')}</button>
          <button type="button" className="btn ghost small" onClick={() => resolveGuestItems(false)}>{t('guestSkip')}</button>
        </div>
      )}

      {todayList.length > 0 && (
        <section className={`today-card ${anyImportant ? 'important' : ''}`} aria-labelledby="today-h">
          <h2 id="today-h" className="small-h">{anyImportant ? t('importantTodayTitle') : t('dueTodayTitle')}</h2>
          {anyImportant && <p className="hint">{t('importantTodaySub')}</p>}
          <ul className="item-list">{todayList.map((it) => <ItemRow key={it.id} it={it} />)}</ul>
        </section>
      )}

      {/* What next — the one suggestion */}
      <section className="next-card" aria-labelledby="next-h">
        <div className="next-top">
          <h2 id="next-h" className="next-label">{t('whatNextTitle')}</h2>
          <button type="button" className="icon-btn" aria-expanded={tuneOpen} aria-label={t('tune')} onClick={() => setTuneOpen((v) => !v)}><Icon.sliders /></button>
        </div>

        {tuneOpen && (
          <div className="tune">
            <div className="field-label">{t('timeQ')}</div>
            <div className="chips">
              {[5, 15, 30, 60].map((m) => (
                <button key={m} type="button" role="radio" aria-checked={minutes === m} className={`chip small ${minutes === m ? 'on' : ''}`} onClick={() => { setMinutes(minutes === m ? null : m); setSkipped(new Set()); }}>{t('time_' + m)}</button>
              ))}
            </div>
            <div className="field-label">{t('areaQ')}</div>
            <div className="chips scroll-x">
              <button type="button" role="radio" aria-checked={!preferArea} className={`chip small ${!preferArea ? 'on' : ''}`} onClick={() => setPreferArea(null)}>{t('anyArea')}</button>
              {AREAS.map((a) => (
                <button key={a} type="button" role="radio" aria-checked={preferArea === a} className={`chip small ${preferArea === a ? 'on' : ''}`} onClick={() => { setPreferArea(a); setSkipped(new Set()); }}>
                  <span className={`dot area-${a}`} aria-hidden="true" />{t('area_' + a)}
                </button>
              ))}
            </div>
          </div>
        )}

        {pick ? (
          <div className="next-body" key={pick.item.id}>
            <button type="button" className="next-title" onClick={() => app.setOpenItemId(pick.item.id)}>{pick.item.title}</button>
            {pick.step && <p className="next-step"><span>{t('whatNextStepPrefix')}</span> {pick.step}</p>}
            {pick.reasons.length > 0 && (
              <p className="next-reasons">
                <button type="button" className="why-btn" aria-expanded={showWhy} onClick={() => setShowWhy((v) => !v)}>{t('why')}</button>
                {showWhy && <span>{pick.reasons.map((r) => t('reason_' + r)).join(lang === 'ar' ? '، ' : ', ')}</span>}
              </p>
            )}
            <div className="next-actions">
              <button type="button" className="btn primary big" onClick={() => app.setFocus({ itemId: pick.item.id, mins: 2 })}><Icon.play />{t('startSmall')}</button>
              <button type="button" className="btn" onClick={skipPick}>{t('somethingElse')}</button>
              <button type="button" className="btn ghost" onClick={() => app.later(pick.item.id, 'tomorrow')}>{t('notNow')}</button>
            </div>
          </div>
        ) : allSkipped ? (
          <div className="next-body">
            <p className="next-empty">{t('whatNextAllSkipped')}</p>
            <button type="button" className="btn" onClick={() => setSkipped(new Set())}>{t('startOver')}</button>
          </div>
        ) : (
          <div className="next-body empty">
            <Teacup size={110} />
            <p className="next-empty">{items.length ? t('whatNextEmpty') : t('todayEmptyBody')}</p>
            <button type="button" className="btn primary" onClick={() => app.setCaptureOpen(true)}><Icon.plus />{t('addNew')}</button>
          </div>
        )}
      </section>

      {/* Resume — the bookmark */}
      {resumeItem && (
        <section className="bookmark" aria-labelledby="resume-h">
          <div className="ribbon" aria-hidden="true" />
          <h2 id="resume-h" className="small-h">{t('resumeTitle')}</h2>
          <p className="bookmark-title">{resumeItem.title}</p>
          {resumeItem.lastAction && <p className="bookmark-line"><span>{t('lastActionLabel')}</span>{resumeItem.lastAction}</p>}
          {resumeItem.nextStep && <p className="bookmark-line next"><span>{t('nextStepLabel')}</span>{resumeItem.nextStep}</p>}
          <div className="bookmark-foot">
            <span className="hint">{t('touchedAgo', { when: ago(resumeItem.touchedAt || resumeItem.startedAt, t, lang) })}</span>
            <button type="button" className="btn small" onClick={() => app.setFocus({ itemId: resumeItem.id })}><Icon.play />{t('continue')}</button>
          </div>
        </section>
      )}

      {wins.length > 0 && (
        <section className="list-section" aria-labelledby="wins-h">
          <h2 id="wins-h" className="small-h">{t('quickWinsTitle')} <span className="h-sub">{t('quickWinsSub')}</span></h2>
          <ul className="item-list">{wins.map((it) => <ItemRow key={it.id} it={it} />)}</ul>
        </section>
      )}



      {(waiting > 0 || inbox > 0) && (
        <div className="gentle-lines">
          {inbox > 0 && (
            <button type="button" className="gentle-line" onClick={() => go('all', 'inbox')}>
              <span>{inbox === 1 ? t('inboxLineOne') : t('inboxLine', { n: formatNumber(inbox, lang) })}</span><span className="link-btn">{t('look')}</span>
            </button>
          )}
          {waiting > 0 && (
            <button type="button" className="gentle-line" onClick={() => go('all', 'waiting')}>
              <span><Icon.hourglass />{waiting === 1 ? t('waitingLineOne') : t('waitingLine', { n: formatNumber(waiting, lang) })}</span><span className="link-btn">{t('look')}</span>
            </button>
          )}
        </div>
      )}

      {settings.playful && stickers.length > 0 && (
        <button type="button" className="jar-peek" onClick={() => go('more', 'jar')}>
          <span className="jar-stickers" aria-hidden="true">
            {stickers.slice(-4).map((s, i) => <Sticker key={s.id} kind={s.kind} size={30} tilt={(i % 2 ? 1 : -1) * (6 + i * 3)} />)}
          </span>
          <span>{t('stickerCorner')}</span>
        </button>
      )}
    </div>
  );
}
