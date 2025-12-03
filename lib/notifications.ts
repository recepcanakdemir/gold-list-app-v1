import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationPermissionStatus {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
  expires?: 'never' | number;
}

// Request notification permissions
export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  try {
    const { status, canAskAgain, expires } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });

    return {
      status,
      canAskAgain,
      expires,
    };
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return {
      status: 'denied',
      canAskAgain: false,
    };
  }
}

// Check current notification permissions
export async function getNotificationPermissions(): Promise<NotificationPermissionStatus> {
  try {
    const { status, canAskAgain, expires } = await Notifications.getPermissionsAsync();
    return {
      status,
      canAskAgain,
      expires,
    };
  } catch (error) {
    console.error('Error getting notification permissions:', error);
    return {
      status: 'denied',
      canAskAgain: false,
    };
  }
}

// Get the next review date from user's words
async function getNextReviewDate(): Promise<Date | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Query for the earliest next_review_date from all user's words
    const { data, error } = await supabase
      .from('words')
      .select(`
        next_review_date,
        pages!inner(
          notebook_id,
          notebooks!inner(
            user_id
          )
        )
      `)
      .eq('pages.notebooks.user_id', user.id)
      .not('next_review_date', 'is', null)
      .not('status', 'in', '("learned","leech")')
      .order('next_review_date', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Error fetching next review date:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null; // No reviews scheduled
    }

    return new Date(data[0].next_review_date + 'T00:00:00'); // Parse as start of day
  } catch (error) {
    console.error('Error in getNextReviewDate:', error);
    return null;
  }
}

// Schedule notification for 9:00 AM on the given date
function createNotificationTrigger(reviewDate: Date): Notifications.TimeIntervalTriggerInput {
  const scheduledDate = new Date(reviewDate);
  scheduledDate.setHours(9, 0, 0, 0); // Set to 9:00 AM

  // If the scheduled time has already passed today, don't schedule
  const now = new Date();
  if (scheduledDate <= now) {
    // If it's the same day but time has passed, schedule for tomorrow
    if (scheduledDate.toDateString() === now.toDateString()) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
    }
  }

  // Calculate seconds until the scheduled time
  const secondsUntilTrigger = Math.max(1, Math.floor((scheduledDate.getTime() - now.getTime()) / 1000));

  return {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: secondsUntilTrigger,
    repeats: false,
  };
}

// Cancel all existing scheduled notifications
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All scheduled notifications cancelled');
  } catch (error) {
    console.error('Error cancelling notifications:', error);
  }
}

// Schedule the next review notification
export async function scheduleNextReviewNotification(): Promise<boolean> {
  try {
    // First check permissions
    const permissions = await getNotificationPermissions();
    if (permissions.status !== 'granted') {
      console.log('Notification permissions not granted, skipping scheduling');
      return false;
    }

    // Cancel any existing notifications
    await cancelAllScheduledNotifications();

    // Get the next review date
    const nextReviewDate = await getNextReviewDate();
    if (!nextReviewDate) {
      console.log('No upcoming reviews found, no notification scheduled');
      return true; // Success - just no notification needed
    }

    // Check if the review date is in the future
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const reviewDay = new Date(nextReviewDate.getFullYear(), nextReviewDate.getMonth(), nextReviewDate.getDate());

    if (reviewDay < today) {
      console.log('Review date is in the past, not scheduling notification');
      return true;
    }

    // Create trigger for 9:00 AM on review date
    const trigger = createNotificationTrigger(nextReviewDate);

    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Goldlist Review Reminder',
        body: 'You have Goldlist reviews waiting for today! 🧠',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
    });

    console.log(`Notification scheduled for ${nextReviewDate.toDateString()} at 9:00 AM, ID: ${notificationId}`);
    return true;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return false;
  }
}

// Get all scheduled notifications (for debugging)
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

// Initialize notifications system - call this once in the app
export async function initializeNotifications(): Promise<void> {
  try {
    // Check if we have permissions
    const permissions = await getNotificationPermissions();
    
    if (permissions.status === 'undetermined' && permissions.canAskAgain) {
      // Request permissions if we haven't asked before
      const newPermissions = await requestNotificationPermissions();
      if (newPermissions.status === 'granted') {
        // Schedule initial notification if permissions granted
        await scheduleNextReviewNotification();
      }
    } else if (permissions.status === 'granted') {
      // We already have permissions, schedule notification
      await scheduleNextReviewNotification();
    }

    console.log('Notifications system initialized');
  } catch (error) {
    console.error('Error initializing notifications:', error);
  }
}

