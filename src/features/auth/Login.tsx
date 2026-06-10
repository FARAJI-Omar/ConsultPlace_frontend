import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLoginMutation } from './useLoginMutation';
import newLogo from '../../assets/new-logo.png';

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const loginMutation = useLoginMutation();

  useEffect(() => {
    const renderCaptcha = () => {
      if (window.grecaptcha?.render && captchaRef.current && widgetIdRef.current === null) {
        widgetIdRef.current = window.grecaptcha.render(captchaRef.current, {
          sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
          callback: (token: string) => {
            setCaptchaToken(token);
            setCaptchaError('');
          },
          'expired-callback': () => {
            setCaptchaToken('');
          },
        });
      }
    };

    renderCaptcha();

    const interval = setInterval(() => {
      if (window.grecaptcha?.render) {
        renderCaptcha();
        if (widgetIdRef.current !== null) clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setCaptchaError('');

    if (!email || !password) {
      const errors: FieldErrors = {};
      if (!email) errors.email = 'Email requis';
      if (!password) errors.password = 'Mot de passe requis';
      setFieldErrors(errors);
      return;
    }

    if (!captchaToken) {
      setCaptchaError('Veuillez compléter le CAPTCHA');
      return;
    }

    loginMutation.mutate(
      { email, password, captchaToken },
      {
        onSettled: () => {
          if (widgetIdRef.current !== null && window.grecaptcha) {
            window.grecaptcha.reset(widgetIdRef.current);
          }
          setCaptchaToken('');
        },
        onError: (error: unknown) => {
          const err = error as {
            response?: {
              data?: {
                error?: {
                  code?: string;
                  message?: string;
                  details?: { field: string; message: string }[];
                };
              };
            };
          };
          const apiError = err.response?.data?.error;
          if (apiError?.code === 'CAPTCHA_FAILED') {
            setCaptchaError(apiError.message || 'Vérification CAPTCHA échouée');
            return;
          }
          const details = apiError?.details;
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
            error?: { code?: string; message?: string; details?: unknown[] };
          };
        };
      };
      const apiError = err.response?.data?.error;
      if (!apiError) return 'Une erreur est survenue. Veuillez réessayer.';
      if (apiError.code === 'CAPTCHA_FAILED') return null;
      if (apiError.details && apiError.details.length > 0) return null;
      return apiError.message || 'Une erreur est survenue. Veuillez réessayer.';
    })();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#ffffff] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src={newLogo} alt="ConsultPlace" className="mx-auto h-32" />
          <p className="mt-4 text-sm text-[#6b7280]">
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
                  : 'border-[#e5e7eb] focus:border-primary-blue'
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
            <div ref={captchaRef}></div>
            {captchaError && (
              <p className="mt-1 text-sm text-[#ef4444]">{captchaError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending || !captchaToken}
            className="flex w-full cursor-pointer items-center justify-center rounded-[8px] bg-primary-blue px-5 py-3 text-sm font-semibold leading-none text-[#ffffff] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#e5e7eb] disabled:text-[#6b7280]"
          >
            {loginMutation.isPending ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
