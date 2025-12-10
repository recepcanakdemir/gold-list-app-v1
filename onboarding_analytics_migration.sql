-- Onboarding Analytics Migration
-- Create table for tracking onboarding completion and user choices

-- Create onboarding_analytics table
CREATE TABLE IF NOT EXISTS onboarding_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  target_language text,
  level text, 
  daily_time text,
  motivation text,
  completed_at timestamp DEFAULT now(),
  converted_to_signup boolean DEFAULT false,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp DEFAULT now()
);

-- Add onboarding fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_language text DEFAULT 'Spanish';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS learning_level text DEFAULT 'Beginner';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_commitment text DEFAULT '15 min';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS motivation text DEFAULT 'Travel';

-- Enable RLS for onboarding_analytics
ALTER TABLE onboarding_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own analytics data
CREATE POLICY "Users can read own onboarding analytics" ON onboarding_analytics
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policy: Allow insert for anonymous users (during onboarding)
CREATE POLICY "Allow anonymous onboarding analytics insert" ON onboarding_analytics
  FOR INSERT WITH CHECK (true);

-- RLS Policy: Users can update their own analytics data
CREATE POLICY "Users can update own onboarding analytics" ON onboarding_analytics
  FOR UPDATE USING (user_id = auth.uid());

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_session_id ON onboarding_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_user_id ON onboarding_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_completed_at ON onboarding_analytics(completed_at);