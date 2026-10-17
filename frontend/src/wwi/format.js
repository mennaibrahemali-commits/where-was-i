import { daysBetween, parseISODate, toISODate } from './lib/model.js';
import { formatNumber } from './i18n.js';

export function formatDate(iso, lang) {
  const d = parseISODate(iso);
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// "Today", "Tomorrow", "In 3 days", or a short date.
export function dueLabel(iso, t, lang, today = toISODate()) {
  if (!iso) return '';
  const d = daysBetween(today, iso);
  if (d === 0) return t('today');
  if (d === 1) return t('tomorrow');
  if (d === -1) return t('yesterday');
  if (d > 1 && d <= 6) return t('inDays', { n: formatNumber(d, lang) });
  return formatDate(iso, lang);
}

// "just now", "yesterday", "5 days ago" from a timestamp.
export function ago(stamp, t, lang) {
  if (!stamp) return '';
  const today = toISODate();
  const day = toISODate(new Date(stamp));
  const d = daysBetween(day, today);
  if (d <= 0) return t('justNow');
  if (d === 1) return t('yesterday');
  return t('daysAgo', { n: formatNumber(d, lang) });
}
