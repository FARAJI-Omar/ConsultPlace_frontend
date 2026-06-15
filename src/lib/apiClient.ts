import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import type { store } from '../store';

let _store: typeof store | null = null;

export const setAuthStore = (s: typeof store) => {
  _store = s;
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

const MAX_RETRIES = 3;
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error || !token) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const isRefreshUrl = (url?: string) => !!url && url.endsWith('/refresh');

const refreshAccessToken = async (): Promise<string> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL}/refresh`,
    {},
    { withCredentials: true },
  );
  return response.data.data.accessToken;
};

const performRefresh = async (): Promise<string> => {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const newToken = await refreshAccessToken();
    _store?.dispatch({ type: 'auth/setAccessToken', payload: { accessToken: newToken } });
    processQueue(null, newToken);
    return newToken;
  } catch (error) {
    processQueue(error, null);
    _store?.dispatch({ type: 'auth/clearCredentials' });
    throw error;
  } finally {
    isRefreshing = false;
  }
};

apiClient.interceptors.request.use(async (config) => {
  if (!_store) {
    return config;
  }

  if (isRefreshUrl(config.url)) {
    return config;
  }

  const token = _store.getState().auth.token;

  if (token) {
    try {
      const decoded = jwtDecode(token);
      if (decoded.exp && decoded.exp * 1000 - Date.now() < 300000) {
        const newToken = await performRefresh();
        config.headers.Authorization = `Bearer ${newToken}`;
        return config;
      }
    } catch {
    }

    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!_store || !originalRequest) {
      return Promise.reject(error);
    }

    if (isRefreshUrl(originalRequest.url)) {
      return Promise.reject(error);
    }

    const isUnauthorized = error.response?.status === 401;
    const hasToken = !!_store.getState().auth.token;
    const retryCount = originalRequest._retryCount || 0;

    if (isUnauthorized && hasToken && retryCount < MAX_RETRIES) {
      originalRequest._retryCount = retryCount + 1;

      try {
        const newToken = await performRefresh();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch {
        return Promise.reject(error);
      }
    }

    if (isUnauthorized && !hasToken) {
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default apiClient;
