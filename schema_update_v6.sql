-- Add column to permanently store the physical length of the MP3 file in seconds
ALTER TABLE calls ADD COLUMN IF NOT EXISTS audio_duration NUMERIC(10, 2) DEFAULT 0.00;
