import { useParams, Link } from 'react-router-dom';
import { FileText, Eye } from 'lucide-react';
import { useGetClientById } from '../../../hooks/useClients';
import { formatDate } from '../../../lib/utils';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const { data: client, isLoading } = useGetClientById(clientId);

  const LABELS: Record<string, string> = {
    raison_sociale: 'Raison sociale',
    rc: 'Registre de Commerce',
    identifiant_commun: 'ICE',
    identifiant_fiscal: 'IF',
    contact: 'Contact',
    email: 'Email',
    address: 'Adresse',
    phone_n: 'Téléphone',
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-[#e5e7eb]" />
        <div className="h-64 animate-pulse rounded-[12px] bg-[#e5e7eb]" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-[#6b7280]">Client introuvable</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/clients"
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-1.5 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>
        <h1 className="text-2xl font-semibold text-[#111111]">
          {client.raison_sociale}
          {client.isArchived && (
            <span className="ml-3 inline-block rounded-full bg-gray-100 px-3 py-0.5 text-sm font-medium text-gray-500">Archivé</span>
          )}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[12px] border border-[#e5e7eb] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">Informations du client</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#6b7280]">Raison sociale</dt>
              <dd className="font-medium text-[#111111]">{client.raison_sociale}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6b7280]">RC</dt>
              <dd className="font-medium text-[#111111]">{client.rc ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6b7280]">ICE</dt>
              <dd className="font-medium text-[#111111]">{client.identifiant_commun || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6b7280]">IF</dt>
              <dd className="font-medium text-[#111111]">{client.identifiant_fiscal ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6b7280]">Contact</dt>
              <dd className="font-medium text-[#111111]">{client.contact}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6b7280]">Email</dt>
              <dd className="font-medium text-[#111111]">{client.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6b7280]">Adresse</dt>
              <dd className="font-medium text-[#111111]">{client.address}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6b7280]">Téléphone</dt>
              <dd className="font-medium text-[#111111]">{client.phone_n ?? '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-[12px] border border-[#e5e7eb] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">
            Contrats ({client.contracts.length})
          </h2>
          {client.contracts.length > 0 ? (
            <div className="space-y-3">
              {client.contracts.map((contract) => (
                <div key={contract.id} className="rounded-[8px] border border-[#e5e7eb] p-4 transition-colors hover:bg-[#f9fafb]">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Link to={`/admin/contracts/${contract.id}`} className="font-medium text-primary-blue hover:underline">
                        {contract.ref}
                      </Link>
                      {contract.isArchived && (
                        <span className="ml-2 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Archivé</span>
                      )}
                    </div>
                    <Link
                      to={`/admin/contracts/${contract.id}`}
                      className="inline-flex cursor-pointer rounded p-1 text-[#6b7280] transition-colors hover:bg-light-blue hover:text-primary-blue"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[#6b7280]">
                    <span>Profil: {contract.profile}</span>
                    <span>Taux: {contract.dailyRate} DH</span>
                    <span>Début: {formatDate(contract.startDate)}</span>
                    <span>Fin: {formatDate(contract.endDate)}</span>
                  </div>
                  {contract.attachments && contract.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {contract.attachments.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-[#EFF6FF] px-2 py-0.5 text-xs text-primary-blue hover:underline"
                        >
                          <FileText className="h-3 w-3" />
                          {doc.filename}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#6b7280]">Aucun contrat associé</p>
          )}
        </div>
      </div>

      <div className="rounded-[12px] border border-[#e5e7eb] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#111111]">
          Historique des modifications ({client.history.length})
        </h2>
        {client.history.length > 0 ? (
          <div className="space-y-4">
            {client.history.map((entry) => (
              <div key={entry.id} className="border-l-2 border-[#e5e7eb] pl-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block rounded bg-[#EFF6FF] px-2 py-0.5 text-xs font-medium text-primary-blue">{entry.userRole}</span>
                  <span className="text-xs text-[#6b7280]">{formatDate(entry.timestamp)}</span>
                </div>
                <ul className="space-y-1">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="text-sm text-[#111111]">
                      <span className="font-medium">{LABELS[change.field] ?? change.field}</span>:{' '}
                      <span className="text-[#ef4444] line-through">{change.oldValue}</span>{' '}
                      <span className="text-[#10b981]">→ {change.newValue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6b7280]">Aucune modification enregistrée</p>
        )}
      </div>
    </div>
  );
}
