-- Brotherhood-KOS Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- KOS Entries Table
CREATE TABLE IF NOT EXISTS kos_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roblox_username VARCHAR(255) NOT NULL,
    roblox_user_id BIGINT,
    reason TEXT NOT NULL,
    added_by VARCHAR(255) NOT NULL,
    added_by_discord_id VARCHAR(255) NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    thumbnail_url TEXT,
    UNIQUE(roblox_username)
);

-- KOS History Table (for archived entries)
CREATE TABLE IF NOT EXISTS kos_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_entry_id UUID,
    roblox_username VARCHAR(255) NOT NULL,
    roblox_user_id BIGINT,
    reason TEXT NOT NULL,
    added_by VARCHAR(255) NOT NULL,
    added_by_discord_id VARCHAR(255) NOT NULL,
    removed_by VARCHAR(255),
    removed_by_discord_id VARCHAR(255),
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    removed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    removal_reason VARCHAR(50) DEFAULT 'manual',
    thumbnail_url TEXT
);

-- KOS Logs Table (for audit trail)
CREATE TABLE IF NOT EXISTS kos_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(50) NOT NULL,
    roblox_username VARCHAR(255),
    performed_by VARCHAR(255) NOT NULL,
    performed_by_discord_id VARCHAR(255) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot Configuration Table
CREATE TABLE IF NOT EXISTS bot_config (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_kos_entries_username ON kos_entries(roblox_username);
CREATE INDEX IF NOT EXISTS idx_kos_entries_active ON kos_entries(is_active);
CREATE INDEX IF NOT EXISTS idx_kos_entries_expiry ON kos_entries(expiry_date);
CREATE INDEX IF NOT EXISTS idx_kos_history_username ON kos_history(roblox_username);
CREATE INDEX IF NOT EXISTS idx_kos_logs_created_at ON kos_logs(created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on kos_entries
DROP TRIGGER IF EXISTS update_kos_entries_updated_at ON kos_entries;
CREATE TRIGGER update_kos_entries_updated_at
    BEFORE UPDATE ON kos_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on bot_config
DROP TRIGGER IF EXISTS update_bot_config_updated_at ON bot_config;
CREATE TRIGGER update_bot_config_updated_at
    BEFORE UPDATE ON bot_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to archive expired KOS entries
CREATE OR REPLACE FUNCTION archive_expired_kos()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move expired entries to history
    WITH expired_entries AS (
        DELETE FROM kos_entries
        WHERE expiry_date IS NOT NULL 
          AND expiry_date < NOW()
          AND is_active = TRUE
        RETURNING *
    )
    INSERT INTO kos_history (
        original_entry_id,
        roblox_username,
        roblox_user_id,
        reason,
        added_by,
        added_by_discord_id,
        removed_by,
        removed_by_discord_id,
        expiry_date,
        created_at,
        removed_at,
        removal_reason,
        thumbnail_url
    )
    SELECT 
        id,
        roblox_username,
        roblox_user_id,
        reason,
        added_by,
        added_by_discord_id,
        'System',
        'system',
        expiry_date,
        created_at,
        NOW(),
        'expired',
        thumbnail_url
    FROM expired_entries;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Initial bot configuration
INSERT INTO bot_config (key, value) 
VALUES ('bot_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE kos_entries IS 'Active KOS (Kill On Sight) entries';
COMMENT ON TABLE kos_history IS 'Historical record of removed or expired KOS entries';
COMMENT ON TABLE kos_logs IS 'Audit log of all KOS system actions';
COMMENT ON TABLE bot_config IS 'Bot configuration and settings storage';
COMMENT ON FUNCTION archive_expired_kos() IS 'Archives expired KOS entries to history table';
