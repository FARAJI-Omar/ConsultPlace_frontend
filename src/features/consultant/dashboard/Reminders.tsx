import { Link } from 'react-router-dom';

interface RemindersProps {
  draftCount: number;
  rejectedCount: number;
}

export default function Reminders({ draftCount, rejectedCount }: RemindersProps) {
  return (
    <div className="rounded-[12px] bg-[#f5f5f5] p-6">
      <h2 className="text-[18px] font-semibold text-[#111111] mb-4">Rappels</h2>

      <div className="space-y-3">
        <Link
          to="/consultant/timesheets/drafts"
          className="block rounded-[8px] bg-[#fef3c7] px-4 py-3 transition-colors hover:bg-[#fde68a]"
        >
          <p className="text-sm font-semibold text-[#92400e]">
            {draftCount > 0
              ? `${draftCount} brouillon${draftCount > 1 ? 's' : ''} en attente`
              : 'Aucun brouillon'}
          </p>
          <p className="text-xs text-[#92400e] mt-0.5">
            Consulter les brouillons &rarr;
          </p>
        </Link>

        <Link
          to="/consultant/timesheets/rejected"
          className="block rounded-[8px] bg-[#fef2f2] px-4 py-3 transition-colors hover:bg-[#fecaca]"
        >
          <p className="text-sm font-semibold text-[#991b1b]">
            {rejectedCount > 0
              ? `${rejectedCount} relevé${rejectedCount > 1 ? 's' : ''} rejeté${rejectedCount > 1 ? 's' : ''}`
              : 'Aucun relevé rejeté'}
          </p>
          <p className="text-xs text-[#991b1b] mt-0.5">
            Consulter les rejetés &rarr;
          </p>
        </Link>
      </div>
    </div>
  );
}
