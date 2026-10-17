import { useMemo, useState } from 'react';
import { useApp } from '../store.jsx';
import { Icon } from './art.jsx';
import { ItemRow } from './ItemRow.jsx';
import { AREAS } from '../lib/model.js';
import { normalizeText } from '../lib/classify.js';
import { formatNumber } from '../i18n.js';

const FILTERS = ['open', 'inbox', 'waiting', 'later', 'done', 'archived', 'trash'];

function matches(it, filter) {
  if (filter === 'inbox') return it.status === 'open' && it.inbox;
  return it.status === filter;
}

export default function Everything({ filter, setFilter }) {
  const { t, lang, items, purge } = useApp();
  const [q, setQ] = useState('');
  const [area, setArea] = useState(null);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f, items.filter((it) => matches(it, f)).length])), [items]);

  const list = useMemo(() => {
    const nq = normalizeText(q);
    let out = items.filter((it) => (nq ? true : matches(it, filter)));
    if (nq) {
      // Search looks everywhere except deleted, unless you're in Deleted.
      out = out.filter((it) => (filter === 'trash' ? it.status === 'trash' : it.status !== 'trash'));
      out = out.filter((it) => normalizeText([it.title, it.notes, it.lastAction, it.nextStep, it.waitingFor, ...it.steps.map((s) => s.title)].join(' ')).includes(nq));
    }
    if (area) out = out.filter((it) => it.area === area);
    const key = filter === 'done' ? (it) => it.completedAt || '' : filter === 'trash' ? (it) => it.deletedAt || '' : null;
    if (key) return [...out].sort((a, b) => key(b).localeCompare(key(a)));
    return [...out].sort((a, b) => (a.dueAt || '9999').localeCompare(b.dueAt || '9999') || b.createdAt.localeCompare(a.createdAt));
  }, [items, filter, q, area]);

  return (
    <div className="screen everything">
      <h1 className="screen-title">{t('navAll')}</h1>
      <div className="search">
        <Icon.search />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchPlaceholder')} />
      </div>

      <div className="tabs scroll-x" role="tablist" aria-label={t('navAll')}>
        {FILTERS.map((f) => (
          <button key={f} type="button" role="tab" aria-selected={filter === f} className={`tab ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
            {t('filter_' + f)}
            {counts[f] > 0 && <span className="count">{formatNumber(counts[f], lang)}</span>}
          </button>
        ))}
      </div>

      <div className="chips scroll-x area-filter" role="radiogroup" aria-label={t('areaLabel')}>
        <button type="button" role="radio" aria-checked={!area} className={`chip small ${!area ? 'on' : ''}`} onClick={() => setArea(null)}>{t('allAreas')}</button>
        {AREAS.map((a) => (
          <button key={a} type="button" role="radio" aria-checked={area === a} className={`chip small ${area === a ? 'on' : ''}`} onClick={() => setArea(area === a ? null : a)}>
            <span className={`dot area-${a}`} aria-hidden="true" />{t('area_' + a)}
          </button>
        ))}
      </div>

      {filter === 'trash' && !q && (
        <div className="trash-bar">
          <p className="hint">{t('trashNote')}</p>
          {counts.trash > 0 && !confirmPurge && <button type="button" className="btn ghost small danger" onClick={() => setConfirmPurge(true)}>{t('emptyTrash')}</button>}
          {confirmPurge && (
            <div className="confirm" role="alertdialog" aria-label={t('emptyTrash')}>
              <p>{t('emptyTrashConfirm', { n: formatNumber(counts.trash, lang) })}</p>
              <button type="button" className="btn danger small" onClick={() => { purge(items.filter((i) => i.status === 'trash').map((i) => i.id)); setConfirmPurge(false); }}>{t('deleteForever')}</button>
              <button type="button" className="btn ghost small" onClick={() => setConfirmPurge(false)}>{t('cancel')}</button>
            </div>
          )}
        </div>
      )}

      {list.length ? (
        <ul className="item-list">{list.map((it) => <ItemRow key={it.id} it={it} />)}</ul>
      ) : (
        <p className="empty-note">{q ? t('noResults') : t('listEmpty_' + filter)}</p>
      )}
    </div>
  );
}
