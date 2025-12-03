-- Weekly Progress Strip Migration
-- Create RPC function to get daily word counts for a user within a date range
-- Run this SQL in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_daily_word_counts(
  user_uuid UUID,
  start_date DATE,
  end_date DATE
)
RETURNS TABLE(
  date DATE,
  count INTEGER
)
AS $$
BEGIN
  RETURN QUERY
  WITH user_notebooks AS (
    -- Get all active notebooks for the user
    SELECT id FROM notebooks 
    WHERE user_id = user_uuid AND is_active = true
  ),
  user_words AS (
    -- Get all words from user's active notebooks
    SELECT 
      w.id,
      w.created_at,
      w.created_at::DATE as created_date
    FROM words w
    JOIN pages p ON w.page_id = p.id
    JOIN user_notebooks un ON p.notebook_id = un.id
  ),
  daily_counts AS (
    -- Group words by creation date and count them
    SELECT 
      created_date as date,
      COUNT(*)::INTEGER as count
    FROM user_words
    WHERE created_date >= start_date 
    AND created_date <= end_date
    GROUP BY created_date
  )
  SELECT 
    daily_counts.date,
    daily_counts.count
  FROM daily_counts
  ORDER BY daily_counts.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_word_counts(UUID, DATE, DATE) TO authenticated;

-- Example usage (for testing):
-- SELECT * FROM get_daily_word_counts(
--   'your-user-uuid'::UUID, 
--   CURRENT_DATE - INTERVAL '6 days', 
--   CURRENT_DATE
-- );