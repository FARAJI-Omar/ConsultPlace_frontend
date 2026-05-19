import { useAlerts, useUpdateAlertStatus } from '../../../hooks/manager/useTracking';
import { toast } from 'sonner';
import { Skeleton, SkeletonCard } from '../../../components/ui/skeleton';

export default function AlertCenterPage() {
  const { data: alerts, isLoading } = useAlerts();
  const updateStatus = useUpdateAlertStatus();

  const handleResolve = (id: number) => {
    updateStatus.mutate(
      { id, status: 'RESOLVED' },
      {
        onSuccess: () => toast.success('Alerte résolue'),
        onError: () => toast.error("Erreur lors de la résolution de l'alerte"),
      },
    );
  };

  const severityConfig = {
    CRITICAL: { label: 'Critiques', count: alerts?.critical.length ?? 0, border: 'border-[#ef4444]', bg: 'bg-[#fef2f2]', dot: 'bg-[#ef4444]' },
    WARNING: { label: 'Avertissements', count: alerts?.warning.length ?? 0, border: 'border-[#f59e0b]', bg: 'bg-[#fffbeb]', dot: 'bg-[#f59e0b]' },
    INFO: { label: 'Informations', count: alerts?.info.length ?? 0, border: 'border-[#3b82f6]', bg: 'bg-[#eff6ff]', dot: 'bg-[#3b82f6]' },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#111111]">Centre d'alertes</h1>

      {isLoading ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="rounded-[12px] bg-[#f5f5f5] p-6">
            <Skeleton className="mb-4 h-6 w-1/4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Skeleton className="mt-1 h-2 w-2 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(Object.entries(severityConfig) as [keyof typeof severityConfig, typeof severityConfig[keyof typeof severityConfig]][]).map(([key, config]) => (
              <div
                key={key}
                className={`rounded-[12px] border-l-4 ${config.border} ${config.bg} p-6`}
              >
                <p className="text-sm font-medium text-[#6b7280]">{config.label}</p>
                <p className="mt-2 text-3xl font-semibold text-[#111111]">{config.count}</p>
              </div>
            ))}
          </div>

          {(['CRITICAL', 'WARNING', 'INFO'] as const).map((severity) => {
            const items = alerts?.[severity.toLowerCase() as keyof typeof alerts] ?? [];
            if (items.length === 0) return null;
            const config = severityConfig[severity];

            return (
              <div key={severity} className="rounded-[12px] bg-[#f5f5f5] p-6">
                <h2 className={`text-lg font-semibold text-[#111111]`}>{config.label}</h2>
                <div className="mt-4 space-y-3">
                  {items.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-3"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
                        <div>
                          <p className="text-sm font-medium text-[#111111]">{alert.title}</p>
                          <p className="text-xs text-[#6b7280]">{alert.message}</p>
                          <p className="mt-1 text-xs text-[#898989]">
                            {new Date(alert.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {severity === 'CRITICAL' && (
                          <button
                            disabled
                            className="cursor-not-allowed rounded-[8px] bg-[#e5e7eb] px-3 py-1.5 text-xs font-medium text-[#6b7280]"
                          >
                            Bientôt disponible
                          </button>
                        )}
                        <button
                          onClick={() => handleResolve(alert.id)}
                          disabled={updateStatus.isPending}
                          className="cursor-pointer rounded-[8px] border border-[#e5e7eb] px-3 py-1.5 text-xs font-medium text-[#111111] transition-colors hover:bg-[#f3f4f6]"
                        >
                          Résoudre
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
