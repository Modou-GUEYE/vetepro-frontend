import { ReactNode } from 'react';
import { EmptyState, Skeleton } from '@/shared/ui';

export interface AssoColumn<T> { key: string; header: string; render: (row: T) => ReactNode; className?: string }

/** Tableau simple du back-office, sans pagination (les listes de l'association restent courtes). */
export function AssoTable<T>({ columns, rows, rowKey, onRowClick, loading, emptyTitle = 'Aucun résultat' }: {
  columns: AssoColumn<T>[]; rows: T[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; loading?: boolean; emptyTitle?: string;
}) {
  if (loading) return <div className="space-y-2 p-5"><Skeleton className="h-8" /><Skeleton className="h-8" /><Skeleton className="h-8" /></div>;
  if (rows.length === 0) return <EmptyState title={emptyTitle} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className="whitespace-nowrap border-b border-line bg-[#f8fafb] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.8px] text-slate">{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={`border-b border-[#eef2f5] ${onRowClick ? 'cursor-pointer hover:bg-mist' : ''}`}>
              {columns.map((c) => <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
