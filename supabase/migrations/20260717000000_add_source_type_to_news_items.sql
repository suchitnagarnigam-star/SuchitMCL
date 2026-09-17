-- Supabase Migration SQL Update for Suchit Nagar Nigam (ਸੂਚਿਤ ਨਗਰ ਨਿਗਮ)
-- Alters news items to support Daak citizen grievance petitions alongside media clippings

-- Add source_type column with default 'media'
ALTER TABLE mcl_news_items 
ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'media';

-- Index for filtering by source_type
CREATE INDEX IF NOT EXISTS idx_news_items_source_type ON mcl_news_items(source_type);
