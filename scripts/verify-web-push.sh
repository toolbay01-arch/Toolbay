#!/bin/bash

# Web Push Setup Verification Script
# Run this to verify your web push implementation is ready

echo "🔍 Web Push Setup Verification"
echo "================================"
echo ""

# Load environment variables if .env exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo "📁 Loaded .env file"
  echo ""
fi

# Check environment variables
echo "1️⃣ Checking environment variables..."
if [ -z "$NEXT_PUBLIC_VAPID_PUBLIC_KEY" ]; then
  echo "❌ NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set"
  exit 1
else
  echo "✅ NEXT_PUBLIC_VAPID_PUBLIC_KEY is set"
fi

if [ -z "$VAPID_PRIVATE_KEY" ]; then
  echo "❌ VAPID_PRIVATE_KEY is not set"
  exit 1
else
  echo "✅ VAPID_PRIVATE_KEY is set"
fi

if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
  echo "⚠️  NEXT_PUBLIC_APP_URL is not set (will default to localhost)"
else
  echo "✅ NEXT_PUBLIC_APP_URL is set to $NEXT_PUBLIC_APP_URL"
fi

echo ""

# Check required files
echo "2️⃣ Checking required files..."
required_files=(
  "public/sw.js"
  "public/manifest.json"
  "src/collections/PushSubscriptions.ts"
  "src/app/api/push/subscribe/route.ts"
  "src/app/api/push/send/route.ts"
  "src/lib/notifications/web-push.ts"
  "src/lib/notifications/send-push.ts"
  "src/hooks/use-web-push.ts"
  "src/components/web-push-subscription.tsx"
  "src/components/auto-push-subscriber.tsx"
)

all_files_exist=true
for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file NOT FOUND"
    all_files_exist=false
  fi
done

if [ "$all_files_exist" = false ]; then
  echo ""
  echo "❌ Some required files are missing. Please check the implementation."
  exit 1
fi

echo ""

# Check package dependencies
echo "3️⃣ Checking package dependencies..."
if grep -q '"web-push"' package.json; then
  echo "✅ web-push package installed"
else
  echo "❌ web-push package not found. Run: bun add web-push"
  exit 1
fi

if grep -q '"next-pwa"' package.json; then
  echo "✅ next-pwa package installed"
else
  echo "❌ next-pwa package not found. Run: bun add next-pwa"
  exit 1
fi

if grep -q '"@types/web-push"' package.json; then
  echo "✅ @types/web-push package installed"
else
  echo "❌ @types/web-push package not found. Run: bun add -D @types/web-push"
  exit 1
fi

echo ""

# Check payload config
echo "4️⃣ Checking Payload configuration..."
if grep -q "PushSubscriptions" src/payload.config.ts; then
  echo "✅ PushSubscriptions collection registered in payload.config.ts"
else
  echo "❌ PushSubscriptions collection not registered in payload.config.ts"
  exit 1
fi

echo ""

# Check next config
echo "5️⃣ Checking Next.js configuration..."
if grep -q "withPWA" next.config.mjs; then
  echo "✅ PWA configured in next.config.mjs"
else
  echo "⚠️  PWA not configured in next.config.mjs (may be optional)"
fi

echo ""

# Generate Payload types
echo "6️⃣ Generating Payload types..."
bun run generate:types
if [ $? -eq 0 ]; then
  echo "✅ Payload types generated successfully"
else
  echo "❌ Failed to generate Payload types"
  exit 1
fi

echo ""
echo "================================"
echo "✅ All checks passed!"
echo ""
echo "🚀 Next Steps:"
echo "1. Start your dev server: bun run dev"
echo "2. Navigate to a page with WebPushSubscription component"
echo "3. Click 'Enable Push Notifications'"
echo "4. Test sending a notification:"
echo ""
echo "   curl -X POST http://localhost:3000/api/push/send \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"userId\":\"YOUR_USER_ID\",\"notification\":{\"title\":\"Test\",\"body\":\"Hello!\",\"data\":{\"url\":\"/\",\"type\":\"general\"}}}'"
echo ""
echo "5. Close browser and test background notifications!"
echo ""
