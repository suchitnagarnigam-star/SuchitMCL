-- Helper function to safely parse text to jsonb, wrapping legacy text in a JSON structure if invalid
CREATE OR REPLACE FUNCTION safe_cast_to_jsonb(val text) 
RETURNS jsonb AS $$
BEGIN
  IF val IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN val::jsonb;
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object(
    'when', 'Not specified',
    'where', 'Not specified',
    'what', val,
    'next_steps', 'Not specified'
  );
END;
$$ LANGUAGE plpgsql;

-- Apply migration using the safe casting helper
ALTER TABLE mcl_news_items 
ALTER COLUMN summary TYPE jsonb 
USING safe_cast_to_jsonb(summary);

-- Clean up the temporary helper function
DROP FUNCTION IF EXISTS safe_cast_to_jsonb(text);
