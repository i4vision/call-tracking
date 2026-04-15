-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Calls Table
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    transcript TEXT,
    ai_version TEXT,
    emotion TEXT CHECK (emotion IN ('good', 'bad', 'neutral', 'unknown')) DEFAULT 'unknown',
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying emotions quickly on the dashboard
CREATE INDEX IF NOT EXISTS idx_calls_emotion ON calls(emotion);
