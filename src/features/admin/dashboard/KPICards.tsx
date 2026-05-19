interface KPICardsProps {
  pendingInvoices: number;
  totalPendingInvoices: number;
  cabinetMargin: number;
  isLoading: boolean;
}

export default function KPICards({
  pendingInvoices,
  totalPendingInvoices,
  cabinetMargin,
  isLoading,
}: KPICardsProps) {
  const cards = [
    {
      label: 'Factures en attente',
      value: pendingInvoices,
      suffix: '',
    },
    {
      label: 'Montant total impayé',
      value: totalPendingInvoices,
      suffix: ' DH',
    },
    {
      label: 'Marge cabinet',
      value: cabinetMargin,
      suffix: ' DH',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6"
        >
          <p className="text-sm text-[#6b7280]">{card.label}</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-[#e5e7eb]" />
          ) : (
            <p className="mt-2 text-2xl font-semibold text-[#111111]">
              {card.value.toLocaleString()}{card.suffix}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
