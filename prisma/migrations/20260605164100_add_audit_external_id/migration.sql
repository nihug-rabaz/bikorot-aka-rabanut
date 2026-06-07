ALTER TABLE "Audit"
ADD COLUMN "externalId" TEXT;

CREATE UNIQUE INDEX "Audit_externalId_key"
ON "Audit"("externalId");

INSERT INTO "Criterion" ("id", "label", "type", "order", "isActive", "categoryId")
SELECT
  concat('cm', md5(random()::text || clock_timestamp()::text)),
  'ליווי מתגיירים',
  'RADIO',
  COALESCE((SELECT MAX("order") FROM "Criterion" WHERE "categoryId" = "Category"."id"), 0) + 1,
  false,
  "Category"."id"
FROM "Category"
WHERE "Category"."name" = 'הלכה'
  AND NOT EXISTS (
    SELECT 1
    FROM "Criterion"
    WHERE "Criterion"."categoryId" = "Category"."id"
      AND "Criterion"."label" = 'ליווי מתגיירים'
  );
