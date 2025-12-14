# Quick Start: Testing Notifications & PWA

## 🚀 Start the App

```bash
cd /home/leo/HomeLTD/toolboxx
bun run dev
```

Open: http://localhost:3000

---

## 👀 See the Onboarding Components

### 1. Test Notification Banner

1. Clear browser data: `Ctrl+Shift+Delete` → Clear localStorage
2. Log in to your account
3. **Wait 3 seconds** → Blue banner appears at top
4. Click "Enable Notifications"
5. Allow permission in browser dialog
6. ✓ Banner disappears, bell icon shows green dot

### 2. Test PWA Install Prompt

1. **Wait 3 seconds** after page load
2. Bottom-right corner → Card appears
3. Click "Install App" (Chrome/Edge) or follow iOS instructions
4. ✓ App installs to home screen/apps

### 3. Test Notification Indicator

1. Look at navbar (top right)
2. Click bell icon 🔔 or 🔕
3. See dropdown with status
4. Click "Enable" or "Disable"
5. ✓ Status updates immediately

---

## 🧪 Quick Test Commands

### Send Test Notification (Terminal)

```bash
# Replace YOUR_USER_ID with actual user ID from database
curl -X POST http://localhost:3000/api/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "notification": {
      "title": "💰 Test Payment!",
      "body": "You received 50,000 RWF",
      "data": {
        "url": "/verify-payments",
        "type": "payment"
      }
    }
  }'
```

### Check Service Worker

```bash
# In browser console:
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs);
});
```

### Check Push Subscription

```bash
# In browser console:
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub ? 'Active' : 'None');
  });
});
```

---

## 📱 Mobile Testing

### Android (Chrome)

1. Deploy to production or use ngrok for HTTPS
2. Open on mobile browser
3. See install prompt → Install
4. Enable notifications
5. Send test notification
6. Close browser completely
7. ✓ Notification appears in notification tray!

### iOS (Safari)

1. Deploy to production (HTTPS required)
2. Open in Safari
3. Tap Share → Add to Home Screen
4. Open from home screen (important!)
5. Enable notifications
6. Send test notification
7. Close app completely
8. ✓ Notification appears!

---

## 🎯 What You Should See

### On Login:
```
═══════════════════════════════════════════════════════════════
  🔔  Stay updated with instant notifications!
      Get notified about payments, orders, and messages 
      even when the browser is closed

      [Enable Notifications]  [✕]
═══════════════════════════════════════════════════════════════

[Your page content]

                           ┌──────────────────────────┐
                           │ 📥 Install ToolBoxx App │
                           │                          │
                           │ Get faster access...     │
                           │                          │
                           │ [Install] [Not Now]      │
                           └──────────────────────────┘
```

### In Navbar (After Enabling):
```
[Logo] ... [🔔●] [💬] [Dashboard] [Logout]
            ↑
       Green dot
```

---

## ✅ Success Checklist

- [ ] Banner appears 3 seconds after login
- [ ] PWA prompt appears in bottom-right
- [ ] Bell icon visible in navbar
- [ ] Clicking bell opens dropdown
- [ ] Clicking "Enable" asks for permission
- [ ] After allowing, green dot appears on bell
- [ ] Test notification works (via curl)
- [ ] Notification appears even when browser minimized
- [ ] Clicking notification opens correct page

---

## 🐛 Troubleshooting

### Banner doesn't appear?
```bash
# Clear localStorage
localStorage.clear()
# Refresh page
location.reload()
```

### PWA prompt doesn't show?
- Check if already installed
- Ensure HTTPS (production) or localhost
- Clear browser cache

### Notifications don't work?
```bash
# Check permission
console.log(Notification.permission)

# Should be "granted"
# If "denied", reset in browser settings:
# Lock icon → Site settings → Notifications → Allow
```

### Service worker not registered?
```bash
# Check in DevTools
# Application → Service Workers
# Should show: sw.js - activated and running

# If not, check console for errors
```

---

## 🎉 You're All Set!

Your notification system is fully functional with:
✅ Eye-catching banner to promote notifications  
✅ PWA install prompt for mobile users  
✅ Always-visible navbar indicator  
✅ Push notifications working even when browser closed  

**Next:** Integrate with your payment/order/message events to send automatic notifications!

See `WEB_PUSH_INTEGRATION.md` for integration examples.
