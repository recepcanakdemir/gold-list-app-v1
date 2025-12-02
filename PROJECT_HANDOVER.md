# PROJECT HANDOVER: Goldlist Vocabulary App

## 🎯 Project Overview & Tech Stack

**Project**: Goldlist Method vocabulary learning app with spaced repetition
**Status**: MVP Core Loop complete and stable

### Tech Stack
- **Frontend**: React Native with Expo (file-based routing)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL with RLS)
- **State Management**: TanStack React Query (v5)
- **Graphics**: react-native-svg (for progress circles)
- **Storage**: AsyncStorage (for time simulation)

---

## 🗄️ Database Schema & Architecture

### Core Tables
```sql
-- User profiles with streak tracking
profiles {
  id: UUID (PK)
  subscription_status: TEXT
  has_ever_subscribed: BOOLEAN
  target_lang: TEXT
  daily_word_goal: INTEGER
  current_streak: INTEGER
  last_activity_date: DATE
  created_at: TIMESTAMP
}

-- Notebook containers (users can have multiple)
notebooks {
  id: UUID (PK)
  user_id: UUID (FK -> profiles.id)
  name: TEXT
  words_per_page_limit: INTEGER (default 20)
  is_active: BOOLEAN
  created_at: TIMESTAMP
}

-- Pages within notebooks (lazy creation)
pages {
  id: UUID (PK)
  notebook_id: UUID (FK -> notebooks.id)
  page_number: INTEGER
  target_date: DATE
  title: TEXT
  created_at: TIMESTAMP
}

-- Individual vocabulary words
words {
  id: UUID (PK)
  page_id: UUID (FK -> pages.id)
  term: TEXT
  definition: TEXT
  type: TEXT (optional)
  example_sentence: TEXT (optional)
  example_translation: TEXT (optional)
  next_review_date: DATE
  stage: ENUM ('bronze', 'silver', 'gold')
  round: INTEGER (1-4)
  status: ENUM ('waiting', 'ready', 'learned', 'leech')
  created_at: TIMESTAMP
  updated_at: TIMESTAMP (auto-updated via trigger)
}

-- Activity tracking for heatmap
daily_activity_log {
  id: UUID (PK)
  user_id: UUID (FK -> profiles.id)
  date: DATE
  created_at: TIMESTAMP
  UNIQUE(user_id, date)
}
```

### Critical SQL Functions (RPC)

#### 1. Dashboard Statistics Function
```sql
-- FINAL: Complete Dashboard Stats Function
-- Fixes: TimeProvider integration + Dynamic notebook-based goals + Today inclusion + Goldlist retention logic
DROP FUNCTION IF EXISTS get_dashboard_stats(uuid,date,text);

CREATE OR REPLACE FUNCTION get_dashboard_stats(
  user_uuid UUID,
  start_date DATE,
  period_type TEXT  -- 'week' or 'month'
)
RETURNS TABLE(
  total_words INTEGER,
  words_added_period INTEGER,
  words_should_add INTEGER,
  words_added_percentage NUMERIC,
  words_reviewed_period INTEGER,
  words_remembered_period INTEGER,
  retention_rate NUMERIC,
  mastery_rate_percentage NUMERIC
)
AS $$
DECLARE
  daily_capacity INTEGER;
  period_days INTEGER;
  start_timestamp TIMESTAMP;
  end_timestamp TIMESTAMP;
BEGIN
  -- Calculate period days
  period_days := CASE 
    WHEN period_type = 'week' THEN 7
    WHEN period_type = 'month' THEN 30
    ELSE 7
  END;
  
  -- Calculate daily capacity from ACTIVE notebooks
  SELECT COALESCE(SUM(words_per_page_limit), 0) INTO daily_capacity
  FROM notebooks 
  WHERE user_id = user_uuid AND is_active = true;
  
  -- Use proper timestamp ranges to include full days + TODAY
  start_timestamp := start_date::TIMESTAMP;
  end_timestamp := (start_date + INTERVAL '1 day' * (period_days + 1))::TIMESTAMP;

  RETURN QUERY
  WITH user_notebooks AS (
    -- Only include ACTIVE notebooks for capacity calculation
    SELECT id FROM notebooks 
    WHERE user_id = user_uuid AND is_active = true
  ),
  user_words AS (
    -- Get all words from user's notebooks
    SELECT w.*, p.notebook_id
    FROM words w
    JOIN pages p ON w.page_id = p.id
    JOIN user_notebooks un ON p.notebook_id = un.id
  ),
  period_words AS (
    -- Words added in the specified period (using timestamp comparison)
    SELECT * FROM user_words 
    WHERE created_at >= start_timestamp 
    AND created_at < end_timestamp
  ),
  period_reviews AS (
    -- Track review results by looking at status changes in period
    -- Words that moved to 'learned' status are considered "remembered"
    -- Words that were reviewed (status updated) in period
    SELECT 
      w.id,
      CASE 
        WHEN w.status = 'learned' THEN 1 
        ELSE 0 
      END as remembered,
      1 as reviewed
    FROM user_words w
    -- CRITICAL: Only count words modified after creation (actually reviewed)
    WHERE w.updated_at >= start_timestamp 
    AND w.updated_at < end_timestamp
    AND w.updated_at > w.created_at  -- Prevents newly added words from inflating review count
    AND w.status IN ('learned', 'waiting', 'ready', 'leech')
  ),
  stats AS (
    SELECT 
      -- Total words across all notebooks
      (SELECT COUNT(*) FROM user_words) as total_words,
      
      -- Words added in this period
      (SELECT COUNT(*) FROM period_words) as words_added_period,
      
      -- Words that should be added (daily capacity × period days)
      (daily_capacity * period_days) as words_should_add,
      
      -- Words reviewed in period
      (SELECT COALESCE(SUM(reviewed), 0) FROM period_reviews) as words_reviewed_period,
      
      -- Words remembered in period
      (SELECT COALESCE(SUM(remembered), 0) FROM period_reviews) as words_remembered_period
  )
  SELECT 
    stats.total_words::INTEGER,
    stats.words_added_period::INTEGER,
    stats.words_should_add::INTEGER,
    
    -- Words Added Percentage: (added / should_add) * 100
    CASE 
      WHEN stats.words_should_add > 0 
      THEN ROUND((stats.words_added_period::NUMERIC / stats.words_should_add) * 100, 1)
      ELSE 0
    END as words_added_percentage,
    
    stats.words_reviewed_period::INTEGER,
    stats.words_remembered_period::INTEGER,
    
    -- Retention Rate: (remembered / reviewed) * 100
    CASE 
      WHEN stats.words_reviewed_period > 0 
      THEN ROUND((stats.words_remembered_period::NUMERIC / stats.words_reviewed_period) * 100, 1)
      ELSE 0
    END as retention_rate,
    
    -- Mastery Rate Percentage: Retention performance scaled to 30% target (Goldlist Method)
    CASE 
      WHEN stats.words_reviewed_period > 0 
      THEN LEAST(100, ROUND(((stats.words_remembered_period::NUMERIC / stats.words_reviewed_period) / 0.3) * 100, 1))
      ELSE 0
    END as mastery_rate_percentage
    
  FROM stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID, DATE, TEXT) TO authenticated;
```

#### 2. Activity Logging Trigger
```sql
-- Auto-tracking user activity + GitHub-style heatmap data
CREATE OR REPLACE FUNCTION public.log_daily_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert activity log for the user who created the word
  -- Uses word's timestamp (NEW.created_at) to support simulated developer time
  INSERT INTO public.daily_activity_log (user_id, date)
  SELECT 
    n.user_id,  -- Get user_id from notebooks table
    NEW.created_at::DATE -- Use word's creation date, not server date
  FROM public.pages p
  JOIN public.notebooks n ON p.notebook_id = n.id
  WHERE p.id = NEW.page_id
  ON CONFLICT (user_id, date) DO NOTHING; -- Ignore if already logged for this date
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on words table
DROP TRIGGER IF EXISTS auto_log_daily_activity ON public.words;
CREATE TRIGGER auto_log_daily_activity
  AFTER INSERT ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION public.log_daily_activity();
```

#### 3. Updated At Trigger (Time Travel Support)
```sql
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

-- Trigger for words table
DROP TRIGGER IF EXISTS set_updated_at ON public.words;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.words
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

#### 4. Activity Log Fetcher
```sql
CREATE OR REPLACE FUNCTION get_user_activity_log(
  user_uuid UUID,
  days_back INTEGER DEFAULT 365
)
RETURNS TABLE(
  activity_date DATE
)
AS $$
BEGIN
  RETURN QUERY
  SELECT dal.date as activity_date
  FROM public.daily_activity_log dal
  WHERE dal.user_id = user_uuid
    AND dal.date >= (CURRENT_DATE - INTERVAL '1 day' * days_back)
    -- No upper date limit to support developer time simulation
  ORDER BY dal.date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_activity_log(UUID, INTEGER) TO authenticated;
```

---

## 🚀 Data Fetching & Performance Strategy

### 1. Consolidated Hook Strategy
**Problem**: Multiple database SELECT calls create N+1 queries
**Solution**: Use Supabase RPC functions for complex queries

```typescript
// ❌ BAD: Multiple queries
const words = useWords(pageId)
const pages = usePages(notebookId) 
const stats = useNotebookStats(notebookId)

// ✅ GOOD: Single RPC call
const { data: dashboardStats } = useDashboardStats(period)
```

### 2. Optimistic Updates Strategy
**Pattern**: Update UI immediately, then sync with server

```typescript
// Example: Adding words
const { mutate: createWord } = useCreateWordOptimistic()

// UI updates immediately → Server sync → Rollback if error
createWord(wordData, {
  onSuccess: () => {
    queryClient.invalidateQueries(['words', pageId])
    queryClient.invalidateQueries(['notebookStats', notebookId])
  },
  onError: (error) => {
    // UI shows error toast, reverts optimistic update
  }
})
```

### 3. Cache Invalidation Rules
**Critical Pattern**: Invalidate related queries to maintain data consistency

```typescript
// Adding/Deleting words affects:
queryClient.invalidateQueries(['words', pageId])
queryClient.invalidateQueries(['notebookStats', notebookId])
queryClient.invalidateQueries(['dashboardStats'])
queryClient.invalidateQueries(['activityLog'])

// Notebook changes affect:
queryClient.invalidateQueries(['notebooks'])
queryClient.invalidateQueries(['dashboardStats']) // Capacity calculation changes

// Review completions affect:
queryClient.invalidateQueries(['reviewWords'])
queryClient.invalidateQueries(['notebookStats']) // Mastered count changes
```

---

## ⏰ The "Time Machine" Architecture

### Problem Solved
Developers need to simulate future dates to test review logic, but database timestamps use server time.

### TimeProvider Implementation
```typescript
// lib/time-provider.tsx
export function TimeProvider({ children }) {
  const [timeOffset, setTimeOffset] = useState(0) // milliseconds offset
  const [currentTime, setCurrentTime] = useState(() => new Date(Date.now()))

  const addDay = () => {
    const newOffset = timeOffset + (24 * 60 * 60 * 1000)
    saveTimeOffset(newOffset)
  }

  // currentTime is reactive - updates when offset changes
  useEffect(() => {
    setCurrentTime(new Date(Date.now() + timeOffset))
  }, [timeOffset])
}
```

### Developer Time vs Server Time Strategy
**Database Operations**: Pass explicit timestamps to override server time

```typescript
// Word Creation
const { mutate: createWord } = useCreateWord()
createWord({
  ...wordData,
  created_at: currentTime.toISOString(), // Use simulated time
  next_review_date: addDays(currentTime, 14).toISOString()
})

// Word Review Updates  
const { mutate: updateReview } = useUpdateWordReview()
updateReview({
  wordId,
  remembered: true,
  updated_at: currentTime.toISOString() // Critical for time travel mastery rate
})
```

**Key Insight**: SQL triggers respect explicitly provided timestamps, fall back to NOW() when null.

---

## 🎮 Key Feature Implementations

### 1. Review Logic (Complex Animation System)

#### Problem: Card Flicker During Swipes
**Root Cause**: Race condition between state update and animation reset

**Solution**: Map-based rendering + horizontal-only interpolation
```typescript
// ❌ BAD: Index-based rendering causes flicker
{reviewWords.map((word, index) => (
  <ReviewCard key={index} isActive={index === currentIndex} />
))}

// ✅ GOOD: Map-based rendering with stable keys
{reviewWords.map((word) => (
  <ReviewCard 
    key={word.id} 
    isActive={word.id === reviewWords[currentIndex]?.id}
    translateX={pan.x} // Only horizontal movement
  />
))}
```

#### Fire-and-Forget Mutation Logic
```typescript
// Immediate UI feedback, background server sync
const handleSwipeResult = (remembered: boolean) => {
  // 1. Update UI immediately
  setCurrentIndex(prev => prev + 1)
  
  // 2. Fire background mutation
  updateReview({ 
    wordId: currentWord.id, 
    remembered,
    currentTime 
  })
  
  // 3. No loading states - seamless UX
}
```

### 2. Dashboard Mastery Rate (30% Goldlist Logic)

#### The Goldlist Method Insight
- Traditional SRS targets 80-90% retention
- Goldlist Method targets 30% retention (distillation focus)
- 30% retention = 100% mastery rate in our app

#### Mastery Rate Formula
```sql
-- Mastery Rate = (Actual Retention / Target Retention) * 100
-- Capped at 100% maximum
CASE 
  WHEN words_reviewed_period > 0 
  THEN LEAST(100, ROUND(((words_remembered_period::NUMERIC / words_reviewed_period) / 0.3) * 100, 1))
  ELSE 0
END as mastery_rate_percentage
```

#### Dynamic Color Logic
```typescript
const getMasteryColor = (percentage: number) => {
  if (percentage >= 100) return '#4CAF50' // Green: Meeting 30% target
  if (percentage >= 70) return '#FFA500'  // Orange: Good progress  
  return '#FF5722'                        // Red: Needs improvement
}
```

### 3. Activity Heatmap (GitHub-Style)

#### Horizontal Scroll Architecture
**Challenge**: Show 365 days in mobile viewport
**Solution**: Week-column layout with horizontal scroll

```typescript
// Generate week grid: columns = weeks, rows = days
const createWeekGrid = (dates: Date[]) => {
  const weeks: Date[][] = []
  let currentWeek: Date[] = []
  
  dates.forEach((date, index) => {
    currentWeek.push(date)
    if (currentWeek.length === 7 || index === dates.length - 1) {
      weeks.push([...currentWeek])
      currentWeek = []
    }
  })
  return weeks
}

// Render with auto-scroll to today
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {weekGrid.map((week, weekIndex) => (
    <View key={weekIndex} style={styles.heatmapWeek}>
      {week.map((date) => (
        <View key={date.toDateString()} style={[
          styles.heatmapDay,
          hasActivity(date) ? styles.active : styles.inactive
        ]} />
      ))}
    </View>
  ))}
</ScrollView>
```

#### Future Date Support
**Problem**: Developer time simulation creates "future" activity dates
**Solution**: No upper date limit in SQL, frontend filters based on TimeProvider

```sql
-- ❌ BAD: Blocks simulated future dates
AND dal.date <= CURRENT_DATE  

-- ✅ GOOD: No upper limit
-- Frontend will filter dates based on TimeProvider's currentTime
```

---

## 📱 Core Navigation & User Flow

### File-Based Routing Structure
```
app/
├── (tabs)/
│   ├── index.tsx          # Homepage (notebook cards)
│   ├── dashboard.tsx      # Statistics & heatmap  
│   └── _layout.tsx        # Tab navigation
├── notebook/
│   ├── [id]/
│   │   ├── index.tsx      # Roadmap (200 pages)
│   │   ├── add-words.tsx  # Word entry form
│   │   └── review.tsx     # Review session
│   └── create.tsx         # New notebook form
└── _layout.tsx            # Root navigation
```

### Smart Notebook Button States
**Logic**: Priority-based button states based on current notebook status

```typescript
// Priority: Review > Add > Done
if (reviewWords?.length > 0) {
  return { state: 'review', text: 'Review Today\'s Words', count: reviewWords.length }
} else if (todayWordCount < wordLimit) {
  return { state: 'add', text: 'Add Today\'s Words', count: wordLimit - todayWordCount }
} else {
  return { state: 'done', text: 'You are all done today', count: 0 }
}
```

---

## 🎯 Current Status & Next Steps

### ✅ MVP Core Loop Complete
1. **Notebook Creation**: ✅ Working
2. **Daily Word Entry**: ✅ Working with time simulation  
3. **14-Day Review Cycle**: ✅ Working with Goldlist progression
4. **Progress Tracking**: ✅ Real activity heatmap + accurate mastery rate
5. **Time Travel Development**: ✅ Full simulation support

### 🔧 Technical Debt & Known Issues
1. **Review Session Tracking**: Currently simplified (tracks via updated_at). Consider dedicated review_sessions table for detailed analytics
2. **Offline Support**: No offline queue implemented yet
3. **Performance**: Large datasets (>1000 words) may need pagination
4. **Testing**: E2E test suite not implemented

### 📋 Potential Future Enhancements
1. **Audio Pronunciation**: Text-to-speech integration
2. **Image Support**: Visual vocabulary cards  
3. **Social Features**: Shared notebooks, leaderboards
4. **Advanced Analytics**: Learning curve analysis, difficulty scoring
5. **Export/Import**: CSV/Anki deck compatibility

---

## 🚨 Critical Notes for Next Developer

### Database Relationship Gotchas
- `user_id` lives in `notebooks` table, NOT `pages` table
- Always join: `words → pages → notebooks` to get `user_id`
- Use `is_active = true` when calculating notebook capacity

### Time Travel Development
- ALWAYS pass `currentTime.toISOString()` for `created_at` and `updated_at`
- SQL triggers respect explicit timestamps, only default to NOW() when null
- Dashboard queries use TimeProvider time, not server time

### Performance Patterns
- Use RPC functions for complex queries (avoid N+1)
- Invalidate caches aggressively but specifically
- Optimistic updates for all mutations

### Mastery Rate Logic
- 30% retention = 100% mastery rate (Goldlist Method)
- Only count `updated_at > created_at` for reviews (prevents newly added words from inflating denominator)
- Color coding: Green ≥100%, Orange ≥70%, Red <70%

---

**This handover document contains everything needed to continue development. The MVP core loop is stable and ready for production deployment.**