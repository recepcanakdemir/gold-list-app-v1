-- ============================================================
-- MIGRATION: Real Activity Heatmap Implementation
-- Auto-tracking user activity + GitHub-style heatmap data
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- Step 1: Create automatic activity logging trigger
-- This trigger runs after every word insert to mark the day as active
-- IMPORTANT: Uses NEW.created_at for developer time support (not server time)
CREATE OR REPLACE FUNCTION public.log_daily_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert activity log for the user who created the word
  -- Uses word's timestamp (NEW.created_at) to support simulated developer time
  -- Correct table relationships: words -> pages -> notebooks -> user_id
  INSERT INTO public.daily_activity_log (user_id, date)
  SELECT 
    n.user_id,  -- Get user_id from notebooks table (correct location)
    NEW.created_at::DATE -- Use word's creation date, not server date
  FROM public.pages p
  JOIN public.notebooks n ON p.notebook_id = n.id  -- Proper join to get user_id
  WHERE p.id = NEW.page_id
  ON CONFLICT (user_id, date) DO NOTHING; -- Ignore if already logged for this date
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create the trigger on words table
DROP TRIGGER IF EXISTS auto_log_daily_activity ON public.words;
CREATE TRIGGER auto_log_daily_activity
  AFTER INSERT ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION public.log_daily_activity();

-- Step 3: Create RPC function to fetch user activity data
-- IMPORTANT: No upper date limit to support developer time simulation
CREATE OR REPLACE FUNCTION get_user_activity_log(
  user_uuid UUID,
  days_back INTEGER DEFAULT 365
)
RETURNS TABLE(
  activity_date DATE
)
AS $$
BEGIN
  RETURN QUERY
  SELECT dal.date as activity_date
  FROM public.daily_activity_log dal
  WHERE dal.user_id = user_uuid
    AND dal.date >= (CURRENT_DATE - INTERVAL '1 day' * days_back)
    -- Removed: AND dal.date <= CURRENT_DATE (blocks simulated future dates)
    -- Frontend will filter dates based on TimeProvider's currentTime
  ORDER BY dal.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION get_user_activity_log(UUID, INTEGER) TO authenticated;

-- Step 5: Create helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_activity_log_user_date 
  ON public.daily_activity_log(user_id, date DESC);

-- Step 6: Backfill existing activity data
-- This populates the activity log based on existing words
DO $$
DECLARE
  backfill_count INTEGER;
BEGIN
  -- Insert historical activity based on word creation dates
  INSERT INTO public.daily_activity_log (user_id, date)
  SELECT DISTINCT
    n.user_id,
    w.created_at::DATE
  FROM public.words w
  JOIN public.pages p ON w.page_id = p.id
  JOIN public.notebooks n ON p.notebook_id = n.id
  WHERE w.created_at::DATE <= CURRENT_DATE
  ON CONFLICT (user_id, date) DO NOTHING;
  
  GET DIAGNOSTICS backfill_count = ROW_COUNT;
  RAISE NOTICE '✅ Backfilled % activity records from existing words', backfill_count;
END $$;

-- Step 7: Verify the setup
DO $$
DECLARE
  trigger_count INTEGER;
  function_exists BOOLEAN;
BEGIN
  -- Check trigger exists
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'auto_log_daily_activity'
    AND event_object_table = 'words';
  
  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'get_user_activity_log'
      AND routine_type = 'FUNCTION'
  ) INTO function_exists;
  
  IF trigger_count > 0 AND function_exists THEN
    RAISE NOTICE '✅ Activity heatmap setup complete!';
    RAISE NOTICE '✅ Trigger: Words will auto-log daily activity';
    RAISE NOTICE '✅ RPC: get_user_activity_log() ready for React Native';
    
    -- Show sample data
    DECLARE
      sample_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO sample_count 
      FROM public.daily_activity_log 
      LIMIT 5;
      RAISE NOTICE 'ℹ️ Activity log contains % records', sample_count;
    END;
  ELSE
    RAISE EXCEPTION '❌ Setup failed - missing trigger or function';
  END IF;
END $$;

-- ============================================================
-- Migration Complete! 
-- 
-- What was added:
-- 1. Auto-logging trigger on words table
-- 2. get_user_activity_log() RPC function  
-- 3. Backfilled historical activity data
-- 4. Performance indexes
-- 
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Update React Native hooks to use real data
-- 3. Build GitHub-style scrollable heatmap UI
-- ============================================================