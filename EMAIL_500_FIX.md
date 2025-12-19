# 🔴 Email Sending 500 Error - Quick Fix

## Problem
- ✅ Email works on localhost
- ❌ Email fails with 500 error on production (Railway)
- Error: `POST /api/trpc/auth.forgotPassword 500 (Internal Server Error)`

---

## ⚡ Root Cause

**SMTP environment variables are NOT set in Railway**, even though you added them to `.env` file locally.

**Important:** Railway doesn't read your `.env` file automatically. You must add variables through Railway's dashboard.

---

## 🎯 FASTEST FIX (5 Minutes)

### Step 1: Get Gmail App Password

1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification** (required)
3. Go to: https://myaccount.google.com/apppasswords
4. Select **Mail** and **Other (Custom name)**
5. Name it "Toolboxx" and click **Generate**
6. Copy the 16-character password (looks like: `xxxx xxxx xxxx xxxx`)
7. **Remove the spaces**: `xxxxxxxxxxxxxxxx`

### Step 2: Add to Railway

1. Open your Railway project: https://railway.app
2. Go to your project → **Variables** tab
3. Click **+ New Variable** and add each one:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxxxxxxxxxxxxxx
SMTP_FROM_EMAIL=noreply@toolbay.store
```

**Important:** Use the 16-character app password WITHOUT spaces for `SMTP_PASS`

### Step 3: Redeploy

Railway auto-redeploys when you add variables, but to be sure:

```bash
git push
```

Or in Railway dashboard: **Deploy** → **Redeploy**

### Step 4: Test

Try the forgot password feature again. Should work now! ✅

---

## 🔍 Verify It's Working

### Check Railway Logs

```bash
railway logs --tail 50
```

Look for:
- ✅ No SMTP errors → Working!
- ❌ "Invalid login" → Wrong app password
- ❌ "Connection timeout" → Wrong SMTP_HOST or SMTP_PORT
- ❌ "Authentication failed" → Need app password (not regular password)

### Test in Production

1. Go to your production site
2. Click "Forgot Password"
3. Enter your email
4. Should see success message
5. Check your inbox for reset email

---

## 🐛 Common Issues

### Issue 1: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Cause:** Using regular Gmail password instead of app password

**Fix:**
1. Generate app password (see Step 1 above)
2. Use that in SMTP_PASS (not your regular password)

### Issue 2: "Connection timeout"

**Cause:** Wrong SMTP settings

**Fix:**
```bash
SMTP_HOST=smtp.gmail.com  # Not mail.google.com
SMTP_PORT=587              # Not 465
```

### Issue 3: Email still not working after adding variables

**Cause:** Railway didn't redeploy

**Fix:**
```bash
# Force redeploy
git commit --allow-empty -m "Force redeploy"
git push
```

Or in Railway: **Settings** → **Redeploy**

### Issue 4: "Please enable 2-Step Verification"

**Cause:** 2-Step Verification not enabled in Gmail

**Fix:**
1. Go to: https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Then create app password

---

## 🔐 Security Notes

### Why App Password?

Google blocks regular passwords for "less secure apps" for security reasons. App passwords are:
- ✅ Specific to one app
- ✅ Can be revoked without changing main password
- ✅ More secure than regular password

### Don't Commit SMTP Credentials

Your `.env` file should be in `.gitignore`:

```bash
# Check if .env is ignored
git check-ignore .env

# If not, add to .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
```

---

## 🎯 Alternative: Use SendGrid (Recommended for Production)

Gmail has sending limits (100 emails/day for free accounts). For production, use dedicated email service:

### Option 1: SendGrid (Free: 100 emails/day)

1. Sign up: https://sendgrid.com
2. Create API key
3. Add to Railway:

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@toolbay.store
```

### Option 2: Resend (Free: 100 emails/day)

1. Sign up: https://resend.com
2. More modern, better developer experience
3. Better email deliverability

---

## ✅ Checklist

After following this guide:

- [ ] Generated Gmail app password
- [ ] Added all 5 SMTP variables to Railway
- [ ] Redeployed Railway project
- [ ] Tested forgot password in production
- [ ] Received reset email successfully
- [ ] Confirmed .env not in git

---

## 🆘 Still Not Working?

### Check Railway Environment

Run in Railway shell:

```bash
railway run bash
# Then check:
echo $SMTP_USER
echo $SMTP_HOST
echo $SMTP_PORT
```

If these are empty → Variables not loaded

### Check Application Logs

```bash
railway logs | grep -i "smtp\|email\|mail"
```

Look for specific error messages

### Test SMTP Connection

Add this test endpoint temporarily:

```typescript
// In any API route for testing
testEmail: baseProcedure.mutation(async () => {
  console.log('SMTP Config:', {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? '***set***' : 'NOT SET'
  });
  
  // Try sending test email
  // ... rest of test code
});
```

---

## 📊 Summary

**The issue:** Railway doesn't automatically load your `.env` file.

**The fix:** Add SMTP variables directly in Railway dashboard.

**Most common mistake:** Using Gmail password instead of app password.

**Time to fix:** 5 minutes if you have app password ready.

🎉 **After fixing:** Both localhost AND production will work! ✅
