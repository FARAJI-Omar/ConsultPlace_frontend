import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#ffffff] px-4">
      <p className="text-[120px] font-bold leading-none text-[#d40606]">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-[#111111]">Page non trouvée</h1>
      <p className="mt-2 text-sm text-[#6b7280]">
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <Link
        to="/"
        className="mt-8 inline-block cursor-pointer rounded-[8px] bg-primary-blue px-6 py-3 text-sm font-medium text-[#ffffff] transition-opacity hover:opacity-90"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
