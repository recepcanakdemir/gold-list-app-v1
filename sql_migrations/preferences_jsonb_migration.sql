-- Preferences JSONB Migration
-- Add flexible JSONB column for survey and preference data

-- Add preferences JSONB column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Add GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_profiles_preferences ON profiles USING GIN (preferences);

-- Update onboarding_analytics table with new survey fields
ALTER TABLE onboarding_analytics ADD COLUMN IF NOT EXISTS traffic_source text;
ALTER TABLE onboarding_analytics ADD COLUMN IF NOT EXISTS goldlist_experience text;
ALTER TABLE onboarding_analytics ADD COLUMN IF NOT EXISTS memory_assessment text;
ALTER TABLE onboarding_analytics ADD COLUMN IF NOT EXISTS learning_challenge text;
ALTER TABLE onboarding_analytics ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Add index for onboarding analytics preferences
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_preferences ON onboarding_analytics USING GIN (preferences);

-- Example preferences structure (for documentation):
-- {
--   "motivation": "travel",
--   "traffic_source": "app_store", 
--   "goldlist_experience": "new",
--   "memory_assessment": "good",
--   "learning_challenge": "consistency",
--   "daily_commitment_minutes": 15,
--   "notifications_enabled": true,
--   "preferred_study_time": "morning"
-- }