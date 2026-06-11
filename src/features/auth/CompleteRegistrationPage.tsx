import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import apiClient from '../../lib/apiClient';
import newLogo from '../../assets/new-logo.png';
import type { CompleteRegistrationPayload, CompleteRegistrationResponse } from '../../types/auth';

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

const errorMessages: Record<string, string> = {
  'Lien d\'invitation invalide': 'Lien invalide',
  'Le lien d\'invitation a expiré (valable 72h)': 'Lien expiré',
  'Ce compte a déjà été activé': 'Compte déjà activé',
};

function getErrorMessage(message: string): string {
  return errorMessages[message] || message;
}

export default function CompleteRegistrationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!searchParams.get('token')) {
      setErrorMessage('Lien d\'invitation invalide');
    } else {
      setErrorMessage(null);
    }
  }, [searchParams]);

  const mutation = useMutation({
    mutationFn: (payload: CompleteRegistrationPayload) =>
      apiClient
        .post<CompleteRegistrationResponse>('/complete-registration', payload)
        .then((res) => res.data),
    onSuccess: () => {
      navigate('/login', { state: { registrationSuccess: true } });
    },
    onError: (error: unknown) => {
      const err = error as {
        response?: {
          data?: {
            error?: { message?: string };
          };
        };
      };
      const message = err.response?.data?.error?.message || 'Une erreur est survenue';
      setErrorMessage(getErrorMessage(message));
    },
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setFieldErrors({});
      setErrorMessage(null);

      const currentToken = searchParams.get('token');
      if (!currentToken) {
        setErrorMessage('Lien d\'invitation invalide');
        return;
      }

      const errors: FieldErrors = {};
      if (!password || password.length < 6) {
        errors.password = 'Mot de passe requis (min 6 caractères)';
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = 'Les mots de passe ne correspondent pas';
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      mutation.mutate({ token: currentToken, password, confirmPassword });
    },
    [searchParams, password, confirmPassword, mutation],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#ffffff] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src={newLogo} alt="ConsultPlace" className="mx-auto h-32" />
          <h1 className="mt-4 text-lg font-semibold text-[#111111]">Finalisez votre inscription</h1>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-[8px] bg-[#fef2f2] px-4 py-3 text-sm text-[#ef4444]">
            {errorMessage}
          </div>
        )}

        {searchParams.get('token') && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#374151]">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  minLength={6}
                  className={`mt-1 block w-full rounded-[8px] border bg-[#ffffff] px-[14px] py-[10px] pr-10 text-base text-[#111111] placeholder:text-[#6b7280] focus:outline-none ${
                    fieldErrors.password
                      ? 'border-[#ef4444] focus:border-[#ef4444]'
                      : 'border-[#e5e7eb] focus:border-primary-blue'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#6b7280] hover:text-[#111111]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-[#ef4444]">{fieldErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#374151]">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`mt-1 block w-full rounded-[8px] border bg-[#ffffff] px-[14px] py-[10px] pr-10 text-base text-[#111111] placeholder:text-[#6b7280] focus:outline-none ${
                    fieldErrors.confirmPassword
                      ? 'border-[#ef4444] focus:border-[#ef4444]'
                      : 'border-[#e5e7eb] focus:border-primary-blue'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#6b7280] hover:text-[#111111]"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-sm text-[#ef4444]">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex w-full cursor-pointer items-center justify-center rounded-[8px] bg-primary-blue px-5 py-3 text-sm font-semibold leading-none text-[#ffffff] transition-opacity hover:opacity-90 disabled:bg-[#e5e7eb] disabled:text-[#6b7280]"
            >
              {mutation.isPending ? 'Enregistrement...' : 'Finaliser l\'inscription'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
