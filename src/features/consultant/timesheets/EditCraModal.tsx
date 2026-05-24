import EditCraForm from './EditCraForm';

interface EditCraModalProps {
  timesheetId: number;
  open: boolean;
  onClose: () => void;
}

export default function EditCraModal({ timesheetId, open, onClose }: EditCraModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-screen w-full max-w-5xl overflow-y-auto rounded-[12px] bg-[#ffffff] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#111111]">Modifier les heures</h2>
          <button onClick={onClose} className="cursor-pointer text-[#6b7280] hover:text-[#111111]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <EditCraForm timesheetId={timesheetId} onClose={onClose} />
      </div>
    </div>
  );
}
