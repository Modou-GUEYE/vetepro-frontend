import { useId, useRef, useState } from 'react';
import clsx from 'clsx';
import { Person, initials, matchPeople, pendingMention } from '../models/forum';

interface Props {
  value: string; onChange: (v: string) => void; people: Person[]; rows?: number; placeholder?: string; label?: string; error?: string; id?: string; onSubmit?: () => void;
}

/** Zone de texte où « @ » propose les personnes de la plateforme à mentionner (flèches, Entrée ou Tab pour choisir, Échap pour fermer). */
export function MentionTextarea({ value, onChange, people, rows = 4, placeholder, label, error, id, onSubmit }: Props) {
  const uid = useId();
  const fid = id ?? uid;
  const ref = useRef<HTMLTextAreaElement>(null);
  const [cursor, setCursor] = useState(0);
  const [index, setIndex] = useState(0);
  const [closed, setClosed] = useState(false);
  const pending = closed ? null : pendingMention(value, cursor);
  const options = pending ? matchPeople(people, pending.requete) : [];

  const pick = (p: Person) => {
    if (!pending) return;
    const after = value.slice(cursor);
    const before = `${value.slice(0, pending.debut)}@${p.nom} `;
    onChange(before + after);
    setIndex(0);
    requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(before.length, before.length); setCursor(before.length); });
  };

  return (
    <div className="relative flex flex-col gap-1.5">
      {label && <label htmlFor={fid} className="text-[11px] font-semibold uppercase tracking-[.7px] text-slate">{label}</label>}
      <textarea
        ref={ref} id={fid} rows={rows} value={value} placeholder={placeholder} aria-invalid={!!error} aria-autocomplete="list" aria-expanded={options.length > 0}
        className={clsx('w-full resize-y rounded-lg border border-line bg-white px-[11px] py-2 text-[13px] outline-none transition placeholder:text-faint hover:border-[#b9c8d1] focus:border-brand focus:shadow-ring', error && 'border-danger')}
        onChange={(e) => { onChange(e.target.value); setCursor(e.target.selectionStart); setIndex(0); setClosed(false); }}
        onSelect={(e) => setCursor(e.currentTarget.selectionStart)}
        onKeyDown={(e) => {
          if (options.length > 0) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => (i + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length); return; }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(options[index]); return; }
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setClosed(true); return; }
          }
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmit) { e.preventDefault(); onSubmit(); }
        }}
      />
      {options.length > 0 && (
        <ul role="listbox" className="absolute left-0 top-full z-20 mt-1 w-full max-w-[360px] overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          {options.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === index}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(p); }} className={clsx('flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-mist', i === index && 'bg-brand-pale/60')}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-soft text-[10px] font-bold text-slate-text">{initials(p.nom)}</span>
                <span className="min-w-0"><b className="block truncate">{p.nom}</b><span className="block truncate text-[11.5px] text-slate">{p.profil}{p.cabinet ? `, ${p.cabinet}` : ''}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
