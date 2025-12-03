-- ============================================================
-- STREAK LOGIC TEST SCRIPT
-- Test various scenarios to verify streak calculation works correctly
-- Run this AFTER running streak_logic_migration.sql
-- ============================================================

-- Note: This is a test script to verify the logic works.
-- In a real environment, you would test by using the app interface.

DO $$
DECLARE
  test_user_id UUID;
  test_notebook_id UUID;
  test_page_id UUID;
  test_word_id UUID;
  current_streak_result INTEGER;
  last_activity_result DATE;
BEGIN
  RAISE NOTICE '🧪 Starting Streak Logic Tests...';
  
  -- Find an existing user and their data for testing
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '⚠️ No users found for testing. Create a user first.';
    RETURN;
  END IF;
  
  SELECT id INTO test_notebook_id 
  FROM public.notebooks 
  WHERE user_id = test_user_id 
  LIMIT 1;
  
  IF test_notebook_id IS NULL THEN
    RAISE NOTICE '⚠️ No notebooks found for user. Create a notebook first.';
    RETURN;
  END IF;
  
  SELECT id INTO test_page_id 
  FROM public.pages 
  WHERE notebook_id = test_notebook_id 
  LIMIT 1;
  
  IF test_page_id IS NULL THEN
    RAISE NOTICE '⚠️ No pages found for notebook. Create a page first.';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Test setup complete. User ID: %', test_user_id;
  
  -- Reset streak to 0 for clean testing
  UPDATE public.profiles 
  SET current_streak = 0, last_activity_date = NULL 
  WHERE id = test_user_id;
  
  RAISE NOTICE '📊 Test 1: First word ever (should set streak to 1)';
  
  -- Test 1: Insert first word ever
  INSERT INTO public.words (
    page_id, term, definition, created_at
  ) VALUES (
    test_page_id, 
    'test_word_1', 
    'First test word',
    CURRENT_DATE::TIMESTAMP
  ) RETURNING id INTO test_word_id;
  
  -- Check result
  SELECT current_streak, last_activity_date 
  INTO current_streak_result, last_activity_result
  FROM public.profiles 
  WHERE id = test_user_id;
  
  RAISE NOTICE 'Result: Streak = %, Last Activity = %', current_streak_result, last_activity_result;
  
  IF current_streak_result = 1 AND last_activity_result = CURRENT_DATE THEN
    RAISE NOTICE '✅ Test 1 PASSED: First word sets streak to 1';
  ELSE
    RAISE NOTICE '❌ Test 1 FAILED: Expected streak=1, date=today';
  END IF;
  
  RAISE NOTICE '📊 Test 2: Same day activity (should not change streak)';
  
  -- Test 2: Add another word same day
  INSERT INTO public.words (
    page_id, term, definition, created_at
  ) VALUES (
    test_page_id, 
    'test_word_2', 
    'Second test word same day',
    CURRENT_DATE::TIMESTAMP
  );
  
  -- Check result
  SELECT current_streak 
  INTO current_streak_result
  FROM public.profiles 
  WHERE id = test_user_id;
  
  RAISE NOTICE 'Result: Streak = %', current_streak_result;
  
  IF current_streak_result = 1 THEN
    RAISE NOTICE '✅ Test 2 PASSED: Same day activity does not change streak';
  ELSE
    RAISE NOTICE '❌ Test 2 FAILED: Expected streak to remain 1';
  END IF;
  
  RAISE NOTICE '📊 Test 3: Next day activity (should increment streak)';
  
  -- Test 3: Simulate next day activity
  INSERT INTO public.words (
    page_id, term, definition, created_at
  ) VALUES (
    test_page_id, 
    'test_word_3', 
    'Third test word next day',
    (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP
  );
  
  -- Check result
  SELECT current_streak, last_activity_date 
  INTO current_streak_result, last_activity_result
  FROM public.profiles 
  WHERE id = test_user_id;
  
  RAISE NOTICE 'Result: Streak = %, Last Activity = %', current_streak_result, last_activity_result;
  
  IF current_streak_result = 2 AND last_activity_result = (CURRENT_DATE + 1) THEN
    RAISE NOTICE '✅ Test 3 PASSED: Next day activity increments streak';
  ELSE
    RAISE NOTICE '❌ Test 3 FAILED: Expected streak=2, date=tomorrow';
  END IF;
  
  RAISE NOTICE '📊 Test 4: Skip a day (should reset streak to 1)';
  
  -- Test 4: Skip a day, add word day after tomorrow
  INSERT INTO public.words (
    page_id, term, definition, created_at
  ) VALUES (
    test_page_id, 
    'test_word_4', 
    'Fourth test word after gap',
    (CURRENT_DATE + INTERVAL '3 days')::TIMESTAMP
  );
  
  -- Check result
  SELECT current_streak, last_activity_date 
  INTO current_streak_result, last_activity_result
  FROM public.profiles 
  WHERE id = test_user_id;
  
  RAISE NOTICE 'Result: Streak = %, Last Activity = %', current_streak_result, last_activity_result;
  
  IF current_streak_result = 1 AND last_activity_result = (CURRENT_DATE + 3) THEN
    RAISE NOTICE '✅ Test 4 PASSED: Gap resets streak to 1';
  ELSE
    RAISE NOTICE '❌ Test 4 FAILED: Expected streak=1, date=day+3';
  END IF;
  
  RAISE NOTICE '📊 Test 5: Word UPDATE (review) should also trigger streak';
  
  -- Test 5: Update a word (simulate review) next day
  UPDATE public.words 
  SET 
    status = 'learned',
    updated_at = (CURRENT_DATE + INTERVAL '4 days')::TIMESTAMP
  WHERE id = test_word_id;
  
  -- Check result
  SELECT current_streak, last_activity_date 
  INTO current_streak_result, last_activity_result
  FROM public.profiles 
  WHERE id = test_user_id;
  
  RAISE NOTICE 'Result: Streak = %, Last Activity = %', current_streak_result, last_activity_result;
  
  IF current_streak_result = 2 AND last_activity_result = (CURRENT_DATE + 4) THEN
    RAISE NOTICE '✅ Test 5 PASSED: Word review increments streak';
  ELSE
    RAISE NOTICE '❌ Test 5 FAILED: Expected streak=2 from review';
  END IF;
  
  -- Clean up test data
  DELETE FROM public.words WHERE term LIKE 'test_word_%';
  
  -- Reset user streak to 0 for clean state
  UPDATE public.profiles 
  SET current_streak = 0, last_activity_date = NULL 
  WHERE id = test_user_id;
  
  RAISE NOTICE '🧹 Test data cleaned up';
  RAISE NOTICE '🎉 All streak logic tests completed!';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Test failed with error: %', SQLERRM;
  -- Clean up on error
  DELETE FROM public.words WHERE term LIKE 'test_word_%';
END $$;