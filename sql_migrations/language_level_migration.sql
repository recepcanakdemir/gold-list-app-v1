-- Language Level Migration
-- Add CEFR language proficiency level support to notebooks
-- This enables AI to generate content appropriate for user's language learning level
-- Run this SQL in your Supabase SQL Editor

-- Add language_level column to notebooks table
ALTER TABLE public.notebooks 
ADD COLUMN language_level TEXT DEFAULT 'A2' NOT NULL;

-- Add constraint to ensure valid CEFR levels
ALTER TABLE public.notebooks 
ADD CONSTRAINT valid_language_level 
CHECK (language_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));

-- Add index for performance (useful for filtering/querying by level)
CREATE INDEX idx_notebooks_language_level ON public.notebooks(language_level);

-- Add comment to document the change
COMMENT ON COLUMN public.notebooks.language_level IS 'CEFR language proficiency level (A1=Beginner, A2=Elementary, B1=Intermediate, B2=Upper Intermediate, C1=Advanced, C2=Proficient)';

-- Update existing notebooks with default level
-- This ensures backwards compatibility for existing notebooks
UPDATE public.notebooks 
SET language_level = 'A2'  -- Elementary level as default
WHERE language_level IS NULL;

-- Verification query (run this to check the migration worked)
-- SELECT id, name, target_language, language_level, created_at 
-- FROM public.notebooks 
-- ORDER BY created_at DESC 
-- LIMIT 10;