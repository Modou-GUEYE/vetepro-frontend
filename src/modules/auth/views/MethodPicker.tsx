import clsx from 'clsx';
import { METHOD_HINT, METHOD_LABEL, TWOFA_METHODS, TwoFactorMethod } from '../models/auth';

/** Choix de la méthode d'envoi du code : SMS, e-mail ou application. */
export function MethodPicker({ value, onChange }: { value: TwoFactorMethod; onChange: (m: TwoFactorMethod) => void }) {
  return (
    <div>
      <div role="radiogroup" aria-label="Méthode" className="grid grid-cols-3 overflow-hidden rounded-xl border border-line bg-mist p-0.5 text-[13px] font-semibold">
        {TWOFA_METHODS.map((m) => (
          <button key={m} type="button" role="radio" aria-checked={value === m} onClick={() => onChange(m)}
            className={clsx('rounded-[10px] px-3 py-2 transition', value === m ? 'bg-white text-brand shadow-sm' : 'text-slate hover:text-ink')}>
            {METHOD_LABEL[m]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate">{METHOD_HINT[value]}</p>
    </div>
  );
}
