-- Drop the restrictive emotions check from Phase 1 so we can save our 7-spectrum dynamically
ALTER TABLE IF EXISTS calls DROP CONSTRAINT IF EXISTS calls_emotion_check;

-- Add a column to track the exact prompt utilized for complete transparency
ALTER TABLE calls ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT '';
