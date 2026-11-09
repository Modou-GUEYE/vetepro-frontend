import clsx from 'clsx';
import { Check, Circle } from 'lucide-react';
import { passwordChecks, passwordStrength } from '../viewmodels/password';

const bar = ['bg-slate-soft', 'bg-danger', 'bg-danger', 'bg-amber', 'bg-amber', 'bg-brand'];

export function PasswordStrength({ value }: { value: string }) {
  const { score, label } = passwordStrength(value);
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-soft">
          <div className={clsx('h-full rounded-full transition-all', bar[score])} style={{ width: `${(score / 5) * 100}%` }} />
        </div>
        <span className="w-12 text-right text-xs font-semibold text-slate">{label === 'Vide' ? '' : label}</span>
      </div>
      <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        {passwordChecks(value).map((c) => (
          <li key={c.label} className={clsx('flex items-center gap-1.5', c.ok ? 'text-brand-text' : 'text-faint')}>
            {c.ok ? <Check size={12} /> : <Circle size={10} />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
