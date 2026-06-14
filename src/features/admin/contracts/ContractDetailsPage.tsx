import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Eye, FileText, Download } from 'lucide-react';
import { useGetContractById } from '../../../hooks/useContracts';
import { useGetMissionsByContract } from '../../../hooks/useMissions';
import { formatDate, cleanFilename } from '../../../lib/utils';
import Modal from '../../../components/common/Modal';
import ContractForm from './ContractForm';
import { downloadFile } from '../../../utils/downloadFile';

export default function ContractDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const contractId = Number(id);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const { data: contract, isLoading: contractLoading } = useGetContractById(contractId);
  const { data: missions, isLoading: missionsLoading } = useGetMissionsByContract(contractId);

  if (contractLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-[#e5e7eb]" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 animate-pulse rounded-[12px] bg-[#e5e7eb]" />
          <div className="h-64 animate-pulse rounded-[12px] bg-[#e5e7eb]" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-[#6b7280]">Contrat introuvable</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/admin/contracts"
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-1.5 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>
        <h1 className="text-2xl font-semibold text-[#111111]">
          Contrat {contract.ref}
        </h1>
        <button
          onClick={() => setEditModalOpen(true)}
          className="ml-auto cursor-pointer rounded-[8px] bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
        >
          Modifier
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">
            Informations du contrat
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Référence</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd className="shrink-0 font-medium text-[#111111]">{contract.ref}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Client</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd className="shrink-0 font-medium text-[#111111]">
                {contract.client?.raison_sociale ?? '—'}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Date de début</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd className="shrink-0 font-medium text-[#111111]">{formatDate(contract.startDate)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Date de fin</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd className="shrink-0 font-medium text-[#111111]">{formatDate(contract.endDate)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Profil</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd className="shrink-0 font-medium text-[#111111]">{contract.profile}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="shrink-0 text-[#6b7280]">Taux journalier</dt>
              <span className="flex-1 border-b border-dashed border-[#cdcfd1]" />
              <dd className="shrink-0 font-medium text-[#111111]">{contract.dailyRate} DH</dd>
            </div>
          </dl>

          {contract.attachments && contract.attachments.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-[#111111]">
                Documents ({contract.attachments.length})
              </h3>
              <ul className="space-y-2">
                {contract.attachments.map((doc) => (
                  <li key={doc.id}>
                    <div className="flex items-center gap-2 rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-sm text-[#111111]">
                      <FileText className="h-4 w-4 shrink-0 text-primary-blue" />
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1 truncate hover:underline"
                      >
                        {cleanFilename(doc.filename)}
                      </a>
                      <button
                        type="button"
                        onClick={() => downloadFile(doc.url, doc.filename)}
                        title="Telecharger"
                        className="cursor-pointer rounded p-2 text-[#016c11] transition-colors hover:bg-green-500 hover:text-[#111111]"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="rounded-[12px] border border-[#e5e7eb] bg-[#ffffff] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#111111]">
            Missions associées
          </h2>
          {missions && missions.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e7eb]">
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                    Titre
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                    Consultant
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                    Statut
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-[#6b7280]">
                  </th>
                </tr>
              </thead>
              <tbody>
                {missions.map((m) => (
                  <tr key={m.id} className="border-b border-[#e5e7eb] transition-colors hover:bg-[#f9fafb]">
                    <td className="px-3 py-2">
                      <Link
                        to={`/admin/missions/${m.id}`}
                        className="font-medium text-primary-blue transition-colors hover:text-primary-blue/80"
                      >
                        {m.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-[#111111]">{m.consultant?.name ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {m.status === 'ACTIVE' ? 'Active' : 'Clôturée'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        to={`/admin/missions/${m.id}`}
                        className="inline-flex cursor-pointer items-center rounded p-1.5 text-[#6b7280] transition-colors hover:bg-light-blue hover:text-primary-blue"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex min-h-[150px] items-center justify-center">
              <p className="text-sm text-[#6b7280]">
                {missionsLoading ? 'Chargement...' : 'Aucune mission associée'}
              </p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Modifier le contrat"
        size="lg"
      >
        <ContractForm
          key={contract.id}
          contract={contract}
          onSuccess={() => setEditModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
