INSERT INTO "Criterion" ("id", "label", "type", "order", "isActive", "categoryId")
SELECT
  concat('cm', md5(random()::text || clock_timestamp()::text || legacy.label)),
  legacy.label,
  'RADIO',
  COALESCE((SELECT MAX("order") FROM "Criterion" WHERE "categoryId" = "Category"."id"), 0) + 1,
  false,
  "Category"."id"
FROM "Category"
JOIN (
  VALUES
    ('מערכת מכ"ם', 'כשרות'),
    ('ערכת זה"ב', 'חירום'),
    ('תרגול שבועי ערכת זה"ב', 'חירום'),
    ('האם הטופס 246 הוא הטופס החדש', 'חירום')
) AS legacy(label, category) ON legacy.category = "Category"."name"
WHERE NOT EXISTS (
  SELECT 1
  FROM "Criterion"
  WHERE "Criterion"."categoryId" = "Category"."id"
    AND "Criterion"."label" = legacy.label
);

INSERT INTO "Criterion" ("id", "label", "type", "order", "isActive", "categoryId")
SELECT
  concat('cm', md5(random()::text || clock_timestamp()::text || 'present')),
  'נוכחים בביקורת',
  'TEXT',
  COALESCE((SELECT MAX("order") FROM "Criterion" WHERE "categoryId" = "Category"."id"), 0) + 1,
  false,
  "Category"."id"
FROM "Category"
WHERE "Category"."name" = 'סיכום'
  AND NOT EXISTS (
    SELECT 1
    FROM "Criterion"
    WHERE "Criterion"."categoryId" = "Category"."id"
      AND "Criterion"."label" = 'נוכחים בביקורת'
  );
