import EditCraForm from './EditCraForm';

interface EditCraModalProps {
  timesheetId: number;
  open: boolean;
  onClose: () => void;
}

export default function EditCraModal({ timesheetId, open, onClose }: EditCraModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="max-h-screen w-full max-w-5xl overflow-y-auto rounded-[12px] bg-[#ffffff] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#e5e7eb]">
          <h2 className="text-lg font-semibold text-[#111111]">Modifier les heures</h2>
        </div>
        <div className="p-6">
          <EditCraForm timesheetId={timesheetId} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
