import { memo, useCallback } from 'react';
import type { Pagination } from '../../types/api';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pagination: Pagination;
  isLoading: boolean;
  isEmpty: boolean;
  emptyMessage?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const PAGE_SIZES = [10, 20, 50];

function DataTableInner<T>({
  columns,
  data,
  pagination,
  isLoading,
  isEmpty,
  emptyMessage = 'Aucune donnée',
  onPageChange,
  onPageSizeChange,
}: DataTableProps<T>) {
  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onPageSizeChange(Number(e.target.value));
    },
    [onPageSizeChange],
  );

  const headerClass =
    'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280] bg-[#E1E2ED] first:rounded-tl-[8px] last:rounded-tr-[8px]';

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb]">
              {columns.map((col) => (
                <th key={col.key} className={headerClass}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[#e5e7eb]">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-[#e5e7eb]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="overflow-x-auto">
        <div className="flex min-h-[200px] items-center justify-center">
          <p className="text-sm text-[#6b7280]">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[#e5e7eb]">
            {columns.map((col) => (
              <th key={col.key} className={headerClass}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr
              key={idx}
              className="border-b border-[#e5e7eb] transition-colors hover:bg-[#f9fafb]"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-[#111111]">
                  {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-[#6b7280]">
          <span>Lignes par page:</span>
          <select
            value={pagination.itemsPerPage}
            onChange={handlePageSizeChange}
            className="rounded border border-[#e5e7eb] px-2 py-1 text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-sm text-[#6b7280]">
          <span>
            Page {pagination.currentPage} sur {pagination.totalPages}
          </span>
          <button
            onClick={() => onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage <= 1}
            className="rounded border border-[#e5e7eb] px-3 py-1 text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db] disabled:hover:bg-transparent"
          >
            Précédent
          </button>
          <button
            onClick={() => onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage >= pagination.totalPages}
            className="rounded border border-[#e5e7eb] px-3 py-1 text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db] disabled:hover:bg-transparent"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}

export const DataTable = memo(DataTableInner) as typeof DataTableInner;
