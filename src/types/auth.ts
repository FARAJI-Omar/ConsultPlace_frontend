export type UserRole = 'ADMIN' | 'GESTIONNAIRE' | 'CONSULTANT';

export interface LoginPayload {
  email: string;
  password: string;
  captchaToken: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    consultantId: number | null;
  };
}

export interface JwtPayload {
  id: number;
  role: UserRole;
  consultantId: number | null;
}

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  consultantId: number | null;
}

export interface CompleteRegistrationPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface CompleteRegistrationResponse {
  success: boolean;
  data: { consultantName: string; email: string };
}

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
}
