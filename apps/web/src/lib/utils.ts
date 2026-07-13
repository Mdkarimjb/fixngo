import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
/** Shared job-status color tokens, kept in sync across Customer/Technician/Admin views. */
export const JOB_STATUS_STYLES: Record<string, string> = {
  REQUESTED: 'bg-amber-100 text-amber-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-blue-100 text-blue-700',
  ON_SITE: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

export function formatJobStatus(status: string) {
  return status.replace(/_/g, ' ').toLowerCase();
}

/** The four visible stages of a job card; API statuses collapse onto them. */
export const JOB_STEPS = ['Requested', 'Assigned', 'On site', 'Done'] as const;

export function jobStepIndex(status: string): number {
  switch (status) {
    case 'REQUESTED':
      return 0;
    case 'ASSIGNED':
    case 'ACCEPTED':
      return 1;
    case 'ON_SITE':
    case 'IN_PROGRESS':
      return 2;
    case 'COMPLETED':
      return 3;
    default:
      return -1; // CANCELLED and unknown states show no progress
  }
}

/** Local (not UTC) "YYYY-MM-DDTHH:mm" string, for <input type="datetime-local"> min/value. */
export function toDateTimeLocalValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function roleHomePath(role: string | undefined): string {
  switch (role) {
    case 'CUSTOMER': return '/customer';
    case 'TECHNICIAN': return '/technician';
    case 'ADMIN': return '/admin';
    default: return '/login';
  }
}

/** Formats a paise amount (integer, INR/100) as a localized currency string. */
export function money(paise: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

/** Up to two uppercase initials from a display name, e.g. "Ravi Kumar" -> "RK". */
export function initials(name?: string, fallback = 'FN') {
  return (
    (name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || fallback
  );
}

/** Extracts a human-readable message from an axios error response. */
export function apiErrorMessage(error: unknown, fallback = 'The request could not be completed.') {
  const message = (error as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message || fallback;
}
