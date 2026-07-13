-- Speeds up the technician dashboard's per-technician count/aggregate
-- queries (getDashboard), which all filter on technicianId + status and
-- mostly also completedAt.
CREATE INDEX "Job_technicianId_status_completedAt_idx" ON "Job"("technicianId", "status", "completedAt");
