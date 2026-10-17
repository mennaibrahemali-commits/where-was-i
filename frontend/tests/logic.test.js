import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createItem, completeItem, nextOccurrence, wakeLaterItems, addMonths, normalizeItem } from '../src/wwi/lib/model.js';
import { classifyCapture, guessEnergyNeed } from '../src/wwi/lib/classify.js';
import { rankWhatNext, pickWhatNext, resumeCandidate, quickWins } from '../src/wwi/lib/whatNext.js';
import { buildExport, parseImport, mergeItems } from '../src/wwi/lib/backup.js';

const TODAY = '2026-10-17';
const now = new Date(2026, 9, 17, 12, 0);

test('recurring items roll forward when completed', () => {
  const weekly = createItem({ title: 'water plants', dueAt: '2026-10-17', recurrence: { freq: 'weekly', interval: 1 } });
  const done = completeItem(weekly, now);
  assert.equal(done.status, 'open');
  assert.equal(done.dueAt, '2026-10-24');
  assert.equal(done.completions.length, 1);

  const daily = createItem({ title: 'meds', dueAt: '2026-10-10', recurrence: { freq: 'daily', interval: 1 } });
  assert.equal(completeItem(daily, now).dueAt, '2026-10-18', 'skips past days, lands after today');
});

test('monthly recurrence handles short months', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(nextOccurrence('2026-10-31', { freq: 'monthly', interval: 1 }, '2026-10-31'), '2026-11-30');
});

test('one-off items close when completed, steps reset on recurring', () => {
  const it = createItem({ title: 'call mama' });
  assert.equal(completeItem(it, now).status, 'done');
  const rec = createItem({ title: 'x', dueAt: TODAY, recurrence: { freq: 'daily', interval: 1 }, steps: [{ id: 'a', title: 's', done: true }] });
  assert.equal(completeItem(rec, now).steps[0].done, false);
});

test('later items wake up on their day', () => {
  const items = [createItem({ title: 'a', status: 'later', laterUntil: '2026-10-17' }), createItem({ title: 'b', status: 'later', laterUntil: '2026-10-20' }), createItem({ title: 'c', status: 'later', laterUntil: null })];
  const out = wakeLaterItems(items, TODAY);
  assert.deepEqual(out.map((i) => i.status), ['open', 'later', 'later']);
});

test('capture guesses area and day in Egyptian Arabic, English and Franco', () => {
  assert.deepEqual(classifyCapture('أكلم ماما بكرة', TODAY), { area: 'calls', dueAt: '2026-10-18' });
  assert.equal(classifyCapture('عيش ولبن', TODAY).area, 'groceries');
  assert.equal(classifyCapture('ميعاد الدكتور النهارده', TODAY).area, 'appointments');
  assert.equal(classifyCapture('ميعاد الدكتور النهارده', TODAY).dueAt, TODAY);
  assert.equal(classifyCapture('reply to Sara', TODAY).area, 'messages');
  assert.equal(classifyCapture('kalem Omar bokra', TODAY).dueAt, '2026-10-18');
  assert.equal(classifyCapture('ارسم اسكتش للمعادي', TODAY).area, 'creative');
  assert.deepEqual(classifyCapture('random thing', TODAY), { area: 'other', dueAt: null });
});

test('energy need is guessed from words, then area', () => {
  assert.equal(guessEnergyNeed(createItem({ title: 'pay the bill' })), 'low');
  assert.equal(guessEnergyNeed(createItem({ title: 'اجدد البطاقة', area: 'errands' })), 'high');
  assert.equal(guessEnergyNeed(createItem({ title: 'x', energy: 'high' })), 'high');
});

test('what next prefers due today, explains why, and respects skips', () => {
  const a = createItem({ title: 'tax form', dueAt: '2026-11-30' });
  const b = createItem({ title: 'call the dentist', area: 'calls', dueAt: TODAY });
  const ranked = rankWhatNext([a, b], { today: TODAY });
  assert.equal(ranked[0].item.id, b.id);
  assert.ok(ranked[0].reasons.includes('dueToday'));
  const next = pickWhatNext([a, b], { today: TODAY, skipped: new Set([b.id]) });
  assert.equal(next.item.id, a.id);
});

test('low energy + 5 minutes favours a small task over a heavy one', () => {
  const heavy = createItem({ title: 'design the new portfolio', area: 'creative', estimateMins: 120 });
  const small = createItem({ title: 'reply to Mona', area: 'messages', estimateMins: 2 });
  const pick = pickWhatNext([heavy, small], { today: TODAY, energy: 'low', minutes: 5 });
  assert.equal(pick.item.id, small.id);
  assert.ok(pick.reasons.length > 0);
});

test('preferred area wins and waiting / later / done items are never picked', () => {
  const items = [
    createItem({ title: 'w', status: 'waiting' }),
    createItem({ title: 'l', status: 'later' }),
    createItem({ title: 'd', status: 'done' }),
    createItem({ title: 'clean kitchen', area: 'home' }),
    createItem({ title: 'sketch', area: 'creative' }),
  ];
  const pick = pickWhatNext(items, { today: TODAY, preferArea: 'creative' });
  assert.equal(pick.item.title, 'sketch');
  assert.equal(rankWhatNext(items, { today: TODAY }).length, 2);
});

test('next step is offered when a task is too big for the time', () => {
  const big = createItem({ title: 'big', estimateMins: 90, steps: [{ id: '1', title: 'open the file', done: false }] });
  const r = pickWhatNext([big], { today: TODAY, minutes: 5 });
  assert.equal(r.step, 'open the file');
  assert.ok(r.reasons.includes('oneStepFits'));
  const withNote = pickWhatNext([{ ...big, nextStep: 'call Hoda first' }], { today: TODAY });
  assert.equal(withNote.step, 'call Hoda first', 'a saved next step wins over template steps');
});

test('resume finds the most recently touched unfinished item', () => {
  const a = createItem({ title: 'a', touchedAt: '2026-10-10T10:00:00Z', lastAction: 'did x' });
  const b = createItem({ title: 'b', touchedAt: '2026-10-15T10:00:00Z', nextStep: 'do y' });
  const c = createItem({ title: 'c', touchedAt: '2026-10-16T10:00:00Z', status: 'done', lastAction: 'z' });
  assert.equal(resumeCandidate([a, b, c]).id, b.id);
  assert.equal(quickWins([createItem({ title: 'milk', area: 'groceries' })], TODAY).length, 1);
});

test('export / import round trip, merge keeps newest, bad files rejected', () => {
  const it = createItem({ title: 'keep me' });
  const file = JSON.stringify(buildExport({ items: [it], settings: { lang: 'ar' } }));
  const res = parseImport(file);
  assert.ok(res.ok);
  assert.equal(res.data.items[0].title, 'keep me');
  assert.equal(parseImport('not json').error, 'importNotJson');
  assert.equal(parseImport('{"items":[]}').error, 'importWrongFile');

  const older = { ...it, title: 'old', updatedAt: '2026-01-01T00:00:00Z' };
  const newer = { ...it, title: 'new', updatedAt: '2026-10-01T00:00:00Z' };
  const other = createItem({ title: 'other' });
  const merged = mergeItems([newer, other], [older]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((x) => x.id === it.id).title, 'new');
});

test('normalizeItem repairs partial data', () => {
  const it = normalizeItem({ id: 'x', title: 'hi', area: 'nope', status: 'weird', steps: [{ title: 's' }, null] });
  assert.equal(it.area, 'other');
  assert.equal(it.status, 'open');
  assert.equal(it.steps.length, 1);
  assert.ok(it.steps[0].id);
});

// ── v2: work space, reminders ─────────────────────────────────────────────
import { setStage, dueTodayOrPassed } from '../src/wwi/lib/model.js';
import { dueReminders, reminderKey, importantLeftToday, shouldNudge, buildICS } from '../src/wwi/lib/reminders.js';

test('work items never appear in daily suggestions', () => {
  const work = createItem({ title: 'client logo', space: 'work', stage: 'doing', dueAt: TODAY, important: true });
  const life = createItem({ title: 'buy bread', area: 'groceries' });
  const ranked = rankWhatNext([work, life], { today: TODAY });
  assert.deepEqual(ranked.map((r) => r.item.id), [life.id]);
  assert.equal(quickWins([work, life], TODAY).some((i) => i.id === work.id), false);
  assert.equal(dueTodayOrPassed([work], TODAY).length, 0);
});

test('pipeline: delivered closes, moving back reopens', () => {
  const w = createItem({ title: 'poster', space: 'work', stage: 'revisions' });
  const d = setStage(w, 'delivered', now);
  assert.equal(d.status, 'done');
  assert.ok(d.completedAt);
  const back = setStage(d, 'revisions', now);
  assert.equal(back.status, 'open');
  assert.equal(back.completedAt, null);
  assert.equal(normalizeItem({ id: 'w', title: 'x', space: 'work' }).stage, 'new');
  assert.equal(normalizeItem({ id: 'l', title: 'x', stage: 'doing' }).stage, null);
});

test('reminders fire once at their time, missed ones fire on next open', () => {
  const it = createItem({ title: 'pay rent', dueAt: TODAY, remindAt: '11:30' });
  assert.equal(dueReminders([it], new Date(2026, 9, 17, 11, 0), []).length, 0, 'not yet');
  assert.equal(dueReminders([it], new Date(2026, 9, 17, 11, 30), []).length, 1, 'on time');
  assert.equal(dueReminders([it], new Date(2026, 9, 17, 18, 0), []).length, 1, 'missed, shown when opened later');
  assert.equal(dueReminders([it], new Date(2026, 9, 17, 18, 0), [reminderKey(it)]).length, 0, 'only once');
  assert.equal(dueReminders([{ ...it, status: 'done' }], new Date(2026, 9, 17, 12, 0), []).length, 0, 'done = silent');
});

test('important-left nudge: once a day after its time', () => {
  const imp = createItem({ title: 'send invoice', important: true, dueAt: '2026-10-16' });
  const notImp = createItem({ title: 'x', dueAt: TODAY });
  assert.deepEqual(importantLeftToday([imp, notImp], TODAY).map((i) => i.id), [imp.id]);
  assert.equal(shouldNudge(new Date(2026, 9, 17, 17, 59), '18:00', null), false);
  assert.equal(shouldNudge(new Date(2026, 9, 17, 18, 1), '18:00', null), true);
  assert.equal(shouldNudge(new Date(2026, 9, 17, 20, 0), '18:00', TODAY), false);
});

test('calendar file has a timed alarm and repeat rule', () => {
  const it = createItem({ title: 'دوا, الصبح', dueAt: TODAY, remindAt: '08:15', recurrence: { freq: 'daily', interval: 1 } });
  const ics = buildICS(it, { now, alarmText: 'فكّري' });
  assert.match(ics, /DTSTART:20261017T081500/);
  assert.match(ics, /RRULE:FREQ=DAILY;INTERVAL=1/);
  assert.match(ics, /BEGIN:VALARM[\s\S]*TRIGGER:PT0M/);
  assert.match(ics, /SUMMARY:دوا\\, الصبح/);
  assert.ok(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75));
  assert.match(buildICS(createItem({ title: 'x', dueAt: TODAY }), { now }), /DTSTART;VALUE=DATE:20261017/);
});

// ── v2: sync merge rules ──────────────────────────────────────────────────
import { mergeRemoteItems, mergeStickers, latestStamp, pickSyncedSettings } from '../src/wwi/lib/sync.js';

test('sync: newer copy wins, unsent local changes are never overwritten', () => {
  const a = createItem({ title: 'a', updatedAt: '2026-10-17T10:00:00Z' });
  const b = createItem({ title: 'b', updatedAt: '2026-10-17T10:00:00Z' });
  const rows = [
    { id: a.id, data: { ...a, title: 'a from phone', updatedAt: '2026-10-17T11:00:00Z' }, updated_at: 's1' },
    { id: b.id, data: { ...b, title: 'b old', updatedAt: '2026-10-17T09:00:00Z' }, updated_at: 's2' },
    { id: 'new-1', data: { id: 'new-1', title: 'from laptop', updatedAt: '2026-10-17T08:00:00Z' }, updated_at: 's3' },
    { id: '__settings', data: { lang: 'en' }, updated_at: 's4' },
  ];
  const r = mergeRemoteItems([a, b], rows);
  const byId = Object.fromEntries(r.items.map((i) => [i.id, i.title]));
  assert.equal(byId[a.id], 'a from phone');
  assert.equal(byId[b.id], 'b', 'older remote ignored');
  assert.equal(byId['new-1'], 'from laptop');
  assert.equal(r.items.length, 3, 'settings doc is not an item');
  const kept = mergeRemoteItems([a], rows.slice(0, 1), new Set([a.id]));
  assert.equal(kept.items[0].title, 'a', 'dirty local change kept');
  assert.equal(kept.changed, false);
});

test('sync: purged markers remove the item on other devices', () => {
  const a = createItem({ title: 'gone', status: 'trash' });
  const r = mergeRemoteItems([a], [{ id: a.id, data: { purged: true, updatedAt: 'z' } }]);
  assert.equal(r.items.length, 0);
});

test('sync helpers', () => {
  assert.equal(mergeStickers([{ id: '1' }], [{ id: '1' }, { id: '2' }]).length, 2);
  assert.equal(latestStamp([{ updated_at: '2026-01-02' }, { updated_at: '2026-01-05' }], '2026-01-03'), '2026-01-05');
  assert.deepEqual(pickSyncedSettings({ lang: 'ar', energy: 'low', theme: 'mint' }), { lang: 'ar', theme: 'mint' });
});
