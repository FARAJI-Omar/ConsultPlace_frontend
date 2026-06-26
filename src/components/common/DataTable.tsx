import { memo, useCallback, useState } from 'react';
import type { Pagination } from '../../types/api';

export interface Column<T> {
  key: string;
  label: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
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
  const [selectedRow, setSelectedRow] = useState<number | null>(null);

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedRow(null);
      onPageSizeChange(Number(e.target.value));
    },
    [onPageSizeChange],
  );

  const handleRowClick = (idx: number) => {
    setSelectedRow((prev) => (prev === idx ? null : idx));
  };

  const headerClass =
    'whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#6b7280] bg-[#E1E2ED] first:rounded-tl-[8px] last:rounded-tr-[8px]';

  const lastColClass = 'sticky right-0 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]';
  const cellClass = 'whitespace-nowrap px-4 py-3 text-[#111111] bg-[#ffffff] hover:bg-[#f9fafb]';

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs md:text-sm">
          <thead>
            <tr className="border-b border-[#e5e7eb]">
              {columns.map((col, idx) => (
              <th key={col.key} className={`${headerClass}${col.key === 'actions' ? ` ${lastColClass} bg-[#E1E2ED] text-center` : idx === columns.length - 1 ? ` ${lastColClass} text-center` : ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[#e5e7eb]">
                {columns.map((col, idx) => (
                  <td key={col.key} className={`${col.key === 'actions' ? 'whitespace-nowrap px-4 py-3 text-[#111111]' : cellClass}${col.key === 'actions' ? ` ${lastColClass} bg-[#E1E2ED] text-center` : idx === columns.length - 1 ? ` ${lastColClass} text-center` : ''}`}>
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
        <div className="flex min-h-50 items-center justify-center">
          <p className="text-sm text-[#6b7280]">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs md:text-sm">
        <thead>
          <tr className="border-b border-[#e5e7eb]">
            {columns.map((col, idx) => (
              <th key={col.key} className={`${headerClass}${col.key === 'actions' ? ` ${lastColClass} bg-[#E1E2ED] text-center` : idx === columns.length - 1 ? ` ${lastColClass} text-center` : ''}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => {
            const isSelected = selectedRow === idx;
            return (
              <tr
                key={idx}
                onClick={() => handleRowClick(idx)}
                className="border-b border-[#e5e7eb]"
              >
              {columns.map((col, colIdx) => {
                const isLast = colIdx === columns.length - 1;
                const cellClassName = `whitespace-nowrap px-4 py-3 text-[#111111]${col.key === 'actions' ? ` ${lastColClass} bg-[#f7f8fa] text-center` : isLast ? ` ${lastColClass} text-center` : ''}${col.key !== 'actions' ? (isSelected ? ' bg-yellow-100/50' : ' bg-[#ffffff] hover:bg-[#f9fafb]') : ''}`;
                return (
                  <td key={col.key} className={cellClassName}>
                    {col.render ? col.render(item, idx) : String((item as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                );
              })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-xs md:text-sm text-[#6b7280]">
          <span>Lignes par page:</span>
          <select
            value={pagination.itemsPerPage}
            onChange={handlePageSizeChange}
            className="rounded border border-[#e5e7eb] px-2 py-1 text-xs md:text-sm text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs md:text-sm text-[#6b7280]">
          <span>
            Page {pagination.currentPage} sur {pagination.totalPages}
          </span>
          <button
            onClick={() => { setSelectedRow(null); onPageChange(pagination.currentPage - 1); }}
            disabled={pagination.currentPage <= 1}
            className="cursor-pointer rounded border border-[#e5e7eb] px-3 py-1 text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db] disabled:hover:bg-transparent"
          >
            Précédent
          </button>
          <button
            onClick={() => { setSelectedRow(null); onPageChange(pagination.currentPage + 1); }}
            disabled={pagination.currentPage >= pagination.totalPages}
            className="cursor-pointer rounded border border-[#e5e7eb] px-3 py-1 text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#d1d5db] disabled:hover:bg-transparent"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}

export const DataTable = memo(DataTableInner) as typeof DataTableInner;
