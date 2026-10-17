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
