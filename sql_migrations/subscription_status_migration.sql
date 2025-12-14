-- =====================================================
-- SUBSCRIPTION STATUS MIGRATION
-- =====================================================
-- This migration fixes the critical state mismatch between:
-- - Database schema: ('active', 'inactive', 'trial', 'expired')
-- - RevenueCat logic: ('free', 'pro')
-- =====================================================

-- Step 1: Update existing 'active' users to 'free' 
-- (New users should start as free until they subscribe)
UPDATE public.profiles 
SET subscription_status = 'free' 
WHERE subscription_status = 'active';

-- Step 2: Update any other legacy values to 'free'
UPDATE public.profiles 
SET subscription_status = 'free' 
WHERE subscription_status NOT IN ('free', 'pro');

-- Step 3: Drop the old constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

-- Step 4: Add new constraint with RevenueCat-aligned values
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_status_check 
CHECK (subscription_status IN ('free', 'pro'));

-- Step 5: Update the default value to 'free'
ALTER TABLE public.profiles 
ALTER COLUMN subscription_status SET DEFAULT 'free';

-- Step 6: Update has_ever_subscribed default to false for new users
ALTER TABLE public.profiles 
ALTER COLUMN has_ever_subscribed SET DEFAULT false;

-- Step 7: Update the trigger function to use new values
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        subscription_status,
        has_ever_subscribed,
        target_lang,
        daily_word_goal,
        current_streak,
        created_at
    ) VALUES (
        NEW.id,
        'free',     -- Changed from 'active' to 'free'
        false,      -- Changed from true to false (new users haven't subscribed yet)
        'English',
        20,
        0,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION QUERIES (Run after migration)
-- =====================================================

-- Check that all profiles now have valid subscription status
-- SELECT subscription_status, COUNT(*) 
-- FROM public.profiles 
-- GROUP BY subscription_status;

-- Verify constraint works
-- INSERT INTO public.profiles (id, subscription_status) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'invalid'); -- Should fail

-- =====================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================

-- To rollback this migration:
-- 1. ALTER TABLE public.profiles DROP CONSTRAINT profiles_subscription_status_check;
-- 2. ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_status_check CHECK (subscription_status IN ('active', 'inactive', 'trial', 'expired'));
-- 3. UPDATE public.profiles SET subscription_status = 'active' WHERE subscription_status = 'free';
-- 4. ALTER TABLE public.profiles ALTER COLUMN subscription_status SET DEFAULT 'active';
-- 5. ALTER TABLE public.profiles ALTER COLUMN has_ever_subscribed SET DEFAULT true;
-- 6. Restore original handle_new_user function

-- =====================================================
-- NOTES
-- =====================================================
-- After running this migration:
-- 1. All existing users will be 'free' until they actually subscribe
-- 2. New users will start as 'free' with has_ever_subscribed = false
-- 3. Only RevenueCat successful purchases will set status to 'pro'
-- 4. Database and RevenueCat logic are now perfectly aligned