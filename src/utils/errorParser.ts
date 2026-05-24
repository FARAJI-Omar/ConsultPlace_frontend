import type { ValidationDetail } from '../types/api';

const BAD_REQUEST_FIELD_PATTERNS: { regex: RegExp; field: string }[] = [
  { regex: /date de début/i, field: 'startDate' },
  { regex: /date de fin/i, field: 'endDate' },
];

export function parseApiError(error: unknown): Record<string, string> | null {
  const err = error as {
    response?: {
      data?: {
        error?: {
          code?: string;
          message?: string;
          details?: ValidationDetail[];
        };
      };
    };
  };

  const apiError = err.response?.data?.error;
  if (!apiError) return null;

  if (apiError.code === 'VALIDATION_ERROR' && apiError.details?.length) {
    const fieldErrors: Record<string, string> = {};
    for (const d of apiError.details) {
      fieldErrors[d.field] = d.message;
    }
    return fieldErrors;
  }

  if (apiError.code === 'BAD_REQUEST' && apiError.message) {
    for (const { regex, field } of BAD_REQUEST_FIELD_PATTERNS) {
      if (regex.test(apiError.message)) {
        return { [field]: apiError.message };
      }
    }
  }

  return null;
}
