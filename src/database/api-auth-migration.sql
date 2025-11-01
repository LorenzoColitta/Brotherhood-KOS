-- API Authentication Tables Migration
-- Run this in your Supabase SQL Editor after the initial schema

-- API Authentication Codes Table
CREATE TABLE IF NOT EXISTS api_auth_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) NOT NULL UNIQUE,
    discord_user_id VARCHAR(255) NOT NULL,
    discord_username VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Sessions Table
CREATE TABLE IF NOT EXISTS api_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(255) NOT NULL UNIQUE,
    discord_user_id VARCHAR(255) NOT NULL,
    discord_username VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_api_auth_codes_code ON api_auth_codes(code);
CREATE INDEX IF NOT EXISTS idx_api_auth_codes_expires ON api_auth_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_auth_codes_used ON api_auth_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_api_sessions_token ON api_sessions(token);
CREATE INDEX IF NOT EXISTS idx_api_sessions_expires ON api_sessions(expires_at);

-- Comments for documentation
COMMENT ON TABLE api_auth_codes IS 'Temporary authentication codes for API access';
COMMENT ON TABLE api_sessions IS 'Active API session tokens';
