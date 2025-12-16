# Offline Notification Testing Guide

## 🎯 Goal
Test that push notifications work even when the user's device is **completely offline**.

## ✅ Prerequisites

1. **User must be subscribed to notifications FIRST** (while online)
   - Visit your app in production
   - Click "Enable Notifications" 
   - Grant permission when prompted
   - Verify you see "Notifications enabled" message

2. **Service Worker must be registered** (check browser console):
   ```
   [SW 1.0.0] Activated and claimed all clients
   [WebPush] Service Worker ready and active
   ```

## 🧪 Test Scenarios

### Scenario 1: Immediate Notification (Device Online)

Test that notifications work normally first:

```bash
# Send to all users immediately
bun run scripts/test-offline-notifications.mjs

# Send to specific user
bun run scripts/test-offline-notifications.mjs <userId>
```

**Expected Result:**
- ✅ Notification appears immediately
- ✅ Console shows "✅ Sent successfully"
- ✅ Clicking notification opens the app

---

### Scenario 2: Delayed Notification (Go Offline Before It Sends)

This is the **main offline test**:

```bash
# 10 second delay - gives you time to go offline
bun run scripts/test-offline-notifications.mjs all 10000

# 30 second delay - more time to test
bun run scripts/test-offline-notifications.mjs all 30000
```

**Steps:**
1. Run the command
2. **IMMEDIATELY**: 
   - Turn on airplane mode, OR
   - Disable WiFi, OR
   - Unplug ethernet cable
3. Wait for the delay to expire
4. **Notification should still appear even though you're offline!**

**Expected Result:**
- ✅ Notification appears even when offline
- ✅ Console shows "📤 Sending notifications..." (server is online, sending)
- ✅ Your device receives it (browser push service delivers it)
- ⚠️ Clicking may fail to open app (no internet)
- ✅ Go back online, click again → app opens

---

### Scenario 3: Device Offline for Extended Period

Test notification delivery after being offline for hours:

```bash
# Send notification with 24-hour TTL (Time To Live)
bun run scripts/test-offline-notifications.mjs all 5000
```

**Steps:**
1. Run the command
2. Go offline within 5 seconds
3. **Stay offline for 1-24 hours**
4. Go back online
5. Notification should appear when you reconnect

**Expected Result:**
- ✅ Notification delivered when device comes back online
- ✅ Notification appears even hours after being sent
- ✅ TTL ensures notification isn't lost

---

### Scenario 4: Browser Closed, Device Offline

Ultimate offline test:

```bash
# Send with delay
bun run scripts/test-offline-notifications.mjs all 10000
```

**Steps:**
1. Run the command
2. **Close the browser completely**
3. Go offline (airplane mode)
4. Wait for notification

**Expected Result:**
- ✅ Notification appears even with browser closed
- ✅ Service Worker persists and receives push
- ✅ Clicking opens the browser and your app

---

## 📊 Understanding the Results

### Success Indicators:
```
✅ Sent successfully - User: 12345
✅ Sent successfully - User: 67890

📊 TEST SUMMARY
Total subscriptions: 2
✅ Successful: 2
❌ Failed: 0
```

### Common Failures:

**410 Gone / 404 Not Found:**
```
❌ Failed - User: 12345
   Error: 410 Gone
   🗑️  Deleting invalid subscription...
```
- **Meaning:** User unsubscribed or cleared browser data
- **Action:** Script auto-deletes the invalid subscription

**Network Errors:**
```
❌ Failed - User: 12345
   Error: ETIMEDOUT
```
- **Meaning:** Push service couldn't be reached
- **Action:** Check your internet connection, try again

---

## 🔍 How to Verify It's Working Offline

### Browser DevTools Test:

1. **Open DevTools** (F12)
2. Go to **Application** tab → **Service Workers**
3. Verify: `Status: activated and is running`
4. Go to **Network** tab
5. Check **"Offline"** checkbox at top
6. Run: `bun run scripts/test-offline-notifications.mjs all 5000`
7. Go offline before delay expires
8. **Notification should still appear!**

### Console Logs to Watch:

**On Server (when sending):**
```
📤 Sending notifications...
✅ Sent successfully - User: xxx
```

**In Browser (when receiving - works offline):**
```
[SW] Push event received: PushEvent {...}
[SW] Push payload: {title: "📴 Offline Test", ...}
```

---

## 🎯 Real-World Use Cases

### 1. Mobile User on Subway
- User opens app → subscribes → closes app
- User enters subway (no signal)
- Server sends notification
- User's phone receives when signal returns
- **Result: ✅ Notification appears**

### 2. Laptop User Traveling
- User subscribes at home
- User closes laptop, travels on plane (offline)
- Server sends notification during flight
- User opens laptop at destination (back online)
- **Result: ✅ Notification waiting for them**

### 3. Power Saving Mode
- User subscribes, enables battery saver
- Network restricted to save battery
- Server sends critical notification
- Browser receives via optimized push channel
- **Result: ✅ Notification appears despite restrictions**

---

## 🐛 Troubleshooting

### No notification appears offline:

1. **Check subscription exists:**
   ```bash
   bun run scripts/test-offline-notifications.mjs
   ```
   Should show: `Found X subscription(s)`

2. **Check Service Worker active:**
   - DevTools → Application → Service Workers
   - Should show: `Status: activated`

3. **Check notification permission:**
   - Browser settings → Notifications
   - Your site should be "Allowed"

4. **Check VAPID keys match:**
   - Server VAPID keys = Browser subscription keys
   - Mismatch = notifications fail

### Notification appears but won't open app offline:

**This is EXPECTED behavior:**
- Notification works offline ✅
- Opening URL requires internet ❌
- **Solution:** Notification will open app when back online

---

## 📱 Testing on Different Devices

### Desktop (Chrome/Edge):
```bash
bun run scripts/test-offline-notifications.mjs all 10000
# Turn off WiFi, wait for notification
```

### Mobile (Android Chrome):
```bash
bun run scripts/test-offline-notifications.mjs all 30000
# Enable airplane mode, wait for notification
```

### iOS (Safari - Limited Support):
- iOS 16.4+ only
- Requires app be added to Home Screen
- Push notifications require Apple Push Notification service
- **May not work offline as expected**

---

## 💡 Key Takeaways

1. **Service Worker = Offline Capability**
   - SW persists even when browser closed
   - SW receives push events independently
   - SW can show notifications without network

2. **TTL (Time To Live) Matters**
   - Default: 24 hours (86400 seconds)
   - Push service holds notification until delivery
   - Expired notifications are dropped

3. **Browser Must Be "Running"**
   - Background process, not UI
   - Notifications wake up the browser
   - Works even with all tabs closed

4. **Push ≠ Internet Required**
   - Push delivered via browser's push service
   - Browser push service is separate from your app
   - Can receive push while offline from your app

---

## 🚀 Next Steps

After testing offline notifications:

1. **Test different notification types:**
   - Order confirmations
   - Payment updates  
   - Chat messages
   - System alerts

2. **Test edge cases:**
   - Multiple devices offline
   - Notification queue (many sent while offline)
   - Expired TTL handling

3. **Monitor in production:**
   - Track delivery rates
   - Monitor failed subscriptions
   - Clean up invalid subscriptions

---

## 📞 Support

If notifications aren't working offline:

1. Check service worker is active
2. Verify VAPID keys are correct
3. Confirm user has granted permission
4. Test with delay script to isolate issue
5. Check browser console for errors

**Common Issue:** "InvalidStateError" during SW transition
- **Solution:** Clear browser data, resubscribe
- **OR:** Wait for old SW to expire (happens automatically)
