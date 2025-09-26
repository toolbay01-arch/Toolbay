import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkUserRoles() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URI);
    
    console.log('✅ Connected! Checking user roles...\n');
    
    // Get all users from the users collection
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    
    console.log(`Found ${users.length} users:\n`);

    let issuesFound = 0;

    users.forEach((user, index) => {
      const roles = user.roles || [];
      const roleCount = roles.length;
      
      console.log(`${index + 1}. User: ${user.email}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Roles: [${roles.join(', ')}] (${roleCount} role${roleCount !== 1 ? 's' : ''})`);
      
      if (roleCount === 0) {
        console.log(`   ⚠️  WARNING: User has NO roles assigned!`);
        issuesFound++;
      } else if (roleCount > 1) {
        console.log(`   ❌ ERROR: User has MULTIPLE roles! Should have only one.`);
        issuesFound++;
      } else {
        const role = roles[0];
        if (['tenant', 'super-admin', 'client'].includes(role)) {
          console.log(`   ✅ OK: Single valid role`);
        } else {
          console.log(`   ⚠️  WARNING: Unknown role "${role}"`);
          issuesFound++;
        }
      }
      
      console.log('');
    });

    console.log('\n📊 SUMMARY:');
    console.log(`Total users: ${users.length}`);
    console.log(`Issues found: ${issuesFound}`);
    
    if (issuesFound === 0) {
      console.log('✅ All users have exactly one valid role!');
    } else {
      console.log('❌ Some users have role issues that need to be fixed.');
    }

    // Also check role distribution
    const roleStats = {};
    users.forEach(user => {
      const roles = user.roles || [];
      if (roles.length === 0) {
        roleStats['NO_ROLE'] = (roleStats['NO_ROLE'] || 0) + 1;
      } else {
        roles.forEach(role => {
          roleStats[role] = (roleStats[role] || 0) + 1;
        });
      }
    });

    console.log('\n📈 ROLE DISTRIBUTION:');
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`${role}: ${count} user${count !== 1 ? 's' : ''}`);
    });

    // Also check tenants collection
    const tenants = await mongoose.connection.db.collection('tenants').find({}).toArray();
    console.log(`\n🏢 TENANTS: Found ${tenants.length} tenants`);
    
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. Store: ${tenant.storeName}`);
      console.log(`   TIN: ${tenant.tinNumber}`);
      console.log(`   Verification Status: ${tenant.verificationStatus || 'pending'}`);
      console.log(`   Verified: ${tenant.isVerified ? 'Yes' : 'No'}`);
      console.log('');
    });

    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error checking user roles:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkUserRoles();
