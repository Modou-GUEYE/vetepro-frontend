import { ClipboardEvent, KeyboardEvent, useEffect, useRef } from 'react';
import clsx from 'clsx';

interface Props { value: string; onChange: (v: string) => void; length?: number; disabled?: boolean; label?: string; autoFocus?: boolean }

/** Code à usage unique en cases séparées : saisie, retour arrière et collage gérés. */
export function OtpInput({ value, onChange, length = 6, disabled, label = 'Code de vérification', autoFocus }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { if (autoFocus) refs.current[0]?.focus(); }, [autoFocus]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');
  const set = (next: string) => onChange(next.replace(/\D/g, '').slice(0, length));

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[i]) set(value.slice(0, i) + value.slice(i + 1));
      else if (i > 0) { set(value.slice(0, i - 1) + value.slice(i)); refs.current[i - 1]?.focus(); }
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };
  const onType = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '');
    if (!d) return;
    const next = (value.slice(0, i) + d + value.slice(i + 1)).slice(0, length);
    set(next);
    refs.current[Math.min(i + d.length, length - 1)]?.focus();
  };
  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const d = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    set(d);
    refs.current[Math.min(d.length, length - 1)]?.focus();
  };

  return (
    <div role="group" aria-label={label} className="flex justify-center gap-2">
      {digits.map((d, i) => (
        <input
          key={i} ref={(el) => { refs.current[i] = el; }} value={d} disabled={disabled} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={length}
          aria-label={`${label}, chiffre ${i + 1}`}
          onChange={(e) => onType(i, e.target.value)} onKeyDown={(e) => onKey(i, e)} onPaste={onPaste} onFocus={(e) => e.target.select()}
          className={clsx('h-12 w-11 rounded-xl border bg-white text-center text-lg font-bold outline-none transition focus:border-brand focus:shadow-ring', d ? 'border-brand/50' : 'border-line')}
        />
      ))}
    </div>
  );
}
