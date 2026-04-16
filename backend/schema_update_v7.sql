-- Phase 10 Migration
-- Execute this natively via the Supabase SQL Editor:
ALTER TABLE calls ADD COLUMN IF NOT EXISTS cost_transcribe NUMERIC(10, 4) DEFAULT 0.0000;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS cost_analyze NUMERIC(10, 4) DEFAULT 0.0000;
