-- PersonaPass Database Schema
-- Production-grade schema for Supabase PostgreSQL

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    did TEXT UNIQUE NOT NULL,
    email TEXT,
    display_name TEXT,
    profile_picture TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_level TEXT DEFAULT 'basic' CHECK (verification_level IN ('basic', 'standard', 'premium')),
    preferences JSONB DEFAULT '{
        "theme": "light",
        "notifications": true,
        "analytics": true,
        "dataSharing": false
    }'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Credentials Table
CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_did TEXT NOT NULL REFERENCES user_profiles(did) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    credential_type TEXT NOT NULL,
    encrypted_credential TEXT NOT NULL,
    issuer TEXT NOT NULL,
    issuance_date TIMESTAMPTZ NOT NULL,
    expiration_date TIMESTAMPTZ,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    verification_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{
        "source": "PersonaPass",
        "automaticallyGenerated": true,
        "verificationScore": 0.95,
        "tags": []
    }'::jsonb
);

-- API Integrations Table
CREATE TABLE IF NOT EXISTS api_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_did TEXT NOT NULL REFERENCES user_profiles(did) ON DELETE CASCADE,
    api_provider TEXT NOT NULL,
    integration_id TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
    last_sync TIMESTAMPTZ DEFAULT NOW(),
    sync_count INTEGER DEFAULT 0,
    credentials TEXT[] DEFAULT '{}',
    configuration JSONB DEFAULT '{}'::jsonb,
    error_log TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_did, api_provider, integration_id)
);

-- ZK Proofs Table
CREATE TABLE IF NOT EXISTS zk_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_did TEXT NOT NULL REFERENCES user_profiles(did) ON DELETE CASCADE,
    proof_type TEXT NOT NULL,
    proof_data TEXT NOT NULL, -- encrypted proof data
    public_signals JSONB DEFAULT '{}'::jsonb,
    verification_count INTEGER DEFAULT 0,
    is_shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{
        "circuit": "unknown",
        "complexity": "medium",
        "generationTime": 0,
        "verified": true
    }'::jsonb
);

-- Verification Events Table (separate for better query performance)
CREATE TABLE IF NOT EXISTS verification_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credential_id TEXT NOT NULL REFERENCES credentials(credential_id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    verifier_did TEXT,
    verification_method TEXT NOT NULL,
    result TEXT NOT NULL CHECK (result IN ('success', 'failure', 'partial')),
    details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- System Metrics Table (for monitoring and analytics)
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram')),
    labels JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log Table (for security and compliance)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_did TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_did ON user_profiles(did);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

CREATE INDEX IF NOT EXISTS idx_credentials_user_did ON credentials(user_did);
CREATE INDEX IF NOT EXISTS idx_credentials_credential_id ON credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_credentials_credential_type ON credentials(credential_type);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);
CREATE INDEX IF NOT EXISTS idx_credentials_created_at ON credentials(created_at);
CREATE INDEX IF NOT EXISTS idx_credentials_expiration_date ON credentials(expiration_date);

CREATE INDEX IF NOT EXISTS idx_api_integrations_user_did ON api_integrations(user_did);
CREATE INDEX IF NOT EXISTS idx_api_integrations_api_provider ON api_integrations(api_provider);
CREATE INDEX IF NOT EXISTS idx_api_integrations_status ON api_integrations(status);
CREATE INDEX IF NOT EXISTS idx_api_integrations_last_sync ON api_integrations(last_sync);

CREATE INDEX IF NOT EXISTS idx_zk_proofs_user_did ON zk_proofs(user_did);
CREATE INDEX IF NOT EXISTS idx_zk_proofs_proof_type ON zk_proofs(proof_type);
CREATE INDEX IF NOT EXISTS idx_zk_proofs_is_shared ON zk_proofs(is_shared);
CREATE INDEX IF NOT EXISTS idx_zk_proofs_created_at ON zk_proofs(created_at);

CREATE INDEX IF NOT EXISTS idx_verification_events_credential_id ON verification_events(credential_id);
CREATE INDEX IF NOT EXISTS idx_verification_events_timestamp ON verification_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_verification_events_result ON verification_events(result);

CREATE INDEX IF NOT EXISTS idx_system_metrics_metric_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_did ON audit_logs(user_did);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Row Level Security (RLS) Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE zk_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_events ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.jwt() ->> 'did' = did);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.jwt() ->> 'did' = did);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.jwt() ->> 'did' = did);

CREATE POLICY "Users can view own credentials" ON credentials
    FOR SELECT USING (auth.jwt() ->> 'did' = user_did);

CREATE POLICY "Users can insert own credentials" ON credentials
    FOR INSERT WITH CHECK (auth.jwt() ->> 'did' = user_did);

CREATE POLICY "Users can update own credentials" ON credentials
    FOR UPDATE USING (auth.jwt() ->> 'did' = user_did);

CREATE POLICY "Users can view own integrations" ON api_integrations
    FOR SELECT USING (auth.jwt() ->> 'did' = user_did);

CREATE POLICY "Users can manage own integrations" ON api_integrations
    FOR ALL USING (auth.jwt() ->> 'did' = user_did);

CREATE POLICY "Users can view own proofs" ON zk_proofs
    FOR SELECT USING (auth.jwt() ->> 'did' = user_did OR is_shared = true);

CREATE POLICY "Users can manage own proofs" ON zk_proofs
    FOR ALL USING (auth.jwt() ->> 'did' = user_did);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credentials_updated_at
    BEFORE UPDATE ON credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_integrations_updated_at
    BEFORE UPDATE ON api_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zk_proofs_updated_at
    BEFORE UPDATE ON zk_proofs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_did_param TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'credentials_count', (
            SELECT COUNT(*) FROM credentials 
            WHERE user_did = user_did_param AND status = 'active'
        ),
        'integrations_count', (
            SELECT COUNT(*) FROM api_integrations 
            WHERE user_did = user_did_param AND status = 'active'
        ),
        'proofs_count', (
            SELECT COUNT(*) FROM zk_proofs 
            WHERE user_did = user_did_param
        ),
        'verification_events_count', (
            SELECT COUNT(*) FROM verification_events ve
            JOIN credentials c ON ve.credential_id = c.credential_id
            WHERE c.user_did = user_did_param
        ),
        'last_activity', (
            SELECT MAX(GREATEST(
                COALESCE(up.updated_at, '1970-01-01'::timestamptz),
                COALESCE(c.updated_at, '1970-01-01'::timestamptz),
                COALESCE(ai.updated_at, '1970-01-01'::timestamptz),
                COALESCE(zp.updated_at, '1970-01-01'::timestamptz)
            ))
            FROM user_profiles up
            LEFT JOIN credentials c ON up.did = c.user_did
            LEFT JOIN api_integrations ai ON up.did = ai.user_did
            LEFT JOIN zk_proofs zp ON up.did = zp.user_did
            WHERE up.did = user_did_param
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired credentials
CREATE OR REPLACE FUNCTION cleanup_expired_credentials()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE credentials 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' 
    AND expiration_date IS NOT NULL 
    AND expiration_date < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to cleanup expired credentials (runs daily)
-- Note: This requires pg_cron extension which may not be available in all environments
-- SELECT cron.schedule('cleanup-expired-credentials', '0 2 * * *', 'SELECT cleanup_expired_credentials();');

-- Insert initial system metrics
INSERT INTO system_metrics (metric_name, metric_value, metric_type, labels) VALUES
    ('database_version', 1.0, 'gauge', '{"component": "database", "version": "1.0.0"}'),
    ('schema_initialized', 1, 'gauge', '{"timestamp": "' || NOW() || '"}')
ON CONFLICT DO NOTHING;

-- Create a view for user dashboard data
CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
    up.did,
    up.display_name,
    up.verification_level,
    up.is_verified,
    COUNT(DISTINCT c.id) as credentials_count,
    COUNT(DISTINCT ai.id) as integrations_count,
    COUNT(DISTINCT zp.id) as proofs_count,
    up.created_at as joined_date,
    MAX(GREATEST(
        up.updated_at,
        COALESCE(c.updated_at, '1970-01-01'::timestamptz),
        COALESCE(ai.updated_at, '1970-01-01'::timestamptz),
        COALESCE(zp.updated_at, '1970-01-01'::timestamptz)
    )) as last_activity
FROM user_profiles up
LEFT JOIN credentials c ON up.did = c.user_did AND c.status = 'active'
LEFT JOIN api_integrations ai ON up.did = ai.user_did AND ai.status = 'active'
LEFT JOIN zk_proofs zp ON up.did = zp.user_did
GROUP BY up.did, up.display_name, up.verification_level, up.is_verified, up.created_at;

COMMENT ON TABLE user_profiles IS 'User profile information and preferences';
COMMENT ON TABLE credentials IS 'Encrypted verifiable credentials storage';
COMMENT ON TABLE api_integrations IS 'API integration records and configurations';
COMMENT ON TABLE zk_proofs IS 'Zero-knowledge proof storage';
COMMENT ON TABLE verification_events IS 'Credential verification event log';
COMMENT ON TABLE system_metrics IS 'System performance and usage metrics';
COMMENT ON TABLE audit_logs IS 'Security and compliance audit trail';