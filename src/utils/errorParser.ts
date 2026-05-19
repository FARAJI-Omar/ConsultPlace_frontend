import type { ValidationDetail } from '../types/api';

export function parseApiError(error: unknown): Record<string, string> | null {
  const err = error as {
    response?: {
      data?: {
        error?: {
          code?: string;
          details?: ValidationDetail[];
        };
      };
    };
  };

  const apiError = err.response?.data?.error;
  if (!apiError) return null;
  if (apiError.code !== 'VALIDATION_ERROR') return null;
  if (!apiError.details || apiError.details.length === 0) return null;

  const fieldErrors: Record<string, string> = {};
  for (const d of apiError.details) {
    fieldErrors[d.field] = d.message;
  }
  return fieldErrors;
}
