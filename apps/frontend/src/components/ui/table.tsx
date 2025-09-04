import React, { useMemo, useState } from 'react';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
  filterText?: string;
  className?: string;
  footerLeft?: React.ReactNode;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  page,
  pageSize,
  total,
  onPageChange,
  defaultSortKey,
  defaultSortDir = 'asc',
  filterText,
  className,
  footerLeft,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultSortDir);

  const filtered = useMemo(() => {
    if (!filterText) return data;
    const q = filterText.toLowerCase();
    return data.filter(row => Object.values(row).some(v => typeof v === 'string' && v.toLowerCase().includes(q)));
  }, [data, filterText]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const va = (a as any)[sortKey];
      const vb = (b as any)[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return sortDir === 'asc' ? -1 : 1;
      if (vb == null) return sortDir === 'asc' ? 1 : -1;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return copy;
  }, [filtered, sortDir, sortKey]);

  const totalCount = filterText ? sorted.length : total;
  const pages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canPrev = page > 1;
  const canNext = page < pages;

  const handleSort = (key: string, enabled?: boolean) => {
    if (!enabled) return;
    if (sortKey === key) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const start = (page - 1) * pageSize;
  const end = page * pageSize;
  const pageSlice = useMemo(() => sorted.slice(start, end), [sorted, start, end]);

  return (
    <div className={cn('w-full overflow-hidden rounded-xl border bg-card text-card-foreground shadow-soft', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y">
          <thead className="bg-muted/40">
            <tr>
              {columns.map(col => (
                <th key={String(col.key)} scope="col" className={cn('px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide', col.className)}>
                  <button
                    className={cn('inline-flex items-center gap-1', col.sortable ? 'hover:text-foreground' : 'cursor-default')}
                    onClick={() => handleSort(String(col.key), col.sortable)}
                    aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    {col.header}
                    {col.sortable && <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {pageSlice.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-muted-foreground" colSpan={columns.length}>
                  No data available
                </td>
              </tr>
            ) : (
              pageSlice.map((row, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  {columns.map(col => (
                    <td key={String(col.key)} className={cn('px-4 py-3 text-sm', col.className)}>
                      {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t bg-card">
        <div className="text-xs text-muted-foreground">
          {footerLeft ?? (
            <span>
              Showing {totalCount === 0 ? 0 : start + 1}-{Math.min(end, totalCount)} of {totalCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 rounded border disabled:opacity-50" onClick={() => onPageChange(page - 1)} disabled={!canPrev}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground">Page {page} of {pages}</span>
          <button className="px-2 py-1 rounded border disabled:opacity-50" onClick={() => onPageChange(page + 1)} disabled={!canNext}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Table;
