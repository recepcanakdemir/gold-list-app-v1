-- DROP existing function first (required for signature change)
DROP FUNCTION IF EXISTS get_dashboard_stats(uuid,date,text);

-- FINAL: Complete Dashboard Stats Function
-- Fixes: TimeProvider integration + Dynamic notebook-based goals + Today inclusion + Goldlist retention logic
-- Run this SQL in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_dashboard_stats(
  user_uuid UUID,
  start_date DATE,
  period_type TEXT  -- 'week' or 'month'
)
RETURNS TABLE(
  total_words INTEGER,
  words_added_period INTEGER,
  words_should_add INTEGER,
  words_added_percentage NUMERIC,
  words_reviewed_period INTEGER,
  words_remembered_period INTEGER,
  retention_rate NUMERIC,
  mastery_rate_percentage NUMERIC
)
AS $$
DECLARE
  daily_capacity INTEGER;
  period_days INTEGER;
  start_timestamp TIMESTAMP;
  end_timestamp TIMESTAMP;
BEGIN
  -- Calculate period days
  period_days := CASE 
    WHEN period_type = 'week' THEN 7
    WHEN period_type = 'month' THEN 30
    ELSE 7
  END;
  
  -- Calculate daily capacity from ACTIVE notebooks
  SELECT COALESCE(SUM(words_per_page_limit), 0) INTO daily_capacity
  FROM notebooks 
  WHERE user_id = user_uuid AND is_active = true;
  
  -- Use proper timestamp ranges to include full days + TODAY
  start_timestamp := start_date::TIMESTAMP;
  end_timestamp := (start_date + INTERVAL '1 day' * (period_days + 1))::TIMESTAMP;

  RETURN QUERY
  WITH user_notebooks AS (
    -- Only include ACTIVE notebooks for capacity calculation
    SELECT id FROM notebooks 
    WHERE user_id = user_uuid AND is_active = true
  ),
  user_words AS (
    -- Get all words from user's notebooks
    SELECT w.*, p.notebook_id
    FROM words w
    JOIN pages p ON w.page_id = p.id
    JOIN user_notebooks un ON p.notebook_id = un.id
  ),
  period_words AS (
    -- Words added in the specified period (using timestamp comparison)
    SELECT * FROM user_words 
    WHERE created_at >= start_timestamp 
    AND created_at < end_timestamp
  ),
  period_reviews AS (
    -- Track review results by looking at status changes in period
    -- Words that moved to 'learned' status are considered "remembered"
    -- Words that were reviewed (status updated) in period
    SELECT 
      w.id,
      CASE 
        WHEN w.status = 'learned' THEN 1 
        ELSE 0 
      END as remembered,
      1 as reviewed
    FROM user_words w
    -- Note: This is simplified - in a real implementation you'd track
    -- review sessions in a separate table for more accurate statistics
    WHERE w.updated_at >= start_timestamp 
    AND w.updated_at < end_timestamp
    AND w.updated_at > w.created_at  -- Only count words modified after creation (actually reviewed)
    AND w.status IN ('learned', 'waiting', 'ready', 'leech')
  ),
  stats AS (
    SELECT 
      -- Total words across all notebooks
      (SELECT COUNT(*) FROM user_words) as total_words,
      
      -- Words added in this period
      (SELECT COUNT(*) FROM period_words) as words_added_period,
      
      -- Words that should be added (daily capacity × period days)
      (daily_capacity * period_days) as words_should_add,
      
      -- Words reviewed in period
      (SELECT COALESCE(SUM(reviewed), 0) FROM period_reviews) as words_reviewed_period,
      
      -- Words remembered in period
      (SELECT COALESCE(SUM(remembered), 0) FROM period_reviews) as words_remembered_period
  )
  SELECT 
    stats.total_words::INTEGER,
    stats.words_added_period::INTEGER,
    stats.words_should_add::INTEGER,
    
    -- Words Added Percentage: (added / should_add) * 100
    CASE 
      WHEN stats.words_should_add > 0 
      THEN ROUND((stats.words_added_period::NUMERIC / stats.words_should_add) * 100, 1)
      ELSE 0
    END as words_added_percentage,
    
    stats.words_reviewed_period::INTEGER,
    stats.words_remembered_period::INTEGER,
    
    -- Retention Rate: (remembered / reviewed) * 100
    CASE 
      WHEN stats.words_reviewed_period > 0 
      THEN ROUND((stats.words_remembered_period::NUMERIC / stats.words_reviewed_period) * 100, 1)
      ELSE 0
    END as retention_rate,
    
    -- Mastery Rate Percentage: Retention performance scaled to 30% target (Goldlist Method)
    CASE 
      WHEN stats.words_reviewed_period > 0 
      THEN LEAST(100, ROUND(((stats.words_remembered_period::NUMERIC / stats.words_reviewed_period) / 0.3) * 100, 1))
      ELSE 0
    END as mastery_rate_percentage
    
  FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID, DATE, TEXT) TO authenticated;

-- Example usage (for testing):
-- SELECT * FROM get_dashboard_stats(
--   'your-user-uuid'::UUID, 
--   CURRENT_DATE - INTERVAL '7 days', 
--   'week'
-- );