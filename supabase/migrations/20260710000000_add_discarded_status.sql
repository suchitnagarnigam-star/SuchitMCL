-- Supabase Migration SQL Update for Suchit Nagar Nigam (ਸੁਚਿਤ ਨਗਰ ਨਿਗਮ)
-- Add 'discarded' to the list of acceptable statuses in the constraint check

ALTER TABLE mcl_news_items DROP CONSTRAINT IF EXISTS mcl_news_items_status_check;

ALTER TABLE mcl_news_items ADD CONSTRAINT mcl_news_items_status_check 
    CHECK (status IN ('pending', 'dispatched', 'in_progress', 'resolved', 'discarded'));
