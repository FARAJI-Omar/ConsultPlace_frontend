export type UserRole = 'ADMIN' | 'GESTIONNAIRE' | 'CONSULTANT';

export interface LoginPayload {
  email: string;
  password: string;
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

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
}
