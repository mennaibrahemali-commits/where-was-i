// "What next?" — picks one practical next step with fixed, readable rules.
//
// Adapted from JumpyBrain's rule-based ranker (backend/ml/priorityModel.js,
// AGPL-3.0, © JumpyBrain contributors): urgency from the due date, the
// person's own importance flag, and how well the task fits current energy.
// Changes here: runs on the device (no server), uses three energy levels plus
// "skip", adds available time, resume and preferred-area factors, and returns
// the reasons so the app can always explain its pick.
import { daysBetween, firstOpenStep, isActive } from './model.js';
import { guessEnergyNeed } from './classify.js';

const ENERGY_RANK = { low: 0, normal: 1, high: 2 };

export const WEIGHTS = {
  urgency: 0.3,
  importance: 0.15,
  energyFit: 0.2,
  timeFit: 0.2,
  smallStart: 0.15,
  resume: 0.15,
  preferred: 0.25,
  skipPenalty: 0.05,
};

function defaultEstimate(it) {
  if (it.estimateMins) return it.estimateMins;
  if (['groceries', 'messages', 'calls', 'ideas'].includes(it.area)) return 5;
  if (it.isProject) return 45;
  return 15;
}

export function urgencyOf(it, today) {
  if (!it.dueAt) return { value: 0.15, reason: null };
  const d = daysBetween(today, it.dueAt);
  if (d < 0) return { value: 0.95, reason: 'duePassed' };
  if (d === 0) return { value: 1, reason: 'dueToday' };
  if (d === 1) return { value: 0.8, reason: 'dueTomorrow' };
  if (d <= 3) return { value: 0.55, reason: 'dueSoon' };
  if (d <= 7) return { value: 0.3, reason: null };
  return { value: 0.1, reason: null };
}

export function scoreItem(it, ctx) {
  const { today, energy, minutes, preferArea } = ctx;
  const reasons = [];
  let score = 0;

  const u = urgencyOf(it, today);
  score += u.value * WEIGHTS.urgency;
  if (u.reason) reasons.push({ key: u.reason, w: u.value * WEIGHTS.urgency });

  if (it.important) {
    score += WEIGHTS.importance;
    reasons.push({ key: 'important', w: WEIGHTS.importance });
  }

  const need = guessEnergyNeed(it);
  if (energy && ENERGY_RANK[energy] != null) {
    const gap = Math.abs(ENERGY_RANK[need] - ENERGY_RANK[energy]);
    // A task that needs less than you have is fine; one that needs more is not.
    const tooHeavy = ENERGY_RANK[need] > ENERGY_RANK[energy];
    const fit = gap === 0 ? 1 : tooHeavy ? (gap === 1 ? 0.35 : 0.05) : 0.7;
    score += fit * WEIGHTS.energyFit;
    if (fit >= 0.7) reasons.push({ key: 'energyFit', w: fit * WEIGHTS.energyFit * 0.8 });
  } else {
    score += 0.6 * WEIGHTS.energyFit;
  }

  const est = defaultEstimate(it);
  const step = firstOpenStep(it);
  if (minutes) {
    let fit;
    if (est <= minutes) fit = 1;
    else if (step) fit = 0.6; // too big, but one step can fit
    else fit = 0.15;
    score += fit * WEIGHTS.timeFit;
    if (fit === 1) reasons.push({ key: 'fitsTime', w: WEIGHTS.timeFit * 0.9 });
    else if (fit === 0.6) reasons.push({ key: 'oneStepFits', w: WEIGHTS.timeFit * 0.5 });
  } else {
    score += 0.6 * WEIGHTS.timeFit;
  }

  if (energy === 'low' && est <= 10) {
    score += WEIGHTS.smallStart;
    reasons.push({ key: 'smallStart', w: WEIGHTS.smallStart });
  }

  const hasMomentum = it.startedAt || it.lastAction || it.steps.some((s) => s.done);
  if (hasMomentum) {
    score += WEIGHTS.resume;
    reasons.push({ key: 'resume', w: WEIGHTS.resume });
  }

  if (preferArea && it.area === preferArea) {
    score += WEIGHTS.preferred;
    reasons.push({ key: 'preferred', w: WEIGHTS.preferred + 1 });
  }

  score -= Math.min(3, it.skipCount || 0) * WEIGHTS.skipPenalty;

  reasons.sort((a, b) => b.w - a.w);
  return {
    item: it,
    score: Math.round(score * 1000) / 1000,
    reasons: reasons.slice(0, 2).map((r) => r.key),
    // The concrete thing to do: the "next tiny step" the person saved,
    // else the first open step.
    step: it.nextStep || (step ? step.title : null),
    estimate: est,
  };
}

// Returns candidates best-first. `skipped` holds ids the person said
// "something else" to during this visit.
export function rankWhatNext(items, ctx) {
  const skipped = ctx.skipped || new Set();
  return items
    .filter((it) => isActive(it) && !skipped.has(it.id) && it.title.trim())
    .map((it) => scoreItem(it, ctx))
    .sort((a, b) => b.score - a.score || a.item.createdAt.localeCompare(b.item.createdAt));
}

export function pickWhatNext(items, ctx) {
  return rankWhatNext(items, ctx)[0] || null;
}

// Small, quick, low-friction items for the "quick wins" corner.
export function quickWins(items, today, excludeId, limit = 3) {
  return items
    .filter((it) => isActive(it) && it.id !== excludeId && !it.isProject && it.title.trim())
    .filter((it) => defaultEstimate(it) <= 10 || ['groceries', 'messages', 'calls'].includes(it.area))
    .map((it) => ({ it, u: urgencyOf(it, today).value }))
    .sort((a, b) => b.u - a.u)
    .slice(0, limit)
    .map((x) => x.it);
}

// The one thing that was left half-way: most recently touched, still open.
export function resumeCandidate(items) {
  const open = items.filter((it) => (it.status === 'open') && (it.touchedAt || it.startedAt) && (it.lastAction || it.nextStep || it.steps.some((s) => s.done) || it.startedAt));
  open.sort((a, b) => (b.touchedAt || b.startedAt).localeCompare(a.touchedAt || a.startedAt));
  return open[0] || null;
}

export function comingUp(items, today, excludeIds = [], limit = 3) {
  return items
    .filter((it) => isActive(it) && it.dueAt && !excludeIds.includes(it.id))
    .filter((it) => daysBetween(today, it.dueAt) <= 3)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, limit);
}
