ALTER TABLE "Inspector" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'INSPECTOR';

UPDATE "Inspector" i
SET "role" = u."role"
FROM "User" u
WHERE u.email IS NOT NULL AND i.email = u.email AND u."role" = 'ADMIN';

ALTER TABLE "User" DROP COLUMN "role";
