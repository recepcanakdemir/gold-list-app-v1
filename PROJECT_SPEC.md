Goldlist App - Final Master Blueprint (Development Phase 1)

1. Project Overview

    App Name: Goldlist
    Core Concept: A high-performance, local-first vocabulary app based on the Goldlist Method.
    Platform: React Native (Expo Router), TypeScript.
    Backend: Supabase (Auth, DB).
    Monetization: RevenueCat (Deferred to Phase 3).

2. Dev & Auth Strategy (Revised)

    To avoid RLS blocking issues, Authentication is Phase 1.

    Onboarding: SKIPPED for now. Hardcode default values for profile creation logic.

    Auth Methods:

    Phase 1: Email/Password (Regular).

    Phase 2: Apple Sign In (Later).

    Session Persistence:

    Use Supabase's built-in AsyncStorage adapter.

    DO NOT implement custom token handling manually. Let the SDK handle auto-refresh.

    Testing: Add a "Developer Menu" to force sign-out and clear local storage instantly.

3. Architecture ("Zero-Latency")

State: React Query + MMKV.

Time Provider: useCurrentTime() hook for simulation.

Ghost Pages: Client-side calculation for missing days (do not auto-insert empty pages).

4. Database Schema (Supabase)

A. profiles

id (uuid, PK): References auth.users.

subscription_status (text): Defaults to 'active' for DEV mode testing.

has_ever_subscribed (boolean): Default true for DEV mode testing.

target_lang (text): Default 'English'.

daily_word_goal (int): Default 20.

current_streak (int): Default 0.

last_activity_date (date)

created_at (timestamp)

B. daily_activity_log (Heatmap)

user_id (uuid, FK)

date (date)

Constraint: Unique pair (user_id, date) for binary tracking.

C. notebooks

id (uuid, PK)

user_id (uuid, FK)

name (text)

words_per_page_limit (int): Default 20.

is_active (boolean)

created_at (timestamp)

D. pages (Headlists)

Only created when actual data exists.

id (uuid, PK)

notebook_id (uuid, FK)

page_number (int)

target_date (date)

title (text, nullable)

created_at (timestamp)

E. words (The Core Engine)

id (uuid, PK)

page_id (uuid, FK)

term (text)

definition (text)

type (text, nullable)

example_sentence (text, nullable)

example_translation (text, nullable)

next_review_date (date)

stage (text): 'bronze' | 'silver' | 'gold'.

round (int): 1-4.

status (text): 'waiting', 'ready', 'learned', 'leech'.

5. Development Phases

Database: Generate SQL migration.

Infrastructure: Setup Expo, React Query, MMKV.

Auth (Basic): Implement Supabase Client with Persistence + Login Screen (No UI polish).

Core UI: Roadmap and Word Entry.




## 7. Technical Constraints & Coding Standards (CRITICAL)
**Always follow these rules when generating code:**

1.  **Storage:** Use `AsyncStorage` via `@react-native-async-storage/async-storage`. **NEVER use `react-native-mmkv`** (Not supported in Expo Go).
2.  **Navigation & Layouts:**
    * **DO NOT modify** `app/_layout.tsx` or `app/(tabs)/_layout.tsx` unless explicitly instructed. These files are stable.
    * Use `expo-router` for navigation (`useRouter`, `push`, `replace`).
3.  **Performance:**
    * **Lists:** ALWAYS use `FlatList` for lists (Roadmap, Words). Never use `ScrollView` for potentially long lists.
    * **Calculations:** Wrap expensive logic (like Ghost Page calculation) in `useMemo`.
    * **Interactions:** Use Optimistic Updates for "Add Word" and "Review" actions to ensure zero-latency UI.
4.  **UI Library:** Use `lucide-react-native` for icons. Use standard `StyleSheet` for styling (keep it clean).