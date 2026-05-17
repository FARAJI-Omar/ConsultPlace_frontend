import { useState } from 'react';
import { useLoginMutation } from './useLoginMutation';

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const loginMutation = useLoginMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    if (!email || !password) {
      const errors: FieldErrors = {};
      if (!email) errors.email = 'Email requis';
      if (!password) errors.password = 'Mot de passe requis';
      setFieldErrors(errors);
      return;
    }

    loginMutation.mutate(
      { email, password },
      {
        onError: (error: unknown) => {
          const err = error as {
            response?: {
              data?: {
                error?: {
                  message?: string;
                  details?: { field: string; message: string }[];
                };
              };
            };
          };
          const details = err.response?.data?.error?.details;
          if (details && details.length > 0) {
            const mapped: FieldErrors = {};
            for (const d of details) {
              if (d.field === 'email') mapped.email = d.message;
              if (d.field === 'password') mapped.password = d.message;
            }
            setFieldErrors(mapped);
          }
        },
      },
    );
  };

  const generalError =
    loginMutation.error &&
    (() => {
      const err = loginMutation.error as {
        response?: {
          data?: {
            error?: { message?: string; details?: unknown[] };
          };
        };
      };
      const apiError = err.response?.data?.error;
      if (!apiError) return 'Une erreur est survenue. Veuillez réessayer.';
      if (apiError.details && apiError.details.length > 0) return null;
      return apiError.message || 'Une erreur est survenue. Veuillez réessayer.';
    })();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#ffffff] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.5px] text-[#111111]">
            ConsultPlace
          </h1>
          <p className="mt-2 text-sm text-[#6b7280]">
            Connectez-vous à votre espace
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {generalError && (
            <div className="rounded-[8px] bg-[#fef2f2] px-4 py-3 text-sm text-[#ef4444]">
              {generalError}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#374151]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="exemple@consultplace.com"
              className={`mt-1 block w-full rounded-[8px] border bg-[#ffffff] px-[14px] py-[10px] text-base text-[#111111] placeholder:text-[#6b7280] focus:outline-none ${
                fieldErrors.email
                  ? 'border-[#ef4444] focus:border-[#ef4444]'
                  : 'border-[#e5e7eb] focus:border-[#111111]'
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-[#ef4444]">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#374151]"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="••••••••"
              className={`mt-1 block w-full rounded-[8px] border bg-[#ffffff] px-[14px] py-[10px] text-base text-[#111111] placeholder:text-[#6b7280] focus:outline-none ${
                fieldErrors.password
                  ? 'border-[#ef4444] focus:border-[#ef4444]'
                  : 'border-[#e5e7eb] focus:border-[#111111]'
              }`}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-[#ef4444]">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="flex w-full items-center justify-center rounded-[8px] bg-[#111111] px-5 py-3 text-sm font-semibold leading-none text-[#ffffff] transition-colors hover:bg-[#242424] disabled:bg-[#e5e7eb] disabled:text-[#6b7280]"
          >
            {loginMutation.isPending ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
