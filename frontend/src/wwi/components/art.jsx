/* eslint-disable react-refresh/only-export-components */
// Line icons, small illustrations and collectible stickers — all inline SVG.

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const Icon = {
  today: () => (<svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="4.2" /><path d="M12 2.8v2M12 19.2v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.8 12h2M19.2 12h2M4.6 19.4L6 18M18 6l1.4-1.4" /></svg>),
  all: () => (<svg viewBox="0 0 24 24" {...stroke}><path d="M8 6.5h12M8 12h12M8 17.5h12" /><circle cx="4" cy="6.5" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="17.5" r="1" /></svg>),
  projects: () => (<svg viewBox="0 0 24 24" {...stroke}><path d="M6 3.5h12v17l-6-4-6 4z" /></svg>),
  more: () => (<svg viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" strokeWidth="2.6" /></svg>),
  work: () => (<svg viewBox="0 0 24 24" {...stroke}><rect x="3" y="7.5" width="18" height="12.5" rx="2.5" /><path d="M9 7.5V5.5a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 5.5v2M3 12.5h18" /></svg>),
  bell: () => (<svg viewBox="0 0 24 24" {...stroke}><path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 004 0" /></svg>),
  calendar: () => (<svg viewBox="0 0 24 24" {...stroke}><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>),
  arrow: () => (<svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6" className="flip-rtl" /></svg>),
  plus: () => (<svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.4"><path d="M12 5v14M5 12h14" /></svg>),
  check: () => (<svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.6"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>),
  close: () => (<svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.2"><path d="M6 6l12 12M18 6L6 18" /></svg>),
  mic: () => (<svg viewBox="0 0 24 24" {...stroke}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" /></svg>),
  search: () => (<svg viewBox="0 0 24 24" {...stroke}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>),
  play: () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z" /></svg>),
  pause: () => (<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" /></svg>),
  star: ({ filled }) => (<svg viewBox="0 0 24 24" {...stroke} fill={filled ? 'currentColor' : 'none'}><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" /></svg>),
  repeat: () => (<svg viewBox="0 0 24 24" {...stroke}><path d="M17 3.5l3 3-3 3" /><path d="M20 6.5H8a4 4 0 00-4 4V12M7 20.5l-3-3 3-3" /><path d="M4 17.5h12a4 4 0 004-4V12" /></svg>),
  hourglass: () => (<svg viewBox="0 0 24 24" {...stroke}><path d="M6.5 3.5h11M6.5 20.5h11M8 3.5c0 5 8 5 8 8.5s-8 3.5-8 8.5M16 3.5c0 5-8 5-8 8.5s8 3.5 8 8.5" /></svg>),
  trash: () => (<svg viewBox="0 0 24 24" {...stroke}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></svg>),
  archive: () => (<svg viewBox="0 0 24 24" {...stroke}><rect x="3.5" y="4.5" width="17" height="4.5" rx="1.2" /><path d="M5 9v10.5h14V9M10 13h4" /></svg>),
  moon: () => (<svg viewBox="0 0 24 24" {...stroke}><path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z" /></svg>),
  link: () => (<svg viewBox="0 0 24 24" {...stroke}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1.2 1.2M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1.2-1.2" /></svg>),
  back: () => (<svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.2"><path d="M15 5l-7 7 7 7" className="flip-rtl" /></svg>),
  sliders: () => (<svg viewBox="0 0 24 24" {...stroke}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></svg>),
};

// Small illustrations. Drawn with the theme's ink + soft accents.
export function Teacup({ size = 120 }) {
  return (
    <svg viewBox="0 0 160 120" width={size} height={size * 0.75} aria-hidden="true">
      <ellipse cx="78" cy="104" rx="56" ry="9" fill="var(--soft-2)" />
      <path d="M34 50h80l-6 36a18 18 0 01-18 15H58a18 18 0 01-18-15z" fill="var(--soft-1)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M114 58h6a12 12 0 010 24h-9" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      <path d="M38 60h72" stroke="var(--ink)" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" opacity=".5" />
      <path d="M62 38c-6-7 6-11 0-19M78 40c-6-8 6-12 0-21M94 38c-6-7 6-11 0-19" fill="none" stroke="var(--ink-2)" strokeWidth="2.6" strokeLinecap="round" opacity=".7" />
      <circle cx="132" cy="28" r="6" fill="var(--soft-3)" />
      <circle cx="22" cy="40" r="4" fill="var(--soft-4)" />
    </svg>
  );
}

export function Snail({ size = 72 }) {
  return (
    <svg viewBox="0 0 100 64" width={size} height={size * 0.64} aria-hidden="true">
      <path d="M10 54h70c6 0 10-4 10-9" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="48" cy="34" r="20" fill="var(--soft-2)" stroke="var(--ink)" strokeWidth="3" />
      <path d="M48 34a7 7 0 107-7 12 12 0 10-12 12" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M80 54c0-10 2-16 6-20M88 34l-4-12M90 34l4-11" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="84" cy="21" r="2.4" fill="var(--ink)" /><circle cx="94" cy="22" r="2.4" fill="var(--ink)" />
    </svg>
  );
}

export function Sun({ size = 44 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className="sun-art">
      <circle cx="24" cy="24" r="10" fill="var(--soft-1)" stroke="var(--ink)" strokeWidth="2.5" />
      <path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.5 9.5l4 4M34.5 34.5l4 4M9.5 38.5l4-4M34.5 13.5l4-4" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 26c1.5 2 6.5 2 8 0" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Collectible stickers. Each has a slight tilt so the jar looks hand-filled.
const STICKER_ART = {
  star: (<><path d="M30 8l6.5 13 14.5 2.2-10.5 10.2 2.5 14.4L30 41l-13 6.8 2.5-14.4L9 23.2 23.5 21z" fill="#FFD66B" /></>),
  flower: (<><g fill="#F7A9C4">{[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="30" cy="16" rx="8" ry="11" transform={`rotate(${r} 30 30)`} />)}</g><circle cx="30" cy="30" r="7" fill="#FFD66B" /></>),
  moon: (<path d="M42 40A17 17 0 0124 12a17 17 0 1018 28z" fill="#CDBDF5" />),
  leaf: (<><path d="M14 46C12 26 26 12 48 12c0 22-14 36-34 34z" fill="#9FDDB9" /><path d="M16 44L40 20" stroke="#1F6B4A" strokeWidth="2.5" strokeLinecap="round" /></>),
  sun: (<><circle cx="30" cy="30" r="11" fill="#FFB86B" /><g stroke="#FFB86B" strokeWidth="4" strokeLinecap="round">{[0, 45, 90, 135, 180, 225, 270, 315].map((r) => <path key={r} d="M30 8v5" transform={`rotate(${r} 30 30)`} />)}</g></>),
  cloud: (<path d="M18 42a9 9 0 01-1-18 12 12 0 0123-4 9 9 0 012 18z" fill="#BFD9F2" />),
  heart: (<path d="M30 48S10 36 10 23a10 10 0 0120-3 10 10 0 0120 3c0 13-20 25-20 25z" fill="#FF8F7A" />),
  cup: (<><path d="M14 22h28l-3 18a8 8 0 01-8 6h-6a8 8 0 01-8-6z" fill="#F4E3C1" /><path d="M42 26h3a6 6 0 010 12h-4" fill="none" stroke="#C9A46A" strokeWidth="3" /><path d="M24 16c-2-3 2-4 0-7M32 16c-2-3 2-4 0-7" stroke="#C9A46A" strokeWidth="2.5" strokeLinecap="round" fill="none" /></>),
  lantern: (<><path d="M30 6v6" stroke="#B98B2E" strokeWidth="3" strokeLinecap="round" /><path d="M22 14h16l4 8-3 16H21l-3-16z" fill="#FFD66B" /><path d="M22 14h16M18 22h24M21 38h18" stroke="#B98B2E" strokeWidth="2.5" /><path d="M24 38l-2 8h16l-2-8" fill="#B98B2E" /><circle cx="30" cy="28" r="4" fill="#FF8F7A" /></>),
  mango: (<><path d="M20 20c8-10 26-6 28 10s-14 22-24 18S12 30 20 20z" fill="#FFC15E" /><path d="M42 16c2-4 6-6 10-5-1 4-5 7-10 5z" fill="#7FCB98" /></>),
};

export function Sticker({ kind, size = 48, tilt = 0 }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} aria-hidden="true" style={{ transform: `rotate(${tilt}deg)` }} className="sticker">
      <g className="sticker-outline">{STICKER_ART[kind] || STICKER_ART.star}</g>
    </svg>
  );
}
