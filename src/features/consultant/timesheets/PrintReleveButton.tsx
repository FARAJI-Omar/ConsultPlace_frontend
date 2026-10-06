import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Printer, Pencil, Upload, X, Download, Loader2 } from 'lucide-react';
import { useConsultantProfile } from '../../../hooks/consultant/useConsultantProfile';
import newLogo from '../../../assets/new-logo2.png';

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']; // indexed by Date.getDay()

interface PrintReleveButtonProps {
  year: number;
  month: number; // 0-based
  entries: Record<string, number>;
  missionTitle: string;
  clientName: string;
  disabled?: boolean;
}

export default function PrintReleveButton(props: PrintReleveButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={props.disabled}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#afb1b3] bg-[#ffffff] px-4 py-2 text-sm font-semibold text-[#111111] transition-colors hover:bg-[#f3f4f6] disabled:opacity-50"
      >
        <Printer size={14} />
        Imprimer
      </button>
      {open && <PrintSheet {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function EditableField({
  label,
  value,
  editing,
  onEdit,
  onChange,
  onConfirm,
  textClass = 'text-[15px]',
}: {
  label?: string;
  value: string;
  editing: boolean;
  onEdit: () => void;
  onChange: (v: string) => void;
  onConfirm: () => void;
  textClass?: string;
}) {
  return (
    <div className="flex h-[23px] items-center">
      {label && (
        <>
          <span className="w-[133px]">{label}</span>
          <span>:</span>
        </>
      )}
      {editing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onConfirm}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          className={`ml-1.5 w-[460px] rounded border border-[#111111] px-1 outline-none ${textClass}`}
        />
      ) : (
        <span className={`ml-1.5 min-h-[20px] ${textClass}`}>{value}</span>
      )}
      <button
        type="button"
        onClick={onEdit}
        title="Modifier"
        className="print-hide ml-1 cursor-pointer rounded p-1 text-[#6b7280] transition-colors hover:bg-[#f3f4f6] hover:text-[#111111]"
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}

function PrintSheet({ year, month, entries, missionTitle, clientName, onClose }: PrintReleveButtonProps & { onClose: () => void }) {
  const { data: profile } = useConsultantProfile();
  const [logo, setLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState(clientName);
  const [projet, setProjet] = useState(missionTitle);
  const [code, setCode] = useState('');
  const [contrat, setContrat] = useState('');
  const [editing, setEditing] = useState<'client' | 'projet' | 'code' | 'contrat' | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  async function handleSavePdf() {
    const el = sheetRef.current;
    if (!el || saving) return;
    setSaving(true);
    try {
      el.classList.add('cra-capturing');
      const { toJpeg } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');
      const dataUrl = await toJpeg(el, { pixelRatio: 2, quality: 0.85, backgroundColor: '#ffffff' });
      el.classList.remove('cra-capturing');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      pdf.addImage(dataUrl, 'JPEG', 0, 0, 297, 210);
      pdf.save(`releve-${String(month + 1).padStart(2, '0')}-${year}.pdf`);
    } catch {
      sheetRef.current?.classList.remove('cra-capturing');
      toast.error('Échec de la génération du PDF.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      if (logo) URL.revokeObjectURL(logo);
    };
  }, [logo]);

  function handleLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
      toast.error('Seules les images PNG ou JPG sont acceptées.');
      return;
    }
    if (file.size > 500 * 1024) {
      toast.error('Le logo ne doit pas dépasser 500 Ko.');
      return;
    }
    setLogo(URL.createObjectURL(file));
  }

  const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1);
  const dayValue = (d: number) => {
    const h = entries[`day-${d}`] ?? 0;
    return h > 0 ? (h <= 4 ? 0.5 : 1) : 0;
  };
  const totalJH = days.reduce((s, d) => s + dayValue(d), 0);
  const fmt = (n: number) => String(n).replace('.', ',');
  const weekend = (d: number) => {
    const g = new Date(year, month, d).getDay();
    return g === 0 || g === 6;
  };
  const consultantName = profile?.profile.name ?? '';
  const dayColW = (1042 - 360 - 67) / days.length;

  const dayCells = (showValues: boolean) =>
    days.map((d) => {
      const v = dayValue(d);
      return (
        <td key={d} style={{ width: dayColW }} className={`border border-black h-[24px] text-center${weekend(d) ? ' bg-[#d9d9d9]' : ''}`}>
          {showValues && v > 0 ? fmt(v) : ''}
        </td>
      );
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <style>{`
        .cra-capturing { box-shadow: none !important; }
        .cra-capturing .print-hide { visibility: hidden !important; }
      `}</style>
      <div className="flex max-h-[94vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-[12px] bg-[#ffffff] shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] px-5 py-3">
          <p className="text-sm font-semibold text-[#111111]">
            Relevé mensuel — {monthNames[month]} {year}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-4 py-1.5 text-xs font-semibold text-[#111111] transition-colors hover:bg-[#f3f4f6]"
            >
              Fermer
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#f3f4f6] p-4">
          <div
            ref={sheetRef}
            className="cra-sheet mx-auto bg-[#ffffff]"
            style={{
              width: 1122,
              padding: 40,
              fontFamily: 'Helvetica, Arial, sans-serif',
              color: '#111111',
              boxShadow: '0 0 0 1px #e5e7eb',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            {/* Header: client logo + name + fields, Expehris logo */}
            <div className="flex items-start justify-between">
              <div>
                {logo ? (
                  <div className="relative inline-block">
                    <img src={logo} alt="Logo client" className="h-[56px] max-w-[260px] object-contain object-left" />
                    <button
                      type="button"
                      onClick={() => setLogo(null)}
                      title="Retirer le logo"
                      className="print-hide absolute -right-2 -top-2 cursor-pointer rounded-full bg-[#ffffff] p-0.5 text-[#dc5252] shadow"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="print-hide flex h-[56px] w-[220px] cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border-2 border-dashed border-[#9ca3af] text-xs font-semibold text-[#6b7280] transition-colors hover:border-[#111111] hover:text-[#111111]"
                  >
                    <Upload size={13} />
                    Logo client
                  </button>
                )}
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" onChange={handleLogo} className="hidden" />
                <div className="mt-[10px]">
                  <EditableField value={client} editing={editing === 'client'} onEdit={() => setEditing('client')} onChange={setClient} onConfirm={() => setEditing(null)} textClass="text-[16px] font-bold" />
                </div>
                <div className="mt-[6px]">
                  <EditableField label="Projet" value={projet} editing={editing === 'projet'} onEdit={() => setEditing('projet')} onChange={setProjet} onConfirm={() => setEditing(null)} />
                  <EditableField label="Code Projet" value={code} editing={editing === 'code'} onEdit={() => setEditing('code')} onChange={setCode} onConfirm={() => setEditing(null)} />
                  <EditableField label="N° Contrat" value={contrat} editing={editing === 'contrat'} onEdit={() => setEditing('contrat')} onChange={setContrat} onConfirm={() => setEditing(null)} />
                </div>
              </div>
              <img src={newLogo} alt="Expehris" className="h-[85px] w-[85px]" />
            </div>

            {/* Prestataire box */}
            <div className="mt-[9px] flex h-[48px] flex-col justify-center border-2 border-black px-[13px]">
              <p className="text-[15px] font-bold leading-[20px]">Prestataire :</p>
              <p className="text-[15px] font-bold leading-[20px]">Relevé mensuel des jours consultants</p>
            </div>

            {/* Month */}
            <p className="mt-[14px] pl-[33px] text-[15px] font-bold">
              Mois de : {monthNames[month]} {year}
            </p>

            {/* Table */}
            <table className="mt-[16px] table-fixed border-collapse text-[11.5px]" style={{ width: 1042 }}>
              <tbody>
                {/* letters — left region open, total column open */}
                <tr>
                  <td className="h-[21px]" style={{ width: 360 }} />
                  {days.map((d) => (
                    <td
                      key={d}
                      style={{ width: dayColW }}
                      className={`border border-black h-[21px] text-center font-bold${weekend(d) ? ' bg-[#6b7280] text-white' : ''}`}
                    >
                      {LETTERS[new Date(year, month, d).getDay()]}
                    </td>
                  ))}
                  <td className="h-[21px]" style={{ width: 67 }} />
                </tr>
                {/* dates */}
                <tr>
                  <td className="h-[21px] pr-2 text-right font-bold" style={{ width: 360 }}>Dates</td>
                  {days.map((d) => (
                    <td key={d} style={{ width: dayColW }} className="border border-black h-[21px] text-center">
                      {d}
                    </td>
                  ))}
                  <td className="h-[21px]" style={{ width: 67 }} />
                </tr>
                {/* Nom complet + Total JH (no inner vertical borders) */}
                <tr>
                  <td className="border border-black h-[21px] pl-2 text-left font-bold text-[12px]" style={{ width: 360 }}>Nom complet</td>
                  <td colSpan={days.length} className="border border-black h-[21px]" style={{ width: dayColW * days.length }} />
                  <td className="border border-black h-[21px] bg-[#FFC000] text-center font-bold" style={{ width: 67 }}>Total JH</td>
                </tr>
                {/* consultant row */}
                <tr>
                  <td className="border border-black h-[24px] pl-2 text-left font-bold text-[12.5px]" style={{ width: 360 }}>{consultantName}</td>
                  {dayCells(true)}
                  <td className="border border-black h-[24px] text-center font-bold text-[12.5px]" style={{ width: 67 }}>{fmt(totalJH)}</td>
                </tr>
                {/* total row */}
                <tr>
                  <td className="border border-black h-[24px] bg-[#FFC000] text-center font-bold text-[12.5px]" style={{ width: 360 }}>Total</td>
                  {dayCells(false)}
                  <td className="border border-black h-[24px] text-center font-bold text-[12.5px]" style={{ width: 67 }}>{fmt(totalJH)}</td>
                </tr>
              </tbody>
            </table>

            {/* small yellow total box */}
            <div className="mt-[13px] flex justify-end">
              <div className="flex h-[24px] w-[93px] items-center justify-center border-2 border-black bg-[#FFC000] text-[13px] font-bold">
                {fmt(totalJH)}
              </div>
            </div>

            {/* Remarques */}
            <div className="mt-[16px] h-[87px] border-2 border-black px-[13px] py-[11px]">
              <span className="text-[15px] font-bold underline">Remarques :</span>
            </div>

            {/* Signature box */}
            <div className="mt-[27px] h-[147px] border-2 border-black" />
          </div>
        </div>

        <div className="flex justify-end border-t border-[#e5e7eb] px-5 py-3">
          <button
            type="button"
            onClick={handleSavePdf}
            disabled={saving}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] bg-green-600 px-5 py-2.5 text-sm font-semibold text-[#ffffff] transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {saving ? 'Génération...' : 'Enregistrer PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
