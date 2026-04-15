-- Update Calls Table to track costs
ALTER TABLE calls ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 4) DEFAULT 0.0000;
