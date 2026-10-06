import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import newLogo from '../../assets/new-logo2.png';
import type { ForgotPasswordPayload } from '../../types/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: ForgotPasswordPayload) =>
      apiClient.post('/forgot-password', payload).then((r) => r.data),
    onSuccess: () => setSent(true),
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      const message = err.response?.data?.error?.message || 'Une erreur est survenue';
      setServerError(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setServerError(null);
    mutation.mutate({ email });
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#ffffff] px-4">
        <div className="w-full max-w-sm text-center">
          <img src={newLogo} alt="ConsultPlace" className="mx-auto h-32" />
          <div className="mt-6 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#d1fae5]">
            <Mail className="h-6 w-6 text-[#10b981]" />
          </div>
          <p className="mt-4 text-sm text-[#374151] leading-relaxed">
            Si un compte existe avec cette adresse, un email de réinitialisation
            vient d'être envoyé. Consultez votre boîte de réception et suivez le
            lien pour choisir un nouveau mot de passe.
          </p>
          <p className="mt-2 text-xs text-[#6b7280]">
            Pensez à vérifier vos spams si vous ne trouvez pas l'email.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block text-sm font-medium text-primary-blue hover:text-[#2563eb]"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#ffffff] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src={newLogo} alt="ConsultPlace" className="mx-auto h-32" />
          <h1 className="mt-4 text-lg font-semibold text-[#111111]">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Saisissez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        {serverError && (
          <div className="mb-4 rounded-[8px] bg-[#fef2f2] px-4 py-3 text-sm text-[#ef4444]">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#374151]">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@consultplace.com"
              required
              className="mt-1 block w-full rounded-[8px] border border-[#e5e7eb] bg-[#ffffff] px-[14px] py-[10px] text-base text-[#111111] placeholder:text-[#6b7280] focus:border-primary-blue focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex w-full cursor-pointer items-center justify-center rounded-[8px] bg-primary-blue px-5 py-3 text-sm font-semibold leading-none text-[#ffffff] transition-opacity hover:opacity-90 disabled:bg-[#e5e7eb] disabled:text-[#6b7280]"
          >
            {mutation.isPending ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#6b7280]">
          <Link to="/login" className="font-medium text-primary-blue hover:text-[#2563eb]">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
