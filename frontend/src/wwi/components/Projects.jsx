import { useState } from 'react';
import { useApp } from '../store.jsx';
import { Icon } from './art.jsx';
import { progress, firstOpenStep } from '../lib/model.js';
import { ago } from '../format.js';
import { formatNumber } from '../i18n.js';

export default function Projects() {
  const { t, lang, items, addItem, setOpenItemId, setFocus } = useApp();
  const [name, setName] = useState('');
  const projects = items
    .filter((it) => it.isProject && ['open', 'waiting', 'later'].includes(it.status))
    .sort((a, b) => (b.touchedAt || b.updatedAt).localeCompare(a.touchedAt || a.updatedAt));

  const create = (e) => {
    e.preventDefault();
    const title = name.trim();
    if (!title) return;
    const it = addItem({ title, isProject: true, area: 'creative', inbox: false });
    setName('');
    setOpenItemId(it.id);
  };

  return (
    <div className="screen projects">
      <h1 className="screen-title">{t('projectsTitle')}</h1>
      <p className="sub">{t('projectsSub')}</p>

      <form className="inline-add big" onSubmit={create}>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('newProjectPlaceholder')} aria-label={t('newProject')} />
        <button type="submit" className="btn primary" disabled={!name.trim()}><Icon.plus />{t('newProject')}</button>
      </form>

      {projects.length === 0 && <p className="empty-note">{t('projectsEmpty')}</p>}

      <ul className="project-list">
        {projects.map((p) => {
          const pr = progress(p);
          const step = firstOpenStep(p);
          const next = p.nextStep || step?.title;
          return (
            <li key={p.id} className="project-card">
              <button type="button" className="project-main" onClick={() => setOpenItemId(p.id)}>
                <span className="project-title"><span className={`dot area-${p.area}`} aria-hidden="true" />{p.title}</span>
                {p.lastAction || next ? (
                  <span className="project-memory">
                    {p.lastAction && <span><b>{t('lastActionLabel')}</b>{p.lastAction}</span>}
                    {next && <span className="next"><b>{t('nextStepLabel')}</b>{next}</span>}
                  </span>
                ) : (
                  <span className="hint">{t('noMemoryYet')}</span>
                )}
                <span className="project-foot">
                  {pr.total > 0 && (
                    <span className="bar" aria-label={`${formatNumber(pr.done, lang)}/${formatNumber(pr.total, lang)}`}>
                      <span style={{ width: `${(pr.done / pr.total) * 100}%` }} />
                    </span>
                  )}
                  {(p.touchedAt) && <span className="hint">{t('touchedAgo', { when: ago(p.touchedAt, t, lang) })}</span>}
                  {p.status !== 'open' && <span className="hint">{t('filter_' + p.status)}</span>}
                </span>
              </button>
              {p.status === 'open' && (
                <button type="button" className="btn small" onClick={() => setFocus({ itemId: p.id })}><Icon.play />{t('continue')}</button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
