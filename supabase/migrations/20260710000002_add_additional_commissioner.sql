-- Supabase Migration SQL Update for Suchit Nagar Nigam (ਸੂਚਿਤ ਨਗਰ ਨਿਗਮ)
-- Update officer_type check constraint to include 'additional_commissioner'

ALTER TABLE mcl_officers DROP CONSTRAINT IF EXISTS mcl_officers_officer_type_check;

ALTER TABLE mcl_officers ADD CONSTRAINT mcl_officers_officer_type_check 
    CHECK (officer_type IN ('additional_commissioner', 'joint_commissioner', 'zonal_commissioner', 'superintending_engineer'));

-- Update MTP to Sh. Vijay Kumar
UPDATE mcl_officers SET full_name = 'Sh. Vijay Kumar' WHERE short_code = 'MTP';

-- Seed Additional Commissioner and SE Ranjit Singh
INSERT INTO mcl_officers (short_code, full_name, designation, officer_type, zone, department, whatsapp_number, is_active)
VALUES 
    ('Addl. Commissioner', 'Additional Commissioner', 'Additional Commissioner', 'additional_commissioner', NULL, NULL, '', TRUE),
    ('SE (RS)', 'Sh. Ranjit Singh', 'Superintending Engineer', 'superintending_engineer', NULL, NULL, '', TRUE)
ON CONFLICT (short_code) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    designation = EXCLUDED.designation,
    officer_type = EXCLUDED.officer_type;
