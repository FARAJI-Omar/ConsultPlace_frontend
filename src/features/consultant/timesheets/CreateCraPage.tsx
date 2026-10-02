import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CreateCraForm from './CreateCraForm';

export default function CreateCraPage() {
  const [showHint, setShowHint] = useState(true);
  const hintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (hintRef.current && !hintRef.current.contains(e.target as Node)) {
        setShowHint(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const [searchParams] = useSearchParams();
  const missionIdParam = searchParams.get('missionId');
  const defaultMissionId = missionIdParam ? Number(missionIdParam) : undefined;

  return (
    <div className="p-2">
      <div className="flex items-center gap-2 mb-6 relative">
        <h1 className="text-[22px] font-semibold text-[#111111]">
          Nouveau relevé mensuel
        </h1>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowHint((p) => !p); }}
          className="w-5 h-5 rounded-full border border-[#ff0000] text-[#ff0000] text-[10px] flex items-center justify-center hover:bg-[#f3f4f6] transition-colors flex-shrink-0 cursor-pointer"
        >
          !
        </button>
        {showHint && (
          <div ref={hintRef} className="absolute left-20 top-full mt-2 bg-white border border-[#ff0000] rounded-lg shadow-lg p-6 text-sm text-[#6b7280] z-10 ">
            -Cliquez sur un jour : "Complet" = journée complète, <br />"Demi" = demi-journée,<br />
            -"—" = jour non travaillé. <br />-Un 3ᵉ clic réinitialise le jour.
          </div>
        )}
      </div>
      <div className="">
        <CreateCraForm defaultMissionId={defaultMissionId} />
      </div>
    </div>
  );
}
