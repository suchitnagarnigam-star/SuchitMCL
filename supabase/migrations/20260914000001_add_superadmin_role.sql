-- Supabase Migration SQL for Adding Superadmin Role and User
-- Target Database: PostgreSQL

-- Update check constraint on role to allow 'superadmin'
ALTER TABLE mcl_users DROP CONSTRAINT IF EXISTS mcl_users_role_check;
ALTER TABLE mcl_users ADD CONSTRAINT mcl_users_role_check CHECK (role IN ('superadmin', 'admin', 'officer'));

-- Seed initial superadmin account
-- Username: superadmin
-- Password: Ojasvialankar1@
-- SHA-256 Hash: '5b60b95dfdce6924a0e673b704e8bd321885c70418089049d83fcb48197d0e6b'
INSERT INTO mcl_users (username, password_hash, full_name, role)
VALUES (
    'superadmin',
    '5b60b95dfdce6924a0e673b704e8bd321885c70418089049d83fcb48197d0e6b',
    'Super Administrator',
    'superadmin'
)
ON CONFLICT (username) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
