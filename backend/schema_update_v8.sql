-- Phase 13: SQL Migration for Audio Metadata Persistence
-- Execute this query within your Supabase Web Editor.

-- Create isolated metadata mapping for arbitrary filenames
CREATE TABLE IF NOT EXISTS file_metadata (
  filename TEXT PRIMARY KEY,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
