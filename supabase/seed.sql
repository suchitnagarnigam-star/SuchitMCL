-- Supabase Seed SQL for Suchit Nagar Nigam (ਸੁਚਿਤ ਨਗਰ ਨਿਗਮ)

-- Seed Officers
INSERT INTO mcl_officers (short_code, full_name, designation, officer_type, zone, department, whatsapp_number, is_active)
VALUES
    ('JC (V)', 'Vineet Kumar', 'Joint Commissioner', 'joint_commissioner', NULL, NULL, '', TRUE),
    ('JC (A)', 'Amanpreet Singh', 'Joint Commissioner', 'joint_commissioner', NULL, NULL, '', TRUE),
    ('JC (T)', 'Tapan Bhanot', 'Joint Commissioner', 'joint_commissioner', NULL, NULL, '', TRUE),
    ('Zonal (A)', 'Zonal Commissioner A', 'Zonal Commissioner', 'zonal_commissioner', 'A', NULL, '', TRUE),
    ('Zonal (B)', 'Zonal Commissioner B', 'Zonal Commissioner', 'zonal_commissioner', 'B', NULL, '', TRUE),
    ('Zonal (C)', 'Zonal Commissioner C', 'Zonal Commissioner', 'zonal_commissioner', 'C', NULL, '', TRUE),
    ('Zonal (D)', 'Zonal Commissioner D', 'Zonal Commissioner', 'zonal_commissioner', 'D', NULL, '', TRUE),
    ('SE (O&M)', 'Ekjot Singh', 'Superintending Engineer', 'superintending_engineer', NULL, 'Operations & Maintenance (O&M)', '', TRUE),
    ('SE (B&R)', 'Parveen Singla', 'Superintending Engineer', 'superintending_engineer', NULL, 'Bridges & Roads (B&R)', '', TRUE),
    ('MTP', 'Ranjit Singh', 'Municipal Town Planner', 'superintending_engineer', NULL, 'Town Planning (Building Branch)', '', TRUE),
    ('SE (SLG)', 'Shyam Lal Gupta', 'Superintending Engineer', 'superintending_engineer', NULL, NULL, '', TRUE),
    ('SE (HPS)', 'Harkiranpal Singh', 'Superintending Engineer', 'superintending_engineer', NULL, NULL, '', TRUE)
ON CONFLICT (short_code) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    designation = EXCLUDED.designation,
    officer_type = EXCLUDED.officer_type,
    department = EXCLUDED.department;

-- Seed Domain Mappings by querying officers by their short code
INSERT INTO mcl_domain_mapping (department, suggested_officer_id)
VALUES
    ('Operations & Maintenance (O&M)', (SELECT id FROM mcl_officers WHERE short_code = 'SE (O&M)')),
    ('Bridges & Roads (B&R)', (SELECT id FROM mcl_officers WHERE short_code = 'SE (B&R)')),
    ('Town Planning (Building Branch)', (SELECT id FROM mcl_officers WHERE short_code = 'MTP')),
    ('Tehbazari / Land & Encroachment', (SELECT id FROM mcl_officers WHERE short_code = 'JC (V)')),
    ('Legal Cell', (SELECT id FROM mcl_officers WHERE short_code = 'JC (V)')),
    ('Sanitation & Vector Control', (SELECT id FROM mcl_officers WHERE short_code = 'JC (A)')),
    ('Solid Waste Management (SWM)', (SELECT id FROM mcl_officers WHERE short_code = 'JC (A)')),
    ('Health Branch', (SELECT id FROM mcl_officers WHERE short_code = 'JC (A)')),
    ('Horticulture / Parks & Squares', (SELECT id FROM mcl_officers WHERE short_code = 'JC (A)')),
    ('Property Tax / House Tax Branch', (SELECT id FROM mcl_officers WHERE short_code = 'JC (T)')),
    ('Licensing & Health License Branch', (SELECT id FROM mcl_officers WHERE short_code = 'JC (T)')),
    ('Accounts & Finance', (SELECT id FROM mcl_officers WHERE short_code = 'JC (T)')),
    ('Establishment & General Branch', (SELECT id FROM mcl_officers WHERE short_code = 'JC (T)')),
    ('Public Grievance Redressal / IT Cell', (SELECT id FROM mcl_officers WHERE short_code = 'JC (V)')),
    ('Fire Brigade & Emergency Services', (SELECT id FROM mcl_officers WHERE short_code = 'JC (V)'))
ON CONFLICT (department) DO UPDATE SET suggested_officer_id = EXCLUDED.suggested_officer_id;

-- Seed Sample News Items for Control Desk Dashboard
INSERT INTO mcl_news_items (id, headline, body, publication, department, severity, summary, page_number, status)
VALUES
    ('a1111111-1111-1111-1111-111111111111', 'Contaminated Water Supply Complaint in Model Town Extension', 'Residents of Model Town Extension reported dirty and foul-smelling water supply for the past three days. Pipeline damage suspect near block B.', 'Dainik Bhaskar', 'Operations & Maintenance (O&M)', 'High', 'Severe water contamination reported in Model Town Extension. Immediate pipeline inspection and repair required.', 2, 'pending'),
    ('a2222222-2222-2222-2222-222222222222', 'Large Potholes Causing Traffic Congestion on Ferozepur Road', 'Commuters face severe delays due to deep potholes near Westend Mall stretch on Ferozepur Road following recent rains.', 'The Tribune', 'Bridges & Roads (B&R)', 'Medium', 'Road surface damage on Ferozepur Road creating traffic hazards. Patchwork needed urgently.', 4, 'dispatched'),
    ('a3333333-3333-3333-3333-333333333333', 'Garbage Dump Accumulation Near Clock Tower Market Area', 'Shopkeepers complain of uncleared waste dumps creating foul smell and sanitation risks in central market area near Clock Tower.', 'Jagran', 'Sanitation & Vector Control', 'High', 'Uncleared waste accumulation in Clock Tower commercial zone causing health concerns.', 1, 'pending'),
    ('a4444444-4444-4444-4444-444444444444', 'Commercial Encroachment Removed in Sarabha Nagar Main Market', 'MCL Tehbazari team conducted drive removing temporary structures blocking pedestrian walkways in Sarabha Nagar market.', 'Ajit', 'Tehbazari / Land & Encroachment', 'Low', 'Encroachment clearance drive successfully executed in Sarabha Nagar.', 5, 'dispatched')
ON CONFLICT (id) DO NOTHING;
