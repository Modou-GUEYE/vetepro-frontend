import { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pageCount } from '@/core/http/pagination';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onRowClick?: (row: T) => void;
  /** Sans cadre propre, pour l'insérer dans un Panel. */
  bare?: boolean;
}

export function Table<T>({ columns, rows, rowKey, loading, emptyTitle = 'Aucun résultat', page, pageSize, total, onPageChange, onRowClick, bare }: TableProps<T>) {
  const pages = pageCount(total, pageSize);
  return (
    <div className={bare ? 'bg-white' : 'overflow-hidden rounded-lg2 border border-line bg-white shadow-card'}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse tabular-nums">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap border-b border-line bg-[#f8fafb] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.8px] text-slate">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i}>{columns.map((c) => <td key={c.key} className="px-4 py-3.5"><Skeleton /></td>)}</tr>
              ))}
            {!loading &&
              rows.map((r) => (
                <tr key={rowKey(r)} onClick={() => onRowClick?.(r)} className={`hover:bg-[#f7fafb] ${onRowClick ? 'cursor-pointer' : ''}`}>
                  {columns.map((c) => (
                    <td key={c.key} className={`border-b border-[#eef2f5] px-4 py-3.5 align-middle text-[13px] ${c.className ?? ''}`}>{c.render(r)}</td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && <EmptyState title={emptyTitle} />}
      <div className="flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-slate">
        <span>{total} élément{total > 1 ? 's' : ''}</span>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="secondary" aria-label="Page précédente" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={14} /></Button>
          <span>Page {page} / {pages}</span>
          <Button size="icon" variant="secondary" aria-label="Page suivante" disabled={page >= pages} onClick={() => onPageChange(page + 1)}><ChevronRight size={14} /></Button>
        </div>
      </div>
    </div>
  );
}
