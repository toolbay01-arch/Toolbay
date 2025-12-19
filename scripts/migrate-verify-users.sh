#!/bin/bash

# Migration Script: Auto-verify existing users
# This script runs the Node.js migration to set emailVerified=true for all existing users

echo "🚀 Starting Email Verification Migration..."
echo ""
echo "This will set emailVerified=true for all existing users."
echo "New users will still need to verify their email."
echo ""

read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Migration cancelled."
    exit 1
fi

echo ""
echo "Running migration..."
bun run scripts/auto-verify-existing-users.mjs

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Test login with an existing user account"
    echo "2. Test sign up with a new email to verify the email verification flow"
    echo ""
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi
