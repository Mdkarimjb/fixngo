ALTER TABLE "Job"
  ADD COLUMN "city" TEXT NOT NULL DEFAULT 'Guntur',
  ADD COLUMN "referenceCode" TEXT;

ALTER TABLE "ProductListing"
  ADD COLUMN "city" TEXT NOT NULL DEFAULT 'Guntur',
  ADD COLUMN "referenceCode" TEXT;

WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS sequence
  FROM "Job"
)
UPDATE "Job" AS job
SET "referenceCode" = 'GNT-SRV-' || LPAD(numbered.sequence::TEXT, 6, '0')
FROM numbered
WHERE job."id" = numbered."id";

WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS sequence
  FROM "ProductListing"
)
UPDATE "ProductListing" AS listing
SET "referenceCode" = 'GNT-SEL-' || LPAD(numbered.sequence::TEXT, 6, '0')
FROM numbered
WHERE listing."id" = numbered."id";

ALTER TABLE "Job" ALTER COLUMN "referenceCode" SET NOT NULL;
ALTER TABLE "ProductListing" ALTER COLUMN "referenceCode" SET NOT NULL;

CREATE UNIQUE INDEX "Job_referenceCode_key" ON "Job"("referenceCode");
CREATE UNIQUE INDEX "ProductListing_referenceCode_key" ON "ProductListing"("referenceCode");

CREATE TABLE "ReferenceSequence" (
  "key" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferenceSequence_pkey" PRIMARY KEY ("key")
);

INSERT INTO "ReferenceSequence" ("key", "value", "updatedAt")
VALUES
  ('GNT-SRV', (SELECT COUNT(*)::INTEGER FROM "Job"), CURRENT_TIMESTAMP),
  ('GNT-SEL', (SELECT COUNT(*)::INTEGER FROM "ProductListing"), CURRENT_TIMESTAMP);
