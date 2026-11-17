-- One-time use for Google Chat Approve / Reject buttons
CREATE TABLE IF NOT EXISTS "ChatActionUse" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tokenHash" TEXT UNIQUE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('finish', 'self')),
  "requestId" TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject')),
  "usedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_action_use_request
  ON "ChatActionUse"(kind, "requestId");
