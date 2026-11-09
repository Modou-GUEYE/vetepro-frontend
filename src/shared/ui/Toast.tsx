import clsx from 'clsx';
import { useToastStore } from './toast.store';

const tone = {
  info: 'bg-ink',
  success: 'bg-brand-text',
  warning: 'bg-amber',
  error: 'bg-danger',
} as const;

export function Toaster() {
  const { items, dismiss } = useToastStore();
  return (
    <div className="fixed bottom-5 right-5 z-[2000] flex flex-col gap-2" role="status" aria-live="polite">
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={clsx('rounded-xl px-[18px] py-3 text-left text-[13px] font-semibold text-white shadow-pop', tone[t.kind])}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
