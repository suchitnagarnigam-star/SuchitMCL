-- Supabase Migration SQL for Suchit Nagar Nigam User Authentication
-- Target Database: PostgreSQL

CREATE TABLE IF NOT EXISTS mcl_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'officer' CHECK (role IN ('admin', 'officer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on username for fast login lookup
CREATE INDEX IF NOT EXISTS idx_mcl_users_username ON mcl_users(username);

-- Seed initial admin account (username: admin, default password: adminpassword)
-- Password hash generated using SHA-256 for adminpassword:
-- 'adminpassword' -> '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'
INSERT INTO mcl_users (username, password_hash, full_name, role)
VALUES (
    'admin',
    '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    'System Administrator',
    'admin'
)
ON CONFLICT (username) DO NOTHING;

-- Seed default officer account (username: commissioner_admin, default password: password123)
-- SHA-256 for 'password123' -> 'ef92b778ba7158759a40773d6fe82388365dce430a967c29da57d425a1e2270d'
INSERT INTO mcl_users (username, password_hash, full_name, role)
VALUES (
    'commissioner_admin',
    'ef92b778ba7158759a40773d6fe82388365dce430a967c29da57d425a1e2270d',
    'Commissioner Office Admin',
    'admin'
)
ON CONFLICT (username) DO NOTHING;
