-- ReplyRelay security & compliance update (November 2026).
-- Run ONCE in Neon → SQL Editor BEFORE deploying the new code (or run `npx prisma db push`).
-- Safe to run more than once.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "ContactOptOut" (
    "channelId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactOptOut_pkey" PRIMARY KEY ("channelId","contactId")
);

CREATE TABLE IF NOT EXISTS "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "DeletionRequest" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "DeletionRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");
CREATE UNIQUE INDEX IF NOT EXISTS "DeletionRequest_code_key" ON "DeletionRequest"("code");

DO $$ BEGIN
  ALTER TABLE "ContactOptOut" ADD CONSTRAINT "ContactOptOut_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reset links are now stored hashed; old unused links stop working (people can request a new one).
DELETE FROM "PasswordReset" WHERE "usedAt" IS NULL;
