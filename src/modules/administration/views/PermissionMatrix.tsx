import clsx from 'clsx';
import { Check, Minus, Plus } from 'lucide-react';
import { ACTIONS, ACTION_LABELS, Action, CellOrigin, MODULES, MODULE_LABELS, ModuleKey } from '@/core/auth/permissions';

interface Props {
  cell: (m: ModuleKey, a: Action) => { on: boolean; origin: CellOrigin };
  onToggle: (m: ModuleKey, a: Action) => void;
  locked?: (m: ModuleKey) => boolean;
  readOnly?: boolean;
}

/** Tableau module × lecture / écriture / suppression. Une case « accordée » ou « retirée » signale une exception à l'héritage du profil. */
export function PermissionMatrix({ cell, onToggle, locked, readOnly }: Props) {
  return (
    <div className="overflow-hidden rounded-md2 border border-line">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-[#f8fafb] text-[11px] uppercase tracking-[.8px] text-slate">
            <th className="px-4 py-2.5 text-left font-semibold">Module</th>
            {ACTIONS.map((a) => <th key={a} className="px-3 py-2.5 text-center font-semibold">{ACTION_LABELS[a]}</th>)}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((m) => (
            <tr key={m} className="border-t border-[#eef2f5]">
              <td className="px-4 py-2 font-medium">{MODULE_LABELS[m]}</td>
              {ACTIONS.map((a) => {
                const { on, origin } = cell(m, a);
                const disabled = readOnly || locked?.(m);
                return (
                  <td key={a} className="px-3 py-1.5 text-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`${MODULE_LABELS[m]} : ${ACTION_LABELS[a]}${origin === 'grant' ? ' (accordé en plus)' : origin === 'deny' ? ' (retiré)' : ''}`}
                      disabled={disabled}
                      onClick={() => onToggle(m, a)}
                      className={clsx(
                        'relative inline-flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed',
                        origin === 'grant' && 'border-brand bg-brand-pale text-brand-text ring-2 ring-brand/30',
                        origin === 'deny' && 'border-danger bg-danger-pale text-danger-text ring-2 ring-danger/25',
                        origin === 'inherit' && (on ? 'border-brand/40 bg-brand-pale text-brand-text' : 'border-line bg-white text-transparent hover:border-[#b9c8d1]'),
                        !disabled && 'hover:shadow-card',
                        disabled && 'opacity-60',
                      )}
                    >
                      {on ? <Check size={15} /> : origin === 'deny' ? <Minus size={15} /> : <span className="h-4 w-4" />}
                      {origin === 'grant' && <Plus size={9} className="absolute -right-1 -top-1 rounded-full bg-brand p-px text-white" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
