import { useParams, Link } from 'react-router-dom';
import { FileText, Download } from 'lucide-react';
import { useTimesheetById } from '../../../hooks/consultant/useTimesheets';
import HorizontalStepper from '../../../components/common/HorizontalStepper';
import { downloadFile } from '../../../utils/downloadFile';
import { truncateFilename } from '../../../lib/utils';

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const statusLabels: Record<string, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS: 'Soumis',
  VALIDE: 'Validé',
  REJETE: 'Rejeté',
  FACTURE: 'Facturé',
  PAYE: 'Payé',
};

function getMonthDays(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

export default function TimesheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ts, isLoading, isError } = useTimesheetById(Number(id));

  if (isLoading) {
    return <p className="text-sm text-[#6b7280]">Chargement...</p>;
  }

  if (isError || !ts) {
    return <p className="text-sm text-[#ef4444]">Relevé introuvable.</p>;
  }

  const [yearStr, monthStr] = ts.month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const totalDays = getMonthDays(year, monthNum);
  const firstDay = getFirstDayOfMonth(year, monthNum);

  const entriesByDay: Record<number, number> = {};
  for (const e of ts.dailyEntries ?? []) {
    entriesByDay[e.day] = e.hours;
  }

  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    calendarCells.push(d);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/consultant/timesheets"
          className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-3 py-1.5 text-sm text-[#111111] transition-colors hover:bg-[#f3f4f6]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>
        <h1 className="text-xl font-semibold text-[#111111]">Détail du relevé</h1>
      </div>

      <div className="rounded-[12px] bg-white p-4">
        <h2 className="mb-6 text-lg font-semibold text-[#111111]">Suivi du statut</h2>
        <HorizontalStepper
          steps={(ts.history ?? []).map((e) => ({
            status: e.newStatus,
            label: statusLabels[e.newStatus] ?? e.newStatus,
            timestamp: e.timestamp,
          }))}
          currentStatus={ts.status}
        />
      </div>

      <div className="rounded-[12px] bg-white p-4">
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-[#6b7280]">Mission</p>
            <p className="font-medium text-[#111111]">{ts.mission?.title ?? '—'}</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Mois</p>
            <p className="font-medium text-[#111111]">{monthNames[monthNum - 1]} {year}</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Statut</p>
            <p className="font-medium text-[#111111]">{statusLabels[ts.status] ?? ts.status}</p>
          </div>
          <div>
            <p className="text-[#6b7280]">Total heures</p>
            <p className="font-medium text-[#111111]">{ts.totalHours}h</p>
          </div>
        </div>
      </div>

      <div className="rounded-[12px] bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold text-[#111111]">Calendrier</h2>
        <div className="grid grid-cols-7 gap-1 text-center text-sm">
          {DAY_LABELS.map((label) => (
            <div key={label} className="py-1 text-xs font-medium text-[#6b7280]">{label}</div>
          ))}
          {calendarCells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} />;
            }
            const hours = entriesByDay[day];
            const hasEntry = hours !== undefined;
            return (
              <div
                key={day}
                className={`rounded-[6px] py-1 md:py-2 text-sm ${
                  hasEntry
                    ? 'bg-[#3b82f6] font-medium text-[#ffffff]'
                    : 'bg-[#f5f5f5c5] text-[#6b7280]'
                }`}
              >
                <div>{day}</div>
                {hasEntry && <div className="text-sm font-bold opacity-80">{hours}h</div>}
              </div>
            );
          })}
        </div>
      </div>

      {(() => {
        const filtered = ts.attachments?.filter((a) => a.type === 'PROOF' || a.type === 'CONSULTANT_FACTURE');
        return filtered && filtered.length > 0 ? (
          <div className="rounded-[12px] bg-white p-4">
            <h2 className="mb-4 text-lg font-semibold text-[#111111]">Pièces jointes</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filtered.map((att) => (
                <button
                  key={att.id}
                  type="button"
                  onClick={() => downloadFile(att.url, att.filename)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-3 text-left transition-colors hover:bg-[#13bc0312]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#eff6ff]">
                    <FileText className="h-5 w-5 text-[#3b82f6]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs md:text-sm font-medium text-[#111111]">{truncateFilename(att.filename)}</p>
                    <p className="text-xs text-[#6b7280]">Telecharger</p>
                  </div>
                  <Download className="h-4 w-4 shrink-0 text-[#6b7280]" />
                </button>
              ))}
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
}
