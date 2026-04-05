-- Adds device token storage for FCM push notifications
-- Run this on your Placement_Tracking database (pgAdmin / psql)

CREATE TABLE IF NOT EXISTS "UserDevice" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  token        TEXT NOT NULL,
  platform     TEXT NOT NULL DEFAULT 'web',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE("userId", token)
);

CREATE INDEX IF NOT EXISTS idx_userdevice_user ON "UserDevice"("userId");

