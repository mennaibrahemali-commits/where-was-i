import { useEffect, useId, useRef } from 'react';
import { Icon } from './art.jsx';

// Bottom sheet on phones, centred panel on wide screens.
export function Sheet({ open, onClose, title, children, labelClose = 'Close', wide = false, className = '' }) {
  const panel = useRef(null);
  const titleId = useId();
  const lastFocus = useRef(null);
  // Keep the latest onClose without re-running the open/close effect
  // (re-running it on every render used to steal focus while typing).
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    lastFocus.current = document.activeElement;
    const el = panel.current;
    const t = setTimeout(() => {
      const first = el?.querySelector('[data-autofocus]') || el?.querySelector('input, textarea, button');
      if (el && !el.contains(document.activeElement)) first?.focus();
    }, 30);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); }
      if (e.key === 'Tab' && el) {
        const f = [...el.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      lastFocus.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panel} className={`sheet ${wide ? 'sheet-wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <h2 id={titleId} className="sheet-title">{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={labelClose}><Icon.close /></button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

// A row of selectable pills acting as a radio group.
export function Chips({ label, options, value, onChange, allowNone = false, className = '' }) {
  const id = useId();
  return (
    <div className={`chips-field ${className}`}>
      {label && <div className="field-label" id={id}>{label}</div>}
      <div className="chips" role="radiogroup" aria-labelledby={label ? id : undefined}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={on}
              className={`chip ${on ? 'on' : ''} ${o.className || ''}`}
              onClick={() => onChange(on && allowNone ? null : o.value)}
            >
              {o.dot && <span className={`dot area-${o.dot}`} aria-hidden="true" />}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Toggle({ label, hint, checked, onChange }) {
  const id = useId();
  return (
    <div className="toggle-row">
      <div>
        <label htmlFor={id} className="toggle-label">{label}</label>
        {hint && <p className="hint">{hint}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} className={`switch ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
        <span className="switch-knob" />
      </button>
    </div>
  );
}

export function AreaTag({ area, t }) {
  return (
    <span className="area-tag"><span className={`dot area-${area}`} aria-hidden="true" />{t('area_' + area)}</span>
  );
}
