ALTER TABLE "Technician"
  ADD COLUMN "city" TEXT NOT NULL DEFAULT 'Guntur',
  ADD COLUMN "points" INTEGER NOT NULL DEFAULT 0;

UPDATE "Technician" AS technician
SET "points" = completed.total * 10
FROM (
  SELECT "technicianId", COUNT(*)::INTEGER AS total
  FROM "Job"
  WHERE "status" = 'COMPLETED' AND "technicianId" IS NOT NULL
  GROUP BY "technicianId"
) AS completed
WHERE technician."id" = completed."technicianId";

DROP INDEX IF EXISTS "JobAssignment_one_pending_per_job";

CREATE INDEX "Technician_city_isAvailable_rating_idx"
  ON "Technician"("city", "isAvailable", "rating");
