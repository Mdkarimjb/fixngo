import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, Role, Tokens } from '../types';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: AuthUser, tokens: Tokens) => void;
  clear: () => void;
}

/** Decodes the JWT payload without verifying (UI hints only; API is the authority). */
function decodeUser(accessToken: string): AuthUser | null {
  try {
    const [, payload] = accessToken.split('.');
    const json = JSON.parse(atob(payload)) as {
      sub: string;
      role: Role;
      phone: string;
    };
    return { id: json.sub, role: json.role, phone: json.phone };
  } catch {
    return null;
  }
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: (user, tokens) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'fixngo-auth' },
  ),
);

export { decodeUser };
