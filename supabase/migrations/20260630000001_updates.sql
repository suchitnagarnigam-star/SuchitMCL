-- Supabase Migration SQL Update for Suchit Nagar Nigam (ਸੁਚਿਤ ਨਗਰ ਨਿਗਮ)
-- Alters news items to support full administrative lifecycle & resolution evidence tracking

-- Update mcl_news_items status check constraint
-- Drop old check constraint first if it exists
ALTER TABLE mcl_news_items DROP CONSTRAINT IF EXISTS mcl_news_items_status_check;

-- Add updated check constraint with 'in_progress' and 'resolved'
ALTER TABLE mcl_news_items ADD CONSTRAINT mcl_news_items_status_check 
    CHECK (status IN ('pending', 'dispatched', 'in_progress', 'resolved'));

-- Add new tracking columns to mcl_news_items
ALTER TABLE mcl_news_items ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE mcl_news_items ADD COLUMN IF NOT EXISTS action_taken_description TEXT NULL;
ALTER TABLE mcl_news_items ADD COLUMN IF NOT EXISTS time_taken_days INTEGER NULL;

-- Create Table: mcl_evidence
CREATE TABLE IF NOT EXISTS mcl_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_item_id UUID NOT NULL REFERENCES mcl_news_items(id) ON DELETE CASCADE,
    file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'pdf')),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for evidence queries
CREATE INDEX IF NOT EXISTS idx_evidence_news_item ON mcl_evidence(news_item_id);

-- Register storage bucket "mcl-evidence" (standard Supabase metadata insert)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('mcl-evidence', 'mcl-evidence', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy to allow anonymous/public reads to mcl-evidence
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'mcl-evidence');

-- Storage Policy to allow authenticated/service uploads to mcl-evidence
CREATE POLICY "Admin Uploads" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'mcl-evidence');
