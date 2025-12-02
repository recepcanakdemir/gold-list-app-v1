-- =====================================================
-- Goldlist App - Initial Database Schema Migration
-- Phase 1: Core Tables, RLS, and Triggers
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_status TEXT NOT NULL DEFAULT 'active' 
        CHECK (subscription_status IN ('active', 'inactive', 'trial', 'expired')),
    has_ever_subscribed BOOLEAN NOT NULL DEFAULT true,
    target_lang TEXT NOT NULL DEFAULT 'English',
    daily_word_goal INTEGER NOT NULL DEFAULT 20,
    current_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. DAILY ACTIVITY LOG TABLE (Heatmap)
-- =====================================================
CREATE TABLE public.daily_activity_log (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    CONSTRAINT daily_activity_log_pkey PRIMARY KEY (user_id, date)
);

-- Add explicit unique constraint as specified
ALTER TABLE public.daily_activity_log 
ADD CONSTRAINT unique_user_date UNIQUE (user_id, date);

-- =====================================================
-- 3. NOTEBOOKS TABLE
-- =====================================================
CREATE TABLE public.notebooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    words_per_page_limit INTEGER NOT NULL DEFAULT 20,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. PAGES TABLE (Headlists)
-- =====================================================
CREATE TABLE public.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    target_date DATE NOT NULL,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_notebook_page UNIQUE (notebook_id, page_number)
);

-- =====================================================
-- 5. WORDS TABLE (Core Engine)
-- =====================================================
CREATE TABLE public.words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    term TEXT NOT NULL,
    definition TEXT NOT NULL,
    type TEXT,
    example_sentence TEXT,
    example_translation TEXT,
    next_review_date DATE,
    stage TEXT NOT NULL DEFAULT 'bronze' 
        CHECK (stage IN ('bronze', 'silver', 'gold')),
    round INTEGER NOT NULL DEFAULT 1 
        CHECK (round >= 1 AND round <= 4),
    status TEXT NOT NULL DEFAULT 'waiting' 
        CHECK (status IN ('waiting', 'ready', 'learned', 'leech')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_notebooks_user_id ON public.notebooks(user_id);
CREATE INDEX idx_pages_notebook_id ON public.pages(notebook_id);
CREATE INDEX idx_pages_target_date ON public.pages(target_date);
CREATE INDEX idx_words_page_id ON public.words(page_id);
CREATE INDEX idx_words_next_review_date ON public.words(next_review_date);
CREATE INDEX idx_words_stage ON public.words(stage);
CREATE INDEX idx_words_status ON public.words(status);
CREATE INDEX idx_daily_activity_log_date ON public.daily_activity_log(date);

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for daily_activity_log
CREATE POLICY "Users can view own activity log" ON public.daily_activity_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity log" ON public.daily_activity_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity log" ON public.daily_activity_log
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity log" ON public.daily_activity_log
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for notebooks
CREATE POLICY "Users can view own notebooks" ON public.notebooks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notebooks" ON public.notebooks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notebooks" ON public.notebooks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notebooks" ON public.notebooks
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for pages
CREATE POLICY "Users can view own pages" ON public.pages
    FOR SELECT USING (
        auth.uid() = (
            SELECT user_id FROM public.notebooks 
            WHERE notebooks.id = pages.notebook_id
        )
    );

CREATE POLICY "Users can insert own pages" ON public.pages
    FOR INSERT WITH CHECK (
        auth.uid() = (
            SELECT user_id FROM public.notebooks 
            WHERE notebooks.id = pages.notebook_id
        )
    );

CREATE POLICY "Users can update own pages" ON public.pages
    FOR UPDATE USING (
        auth.uid() = (
            SELECT user_id FROM public.notebooks 
            WHERE notebooks.id = pages.notebook_id
        )
    );

CREATE POLICY "Users can delete own pages" ON public.pages
    FOR DELETE USING (
        auth.uid() = (
            SELECT user_id FROM public.notebooks 
            WHERE notebooks.id = pages.notebook_id
        )
    );

-- RLS Policies for words
CREATE POLICY "Users can view own words" ON public.words
    FOR SELECT USING (
        auth.uid() = (
            SELECT notebooks.user_id 
            FROM public.notebooks 
            JOIN public.pages ON pages.notebook_id = notebooks.id 
            WHERE pages.id = words.page_id
        )
    );

CREATE POLICY "Users can insert own words" ON public.words
    FOR INSERT WITH CHECK (
        auth.uid() = (
            SELECT notebooks.user_id 
            FROM public.notebooks 
            JOIN public.pages ON pages.notebook_id = notebooks.id 
            WHERE pages.id = words.page_id
        )
    );

CREATE POLICY "Users can update own words" ON public.words
    FOR UPDATE USING (
        auth.uid() = (
            SELECT notebooks.user_id 
            FROM public.notebooks 
            JOIN public.pages ON pages.notebook_id = notebooks.id 
            WHERE pages.id = words.page_id
        )
    );

CREATE POLICY "Users can delete own words" ON public.words
    FOR DELETE USING (
        auth.uid() = (
            SELECT notebooks.user_id 
            FROM public.notebooks 
            JOIN public.pages ON pages.notebook_id = notebooks.id 
            WHERE pages.id = words.page_id
        )
    );

-- =====================================================
-- 8. AUTOMATIC PROFILE CREATION TRIGGER
-- =====================================================

-- Function to create profile when new user signs up
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
        'active',
        true,
        'English',
        20,
        0,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_activity_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notebooks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.words TO authenticated;

-- =====================================================
-- Migration Complete
-- =====================================================