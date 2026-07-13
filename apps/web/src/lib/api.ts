import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuth, decodeUser } from '../store/auth';
import type { Tokens } from '../types';

const baseURL = import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({ baseURL });

// Attach the access token to every request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuth.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, try a single refresh + replay; otherwise clear the session.
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const { refreshToken } = useAuth.getState();

    if (error.response?.status === 401 && refreshToken && !original._retry) {
      original._retry = true;
      refreshing ??= refreshAccessToken(refreshToken);
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization =
          `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const { data } = await axios.post<Tokens>(`${baseURL}/auth/refresh`, {
      refreshToken,
    });
    const user = decodeUser(data.accessToken);
    if (user) {
      useAuth.getState().setSession(user, data);
      return data.accessToken;
    }
  } catch {
    useAuth.getState().clear();
  }
  return null;
}
