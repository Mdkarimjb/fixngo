ALTER TABLE "Technician"
  ADD COLUMN "location" TEXT NOT NULL DEFAULT 'Brodipet';

ALTER TABLE "Job"
  ADD COLUMN "location" TEXT NOT NULL DEFAULT 'Brodipet';

UPDATE "Technician"
SET "location" = CASE
  WHEN "city" = 'Vijayawada' THEN 'Benz Circle'
  ELSE 'Brodipet'
END;

UPDATE "Job"
SET "location" = CASE
  WHEN "city" = 'Vijayawada' THEN 'Benz Circle'
  ELSE 'Brodipet'
END;

CREATE INDEX "Technician_city_location_isAvailable_rating_idx"
  ON "Technician"("city", "location", "isAvailable", "rating");
