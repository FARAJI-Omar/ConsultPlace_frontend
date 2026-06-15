import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { jwtDecode } from 'jwt-decode';
import type { AuthUser, AuthState, JwtPayload } from '../types/auth';

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ accessToken: string }>,
    ) {
      const decoded = jwtDecode<JwtPayload>(action.payload.accessToken);
      state.token = action.payload.accessToken;
      state.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        consultantId: decoded.consultantId,
      };
      state.isAuthenticated = true;
    },
    setAccessToken(
      state,
      action: PayloadAction<{ accessToken: string }>,
    ) {
      state.token = action.payload.accessToken;
    },
    clearCredentials(state) {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, setAccessToken, clearCredentials } = authSlice.actions;
export type { AuthState, AuthUser };
export default authSlice.reducer;
