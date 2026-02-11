/*
  Warnings:

  - You are about to drop the `_AuditToInspector` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_AuditToInspector" DROP CONSTRAINT "_AuditToInspector_A_fkey";

-- DropForeignKey
ALTER TABLE "_AuditToInspector" DROP CONSTRAINT "_AuditToInspector_B_fkey";

-- DropTable
DROP TABLE "_AuditToInspector";

-- CreateTable
CREATE TABLE "_AuditInspectors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AuditInspectors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AuditInspectors_B_index" ON "_AuditInspectors"("B");

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Inspector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuditInspectors" ADD CONSTRAINT "_AuditInspectors_A_fkey" FOREIGN KEY ("A") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AuditInspectors" ADD CONSTRAINT "_AuditInspectors_B_fkey" FOREIGN KEY ("B") REFERENCES "Inspector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
