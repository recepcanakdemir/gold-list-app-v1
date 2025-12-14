# GoldList App - Comprehensive Project Documentation

## 📱 Project Overview

**GoldList** is a sophisticated mobile vocabulary learning application built using the proven Goldlist Method for language acquisition. The app provides a systematic approach to learning vocabulary through spaced repetition and progressive stages of mastery.

### 🎯 Core Concept
The Goldlist Method is a language learning technique that uses:
- **Bronze Stage**: Initial word input and familiarization
- **Silver Stage**: First review after 2-week intervals  
- **Gold Stage**: Final mastery review after additional 2-week intervals
- **Progressive reduction**: Only 70% of words advance to each subsequent stage

### 🚀 Key Features
- **Local-first architecture** with instant responsiveness
- **Gamified learning** with streaks, progress tracking, and achievements
- **Multi-language support** with country flags and level indicators (A1-C2)
- **Smart review system** with automated scheduling
- **Freemium monetization** (300 words free, unlimited with Pro)
- **Cross-device synchronization** via Supabase backend

---

## 🛠 Technology Stack

### **Frontend Framework**
- **React Native** (0.81.5) with Expo SDK (54.0.26)
- **TypeScript** (5.9.2) for type safety and development experience
- **Expo Router** (6.0.15) for file-based navigation with automatic route generation
- **React** (19.1.0) with hooks-based architecture
- **Expo Metro Config** (54.0.10) for bundling and development

### **State Management & Data Flow**
- **React Query (TanStack)** (5.90.11) for server state management
  - Query invalidation and cache management
  - Optimistic updates for zero-latency UI
  - Automatic background refetching
  - Offline-first with persistence via AsyncStorage
- **AsyncStorage** (@react-native-async-storage/async-storage 2.2.0) for local persistence
- **MMKV** (react-native-mmkv 4.0.1) integration for high-performance storage
- **React Query Persist Client** (5.90.13) for cache persistence across app sessions

### **Backend & Database**
- **Supabase** (2.86.0) for Backend-as-a-Service
  - PostgreSQL database with automatic API generation
  - Real-time subscriptions for live data updates
  - Row Level Security (RLS) for data protection
  - Edge functions for serverless compute
- **Database Features**:
  - Automatic schema migrations
  - Foreign key constraints and data integrity
  - Indexed queries for performance
  - UUID primary keys for distributed systems

### **Authentication & Security**
- **Supabase Auth** with multiple providers:
  - Email/Password authentication with email verification
  - Apple Sign-In integration (expo-apple-authentication 8.0.8)
  - Session persistence with automatic token refresh
  - Deep linking for password reset flows
- **Security Features**:
  - JWT tokens for stateless authentication
  - Session isolation between users
  - Cache clearing on logout to prevent data leakage
  - Row Level Security policies

### **Monetization & Analytics**
- **RevenueCat** (9.6.9) for subscription management
  - Cross-platform subscription handling
  - Receipt validation and fraud protection
  - Analytics and cohort analysis
  - A/B testing for pricing strategies
- **Expo Store Review** (9.0.9) for App Store ratings prompts
- **Expo Notifications** (0.32.14) for push notification engagement

### **UI/UX Libraries & Components**
- **Vector Icons**: @expo/vector-icons (15.0.3) with Ionicons
- **Graphics**: react-native-svg (15.12.1) for custom illustrations
- **Animations**: lottie-react-native (7.3.4) for complex animations
- **Internationalization**: react-native-country-flag (2.0.2) for language flags
- **Safe Areas**: react-native-safe-area-context (5.6.0)
- **Navigation**: react-native-screens (4.16.0) for native navigation performance

### **Development & Build Tools**
- **Expo Constants** (18.0.11) for environment configuration
- **Expo Linking** (8.0.9) for deep linking and URL handling
- **Metro Runtime** (6.1.2) for fast refresh and hot reloading
- **Babel Preset Expo** (54.0.7) for JavaScript compilation
- **TypeScript Configuration** with strict mode enabled

---

## 🏗 Architecture Overview

### **Application Architecture Pattern**
- **Local-First Architecture**: Primary data lives locally with background sync
- **Optimistic UI**: Immediate feedback with rollback on failure
- **Offline-First**: Full functionality without internet connection
- **Progressive Enhancement**: Core features work offline, enhanced features online

### **Folder Structure**
```
GoldlistApp/
├── app/                          # Expo Router pages (file-based routing)
│   ├── (auth)/                   # Authentication group routes
│   │   ├── login.tsx             # Email/password + Apple Sign-In
│   │   ├── forgot-password.tsx   # Password reset request with email
│   │   └── reset-password.tsx    # PKCE + deep link password reset
│   ├── (tabs)/                   # Tab navigation group
│   │   ├── _layout.tsx           # Tab bar configuration
│   │   ├── index.tsx             # Home - Notebooks grid with filters
│   │   ├── dashboard.tsx         # Analytics, streaks, progress charts
│   │   └── settings.tsx          # Account, notifications, support
│   ├── notebook/[id]/            # Dynamic notebook routes
│   │   ├── [id].tsx              # Notebook calendar view with pages
│   │   ├── add.tsx               # Word entry form with validation
│   │   └── review.tsx            # Spaced repetition review interface
│   ├── _layout.tsx               # Root layout with auth provider
│   ├── index.tsx                 # App entry point with redirection
│   ├── onboarding.tsx            # Multi-step user onboarding
│   ├── paywall.tsx               # RevenueCat subscription interface
│   └── create-notebook.tsx       # Language + level + goal selection
├── lib/                          # Core business logic layer
│   ├── database-hooks.ts         # 50+ React Query hooks for data management
│   ├── revenuecat.tsx           # Subscription state + purchase logic
│   ├── supabase.ts              # Database client configuration
│   ├── time-provider.tsx        # Centralized time simulation for development
│   ├── query-client.tsx         # React Query configuration + persistence
│   ├── notifications.ts         # Push notification scheduling + handling
│   ├── onboarding-context.tsx   # Onboarding flow state management
│   └── ai-helper.ts             # AI integration helpers (future)
├── components/                   # Reusable UI component library
│   ├── Header.tsx               # App header with navigation + streaks
│   ├── HeaderProButton.tsx      # Pro upgrade button (context-aware)
│   ├── SettingsProBanner.tsx   # Conversion-focused upgrade banner
│   ├── AnimatedWordEntry.tsx    # Word input with transitions
│   ├── AnimatedReviewCards.tsx  # Swipeable review card interface
│   ├── GoldlistMonthView.tsx    # Calendar component for notebook view
│   ├── GoldlistSchema.tsx       # Visual Goldlist Method explanation
│   └── LottieAnimation.tsx      # Reusable Lottie animation wrapper
├── styles/                      # Design system and theming
│   └── theme.ts                 # Colors, typography, spacing, 3D effects
├── assets/                      # Static resources
│   ├── images/                  # App icons, logos, illustrations
│   ├── lottie/                  # Animation files (.json)
│   └── fonts/                   # Custom typography (if needed)
└── sql_migrations/              # Database schema evolution
    └── *.sql                    # Supabase migration files
```

### **Design System Architecture**
```typescript
// Comprehensive design tokens system
export const Colors = {
  primary: '#FFA500',           // Orange brand color
  primaryDark: '#D97706',       // Orange shadows/borders  
  gold: '#FFD700',              // Achievement accents
  goldDark: '#E6C200',          // Gold shadows
  silver: '#C0C0C0',            // Secondary achievements
  bronze: '#CD7F32',            // Entry level achievements
  textPrimary: '#4B4B4B',       // Headers and important text
  textSecondary: '#AFAFAF',     // Subtitles and metadata
  background: '#F7F7F7',        // App background
  white: '#FFFFFF',             // Card backgrounds
}

export const Typography = {
  headerLarge: { fontSize: 28, fontWeight: '800' },
  titleMedium: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '400' },
  // ... 8 total text styles with consistent hierarchy
}

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32
  // 8-point grid system for consistent spacing
}

export const Effects3D = {
  // Gamified 3D button effects
  container: { borderWidth: 3, shadowRadius: 4 },
  buttonPrimary: { elevation: 8, shadowOpacity: 0.3 }
}
```

### **Data Flow Architecture**
```
User Interaction → Optimistic Update → Local Cache → Background Sync → Server → Cache Invalidation → UI Update
```

### **State Management Layers**
1. **Local State**: React useState/useReducer for component state
2. **Query Cache**: React Query for server state with persistence
3. **Context State**: React Context for auth, onboarding, time simulation
4. **Persistent State**: AsyncStorage for user preferences and cache
5. **Remote State**: Supabase for source of truth and real-time sync

---

## 🗄 Database Schema

### **PostgreSQL Database Architecture**
- **Hosted on**: Supabase (managed PostgreSQL)
- **Row Level Security (RLS)**: Enabled on all tables
- **UUID Primary Keys**: For distributed system compatibility
- **Foreign Key Constraints**: Maintaining referential integrity
- **Indexes**: Optimized for common query patterns

### **Core Tables with Technical Details**

#### **profiles** (User Account Data)
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'canceled')),
  has_ever_subscribed boolean DEFAULT true,        -- For development/demo
  target_lang text DEFAULT 'English',
  daily_word_goal integer DEFAULT 20,
  current_streak integer DEFAULT 0,
  last_activity_date date,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
```

#### **notebooks** (Language Learning Notebooks)
```sql
CREATE TABLE notebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_language text NOT NULL DEFAULT 'Spanish',
  language_level text DEFAULT 'A2' CHECK (language_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  words_per_page_limit integer DEFAULT 20,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_notebooks_user_id ON notebooks(user_id);
CREATE INDEX idx_notebooks_active ON notebooks(user_id, is_active);

-- RLS Policies
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own notebooks" ON notebooks USING (auth.uid() = user_id);
```

#### **pages** (Daily Goldlist Pages)
```sql
CREATE TABLE pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  target_date date NOT NULL,
  title text,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Ensure unique page numbers per notebook
  UNIQUE(notebook_id, page_number)
);

-- Indexes for calendar queries
CREATE INDEX idx_pages_notebook_target_date ON pages(notebook_id, target_date);
CREATE INDEX idx_pages_target_date ON pages(target_date);

-- RLS: Users can access pages of their notebooks
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage pages of own notebooks" ON pages 
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));
```

#### **words** (Vocabulary Entries - Core Entity)
```sql
CREATE TABLE words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  term text NOT NULL,
  definition text NOT NULL,
  type text,                                    -- word type: noun, verb, etc.
  example_sentence text,
  example_translation text,
  next_review_date date NOT NULL,
  stage text DEFAULT 'bronze' CHECK (stage IN ('bronze', 'silver', 'gold')),
  round integer DEFAULT 1 CHECK (round BETWEEN 1 AND 4),
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'learned', 'leech')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Critical indexes for Goldlist Method queries
CREATE INDEX idx_words_page_id ON words(page_id);
CREATE INDEX idx_words_review_date ON words(next_review_date);
CREATE INDEX idx_words_stage_status ON words(stage, status);
CREATE INDEX idx_words_user_review ON words(page_id, next_review_date, status);

-- RLS: Users can access words of their pages
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage words of own pages" ON words 
  USING (page_id IN (
    SELECT p.id FROM pages p 
    JOIN notebooks n ON p.notebook_id = n.id 
    WHERE n.user_id = auth.uid()
  ));
```

#### **daily_activity_log** (Streak & Heatmap Tracking)
```sql
CREATE TABLE daily_activity_log (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Unique constraint for daily activity tracking
  PRIMARY KEY (user_id, date)
);

-- Index for heatmap queries
CREATE INDEX idx_activity_log_date ON daily_activity_log(date);

-- RLS
ALTER TABLE daily_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own activity" ON daily_activity_log 
  USING (auth.uid() = user_id);
```

### **Database Relationships**
```
profiles (1) ←→ (∞) notebooks ←→ (∞) pages ←→ (∞) words
    ↓
daily_activity_log
```

### **Query Optimization Patterns**
1. **Word Limit Checking**: Efficient count queries with early termination
2. **Review Scheduling**: Index on next_review_date for daily review queries
3. **Notebook Statistics**: Aggregation queries with proper indexing
4. **Activity Heatmaps**: Date-range queries optimized for calendar views

### **Data Integrity Features**
- **Cascading Deletes**: Automatic cleanup when notebooks are deleted
- **Check Constraints**: Validate enum values (stage, status, level)
- **Unique Constraints**: Prevent duplicate pages and activity entries
- **Foreign Key Constraints**: Maintain referential integrity
- **RLS Policies**: User data isolation and security

---

## 🔄 User Flow & Navigation

### **Authentication Flow**
1. **App Launch** → Check existing session
2. **First Time** → Onboarding → Create account
3. **Returning User** → Auto-login → Dashboard
4. **Forgot Password** → Email → Deep link → Reset form

### **Main App Flow**
1. **Home Tab** → View notebooks → Select notebook
2. **Notebook Detail** → Calendar view → Select page/date
3. **Add Words** → Input vocabulary → Save to database
4. **Review Mode** → Spaced repetition → Update progress
5. **Dashboard** → View statistics → Track streaks

### **Subscription Flow**
1. **Free User** → Hits 300 word limit → Paywall
2. **Pro Upgrade** → RevenueCat → Unlock unlimited words
3. **Settings Banner** → Upgrade promotion → Paywall

### **Core User Journey**
```
Login → Home (Notebooks) → Select/Create Notebook → 
Add Words (Bronze) → Wait 14 days → Review (Silver) → 
Wait 14 days → Review (Gold) → Mastery Complete
```

---

## ⚙️ Key Features Deep Dive

### **Goldlist Method Implementation**
```typescript
// Core algorithm implementation
const GOLDLIST_SCHEDULE = {
  bronze: { nextStage: 'silver', waitDays: 14 },
  silver: { nextStage: 'gold', waitDays: 14 },
  gold: { nextStage: 'completed', waitDays: null }
}

const ADVANCEMENT_RATE = 0.7; // Only 70% of words advance per stage

// Automatic review scheduling
function calculateNextReviewDate(stage: string, currentDate: Date): Date {
  const schedule = GOLDLIST_SCHEDULE[stage];
  return addDays(currentDate, schedule.waitDays);
}

// Stage progression with filtering
function advanceWords(words: Word[]): Word[] {
  const passingCount = Math.floor(words.length * ADVANCEMENT_RATE);
  return words
    .sort(() => Math.random() - 0.5) // Random selection
    .slice(0, passingCount)
    .map(word => ({
      ...word,
      stage: GOLDLIST_SCHEDULE[word.stage].nextStage,
      next_review_date: calculateNextReviewDate(word.stage, new Date())
    }));
}
```

### **Performance Optimizations**

#### **React Query Optimistic Updates**
```typescript
// Zero-latency word creation
export function useCreateWordOptimistic() {
  return useMutation({
    mutationFn: createWord,
    onMutate: async (newWord) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['words', pageId]);
      
      // Snapshot previous value
      const previousWords = queryClient.getQueryData(['words', pageId]);
      
      // Optimistically update cache
      queryClient.setQueryData(['words', pageId], old => [...old, newWord]);
      
      return { previousWords };
    },
    onError: (err, newWord, context) => {
      // Rollback on error
      queryClient.setQueryData(['words', pageId], context.previousWords);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries(['words', pageId]);
    }
  });
}
```

#### **Performance Patterns**
- **FlatList Virtualization**: `getItemLayout` for consistent item heights
- **Memoized Calculations**: `useMemo` for expensive computations
- **Image Optimization**: Country flag URLs with caching
- **Bundle Splitting**: Dynamic imports for heavy components
- **Query Optimization**: Specific field selection in database queries

### **Freemium Model Implementation**
```typescript
// Free tier limits and enforcement
export const FREE_TIER_LIMITS = {
  MAX_WORDS: 300,
} as const;

// Word limit checking with efficient counting
export function useTotalWordCount() {
  return useQuery({
    queryKey: ['totalWordCount', userCacheId],
    queryFn: async () => {
      if (await isDemoUser()) return mockTotalWordCount;
      
      const { count, error } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('page_id', pageIds); // Optimized count query
      
      return count || 0;
    }
  });
}

// Upgrade touchpoints throughout the app
const upgradeStrategy = {
  header: 'Always visible pro button',
  settings: 'Prominent upgrade banner',
  wordLimit: 'Paywall on 300 word limit',
  onboarding: 'Pro features explanation'
};
```

### **Demo Mode Architecture**
```typescript
// Apple Review mode with mock data
const DEMO_EMAIL = "apple_review@goldlist.app";

async function isDemoUser(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === DEMO_EMAIL;
}

// Mock data injection for demo account
export function useNotebooks() {
  return useQuery({
    queryKey: ['notebooks', userCacheId],
    queryFn: async () => {
      if (await isDemoUser()) {
        return mockNotebooks; // Pre-populated demo data
      }
      
      // Real user data
      const { data, error } = await supabase
        .from('notebooks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      return data || [];
    }
  });
}
```

### **Ghost Pages System**
```typescript
// Client-side calculation for missing days
function calculateGhostPages(existingPages: Page[], startDate: Date, endDate: Date): GhostPage[] {
  const ghostPages: GhostPage[] = [];
  
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const existingPage = existingPages.find(p => isSameDay(p.target_date, date));
    
    if (!existingPage) {
      ghostPages.push({
        id: `ghost-${formatDate(date)}`,
        notebook_id: notebookId,
        page_number: getPageNumber(date),
        target_date: date,
        isGhost: true,
        wordCount: 0
      });
    }
  }
  
  return ghostPages;
}
```

### **Deep Linking & PKCE Authentication**
```typescript
// Password reset with PKCE flow
export default function ResetPasswordScreen() {
  const url = useURL(); // Expo Linking hook
  
  useEffect(() => {
    if (url) {
      handleDeepLink(url);
    }
  }, [url]);

  const handleDeepLink = async (url: string) => {
    // Priority 1: PKCE Authorization Code Exchange
    const codeMatch = url.match(/[?&]code=([^&#]+)/);
    const code = codeMatch ? decodeURIComponent(codeMatch[1]) : null;
    
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      // Handle session establishment
    }
  };
}
```

---

## 🔧 Development Environment

### **Setup Requirements**
```bash
# Install dependencies
npm install

# Start development server
npm run start

# Run on specific platforms
npm run ios
npm run android
npm run web
```

### **Environment Variables**
- **Supabase URL & API Key**: Database connection
- **RevenueCat API Keys**: iOS/Android subscription keys
- **Expo Project ID**: For EAS builds

### **Development Tools**
- **Expo Go**: For testing on device
- **Flipper**: For debugging (React Native)
- **Supabase Dashboard**: Database management
- **RevenueCat Dashboard**: Subscription analytics

---

## 🧪 Testing Strategy

### **Demo Mode Testing**
- Use `apple_review@goldlist.app` for Apple Review
- Mock data automatically loaded for demo account
- Pro features unlocked for demonstration

### **Development Flags**
```typescript
const FORCE_PRO_IN_DEV = false  // Test Pro features locally
const IS_EXPO_GO = Constants.appOwnership === 'expo'  // Expo Go detection
```

### **Session Testing**
- Developer menu for instant logout
- Cache clearing functionality
- Session isolation between users

---

## 🚀 Deployment & Distribution

### **Build Configuration**
- **iOS Bundle ID**: `com.recepsienen.goldlist-method`
- **Android Package**: `com.recepsienen.goldlist_method`
- **App Name**: "Gold List"
- **Scheme**: `goldlist://` for deep linking

### **Store Preparation**
- **App Store Connect**: iOS distribution
- **Google Play Console**: Android distribution
- **RevenueCat**: Subscription products setup
- **Assets**: Icons, screenshots, store descriptions

---

## 📈 Analytics & Monitoring

### **User Engagement Tracking**
- Daily streak monitoring
- Word addition frequency
- Review completion rates
- Session duration analysis

### **Business Metrics**
- Free-to-Pro conversion rates
- Monthly recurring revenue (MRR)
- User retention rates
- Feature usage analytics

---

## 🔮 Future Roadmap

### **Planned Features**
1. **Social Features**: Friend streaks, leaderboards
2. **AI Integration**: Smart word suggestions, difficulty assessment
3. **Export Functionality**: PDF exports, backup options
4. **Advanced Analytics**: Learning curve analysis, weak point identification
5. **Tablet Optimization**: iPad-specific UI improvements

### **Technical Improvements**
1. **Offline Mode**: Full offline functionality
2. **Performance**: Further optimization for large datasets
3. **Accessibility**: Screen reader support, voice navigation
4. **Security**: Enhanced data encryption

---

## 🤝 Contributing Guidelines

### **Code Standards**
- **TypeScript**: Strict typing required
- **React Query**: For all server state management
- **AsyncStorage**: Never use react-native-mmkv (Expo Go incompatible)
- **FlatList**: For all potentially long lists
- **Expo Router**: File-based routing only

### **Development Workflow**
1. **Feature Branch**: Create from main
2. **Development**: Use TypeScript strictly
3. **Testing**: Test on both iOS and Android
4. **Review**: Code review before merge
5. **Deployment**: EAS build for distribution

---

*This documentation serves as the complete guide to understanding, developing, and maintaining the GoldList vocabulary learning application.*