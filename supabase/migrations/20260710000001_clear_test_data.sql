-- Supabase Migration SQL Update for Suchit Nagar Nigam (ਸੁਚਿਤ ਨਗਰ ਨਿਗਮ)
-- Truncates/wipes all dynamic testing tables (uploads, news items, dispatches, evidence)
-- leaving baseline officers and domain mappings intact.

TRUNCATE TABLE 
    mcl_pdf_uploads, 
    mcl_news_items, 
    mcl_dispatches, 
    mcl_evidence 
RESTART IDENTITY CASCADE;
