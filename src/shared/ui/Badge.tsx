import { ReactNode } from 'react';
import clsx from 'clsx';

const tones = {
  green: 'bg-brand-pale text-brand-text',
  amber: 'bg-amber-pale text-amber-text',
  red: 'bg-danger-pale text-danger-text',
  blue: 'bg-info-pale text-info-text',
  violet: 'bg-violet-pale text-violet-text',
  slate: 'bg-slate-soft text-slate-text',
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({ tone = 'slate', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}
