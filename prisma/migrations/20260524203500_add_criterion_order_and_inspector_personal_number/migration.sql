ALTER TABLE "Criterion"
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "categoryId"
      ORDER BY ctid
    ) AS position
  FROM "Criterion"
)
UPDATE "Criterion" AS c
SET "order" = ranked.position
FROM ranked
WHERE ranked.id = c.id;

ALTER TABLE "Inspector"
ADD COLUMN "personalNumber" TEXT NOT NULL DEFAULT '0000000';
