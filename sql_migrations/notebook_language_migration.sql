-- Notebook Language Migration
-- Refactor: Move target language setting from user-level (profiles) to notebook-level
-- This enables users to learn multiple languages simultaneously with different notebooks
-- Run this SQL in your Supabase SQL Editor

-- Add target_language column to notebooks table
ALTER TABLE public.notebooks 
ADD COLUMN target_language TEXT DEFAULT 'English' NOT NULL;

-- Add index for performance (useful for filtering/querying by language)
CREATE INDEX idx_notebooks_target_language ON public.notebooks(target_language);

-- Add comment to document the change
COMMENT ON COLUMN public.notebooks.target_language IS 'Target language being learned in this notebook (e.g., Spanish, French, German)';

-- Optional: Update existing notebooks with default language
-- This ensures backwards compatibility for existing notebooks
UPDATE public.notebooks 
SET target_language = 'Spanish'  -- or whatever default you prefer
WHERE target_language = 'English';  -- only update those with default

-- Example: If you want to set different defaults based on existing profile data
-- UPDATE public.notebooks 
-- SET target_language = (
--   SELECT COALESCE(profiles.target_lang, 'English') 
--   FROM public.profiles 
--   WHERE profiles.id = notebooks.user_id
-- )
-- WHERE target_language = 'English';

-- Verification query (run this to check the migration worked)
-- SELECT id, name, target_language, created_at 
-- FROM public.notebooks 
-- ORDER BY created_at DESC 
-- LIMIT 10;