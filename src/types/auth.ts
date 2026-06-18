export type UserRole = 'ADMIN' | 'GESTIONNAIRE' | 'CONSULTANT';

export interface LoginPayload {
  email: string;
  password: string;
  captchaToken: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
}

export interface JwtPayload {
  id: number;
  email: string;
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

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  data: { email: string };
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
