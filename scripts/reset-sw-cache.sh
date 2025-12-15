#!/bin/bash

# Service Worker Cache Reset Script
# Use this to clear stale service worker caches in production

echo "🧹 Service Worker Cache Reset Utility"
echo "===================================="
echo ""
echo "This script helps diagnose and fix service worker cache issues."
echo ""

# Function to generate unregister script
generate_unregister_script() {
  cat > /tmp/sw-unregister.js << 'EOF'
// Run this in browser console to completely reset service worker

console.log('🧹 Starting Service Worker cleanup...');

// Step 1: Unregister all service workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log(`Found ${registrations.length} service worker(s)`);
  
  const unregisterPromises = registrations.map(reg => {
    console.log(`Unregistering: ${reg.scope}`);
    return reg.unregister();
  });
  
  return Promise.all(unregisterPromises);
}).then(() => {
  console.log('✅ All service workers unregistered');
  
  // Step 2: Clear all caches
  return caches.keys();
}).then(cacheNames => {
  console.log(`Found ${cacheNames.length} cache(s):`, cacheNames);
  
  const deletePromises = cacheNames.map(cacheName => {
    console.log(`Deleting cache: ${cacheName}`);
    return caches.delete(cacheName);
  });
  
  return Promise.all(deletePromises);
}).then(() => {
  console.log('✅ All caches cleared');
  console.log('🔄 Please refresh the page (hard reload: Ctrl+Shift+R)');
  console.log('✨ Service worker will re-register with fresh state');
}).catch(error => {
  console.error('❌ Error during cleanup:', error);
});
EOF

  echo "📝 Generated unregister script at /tmp/sw-unregister.js"
}

# Function to show manual steps
show_manual_steps() {
  echo ""
  echo "📋 Manual Cleanup Steps:"
  echo "========================"
  echo ""
  echo "1. Open your production site in browser"
  echo "   https://toolboxx-production.up.railway.app/"
  echo ""
  echo "2. Open DevTools (F12)"
  echo ""
  echo "3. Go to Application tab > Service Workers"
  echo ""
  echo "4. Click 'Unregister' for each service worker"
  echo ""
  echo "5. Go to Application tab > Cache Storage"
  echo ""
  echo "6. Right-click each cache and select 'Delete'"
  echo ""
  echo "7. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)"
  echo ""
  echo "8. Service worker will re-register with fresh manifest"
  echo ""
}

# Function to show console script
show_console_script() {
  echo ""
  echo "🖥️  Console Cleanup Script:"
  echo "==========================="
  echo ""
  echo "Copy and paste this into browser console:"
  echo ""
  cat << 'EOF'
// SERVICE WORKER COMPLETE RESET
(async function resetServiceWorker() {
  console.log('🧹 Resetting Service Worker...');
  
  // Unregister all SWs
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map(r => r.unregister()));
  console.log('✅ Unregistered', regs.length, 'service worker(s)');
  
  // Clear all caches
  const caches = await window.caches.keys();
  await Promise.all(caches.map(c => window.caches.delete(c)));
  console.log('✅ Cleared', caches.length, 'cache(s)');
  
  console.log('🔄 Reloading page...');
  setTimeout(() => location.reload(), 1000);
})();
EOF
  echo ""
}

# Function to update build scripts
suggest_build_improvements() {
  echo ""
  echo "🔧 Suggested package.json Script Improvements:"
  echo "=============================================="
  echo ""
  echo "Add these scripts to prevent future cache issues:"
  echo ""
  cat << 'EOF'
{
  "scripts": {
    "clean": "rm -rf .next public/sw.js public/workbox-*.js",
    "clean:sw": "rm -f public/sw.js public/workbox-*.js",
    "prebuild": "npm run clean:sw",
    "build": "next build",
    "postbuild": "echo 'Build ID:' && cat .next/BUILD_ID",
    "deploy:railway": "npm run clean && npm run build && npm run start"
  }
}
EOF
  echo ""
}

# Main execution
echo "Choose an option:"
echo "1) Show console cleanup script (Recommended)"
echo "2) Show manual cleanup steps"
echo "3) Show build script improvements"
echo "4) All of the above"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
  1)
    show_console_script
    ;;
  2)
    show_manual_steps
    ;;
  3)
    suggest_build_improvements
    ;;
  4)
    show_console_script
    show_manual_steps
    suggest_build_improvements
    ;;
  *)
    echo "Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "✅ Done! Follow the steps above to fix service worker issues."
echo ""
