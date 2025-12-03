-- ============================================================
-- MIGRATION: Streak Logic Implementation
-- Automatic streak tracking based on word activity
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- Step 1: Create the streak update trigger function
CREATE OR REPLACE FUNCTION public.handle_streak_update()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  activity_date DATE;
  current_streak_value INTEGER;
  last_activity_date_value DATE;
  days_diff INTEGER;
  new_streak INTEGER;
BEGIN
  -- Get the user_id by following the relationship: words -> pages -> notebooks -> user_id
  SELECT n.user_id INTO target_user_id
  FROM public.pages p
  JOIN public.notebooks n ON p.notebook_id = n.id
  WHERE p.id = NEW.page_id;
  
  -- Exit if user not found (shouldn't happen with proper FK constraints)
  IF target_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Determine activity date based on operation type and developer time support
  IF TG_OP = 'INSERT' THEN
    -- For INSERTs (adding words): Use NEW.created_at if available, fallback to CURRENT_DATE
    activity_date := COALESCE(NEW.created_at::DATE, CURRENT_DATE);
  ELSE
    -- For UPDATEs (reviewing words): Use NEW.updated_at if available, fallback to CURRENT_DATE
    activity_date := COALESCE(NEW.updated_at::DATE, CURRENT_DATE);
  END IF;
  
  -- Get current streak and last activity date from profile
  SELECT current_streak, last_activity_date 
  INTO current_streak_value, last_activity_date_value
  FROM public.profiles 
  WHERE id = target_user_id;
  
  -- Handle case where profile doesn't exist (shouldn't happen, but be safe)
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Handle first-time activity (no previous last_activity_date)
  IF last_activity_date_value IS NULL THEN
    -- First activity ever - set streak to 1
    new_streak := 1;
  ELSE
    -- Calculate days difference between last activity and current activity
    days_diff := activity_date - last_activity_date_value;
    
    -- Apply streak logic based on the rules:
    IF days_diff = 0 THEN
      -- Same day (today): Do nothing - already counted
      RETURN NEW;
    ELSIF days_diff = 1 THEN
      -- Yesterday: Increment streak
      new_streak := current_streak_value + 1;
    ELSE
      -- Before yesterday or future date: Reset streak to 1
      new_streak := 1;
    END IF;
  END IF;
  
  -- Update the user's profile with new streak and last activity date
  UPDATE public.profiles 
  SET 
    current_streak = new_streak,
    last_activity_date = activity_date
  WHERE id = target_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create the trigger on words table for both INSERT and UPDATE operations
DROP TRIGGER IF EXISTS streak_update_trigger ON public.words;
CREATE TRIGGER streak_update_trigger
  AFTER INSERT OR UPDATE ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_streak_update();

-- Step 3: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_streak_update() TO authenticated;

-- Step 4: Test the implementation (optional verification)
DO $$
DECLARE
  trigger_count INTEGER;
  function_exists BOOLEAN;
BEGIN
  -- Check if trigger was created successfully
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'streak_update_trigger'
    AND event_object_table = 'words'
    AND event_manipulation IN ('INSERT', 'UPDATE');
  
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_name = 'handle_streak_update'
      AND routine_type = 'FUNCTION'
  ) INTO function_exists;
  
  IF trigger_count > 0 AND function_exists THEN
    RAISE NOTICE '✅ Streak logic setup complete!';
    RAISE NOTICE '✅ Trigger: handle_streak_update() will run on INSERT/UPDATE of words';
    RAISE NOTICE '✅ Logic: Yesterday (+1), Today (no change), Before Yesterday (reset to 1)';
    RAISE NOTICE '✅ Developer Time: Supports NEW.created_at and NEW.updated_at timestamps';
  ELSE
    RAISE EXCEPTION '❌ Setup failed - missing trigger or function';
  END IF;
END $$;

-- Step 5: Create index for performance (if not already exists)
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity_date 
  ON public.profiles(last_activity_date);

-- ============================================================
-- Migration Complete! 
-- 
-- What was implemented:
-- 1. handle_streak_update() trigger function with proper logic
-- 2. Trigger on words table for INSERT/UPDATE operations  
-- 3. Developer time support using NEW.created_at/updated_at
-- 4. Streak rules: Yesterday (+1), Today (no change), Before Yesterday (reset)
-- 5. Performance index on last_activity_date
-- 
-- How it works:
-- - User adds a word (INSERT) → trigger calculates streak based on created_at
-- - User reviews a word (UPDATE) → trigger calculates streak based on updated_at
-- - Streak increments for consecutive days, resets after gaps
-- - Multiple actions same day don't affect streak (already counted)
-- 
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Test by adding words - streak should update automatically
-- 3. Frontend will show updated streaks via existing profile queries
-- ============================================================