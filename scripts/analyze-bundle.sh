#!/bin/bash

# Bundle analysis script
# This will help identify large dependencies causing slow initial loads

echo "🔍 Analyzing bundle size..."
echo ""

# Install bundle analyzer if not present
if ! grep -q "@next/bundle-analyzer" package.json; then
  echo "Installing @next/bundle-analyzer..."
  npm install --save-dev @next/bundle-analyzer
fi

# Run build with analyzer
ANALYZE=true npm run build

echo ""
echo "✅ Bundle analysis complete!"
echo "Check the generated reports in .next/analyze/"
