CREATE TABLE "AppLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "actorName" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "message" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AppLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppLog_createdAt_idx" ON "AppLog"("createdAt");
CREATE INDEX "AppLog_eventType_createdAt_idx" ON "AppLog"("eventType", "createdAt");
