import { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({ title, description, action, icon }: { title: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-5 py-12 text-center text-slate">
      <div className="mb-3 opacity-70">{icon ?? <Inbox size={36} />}</div>
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
