#!/usr/bin/env node

/**
 * Populate category and location fields for existing tenants
 * These fields were added later and need default values
 */

import { getPayload } from 'payload';
import config from '../src/payload.config.ts';

async function populateTenantFields() {
  console.log('🔄 Starting tenant fields population...\n');

  const payload = await getPayload({ config });

  try {
    // Get all tenants
    const { docs: tenants } = await payload.find({
      collection: 'tenants',
      limit: 1000,
      depth: 0,
    });

    console.log(`📊 Found ${tenants.length} tenant(s) to process\n`);

    let updated = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      const needsUpdate = !tenant.category || !tenant.location;
      
      if (needsUpdate) {
        console.log(`📝 Updating tenant: ${tenant.businessName || tenant.id}`);
        
        // Prepare update data
        const updateData = {};
        
        // Set default category if missing
        if (!tenant.category) {
          updateData.category = 'retailer'; // Default to retailer
          console.log(`  ✓ Setting category: retailer`);
        }
        
        // Set default location if missing
        if (!tenant.location) {
          updateData.location = tenant.businessAddress || 'Rwanda'; // Use businessAddress if available, otherwise default
          console.log(`  ✓ Setting location: ${updateData.location}`);
        }

        // Update the tenant
        await payload.update({
          collection: 'tenants',
          id: tenant.id,
          data: updateData,
        });

        updated++;
        console.log(`  ✅ Updated successfully\n`);
      } else {
        console.log(`⏭️  Skipping tenant ${tenant.businessName || tenant.id} - already has category and location\n`);
        skipped++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Migration complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total:   ${tenants.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error populating tenant fields:', error);
    process.exit(1);
  }

  process.exit(0);
}

populateTenantFields();
