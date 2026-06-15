import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import apiClient from './apiClient';
import { setCredentials } from '../store/authSlice';

export function useSessionRestore() {
  const dispatch = useDispatch();
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    apiClient
      .post<{ success: boolean; data: { accessToken: string } }>('/refresh')
      .then((res) => {
        dispatch(setCredentials({ accessToken: res.data.data.accessToken }));
      })
      .catch(() => {})
      .finally(() => setRestoring(false));
  }, [dispatch]);

  return restoring;
}