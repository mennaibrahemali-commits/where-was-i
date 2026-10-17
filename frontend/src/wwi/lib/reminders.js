// Reminders that need no server.
// 1) While the app is open (or recently in the background), it checks every
//    30 seconds and shows a notification + in-app message at the set time.
// 2) "Add to phone calendar" creates an .ics event with an alarm, so the
//    phone's own calendar reminds you even when the app is closed.
import { daysBetween, isLife, toISODate } from './model.js';

// Local Date for an item's reminder, or null.
export function reminderDate(it) {
  if (!it.remindAt || !it.dueAt) return null;
  const [y, m, d] = it.dueAt.split('-').map(Number);
  const [hh, mm] = it.remindAt.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

export function reminderKey(it) {
  return `${it.id}@${it.dueAt}T${it.remindAt}`;
}

// Reminders whose time has come (within the last `graceHours`) and that
// haven't been shown yet. Missed ones still fire when the app is next opened.
export function dueReminders(items, now, fired, graceHours = 12) {
  const out = [];
  for (const it of items) {
    if (!['open', 'waiting'].includes(it.status)) continue;
    const at = reminderDate(it);
    if (!at) continue;
    const diff = now - at;
    if (diff >= 0 && diff <= graceHours * 3600000 && !fired.includes(reminderKey(it))) out.push(it);
  }
  return out;
}

// Once a day, at the chosen time: important things due today (or earlier)
// that are still open.
export function importantLeftToday(items, today) {
  return items.filter((it) => isLife(it) && it.important && ['open', 'waiting'].includes(it.status) && it.dueAt && daysBetween(today, it.dueAt) <= 0);
}

export function shouldNudge(now, nudgeTime, lastNudgeDate) {
  if (!nudgeTime) return false;
  const today = toISODate(now);
  if (lastNudgeDate === today) return false;
  const [hh, mm] = nudgeTime.split(':').map(Number);
  const at = new Date(now);
  at.setHours(hh, mm, 0, 0);
  return now >= at;
}

// ── .ics calendar file ──────────────────────────────────────────────────────
const esc = (s = '') => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
const compact = (iso) => iso.replace(/-/g, '');

function fold(line) {
  // RFC 5545: lines longer than 75 octets are folded.
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out = [];
  let cur = '';
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n');
}

export function buildICS(it, { now = new Date(), alarmText = 'Reminder' } = {}) {
  const day = it.dueAt || toISODate(now);
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//where was i//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${it.id}@where-was-i`,
    `DTSTAMP:${stamp}`,
  ];
  if (it.remindAt) {
    const [hh, mm] = it.remindAt.split(':');
    lines.push(`DTSTART:${compact(day)}T${hh}${mm}00`);
    lines.push('DURATION:PT15M');
  } else {
    lines.push(`DTSTART;VALUE=DATE:${compact(day)}`);
  }
  lines.push(`SUMMARY:${esc(it.title)}`);
  const desc = [it.nextStep, it.notes].filter(Boolean).join('\n');
  if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
  if (it.recurrence) lines.push(`RRULE:FREQ=${it.recurrence.freq.toUpperCase()};INTERVAL=${it.recurrence.interval || 1}`);
  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(alarmText)}`,
    // timed: at the time; all-day: 9:00 on the day
    it.remindAt ? 'TRIGGER:PT0M' : 'TRIGGER:PT9H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  );
  return lines.map(fold).join('\r\n') + '\r\n';
}
