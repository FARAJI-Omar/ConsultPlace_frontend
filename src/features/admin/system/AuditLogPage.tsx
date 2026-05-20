import { useState, useCallback } from 'react';
import { DataTable, type Column } from '../../../components/common/DataTable';
import { useGetAuditLogs } from '../../../hooks/useAuditLog';
import { formatDate } from '../../../lib/utils';
import type { AuditLogEntry } from '../../../hooks/useAuditLog';

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useGetAuditLogs(page, pageSize);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const columns: Column<AuditLogEntry>[] = [
    { key: 'action', label: 'Action' },
    { key: 'entityType', label: 'Type d\'entité' },
    { key: 'entityId', label: 'ID entité', render: (item) => String(item.entityId) },
    { key: 'userRole', label: 'Rôle' },
    { key: 'ipAddress', label: 'Adresse IP' },
    { key: 'timestamp', label: 'Date', render: (item) => formatDate(item.timestamp) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#111111]">Journal d'audit</h1>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        pagination={
          data?.pagination ?? {
            totalItems: 0,
            totalPages: 0,
            currentPage: 1,
            itemsPerPage: 10,
          }
        }
        isLoading={isLoading}
        isEmpty={(data?.data?.length ?? 0) === 0 && !isLoading}
        emptyMessage="Aucune entrée de journal trouvée"
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
