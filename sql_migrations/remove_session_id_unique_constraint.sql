-- =====================================================
-- REMOVE SESSION_ID UNIQUE CONSTRAINT
-- =====================================================
-- This migration removes the unique constraint on session_id
-- to allow duplicate onboarding analytics entries for the same session
-- =====================================================

-- Step 1: Drop the unique constraint on session_id column
-- The constraint is typically named: onboarding_analytics_session_id_key
ALTER TABLE onboarding_analytics 
DROP CONSTRAINT IF EXISTS onboarding_analytics_session_id_key;

-- Step 2: Drop any unique index on session_id (if it exists)
-- Check for common naming patterns
DROP INDEX IF EXISTS onboarding_analytics_session_id_key;
DROP INDEX IF EXISTS unique_onboarding_analytics_session_id;
DROP INDEX IF EXISTS uniq_onboarding_analytics_session_id;

-- Step 3: Keep the regular (non-unique) index for performance
-- This was already created in the original migration as:
-- CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_session_id ON onboarding_analytics(session_id);
-- So no action needed here - the performance index remains

-- =====================================================
-- VERIFICATION QUERY (Run after migration)
-- =====================================================

-- Check that the unique constraint has been removed
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'onboarding_analytics' 
-- AND constraint_type = 'UNIQUE';

-- Verify we can insert duplicate session_ids
-- INSERT INTO onboarding_analytics (session_id, target_language) VALUES ('test_session', 'English');
-- INSERT INTO onboarding_analytics (session_id, target_language) VALUES ('test_session', 'Spanish');
-- Should succeed without errors

-- =====================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================

-- To restore the unique constraint:
-- ALTER TABLE onboarding_analytics 
-- ADD CONSTRAINT onboarding_analytics_session_id_key UNIQUE (session_id);

-- =====================================================
-- NOTES
-- =====================================================
-- After this migration:
-- 1. Multiple onboarding analytics entries can have the same session_id
-- 2. No more 23505 duplicate key errors
-- 3. Regular index on session_id remains for query performance
-- 4. Frontend can use simple .insert() without upsert logic