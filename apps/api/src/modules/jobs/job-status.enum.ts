/** Mirrors the Prisma JobStatus enum for DTO validation. */
export enum JobStatus {
  REQUESTED = 'REQUESTED',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  ON_SITE = 'ON_SITE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
