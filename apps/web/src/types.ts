export type Role = 'CUSTOMER' | 'TECHNICIAN' | 'ADMIN';

export interface AuthUser {
  id: string;
  role: Role;
  phone: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
