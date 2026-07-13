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
