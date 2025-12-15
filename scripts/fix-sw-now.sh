#!/bin/bash

echo "🚀 Service Worker Fix - Quick Action Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}This script will:${NC}"
echo "1. Show you the console script to fix production"
echo "2. Help you commit and deploy the fixes"
echo ""

read -p "Press Enter to continue..."

# Show console cleanup script
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  STEP 1: Fix Production Site RIGHT NOW${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "1. Open https://toolboxx-production.up.railway.app/ in browser"
echo "2. Press F12 to open DevTools"
echo "3. Go to Console tab"
echo "4. Copy and paste this script:"
echo ""
echo -e "${YELLOW}┌─────────────────────────────────────────────┐${NC}"
cat << 'EOF'
(async function resetServiceWorker() {
  console.log('🧹 Starting Service Worker cleanup...');
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map(r => r.unregister()));
  console.log('✅ Unregistered', regs.length, 'service worker(s)');
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
  console.log('✅ Cleared', cacheNames.length, 'cache(s)');
  console.log('🔄 Reloading in 1 second...');
  setTimeout(() => location.reload(), 1000);
})();
EOF
echo -e "${YELLOW}└─────────────────────────────────────────────┘${NC}"
echo ""
echo "5. Press Enter in console"
echo "6. Wait for page to reload"
echo "7. Check console should show: [WebPush] Service Worker ready and active"
echo ""

read -p "Have you run the script in production? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Please run the script in production first, then re-run this script.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Great! Production is now fixed temporarily.${NC}"
echo ""

# Commit changes
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  STEP 2: Deploy Permanent Fixes${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""

echo "Files modified:"
echo "  ✓ src/lib/notifications/web-push.ts (auto-recovery logic)"
echo "  ✓ package.json (better build scripts)"
echo "  ✓ scripts/reset-sw-cache.sh (helper script)"
echo "  ✓ SERVICE_WORKER_FIX_GUIDE.md (documentation)"
echo ""

read -p "Commit and push these changes? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Committing changes..."
    
    git add src/lib/notifications/web-push.ts
    git add package.json
    git add scripts/reset-sw-cache.sh
    git add SERVICE_WORKER_FIX_GUIDE.md
    git add NOTIFICATION_SYSTEM_ANALYSIS.md
    git add SERVICE_WORKER_FLOW_DIAGRAM.md
    git add DEBUGGING_NOTIFICATIONS.md
    
    git commit -m "fix: improve service worker error handling and auto-recovery

- Add auto-detection and cleanup of redundant service workers
- Add timeout protection for SW registration
- Improve error logging and recovery
- Add cache cleanup on invalid state
- Update build scripts for cleaner deployments
- Add comprehensive documentation and debugging guides"
    
    echo ""
    echo -e "${GREEN}✅ Changes committed!${NC}"
    echo ""
    
    read -p "Push to origin/main to trigger Railway deployment? (y/N) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Pushing to origin/main..."
        git push origin main
        
        echo ""
        echo -e "${GREEN}✅ Pushed to GitHub!${NC}"
        echo ""
        echo -e "${YELLOW}Railway will now deploy automatically (~2-3 minutes)${NC}"
        echo ""
    else
        echo ""
        echo -e "${YELLOW}Skipping push. Run 'git push origin main' when ready.${NC}"
    fi
else
    echo ""
    echo -e "${YELLOW}Skipping commit. You can commit manually later.${NC}"
fi

# Show verification steps
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  STEP 3: Verify After Deployment${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "After Railway deployment completes:"
echo ""
echo "1. Open https://toolboxx-production.up.railway.app/"
echo "2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)"
echo "3. Check console for:"
echo "   ✓ [WebPush] Service Worker ready and active"
echo "   ✓ No errors"
echo ""
echo "4. Check DevTools > Application > Service Workers:"
echo "   ✓ Status: 'activated and is running'"
echo "   ✓ No 'redundant' or 'error' states"
echo ""
echo "5. Test push notifications:"
echo "   ✓ Subscribe to notifications"
echo "   ✓ Send test notification"
echo "   ✓ Verify it appears"
echo ""

# Show monitoring script
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Quick Verification Script${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "Run this in production console to verify everything:"
echo ""
echo -e "${YELLOW}┌─────────────────────────────────────────────┐${NC}"
cat << 'EOF'
Promise.all([
  navigator.serviceWorker.getRegistrations(),
  navigator.serviceWorker.ready,
  caches.keys()
]).then(([regs, ready, caches]) => {
  console.log('╔══════════════════════════════════╗');
  console.log('║  Service Worker Health Check    ║');
  console.log('╚══════════════════════════════════╝');
  console.log('Registrations:', regs.length);
  console.log('Active State:', ready.active?.state);
  console.log('Scope:', ready.scope);
  console.log('Caches:', caches.length);
  console.log('Status:', ready.active?.state === 'activated' ? '✅ HEALTHY' : '❌ UNHEALTHY');
});
EOF
echo -e "${YELLOW}└─────────────────────────────────────────────┘${NC}"
echo ""

echo -e "${GREEN}✨ All done! Service worker should now work properly.${NC}"
echo ""
echo "📚 For more details, see:"
echo "   - SERVICE_WORKER_FIX_GUIDE.md"
echo "   - NOTIFICATION_SYSTEM_ANALYSIS.md"
echo "   - DEBUGGING_NOTIFICATIONS.md"
echo ""
