import { useRef, useState } from 'react';
import { useApp } from '../store.jsx';
import { Icon } from './art.jsx';
import { STAGES, daysBetween, toISODate, firstOpenStep } from '../lib/model.js';
import { dueLabel } from '../format.js';
import { formatNumber } from '../i18n.js';

// The work pipeline: its own board, never mixed into daily-life screens.
export default function Work() {
  const { t, lang, items, addItem, moveStage, setOpenItemId } = useApp();
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const colRefs = useRef({});
  const today = toISODate();

  const work = items.filter((it) => it.space === 'work' && ['open', 'waiting', 'done'].includes(it.status));
  const byStage = Object.fromEntries(STAGES.map((s) => [s, []]));
  for (const it of work) (byStage[it.stage] || byStage.new).push(it);
  for (const s of STAGES) {
    byStage[s].sort((a, b) => (s === 'delivered'
      ? (b.completedAt || '').localeCompare(a.completedAt || '')
      : (a.dueAt || '9999').localeCompare(b.dueAt || '9999') || b.updatedAt.localeCompare(a.updatedAt)));
  }

  const add = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addItem({ title: title.trim(), client: client.trim(), space: 'work', stage: 'new', area: 'work', inbox: false });
    setTitle('');
    setClient('');
  };

  const jump = (s) => colRefs.current[s]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });

  return (
    <div className="screen work">
      <div>
        <h1 className="screen-title">{t('workTitle')}</h1>
        <p className="sub">{t('workSub')}</p>
      </div>

      <form className="work-add" onSubmit={add}>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('workAddPlaceholder')} aria-label={t('workAddPlaceholder')} />
        <div className="work-add-row">
          <input type="text" value={client} onChange={(e) => setClient(e.target.value)} placeholder={t('workClientPlaceholder')} aria-label={t('clientLabel')} />
          <button type="submit" className="btn primary" disabled={!title.trim()}><Icon.plus />{t('workAdd')}</button>
        </div>
      </form>

      <div className="stage-jump" role="tablist" aria-label={t('stageLabel')}>
        {STAGES.map((s) => (
          <button key={s} type="button" className={`stage-pill st-${s}`} onClick={() => jump(s)}>
            {t('stage_' + s)}<span className="count">{formatNumber(byStage[s].length, lang)}</span>
          </button>
        ))}
      </div>

      {work.length === 0 && <p className="empty-note">{t('workEmpty')}</p>}

      <div className="board">
        {STAGES.map((s, i) => {
          const next = STAGES[i + 1];
          const list = s === 'delivered' ? byStage[s].slice(0, 12) : byStage[s];
          return (
            <section key={s} className={`column st-${s}`} ref={(el) => { colRefs.current[s] = el; }} aria-labelledby={`col-${s}`}>
              <h2 id={`col-${s}`} className="column-head">
                <span className="stage-dot" aria-hidden="true" />{t('stage_' + s)}
                <span className="count">{formatNumber(byStage[s].length, lang)}</span>
              </h2>
              {list.length === 0 && <p className="column-empty">{t('stageEmpty')}</p>}
              <ul className="cards">
                {list.map((it) => {
                  const d = it.dueAt ? daysBetween(today, it.dueAt) : null;
                  const step = it.nextStep || firstOpenStep(it)?.title;
                  return (
                    <li key={it.id} className="work-card">
                      <button type="button" className="work-card-main" onClick={() => setOpenItemId(it.id)}>
                        <span className="work-title">{it.title}</span>
                        {it.client && <span className="work-client">{it.client}</span>}
                        {it.dueAt && s !== 'delivered' && <span className={`work-due ${d <= 1 ? 'soon' : ''}`}><Icon.calendar />{dueLabel(it.dueAt, t, lang)}</span>}
                        {step && s !== 'delivered' && <span className="work-step">{step}</span>}
                      </button>
                      {next && (
                        <button type="button" className="move-btn" onClick={() => moveStage(it.id, next)}>
                          <Icon.arrow />{t('moveNext', { s: t('stage_' + next) })}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
