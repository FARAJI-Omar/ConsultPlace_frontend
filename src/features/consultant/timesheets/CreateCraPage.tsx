import CreateCraForm from './CreateCraForm';

export default function CreateCraPage() {
  return (
    <div className="rounded-[12px] bg-[#f5f5f5] p-8">
      <h1 className="text-[22px] font-semibold text-[#111111] mb-6">
        Nouveau relevé mensuel
      </h1>
      <div className="rounded-[12px] bg-[#ffffff] border border-[#e5e7eb] p-8">
        <CreateCraForm />
      </div>
    </div>
  );
}
