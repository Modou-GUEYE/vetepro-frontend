import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { config } from '../config';
import { useSessionStore } from '../auth/session.store';
import { toApiError } from './errors';
import { toast } from '@/shared/ui/toast.store';

export const http = axios.create({ baseURL: config.apiUrl, timeout: 20_000 });

/** Routes pour lesquelles on n'affiche pas de toast automatique ni de refresh. */
const SILENT = ['/auth/login', '/auth/refresh', '/auth/2fa', '/auth/forgot', '/auth/reset'];
const isSilent = (url?: string) => SILENT.some((p) => url?.includes(p));

http.interceptors.request.use((req) => {
  const token = useSessionStore.getState().accessToken;
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, setTokens } = useSessionStore.getState();
  if (!refreshToken) throw new Error('no refresh token');
  const { data } = await axios.post(`${config.apiUrl}/auth/refresh`, {
    refresh_token: refreshToken,
  });
  setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
  return data.access_token as string;
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retry && !isSilent(original.url)) {
      original._retry = true;
      try {
        refreshing ??= refreshAccessToken().finally(() => (refreshing = null));
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        return http(original);
      } catch {
        useSessionStore.getState().clear();
        window.location.assign('/connexion');
        return Promise.reject(toApiError(error));
      }
    }

    const apiError = toApiError(error);
    if (apiError.status === 403 && apiError.code === 'permission_denied') {
      window.dispatchEvent(new Event('vetepro:permissions-stale')); // droits modifiés entre-temps : on les relit
    }
    if (!isSilent(original?.url) && apiError.status !== 422) toast.error(apiError.message);
    return Promise.reject(apiError);
  },
);
