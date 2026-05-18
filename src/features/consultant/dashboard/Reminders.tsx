import type { Timesheet } from '../../../types/models';

interface RemindersProps {
  unsubmittedDrafts: Timesheet[];
  activeMissionCount: number;
}

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function getCurrentMonthFr(): string {
  return MONTHS_FR[new Date().getMonth()];
}

export default function Reminders({
  unsubmittedDrafts,
  activeMissionCount,
}: RemindersProps) {
  const reminders: { message: string; type: 'warning' | 'info' }[] = [];

  if (unsubmittedDrafts.length > 0) {
    reminders.push({
      message: `Vous avez ${unsubmittedDrafts.length} relevé mensuel brouillon${unsubmittedDrafts.length > 1 ? 's' : ''} non soumi${unsubmittedDrafts.length > 1 ? 's' : ''} pour ${getCurrentMonthFr()}.`,
      type: 'warning',
    });
  }

  if (activeMissionCount > 0) {
    reminders.push({
      message: `Vous avez ${activeMissionCount} mission${activeMissionCount > 1 ? 's' : ''} active${activeMissionCount > 1 ? 's' : ''}.`,
      type: 'info',
    });
  }

  if (reminders.length === 0) {
    return (
      <div className="rounded-[12px] bg-[#f5f5f5] p-8">
        <h2 className="text-[18px] font-semibold text-[#111111] leading-[1.4] mb-4">
          Rappels
        </h2>
        <p className="text-[16px] text-[#374151] leading-[1.5]">
          Aucun rappel en attente.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] bg-[#f5f5f5] p-8">
      <h2 className="text-[18px] font-semibold text-[#111111] leading-[1.4] mb-4">
        Rappels
      </h2>
      <div className="space-y-3">
        {reminders.map((reminder, idx) => (
          <div
            key={idx}
            className={`rounded-[8px] px-4 py-3 text-sm ${
              reminder.type === 'warning'
                ? 'bg-[#fef3c7] text-[#92400e]'
                : 'bg-[#dbeafe] text-[#1e40af]'
            }`}
          >
            {reminder.message}
          </div>
        ))}
      </div>
    </div>
  );
}
