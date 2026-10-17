// Alarm sound, vibration, screen wake lock and notifications.
// Browsers only allow sound after a tap, so unlockAudio() must be called from
// a tap (e.g. when the timer starts); the alarm can then ring later.

let ctx = null;

export function unlockAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    // A silent blip fully unlocks audio on iOS.
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.02);
  } catch { /* no audio */ }
}

// One "tenn": a bell made of a few decaying partials.
function bell(at, base = 880, volume = 0.35) {
  const partials = [[1, 1], [2.76, 0.45], [5.4, 0.25], [8.93, 0.12]];
  for (const [ratio, amp] of partials) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = base * ratio;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(volume * amp, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.4 / Math.sqrt(ratio));
    o.connect(g).connect(ctx.destination);
    o.start(at);
    o.stop(at + 1.6);
  }
}

export function playBellOnce(volume = 0.3) {
  try {
    if (!ctx) unlockAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    bell(ctx.currentTime + 0.02, 988, volume);
  } catch { /* no audio */ }
}

// Rings "tenn-tenn" every 2 seconds (and vibrates where supported) until
// stop() is called, or for `maxSeconds`.
export function startAlarm({ maxSeconds = 90, sound = true, vibrate = true } = {}) {
  let stopped = false;
  let timer = null;
  const started = Date.now();
  const ring = () => {
    if (stopped) return;
    if (sound) {
      try {
        if (ctx && ctx.state === 'suspended') ctx.resume();
        if (ctx) {
          const t = ctx.currentTime + 0.02;
          bell(t, 988);
          bell(t + 0.32, 1318);
        }
      } catch { /* ignore */ }
    }
    if (vibrate && navigator.vibrate) navigator.vibrate([350, 150, 350]);
    if (Date.now() - started < maxSeconds * 1000) timer = setTimeout(ring, 2000);
  };
  ring();
  return () => {
    stopped = true;
    clearTimeout(timer);
    if (navigator.vibrate) navigator.vibrate(0);
  };
}

// Keep the screen on while a timer runs, so the phone doesn't lock and pause it.
let wakeLock = null;
export async function keepScreenOn() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener?.('release', () => { wakeLock = null; });
    }
    return !!wakeLock;
  } catch {
    return false;
  }
}
export async function releaseScreen() {
  try { await wakeLock?.release(); } catch { /* ignore */ }
  wakeLock = null;
}

// ── Notifications ───────────────────────────────────────────────────────────
export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function askNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function notify(title, body, tag) {
  if (notificationPermission() !== 'granted') return false;
  const opts = { body, tag, icon: '/wwi-icon-192.png', badge: '/wwi-icon-192.png', renotify: true };
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg) { await reg.showNotification(title, opts); return true; }
  } catch { /* fall back */ }
  try {
    new Notification(title, opts);
    return true;
  } catch {
    return false;
  }
}
