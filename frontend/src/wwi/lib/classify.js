// Transparent keyword rules that guess an area and a day for a quick capture.
// The guess is always shown to the person as chips they can change; nothing
// here is hidden or "smart" — it is a word list.
import { addDays } from './model.js';

// Arabic normalisation so "أكلم" and "اكلم", "ة" and "ه" match.
export function normalizeText(s = '') {
  return s
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '')   // harakat + tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

// Order matters: the first area whose word appears wins.
// Includes Egyptian Arabic, English, and common Franco-Arabic spellings.
const AREA_RULES = [
  ['appointments', ['دكتور', 'دكتوره', 'ميعاد', '=معاد', 'حجز', 'احجز', 'عياده', 'كشف', 'appointment', 'doctor', 'dentist', 'booking', 'mi3ad', 'me3ad', 'doktor']],
  ['calls', ['كلم', 'اكلم', 'اتصل', 'اتصال', 'مكالمه', 'call', 'phone', 'ring', 'kalem', 'akalem', 'etasel']],
  ['messages', ['رد علي', '=رد', 'ارد', 'رسال', 'ابعت', 'واتس', 'ايميل', 'مسج', 'reply', 'message', '=text', 'email', 'whatsapp', '=dm', 'rod', 'ab3at', 'ab3t']],
  ['groceries', ['بقاله', 'اشتري', 'عيش', 'لبن', 'بيض', 'جبنه', 'خضار', 'فاكهه', 'سكر', 'شاي', 'رز', 'مكرونه', 'زيت', 'سوبر ماركت', 'groceries', 'grocery', 'milk', 'bread', 'eggs', 'supermarket', '3eish', 'laban', 'beyd']],
  ['errands', ['مشوار', 'اروح', 'اجيب', 'استلم', 'البوسته', 'البنك', 'الصيدليه', 'اوديها', 'errand', 'pick up', 'drop off', 'pharmacy', 'bank', 'post office', 'mashwar', 'agib']],
  ['home', ['اغسل', 'غسيل', 'انضف', 'تنضيف', 'اكوي', 'المطبخ', 'السفره', 'اوضه', 'البيت', 'سباك', 'كهربائي', 'clean', 'laundry', 'dishes', 'tidy', 'kitchen', 'nadaf', 'ghaseel']],
  ['self', ['رياضه', 'امشي', '=مشي', 'اتمرن', 'دوا', 'علاج', 'انام', '=ميه', 'شعري', 'بشرتي', 'استحمي', 'walk', 'workout', 'exercise', 'gym', 'meds', 'sleep', 'skincare', 'water']],
  ['creative', ['ارسم', 'رسمه', 'لوحه', 'اسكتش', 'تصميم', 'اصمم', 'الستريشن', 'انستجرام', 'بوست', 'draw', 'paint', 'sketch', 'illustration', 'design', 'portfolio', 'instagram', 'post', 'ersem']],
  ['work', ['شغل', 'عميل', 'كلاينت', 'فاتوره', 'اجتماع', 'ميتنج', 'تسليم', 'ديدلاين', 'client', 'invoice', 'meeting', 'deadline', 'brief', 'deliver', 'shoghl', '3ameel']],
  ['ideas', ['فكره', '=يمكن', 'ممكن اعمل', 'لو اعمل', 'idea', 'maybe', 'what if', 'fekra']],
];

const DAY_RULES = [
  [2, ['بعد بكره', 'بعد بكرا', 'day after tomorrow', 'ba3d bokra']],
  [1, ['بكره', 'بكرا', 'tomorrow', 'bokra', 'bukra']],
  [0, ['النهارده', 'انهارده', 'النهاردا', 'today', 'tonight', 'ennaharda', 'naharda', 'النهارده بالليل']],
];

// Strip common attached Arabic prefixes: و ف ب ل ال لل وال بال
function stripPrefix(w) {
  return w.replace(/^(وال|بال|فال|لل|ال|و|ف|ب)(?=..)/, '');
}

// A keyword matches when a word starts with it (so "اشتري" matches
// "اشتريلي"). Keywords written "=word" must match a whole word, for short
// words that hide inside place names (e.g. "معاد" inside "المعادي").
// Keywords with a space are matched as phrases.
export function hasKeyword(text, keyword) {
  const t = normalizeText(text);
  const kw = normalizeText(keyword.replace(/^=/, ''));
  if (!kw) return false;
  if (kw.includes(' ')) return (' ' + t + ' ').includes(' ' + kw + ' ') || t.includes(kw);
  const exact = keyword.startsWith('=');
  return t.split(/[\s,.;:!?؟،]+/).some((raw) => {
    const w = stripPrefix(raw);
    return exact ? (w === kw || raw === kw) : (w.startsWith(kw) || raw.startsWith(kw));
  });
}

export function guessArea(text) {
  const t = normalizeText(text);
  for (const [area, words] of AREA_RULES) {
    if (words.some((w) => hasKeyword(text, w))) return area;
  }
  if (t.trim().endsWith('?') || t.trim().endsWith('؟')) return 'ideas';
  return 'other';
}

export function guessDue(text, todayISO) {
  for (const [offset, words] of DAY_RULES) {
    if (words.some((w) => hasKeyword(text, w))) return addDays(todayISO, offset);
  }
  return null;
}

export function classifyCapture(text, todayISO) {
  return { area: guessArea(text), dueAt: guessDue(text, todayISO) };
}

// Task-type categories ported from JumpyBrain's backend/ml/priorityModel.js
// (AGPL-3.0, © JumpyBrain contributors), extended with Egyptian Arabic words.
// Used to guess how much energy a task needs when the person did not say.
const CATEGORY_KEYWORDS = {
  quick_win: ['reply', 'confirm', 'check', 'pay', 'send', 'remind', 'rsvp', 'print', 'sign', '=رد', 'ابعت', 'ادفع', 'اتاكد', 'اطبع', 'امضي', 'افكر'],
  deep_focus: ['write', 'code', 'design', 'build', 'draft', 'create', 'sketch', 'plan', 'اكتب', 'اصمم', 'ارسم', 'اخطط', 'ابني', 'لوحه'],
  high_initiation: ['form', 'tax', 'invoice', 'register', 'submit', 'apply', 'renew', 'insurance', 'استماره', 'ضرايب', 'فاتوره', 'اقدم', 'اجدد', 'تامين', 'ورق'],
  physical_reset: ['clean', 'walk', 'tidy', 'buy', 'pick', 'انضف', 'امشي', 'اشتري', 'اجيب', 'ارتب'],
};

const CATEGORY_ENERGY = {
  quick_win: 'low',
  physical_reset: 'low',
  deep_focus: 'high',
  high_initiation: 'high',
};

const AREA_ENERGY = {
  groceries: 'low', messages: 'low', calls: 'normal', errands: 'normal',
  appointments: 'normal', home: 'low', self: 'low', work: 'normal',
  creative: 'high', ideas: 'low', other: 'normal',
};

export function guessEnergyNeed(item) {
  if (item.energy) return item.energy;
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => hasKeyword(item.title, w))) return CATEGORY_ENERGY[cat];
  }
  return AREA_ENERGY[item.area] || 'normal';
}

// Template steps for "break it into tiny steps". Concrete physical first
// moves, editable by the person. No AI involved.
export const STEP_TEMPLATES = {
  calls: ['stepFindNumber', 'stepOneLineWhy', 'stepDial'],
  messages: ['stepOpenChat', 'stepFirstLine', 'stepSend'],
  appointments: ['stepCheckTimes', 'stepBook', 'stepNoteTime'],
  groceries: ['stepListMissing', 'stepPickShop'],
  errands: ['stepWhatToTake', 'stepWhereFirst', 'stepGo'],
  home: ['stepOneCorner', 'stepTimer5', 'stepPutAway'],
  creative: ['stepOpenFile', 'stepRoughSketch', 'stepOneDetail'],
  work: ['stepOpenFile', 'stepWriteNext', 'stepTwoMinutes'],
  other: ['stepFirstMove', 'stepTwoMinutes', 'stepDecide'],
};

export function stepTemplateFor(area) {
  return STEP_TEMPLATES[area] || STEP_TEMPLATES.other;
}
