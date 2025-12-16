#!/usr/bin/env node

/**
 * Migration Script: Add default contact phone to EXISTING tenants
 * 
 * This script adds the default contact phone number (+250788888888) to all
 * existing tenants in the database that don't have a contactPhone field.
 * This prevents database integrity errors after adding the required contactPhone field.
 * 
 * NEW tenants will be required to provide their actual contact phone during sign-up.
 * 
 * Usage: npx tsx scripts/add-default-contact-phone.mjs
 */

// Load environment variables FIRST before any imports
import dotenv from 'dotenv';
dotenv.config();

// Verify the secret is loaded
if (!process.env.PAYLOAD_SECRET) {
  console.error('❌ Error: PAYLOAD_SECRET is not set in environment variables');
  console.error('Please check your .env file');
  process.exit(1);
}

const DEFAULT_PHONE = '+250788888888';

async function addDefaultContactPhone() {
  console.log('🚀 Starting migration: Add default contact phone to tenants...\n');
  console.log('Environment check:');
  console.log('- PAYLOAD_SECRET:', process.env.PAYLOAD_SECRET ? '✅ Set' : '❌ Missing');
  console.log('- DATABASE_URI:', process.env.DATABASE_URI ? '✅ Set' : '❌ Missing');
  console.log('');

  try {
    // Dynamic import of getPayload and config AFTER env vars are loaded
    const { getPayload } = await import('payload');
    const configModule = await import('../src/payload.config.ts');
    const config = configModule.default;

    // Initialize Payload
    const payload = await getPayload({ config });

    // Find all tenants
    const { docs: tenants, totalDocs } = await payload.find({
      collection: 'tenants',
      limit: 1000, // Adjust if you have more than 1000 tenants
      depth: 0,
    });

    console.log(`📊 Found ${totalDocs} tenant(s) in database\n`);

    if (totalDocs === 0) {
      console.log('✅ No tenants found. Migration complete.\n');
      process.exit(0);
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process each tenant
    for (const tenant of tenants) {
      try {
        // Check if tenant already has a contactPhone
        if (tenant.contactPhone) {
          console.log(`⏭️  Tenant "${tenant.name}" (${tenant.slug}) already has contact phone: ${tenant.contactPhone}`);
          skipped++;
          continue;
        }

        // Prepare update data - include default values for missing required fields
        const updateData = {
          contactPhone: DEFAULT_PHONE,
        };

        // If category is missing, add default
        if (!tenant.category) {
          updateData.category = 'retailer';
          console.log(`   ℹ️  Adding default category 'retailer' to tenant "${tenant.name}"`);
        }

        // If location is missing, add default
        if (!tenant.location) {
          updateData.location = 'Kigali, Rwanda';
          console.log(`   ℹ️  Adding default location 'Kigali, Rwanda' to tenant "${tenant.name}"`);
        }

        // Update tenant with default phone (and other missing fields if needed)
        await payload.update({
          collection: 'tenants',
          id: tenant.id,
          data: updateData,
        });

        console.log(`✅ Updated tenant "${tenant.name}" (${tenant.slug}) with default phone: ${DEFAULT_PHONE}`);
        updated++;

      } catch (error) {
        console.error(`❌ Error updating tenant "${tenant.name}" (${tenant.slug}):`, error.message);
        errors++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total tenants: ${totalDocs}`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Skipped (already had phone): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60) + '\n');

    if (errors === 0) {
      console.log('🎉 Migration completed successfully!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Migration completed with some errors. Please review above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addDefaultContactPhone();
