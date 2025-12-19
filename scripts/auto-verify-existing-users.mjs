#!/usr/bin/env node

/**
 * Migration Script: Auto-verify all existing users
 * 
 * This script sets emailVerified to true for all existing users who don't have
 * the emailVerified field set. This ensures backward compatibility - existing
 * users won't need to verify their email, only new signups will.
 * 
 * Run this once after deploying the email verification feature:
 * node scripts/auto-verify-existing-users.mjs
 */

import { getPayload } from 'payload';
import config from '../src/payload.config.ts';

async function autoVerifyExistingUsers() {
  console.log('🚀 Starting migration: Auto-verify existing users...\n');

  try {
    const payload = await getPayload({ config });
    
    console.log('📊 Fetching all users...');
    
    // Get all users
    const allUsers = await payload.find({
      collection: 'users',
      limit: 10000, // Adjust if you have more users
    });

    console.log(`✅ Found ${allUsers.totalDocs} users\n`);

    let verifiedCount = 0;
    let alreadyVerifiedCount = 0;
    let errorCount = 0;

    // Process each user
    for (const user of allUsers.docs) {
      try {
        // Check if emailVerified field exists and is already true
        if (user.emailVerified === true) {
          console.log(`⏭️  Skipping ${user.email} - already verified`);
          alreadyVerifiedCount++;
          continue;
        }

        // Update user to set emailVerified to true
        await payload.update({
          collection: 'users',
          id: user.id,
          data: {
            emailVerified: true,
            verificationToken: null,
            verificationExpires: null,
          },
        });

        console.log(`✅ Verified ${user.email}`);
        verifiedCount++;
      } catch (error) {
        console.error(`❌ Error verifying ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   Total Users: ${allUsers.totalDocs}`);
    console.log(`   ✅ Newly Verified: ${verifiedCount}`);
    console.log(`   ⏭️  Already Verified: ${alreadyVerifiedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('\n✨ Migration completed successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
autoVerifyExistingUsers();
