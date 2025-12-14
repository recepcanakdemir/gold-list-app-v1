-- =====================================================
-- PLAN TRACKING MIGRATION
-- =====================================================
-- This migration adds plan tracking to the profiles table
-- to store which specific plan (Weekly/Monthly/Yearly) 
-- the user purchased, not just 'pro' status.
-- =====================================================

-- Step 1: Add current_plan_id column to track specific plan purchased
ALTER TABLE public.profiles 
ADD COLUMN current_plan_id TEXT;

-- Step 2: Add index for efficient plan tracking queries
CREATE INDEX idx_profiles_current_plan_id ON public.profiles(current_plan_id);

-- Step 3: Add comment to document the new column
COMMENT ON COLUMN public.profiles.current_plan_id IS 'Stores the RevenueCat product identifier for the currently active plan (e.g., goldlist_premium_weekly_499, goldlist_premium_monthly_999, goldlist_premium_yearly_4999). NULL when subscription_status is free.';

-- =====================================================
-- VERIFICATION QUERIES (Run after migration)
-- =====================================================

-- Check the new column was added
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'current_plan_id';

-- Check current profile structure
-- SELECT id, subscription_status, current_plan_id, has_ever_subscribed
-- FROM public.profiles 
-- LIMIT 5;

-- =====================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================

-- To rollback this migration:
-- 1. DROP INDEX idx_profiles_current_plan_id;
-- 2. ALTER TABLE public.profiles DROP COLUMN current_plan_id;

-- =====================================================
-- NOTES
-- =====================================================
-- After running this migration:
-- 1. current_plan_id will be NULL for all existing users
-- 2. New purchases will populate current_plan_id with the plan identifier
-- 3. When users downgrade to free, current_plan_id will be set to NULL
-- 4. This enables analytics on plan distribution and conversion paths