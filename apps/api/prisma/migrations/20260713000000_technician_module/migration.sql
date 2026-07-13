-- Complete the technician profile and job lifecycle persistence.
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

ALTER TABLE "Technician"
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "experienceYears" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "serviceArea" TEXT,
  ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "locationUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "availabilityUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Job"
  ADD COLUMN "assignedAt" TIMESTAMP(3),
  ADD COLUMN "acceptedAt" TIMESTAMP(3),
  ADD COLUMN "onSiteAt" TIMESTAMP(3),
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Preserve assignment dates for existing assigned jobs.
UPDATE "Job"
SET "assignedAt" = "updatedAt"
WHERE "technicianId" IS NOT NULL;

CREATE TABLE "JobAssignment" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "technicianId" TEXT NOT NULL,
  "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
  "declineReason" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  CONSTRAINT "JobAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobAssignment_jobId_idx" ON "JobAssignment"("jobId");
CREATE INDEX "JobAssignment_technicianId_status_idx" ON "JobAssignment"("technicianId", "status");
CREATE UNIQUE INDEX "JobAssignment_one_pending_per_job"
  ON "JobAssignment"("jobId") WHERE "status" = 'PENDING';

ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_jobId_fkey"
  FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_technicianId_fkey"
  FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed assignment history for jobs created before this module was introduced.
INSERT INTO "JobAssignment" (
  "id", "jobId", "technicianId", "status", "assignedAt", "respondedAt"
)
SELECT
  'legacy-' || "id",
  "id",
  "technicianId",
  CASE
    WHEN "status" = 'ASSIGNED' THEN 'PENDING'::"AssignmentStatus"
    ELSE 'ACCEPTED'::"AssignmentStatus"
  END,
  COALESCE("assignedAt", "updatedAt"),
  CASE WHEN "status" = 'ASSIGNED' THEN NULL ELSE "updatedAt" END
FROM "Job"
WHERE "technicianId" IS NOT NULL
  AND "status" NOT IN ('REQUESTED', 'CANCELLED');
