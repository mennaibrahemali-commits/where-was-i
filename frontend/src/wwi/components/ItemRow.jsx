import { useState } from 'react';
import { useApp } from '../store.jsx';
import { Icon } from './art.jsx';
import { dueLabel, ago } from '../format.js';
import { daysBetween, progress, toISODate } from '../lib/model.js';
import { formatNumber } from '../i18n.js';

export function ItemMeta({ it }) {
  const { t, lang } = useApp();
  const parts = [];
  const today = toISODate();
  if (it.status === 'waiting') {
    parts.push(<span key="w" className="meta-waiting"><Icon.hourglass />{it.waitingFor || t('filter_waiting')}</span>);
  }
  if (it.status === 'later') {
    parts.push(<span key="l" className="meta-later">{it.laterUntil ? t('laterUntil', { d: dueLabel(it.laterUntil, t, lang) }) : t('laterSomeday')}</span>);
  }
  if (it.dueAt && ['open', 'waiting'].includes(it.status)) {
    const passed = daysBetween(today, it.dueAt) < 0;
    parts.push(<span key="d" className={`meta-due ${daysBetween(today, it.dueAt) <= 0 ? 'soon' : ''}`}>{passed ? t('duePassedLabel', { d: dueLabel(it.dueAt, t, lang) }) : dueLabel(it.dueAt, t, lang)}</span>);
  }
  if (it.remindAt && ['open', 'waiting'].includes(it.status)) parts.push(<span key="b" className="meta-icon"><Icon.bell /><span dir="ltr">{it.remindAt}</span></span>);
  if (it.recurrence) parts.push(<span key="r" className="meta-icon" title={t('repeat_' + it.recurrence.freq)}><Icon.repeat /><span className="sr-only">{t('repeat_' + it.recurrence.freq)}</span></span>);
  const p = progress(it);
  if (p.total) parts.push(<span key="p">{formatNumber(p.done, lang)}/{formatNumber(p.total, lang)}</span>);
  if (it.status === 'done' && it.completedAt) parts.push(<span key="c">{ago(it.completedAt, t, lang)}</span>);
  if (it.important) parts.push(<span key="i" className="meta-icon star"><Icon.star filled /><span className="sr-only">{t('importantLabel')}</span></span>);
  return (
    <span className="item-meta">
      <span className="area-tag"><span className={`dot area-${it.area}`} aria-hidden="true" />{t('area_' + it.area)}</span>
      {parts}
    </span>
  );
}

export function ItemRow({ it, compact = false }) {
  const { t, complete, setStatus, setOpenItemId, settings, restore } = useApp();
  const [popping, setPopping] = useState(false);
  const isDone = it.status === 'done';
  const isTrash = it.status === 'trash';

  const onCheck = () => {
    if (isDone) {
      setStatus(it.id, 'open', {}, t('toastRestored'));
      return;
    }
    if (settings.playful) {
      setPopping(true);
      setTimeout(() => complete(it.id), 260);
    } else {
      complete(it.id);
    }
  };

  return (
    <li className={`item-row ${isDone ? 'is-done' : ''} ${popping ? 'popping' : ''} ${compact ? 'compact' : ''}`}>
      {isTrash ? (
        <button type="button" className="row-restore" onClick={() => restore(it.id)}>{t('restore')}</button>
      ) : (
        <button
          type="button"
          className={`check ${isDone ? 'checked' : ''}`}
          onClick={onCheck}
          aria-label={isDone ? `${t('reopen')}: ${it.title}` : `${t('done')}: ${it.title}`}
        >
          <Icon.check />
        </button>
      )}
      <button type="button" className="row-main" onClick={() => setOpenItemId(it.id)}>
        <span className="row-title">
          {it.isProject && <span className="project-mark" aria-hidden="true"><Icon.projects /></span>}
          {it.title}
          {it.inbox && it.status === 'open' && <span className="badge-new">{t('newBadge')}</span>}
        </span>
        {!compact && <ItemMeta it={it} />}
      </button>
    </li>
  );
}
