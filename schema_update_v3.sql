-- Update Calls Table to track processing speed
ALTER TABLE calls ADD COLUMN IF NOT EXISTS processing_time NUMERIC(10, 4) DEFAULT 0.0000;
