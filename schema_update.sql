-- AI Credentials Table
CREATE TABLE IF NOT EXISTS ai_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL UNIQUE,
    api_key TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note: In a production app, Row Level Security (RLS) would be enabled here.
