import { MODULE_LABELS, ModuleKey } from '@/core/auth/permissions';

/** Case à cocher par module ; les modules toujours disponibles (administration, support, CVthèque) sont rappelés à part. */
export function ModulePicker({ modules, alwaysOn, value, onChange }: { modules: { key: string; label: string }[]; alwaysOn: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (k: string) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {modules.map((m) => <label key={m.key} className="flex items-center gap-2 text-[13px]"><input type="checkbox" className="accent-brand" checked={value.includes(m.key)} onChange={() => toggle(m.key)} /> {m.label}</label>)}
      </div>
      {alwaysOn.length > 0 && <p className="text-xs text-faint">Toujours inclus : {alwaysOn.map((k) => MODULE_LABELS[k as ModuleKey] ?? k).join(', ')}.</p>}
    </div>
  );
}
