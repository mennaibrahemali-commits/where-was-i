import { useState } from 'react';
import { useApp } from '../store.jsx';
import { Sheet, Chips, Toggle } from './ui.jsx';
import { Icon, Snail } from './art.jsx';
import { AREAS, STAGES, uid, toISODate } from '../lib/model.js';
import { stepTemplateFor } from '../lib/classify.js';
import { buildICS } from '../lib/reminders.js';
import { dueLabel, ago } from '../format.js';
import { formatNumber } from '../i18n.js';

const ESTIMATES = [2, 5, 15, 30, 60];

function downloadICS(it, t) {
  const ics = buildICS(it, { alarmText: t('calendarAlarm', { t: it.title }) });
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (it.title.replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 40).trim() || 'reminder') + '.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export default function ItemSheet() {
  const app = useApp();
  const { t, lang, openItemId, setOpenItemId, items, updateItem } = app;
  const it = items.find((i) => i.id === openItemId);
  const [newStep, setNewStep] = useState('');
  const [newLink, setNewLink] = useState('');
  const [laterOpen, setLaterOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const close = () => { setOpenItemId(null); setLaterOpen(false); setNewStep(''); setNewLink(''); setDetails(false); };

  if (!it) return <Sheet open={false} onClose={close} />;

  const isWork = it.space === 'work';
  const set = (patch) => updateItem(it.id, { inbox: false, ...patch });
  const isActive = ['open', 'waiting', 'later'].includes(it.status);
  const hasMemory = it.lastAction || it.nextStep || it.notes || it.links.length;
  const showMemory = details || hasMemory || it.isProject || isWork;

  const addStep = () => {
    const s = newStep.trim();
    if (!s) return;
    set({ steps: [...it.steps, { id: uid(), title: s, done: false }] });
    setNewStep('');
  };
  const suggest = () => {
    const titles = stepTemplateFor(it.area).map((k) => t(k));
    const have = new Set(it.steps.map((s) => s.title));
    set({ steps: [...it.steps, ...titles.filter((x) => !have.has(x)).map((title) => ({ id: uid(), title, done: false }))] });
  };
  const toggleStep = (sid) => {
    const step = it.steps.find((s) => s.id === sid);
    set({
      steps: it.steps.map((s) => (s.id === sid ? { ...s, done: !s.done } : s)),
      touchedAt: new Date().toISOString(),
      lastAction: !step.done ? step.title : it.lastAction,
      // a saved "next step" that was just done is no longer next
      nextStep: !step.done && step.title === it.nextStep ? '' : it.nextStep,
    });
  };
  const addLink = () => {
    let l = newLink.trim();
    if (!l) return;
    if (!/^https?:\/\//i.test(l)) l = 'https://' + l;
    set({ links: [...it.links, l] });
    setNewLink('');
  };
  const act = (fn) => { fn(); close(); };

  return (
    <Sheet open onClose={close} title={isWork ? t('space_work') : t('titleLabel')} labelClose={t('close')} wide className="item-sheet">
      <label className="sr-only" htmlFor="item-title">{t('titleLabel')}</label>
      <textarea id="item-title" className="title-input" rows={1} value={it.title} onChange={(e) => set({ title: e.target.value.replace(/\n/g, ' ') })} placeholder={t('titleLabel')} />

      {/* Main actions */}
      {isActive && (
        <div className="sheet-actions">
          <button type="button" className="btn primary" onClick={() => act(() => app.setFocus({ itemId: it.id }))}><Icon.play />{t('start')}</button>
          <button type="button" className="btn" onClick={() => act(() => app.complete(it.id))}><Icon.check />{isWork ? t('stage_delivered') : t('done')}</button>
          {!isWork && <button type="button" className="btn ghost" aria-expanded={laterOpen} onClick={() => setLaterOpen((v) => !v)}><Icon.moon />{t('later')}</button>}
        </div>
      )}
      {laterOpen && (
        <div className="later-pick">
          <Snail size={56} />
          <div className="chips">
            {['tomorrow', 'week', 'someday'].map((w) => (
              <button key={w} type="button" className="chip" onClick={() => act(() => app.later(it.id, w))}>{t('later_' + w)}</button>
            ))}
          </div>
        </div>
      )}
      {it.status === 'done' && (
        <div className="sheet-actions"><button type="button" className="btn" onClick={() => app.setStatus(it.id, 'open', {}, t('toastRestored'))}>{t('reopen')}</button></div>
      )}
      {it.status === 'trash' && (
        <div className="sheet-actions"><button type="button" className="btn primary" onClick={() => act(() => app.restore(it.id))}>{t('restore')}</button></div>
      )}

      {/* The basics */}
      {isWork ? (
        <>
          <Chips label={t('stageLabel')} options={STAGES.map((s) => ({ value: s, label: t('stage_' + s) }))} value={it.stage} onChange={(v) => app.moveStage(it.id, v)} className="scroll-x" />
          <div className="field">
            <label className="field-label" htmlFor="item-client">{t('clientLabel')}</label>
            <input id="item-client" type="text" value={it.client} onChange={(e) => set({ client: e.target.value })} />
          </div>
        </>
      ) : (
        <Chips label={t('areaLabel')} options={AREAS.filter((a) => a !== 'work').map((a) => ({ value: a, label: t('area_' + a), dot: a }))} value={it.area} onChange={(v) => set({ area: v })} className="scroll-x" />
      )}

      <div className="field-grid">
        <div className="field">
          <label className="field-label" htmlFor="item-due">{t('dueLabel')}</label>
          <div className="date-row">
            <input id="item-due" type="date" value={it.dueAt || ''} onChange={(e) => set({ dueAt: e.target.value || null })} />
          </div>
          {it.dueAt && <p className="hint">{dueLabel(it.dueAt, t, lang)} · <button type="button" className="link-btn inline" onClick={() => set({ dueAt: null, remindAt: null })}>{t('clearDate')}</button></p>}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="item-remind"><Icon.bell />{t('remindLabel')}</label>
          <div className="date-row">
            <input id="item-remind" type="time" value={it.remindAt || ''} onChange={(e) => set({ remindAt: e.target.value || null, dueAt: e.target.value ? (it.dueAt || toISODate()) : it.dueAt })} />
          </div>
          {it.remindAt && <p className="hint"><button type="button" className="link-btn inline" onClick={() => set({ remindAt: null })}>{t('remindNone')}</button></p>}
        </div>
      </div>
      {(it.dueAt || it.remindAt) && isActive && (
        <div className="calendar-row">
          <button type="button" className="btn small" onClick={() => downloadICS(it, t)}><Icon.calendar />{t('addToCalendar')}</button>
          <p className="hint">{t('remindHint')}</p>
        </div>
      )}

      <Toggle label={t('importantLabel')} checked={it.important} onChange={(v) => set({ important: v })} />

      {/* Tiny steps */}
      <section className="sheet-section" aria-labelledby="steps-h">
        <div className="section-head">
          <h3 id="steps-h">{t('stepsLabel')}</h3>
          <button type="button" className="link-btn" onClick={suggest}>{t('suggestSteps')}</button>
        </div>
        {it.steps.length === 0 && <p className="hint">{t('stepsHint')}</p>}
        <ul className="steps">
          {it.steps.map((s) => (
            <li key={s.id} className={s.done ? 'done' : ''}>
              <button type="button" className={`check small ${s.done ? 'checked' : ''}`} onClick={() => toggleStep(s.id)} aria-label={`${t('done')}: ${s.title}`} aria-pressed={s.done}><Icon.check /></button>
              <input type="text" value={s.title} aria-label={t('stepsLabel')} onChange={(e) => set({ steps: it.steps.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)) })} />
              <button type="button" className="icon-btn small" onClick={() => set({ steps: it.steps.filter((x) => x.id !== s.id) })} aria-label={`${t('removeStep')}: ${s.title}`}><Icon.close /></button>
            </li>
          ))}
        </ul>
        <form className="inline-add" onSubmit={(e) => { e.preventDefault(); addStep(); }}>
          <input type="text" value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder={t('addStep')} aria-label={t('addStep')} />
          <button type="submit" className="icon-btn" aria-label={t('addStep')} disabled={!newStep.trim()}><Icon.plus /></button>
        </form>
      </section>

      {/* Memory: shown for projects, work, or once something is in it */}
      {showMemory && (
        <section className="sheet-section memory" aria-labelledby="mem-h">
          <div className="section-head">
            <h3 id="mem-h">{t('memoryLabel')}</h3>
            {it.touchedAt && <span className="hint">{t('touchedAgo', { when: ago(it.touchedAt, t, lang) })}</span>}
          </div>
          <p className="hint">{t('memoryHint')}</p>
          <label className="field-label" htmlFor="item-last">{t('lastActionLabel')}</label>
          <input id="item-last" type="text" value={it.lastAction} placeholder={t('lastActionPlaceholder')} onChange={(e) => set({ lastAction: e.target.value, touchedAt: new Date().toISOString() })} />
          <label className="field-label" htmlFor="item-next">{t('nextStepLabel')}</label>
          <input id="item-next" type="text" value={it.nextStep} placeholder={t('nextStepPlaceholder')} onChange={(e) => set({ nextStep: e.target.value, touchedAt: new Date().toISOString() })} />
          <label className="field-label" htmlFor="item-notes">{t('notesLabel')}</label>
          <textarea id="item-notes" rows={3} value={it.notes} onChange={(e) => set({ notes: e.target.value })} />
          <div className="field-label">{t('linksLabel')}</div>
          <ul className="links">
            {it.links.map((l, i) => (
              <li key={l + i}>
                <Icon.link />
                <a href={l} target="_blank" rel="noopener noreferrer" dir="ltr">{l.replace(/^https?:\/\//, '')}</a>
                <button type="button" className="icon-btn small" onClick={() => set({ links: it.links.filter((_, j) => j !== i) })} aria-label={t('removeLink')}><Icon.close /></button>
              </li>
            ))}
          </ul>
          <form className="inline-add" onSubmit={(e) => { e.preventDefault(); addLink(); }}>
            <input type="url" inputMode="url" dir="ltr" value={newLink} onChange={(e) => setNewLink(e.target.value)} placeholder={t('linkPlaceholder')} aria-label={t('addLink')} />
            <button type="submit" className="icon-btn" aria-label={t('addLink')} disabled={!newLink.trim()}><Icon.plus /></button>
          </form>
        </section>
      )}

      {/* Everything else, folded away */}
      <button type="button" className="details-toggle" aria-expanded={details} onClick={() => setDetails((v) => !v)}>
        {details ? t('lessDetails') : t('moreDetails')}
      </button>
      {details && (
        <div className="details">
          <Chips label={t('spaceLabel')} options={['life', 'work'].map((s) => ({ value: s, label: t('space_' + s) }))} value={it.space}
            onChange={(v) => set({ space: v, stage: v === 'work' ? (it.stage || 'new') : null, area: v === 'work' ? 'work' : it.area === 'work' ? 'other' : it.area })} />
          <div className="field">
            <label className="field-label" htmlFor="item-repeat">{t('repeatLabel')}</label>
            <select id="item-repeat" value={it.recurrence?.freq || 'none'} onChange={(e) => {
              const v = e.target.value;
              set({ recurrence: v === 'none' ? null : { freq: v, interval: 1 }, dueAt: it.dueAt || (v === 'none' ? it.dueAt : toISODate()) });
            }}>
              {['none', 'daily', 'weekly', 'monthly'].map((f) => <option key={f} value={f}>{t('repeat_' + f)}</option>)}
            </select>
            {it.recurrence && it.dueAt && <p className="hint">{t('repeatsNext', { d: dueLabel(it.dueAt, t, lang) })}</p>}
          </div>
          <Chips label={t('estimateLabel')} options={ESTIMATES.map((m) => ({ value: m, label: t('minutes', { n: formatNumber(m, lang) }) }))} value={it.estimateMins} onChange={(v) => set({ estimateMins: v })} allowNone />
          <Chips label={t('energyNeedLabel')} options={['low', 'normal', 'high'].map((e) => ({ value: e, label: t('need_' + e) }))} value={it.energy} onChange={(v) => set({ energy: v })} allowNone />
          {!isWork && <Toggle label={t('isProjectLabel')} checked={it.isProject} onChange={(v) => set({ isProject: v })} />}
          <Toggle label={t('waitingLabel')} checked={it.status === 'waiting'} onChange={(v) => {
            if (v) { app.setStatus(it.id, 'waiting', { waitingSince: new Date().toISOString() }); app.toast(t('toastWaiting')); }
            else app.setStatus(it.id, 'open', { waitingSince: null });
          }} />
          {it.status === 'waiting' && (
            <div className="field">
              <label className="field-label" htmlFor="item-waiting">{t('waitingWho')}</label>
              <input id="item-waiting" type="text" value={it.waitingFor} onChange={(e) => set({ waitingFor: e.target.value })} />
              {it.waitingSince && <p className="hint">{t('waitingSince', { when: ago(it.waitingSince, t, lang) })}</p>}
            </div>
          )}
        </div>
      )}

      <div className="sheet-footer">
        <span className="hint">{t('savedAuto')}</span>
        <div className="footer-actions">
          {it.status === 'archived'
            ? <button type="button" className="btn ghost small" onClick={() => app.setStatus(it.id, 'open', { archivedAt: null }, t('toastRestored'))}><Icon.archive />{t('unarchive')}</button>
            : it.status !== 'trash' && <button type="button" className="btn ghost small" onClick={() => act(() => app.setStatus(it.id, 'archived', {}, t('toastArchived')))}><Icon.archive />{t('archive')}</button>}
          {it.status !== 'trash' && <button type="button" className="btn ghost small danger" onClick={() => act(() => app.trash(it.id))}><Icon.trash />{t('delete')}</button>}
        </div>
      </div>
    </Sheet>
  );
}
