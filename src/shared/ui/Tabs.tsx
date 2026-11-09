import clsx from 'clsx';

export interface TabItem<K extends string> { key: K; label: string }

export function Tabs<K extends string>({ items, value, onChange }: { items: TabItem<K>[]; value: K; onChange: (k: K) => void }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line bg-white px-5">
      {items.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={t.key === value}
          onClick={() => onChange(t.key)}
          className={clsx(
            'whitespace-nowrap rounded-t-sm border-b-[3px] px-3.5 py-[13px] text-[13px] font-semibold transition hover:bg-mist',
            t.key === value ? 'border-brand text-brand' : 'border-transparent text-slate hover:text-ink',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
