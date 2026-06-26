-- ============================================================
-- Phase 2 Migration: Todos
-- Tracks actionable items — manual, digest-generated, email tasks
-- Run in Supabase SQL Editor after 002_phase2_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS todos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  -- 'manual' | 'digest_action' | 'email_task' | 'follow_up_task'
  type             TEXT NOT NULL DEFAULT 'manual',
  -- Optional link to a lead
  linked_lead_id   UUID REFERENCES leads(id) ON DELETE SET NULL,
  -- Optional link to an email draft (for email_task todos)
  linked_draft_id  UUID REFERENCES email_drafts(id) ON DELETE SET NULL,
  -- Completion
  is_completed     BOOLEAN NOT NULL DEFAULT false,
  completed_at     TIMESTAMPTZ,
  -- Archival (completed todos are auto-archived)
  is_archived      BOOLEAN NOT NULL DEFAULT false,
  archived_at      TIMESTAMPTZ,
  -- Ordering & ownership
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS todos_is_completed_idx ON todos(is_completed);
CREATE INDEX IF NOT EXISTS todos_is_archived_idx ON todos(is_archived);
CREATE INDEX IF NOT EXISTS todos_linked_draft_id_idx ON todos(linked_draft_id);
CREATE INDEX IF NOT EXISTS todos_created_at_idx ON todos(created_at DESC);

-- RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_todos" ON todos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at trigger (reuses function from 002)
CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
