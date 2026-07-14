-- Supabase Migration SQL for Suchit Nagar Nigam (ਸੁਚਿਤ ਨਗਰ ਨਿਗਮ)
-- Target Database: PostgreSQL

-- Table 1: mcl_pdf_uploads
CREATE TABLE IF NOT EXISTS mcl_pdf_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_pages INTEGER NOT NULL DEFAULT 0,
    processing_status TEXT NOT NULL CHECK (processing_status IN ('uploading', 'ocr_processing', 'analysing', 'completed', 'failed')),
    storage_path TEXT NOT NULL,
    progress_log TEXT[] NOT NULL DEFAULT '{}',
    items_extracted INTEGER NOT NULL DEFAULT 0,
    current_step TEXT NOT NULL DEFAULT 'uploading',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: mcl_officers
CREATE TABLE IF NOT EXISTS mcl_officers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    designation TEXT NOT NULL,
    officer_type TEXT NOT NULL CHECK (officer_type IN ('joint_commissioner', 'zonal_commissioner', 'superintending_engineer')),
    zone TEXT CHECK (zone IN ('A', 'B', 'C', 'D')),
    department TEXT CHECK (department IN (
        'Operations & Maintenance (O&M)',
        'Bridges & Roads (B&R)',
        'Horticulture / Parks & Squares',
        'Solid Waste Management (SWM)',
        'Sanitation & Vector Control',
        'Health Branch',
        'Town Planning (Building Branch)',
        'Tehbazari / Land & Encroachment',
        'Licensing & Health License Branch',
        'Property Tax / House Tax Branch',
        'Accounts & Finance',
        'Establishment & General Branch',
        'Legal Cell',
        'Public Grievance Redressal / IT Cell',
        'Fire Brigade & Emergency Services'
    )),
    whatsapp_number TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Table 3: mcl_news_items
CREATE TABLE IF NOT EXISTS mcl_news_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pdf_upload_id UUID REFERENCES mcl_pdf_uploads(id) ON DELETE CASCADE,
    headline TEXT NOT NULL,
    body TEXT NOT NULL,
    publication TEXT NOT NULL DEFAULT 'Unknown',
    department TEXT NOT NULL CHECK (department IN (
        'Operations & Maintenance (O&M)',
        'Bridges & Roads (B&R)',
        'Horticulture / Parks & Squares',
        'Solid Waste Management (SWM)',
        'Sanitation & Vector Control',
        'Health Branch',
        'Town Planning (Building Branch)',
        'Tehbazari / Land & Encroachment',
        'Licensing & Health License Branch',
        'Property Tax / House Tax Branch',
        'Accounts & Finance',
        'Establishment & General Branch',
        'Legal Cell',
        'Public Grievance Redressal / IT Cell',
        'Fire Brigade & Emergency Services'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('High', 'Medium', 'Low')),
    summary TEXT NOT NULL,
    page_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('pending', 'dispatched')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dispatched_at TIMESTAMP WITH TIME ZONE
);

-- Table 4: mcl_domain_mapping
CREATE TABLE IF NOT EXISTS mcl_domain_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department TEXT NOT NULL UNIQUE CHECK (department IN (
        'Operations & Maintenance (O&M)',
        'Bridges & Roads (B&R)',
        'Horticulture / Parks & Squares',
        'Solid Waste Management (SWM)',
        'Sanitation & Vector Control',
        'Health Branch',
        'Town Planning (Building Branch)',
        'Tehbazari / Land & Encroachment',
        'Licensing & Health License Branch',
        'Property Tax / House Tax Branch',
        'Accounts & Finance',
        'Establishment & General Branch',
        'Legal Cell',
        'Public Grievance Redressal / IT Cell',
        'Fire Brigade & Emergency Services'
    )),
    suggested_officer_id UUID REFERENCES mcl_officers(id) ON DELETE SET NULL
);

-- Table 5: mcl_dispatches
CREATE TABLE IF NOT EXISTS mcl_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_item_id UUID NOT NULL REFERENCES mcl_news_items(id) ON DELETE CASCADE,
    officer_id UUID NOT NULL REFERENCES mcl_officers(id) ON DELETE RESTRICT,
    dispatched_by TEXT NOT NULL DEFAULT 'Commissioner',
    dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    remarks TEXT,
    whatsapp_status TEXT NOT NULL CHECK (whatsapp_status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
    message_text TEXT NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_items_status ON mcl_news_items(status);
CREATE INDEX IF NOT EXISTS idx_news_items_upload_id ON mcl_news_items(pdf_upload_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_news_item ON mcl_dispatches(news_item_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_officer ON mcl_dispatches(officer_id);
CREATE INDEX IF NOT EXISTS idx_officers_active ON mcl_officers(is_active);
