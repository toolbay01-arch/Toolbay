/**
 * Android Notification Fix - Run this in browser console on your phone
 * 
 * This script diagnoses and fixes common Android notification issues
 */

async function fixAndroidNotifications() {
  console.log('🔧 Android Notification Fix Tool');
  console.log('================================\n');

  const results = {
    checks: [],
    fixes: [],
    errors: []
  };

  // 1. Check basic support
  console.log('1️⃣ Checking notification support...');
  if (!('Notification' in window)) {
    results.errors.push('❌ Notifications not supported in this browser');
    console.error('Notifications not supported');
    return results;
  }
  results.checks.push('✅ Notifications API supported');
  console.log('✅ Notifications API supported');

  // 2. Check current permission
  console.log('\n2️⃣ Checking permission status...');
  console.log('Current permission:', Notification.permission);
  results.checks.push(`Permission: ${Notification.permission}`);

  if (Notification.permission === 'denied') {
    results.errors.push('❌ CRITICAL: Notifications are DENIED');
    console.error('❌ CRITICAL: Notifications are DENIED');
    console.log('\n🔧 FIX: Go to Chrome Settings > Site Settings > Notifications');
    console.log('   Then find your site and change to "Allow"');
    return results;
  }

  if (Notification.permission === 'default') {
    console.log('⚠️  Permission not granted yet, requesting...');
    try {
      const permission = await Notification.requestPermission();
      console.log('New permission:', permission);
      results.fixes.push(`Permission requested: ${permission}`);
      
      if (permission !== 'granted') {
        results.errors.push('❌ Permission not granted');
        return results;
      }
    } catch (err) {
      results.errors.push(`❌ Error requesting permission: ${err.message}`);
      console.error('Error requesting permission:', err);
      return results;
    }
  }

  results.checks.push('✅ Permission granted');
  console.log('✅ Permission granted');

  // 3. Check Service Worker
  console.log('\n3️⃣ Checking Service Worker...');
  if (!('serviceWorker' in navigator)) {
    results.errors.push('❌ Service Worker not supported');
    console.error('Service Worker not supported');
    return results;
  }
  results.checks.push('✅ Service Worker API supported');

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      results.errors.push('❌ No Service Worker registered');
      console.error('❌ No Service Worker registered');
      console.log('\n🔧 FIX: Registering Service Worker...');
      
      try {
        const newReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
        results.fixes.push('✅ Service Worker registered');
        console.log('✅ Service Worker registered successfully');
      } catch (regError) {
        results.errors.push(`❌ Failed to register SW: ${regError.message}`);
        console.error('Failed to register Service Worker:', regError);
        return results;
      }
    } else {
      results.checks.push(`✅ Service Worker registered: ${registration.scope}`);
      console.log('✅ Service Worker registered:', registration.scope);
      console.log('   State:', registration.active?.state);
      
      // Check if SW is active
      if (!registration.active || registration.active.state !== 'activated') {
        results.errors.push('⚠️  Service Worker not active');
        console.warn('⚠️  Service Worker not active, waiting...');
        await navigator.serviceWorker.ready;
        results.fixes.push('✅ Service Worker activated');
      }
    }
  } catch (swError) {
    results.errors.push(`❌ Service Worker error: ${swError.message}`);
    console.error('Service Worker error:', swError);
    return results;
  }

  // 4. Check HTTPS
  console.log('\n4️⃣ Checking HTTPS...');
  const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
  if (!isSecure) {
    results.errors.push('❌ CRITICAL: Not on HTTPS');
    console.error('❌ CRITICAL: Page is not on HTTPS');
    console.log('Service Workers require HTTPS');
    return results;
  }
  results.checks.push('✅ Page is on HTTPS');
  console.log('✅ Page is on HTTPS');

  // 5. Test notification with Service Worker
  console.log('\n5️⃣ Testing notification...');
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    
    if (registration) {
      // THIS IS THE KEY: Use registration.showNotification for Android
      await registration.showNotification('🎉 Test Notification', {
        body: 'If you see this, notifications are working on your Android!',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'android-test',
        requireInteraction: false,
        data: {
          url: '/',
          test: true
        }
      });
      
      results.fixes.push('✅ Test notification sent via Service Worker');
      console.log('✅ Test notification sent successfully!');
      console.log('   Method: Service Worker API (Android compatible)');
    } else {
      throw new Error('No Service Worker registration');
    }
  } catch (testError) {
    results.errors.push(`❌ Test notification failed: ${testError.message}`);
    console.error('❌ Test notification failed:', testError);
  }

  // 6. Check Push Subscription
  console.log('\n6️⃣ Checking Push Subscription...');
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        results.checks.push('✅ Push subscription active');
        console.log('✅ Push subscription active');
        console.log('   Endpoint:', subscription.endpoint.substring(0, 50) + '...');
      } else {
        results.checks.push('⚠️  No push subscription (this is OK for browser notifications)');
        console.log('⚠️  No push subscription');
        console.log('   This is OK - browser notifications work without push subscription');
      }
    }
  } catch (pushError) {
    console.warn('Push subscription check failed:', pushError);
  }

  // 7. Summary
  console.log('\n================================');
  console.log('📊 SUMMARY');
  console.log('================================\n');
  
  console.log('✅ Checks passed:', results.checks.length);
  results.checks.forEach(check => console.log('  ' + check));
  
  if (results.fixes.length > 0) {
    console.log('\n🔧 Fixes applied:', results.fixes.length);
    results.fixes.forEach(fix => console.log('  ' + fix));
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors found:', results.errors.length);
    results.errors.forEach(error => console.log('  ' + error));
  } else {
    console.log('\n🎉 ALL GOOD! Notifications should work on your Android device!');
  }

  console.log('\n================================');
  console.log('📱 Android-Specific Tips:');
  console.log('================================\n');
  console.log('1. Check Chrome notification settings:');
  console.log('   Chrome > Settings > Site Settings > Notifications > Allow');
  console.log('');
  console.log('2. Check Android notification settings:');
  console.log('   Android Settings > Apps > Chrome > Notifications > Allow');
  console.log('');
  console.log('3. Disable Battery Optimization:');
  console.log('   Android Settings > Apps > Chrome > Battery > Unrestricted');
  console.log('');
  console.log('4. If using PWA (installed app):');
  console.log('   Android Settings > Apps > [Your App Name] > Notifications > Allow');
  console.log('');
  console.log('5. Check Do Not Disturb mode is OFF');
  console.log('');
  console.log('6. Try Chrome Canary or Dev version if stable version fails');

  return results;
}

// Run the fix
console.log('Starting Android Notification Fix...\n');
fixAndroidNotifications()
  .then(results => {
    console.log('\n✅ Fix script completed');
    
    // Store results globally for inspection
    window.androidNotificationResults = results;
    console.log('\nResults saved to: window.androidNotificationResults');
  })
  .catch(error => {
    console.error('\n❌ Fix script failed:', error);
  });
