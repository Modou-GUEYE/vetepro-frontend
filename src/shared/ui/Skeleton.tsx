import clsx from 'clsx';

export const Skeleton = ({ className }: { className?: string }) => (
  <div aria-hidden className={clsx('animate-pulse rounded-lg bg-slate-soft', className ?? 'h-4 w-full')} />
);
