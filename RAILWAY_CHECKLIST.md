# Railway Deployment Checklist

## ✅ Pre-Deployment Checklist

Before deploying to Railway, ensure these items are configured:

### 1. Environment Variables in Railway Dashboard

Go to your Railway project → Variables and verify these are set:

- [ ] `DATABASE_URI` - MongoDB connection string
  - Should include `retryWrites=true&w=majority`
  - Ensure Railway IPs are whitelisted in MongoDB Atlas
  
- [ ] `PAYLOAD_SECRET` - Random secure string (min 32 chars)
  - Generate: `openssl rand -base64 32`
  
- [ ] `NEXT_PUBLIC_APP_URL` - Your Railway app URL
  - Format: `https://your-app.railway.app`
  - Get this from Railway after first deployment
  
- [ ] `RESEND_API_KEY` - Your Resend API key
  - Get from: https://resend.com/api-keys
  
- [ ] `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token
  - Get from: https://vercel.com/dashboard/stores
  
- [ ] `NODE_ENV` - Should be `production`

### 2. MongoDB Configuration

- [ ] MongoDB Atlas: Add Railway IPs to IP whitelist (or use 0.0.0.0/0 for all IPs)
- [ ] Test connection string locally: `mongosh "YOUR_CONNECTION_STRING"`
- [ ] Verify database user has read/write permissions

### 3. Code Changes (Already Done ✅)

- [x] Dockerfile uses dynamic PORT from Railway
- [x] Health check timeout increased to 300 seconds
- [x] Startup script validates environment variables
- [x] Changes committed and pushed to GitHub

### 4. Railway Project Settings

- [ ] Domain configured (if using custom domain)
- [ ] GitHub repository connected
- [ ] Auto-deploy enabled for main branch

## 🚀 Deployment

Once all checklist items are complete:

1. Go to Railway dashboard
2. Trigger a new deployment (or push to main branch)
3. Watch the build logs for any errors
4. Wait for health checks to pass (can take 2-3 minutes)
5. Visit your app URL to verify it's running

## 🔍 If Deployment Still Fails

Check the Railway logs for these specific errors:

### "DATABASE_URI is not set"
- Go to Railway Variables and add DATABASE_URI

### "PAYLOAD_SECRET is not set"
- Go to Railway Variables and add PAYLOAD_SECRET

### "MongoDB connection failed"
- Check MongoDB Atlas IP whitelist
- Verify connection string format
- Test connection string locally

### "Build failed"
- Ensure `bun.lock` is committed to repository
- Check for syntax errors in code
- Verify all dependencies are in package.json

### "Health check timeout"
- Check if MongoDB is accessible from Railway
- Look for startup errors in logs
- Verify NEXT_PUBLIC_APP_URL is correct

## 📊 Post-Deployment

After successful deployment:

- [ ] Test `/api/health` endpoint
- [ ] Test login to admin panel
- [ ] Verify database connections
- [ ] Test file uploads (Vercel Blob)
- [ ] Test email sending (Resend)
- [ ] Check application logs for warnings

## 🆘 Emergency Rollback

If the deployment is broken:

1. Go to Railway → Deployments
2. Find the last working deployment
3. Click "Redeploy"
4. Or: Roll back your git commits and push

## 📝 Notes

- Health checks may take 2-3 minutes to pass on first deployment
- Railway automatically restarts the app if it crashes
- Maximum 10 restart attempts before marking as failed
- Logs are available in Railway dashboard

---

Last updated: 2026-01-02
