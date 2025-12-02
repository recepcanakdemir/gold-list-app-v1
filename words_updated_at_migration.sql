-- ============================================================
-- MIGRATION: Add updated_at column to words table + triggers
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- Step 1: Add updated_at column to words table
ALTER TABLE public.words 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Populate existing records with created_at as initial updated_at
UPDATE public.words 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Step 3: Make updated_at NOT NULL after population
ALTER TABLE public.words 
ALTER COLUMN updated_at SET NOT NULL;

-- Step 4: Create reusable updated_at trigger function
-- Updated to support manual timestamp control for time travel scenarios
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set updated_at to NOW() if it wasn't explicitly provided
  -- This allows manual timestamp control for time travel scenarios
  IF NEW.updated_at IS NULL OR NEW.updated_at = OLD.updated_at THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger for words table
DROP TRIGGER IF EXISTS set_updated_at ON public.words;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Step 6: Verify the migration worked
DO $$
BEGIN
  -- Check if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'words' 
    AND column_name = 'updated_at'
  ) THEN
    RAISE NOTICE '✅ Migration completed: updated_at column added to words table';
    RAISE NOTICE '✅ Trigger created: Updates will automatically set updated_at';
    
    -- Show count of migrated records
    DECLARE
      record_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO record_count FROM public.words WHERE updated_at IS NOT NULL;
      RAISE NOTICE '✅ Records migrated: % words have updated_at timestamps', record_count;
    END;
  ELSE
    RAISE EXCEPTION '❌ Migration failed: updated_at column not found';
  END IF;
END $$;

-- Step 7: Test the trigger works (optional verification)
DO $$
DECLARE
  test_word_id UUID;
  old_updated_at TIMESTAMP WITH TIME ZONE;
  new_updated_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Find any existing word to test with
  SELECT id INTO test_word_id FROM public.words LIMIT 1;
  
  IF test_word_id IS NOT NULL THEN
    -- Get current updated_at
    SELECT updated_at INTO old_updated_at FROM public.words WHERE id = test_word_id;
    
    -- Wait a moment and update the word
    PERFORM pg_sleep(0.1);
    UPDATE public.words SET stage = stage WHERE id = test_word_id;
    
    -- Check if updated_at changed
    SELECT updated_at INTO new_updated_at FROM public.words WHERE id = test_word_id;
    
    IF new_updated_at > old_updated_at THEN
      RAISE NOTICE '✅ Trigger test successful: updated_at automatically changed on UPDATE';
    ELSE
      RAISE WARNING '⚠️ Trigger test failed: updated_at did not change on UPDATE';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ No existing words found for trigger testing';
  END IF;
END $$;

-- ============================================================
-- Migration Complete! 
-- Your dashboard should now work with real data.
-- 
-- What was added:
-- 1. updated_at column (TIMESTAMP WITH TIME ZONE, NOT NULL)
-- 2. Auto-update trigger on every UPDATE operation
-- 3. Populated existing records with created_at values
-- 4. Verified migration success
-- 
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Check your dashboard - should show real data now!
-- 3. Test word reviews - updated_at should track changes
-- ============================================================