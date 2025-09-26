import payload from 'payload';

async function checkUserRoles() {
  try {
    // Initialize Payload
    await payload.init({
      secret: process.env.PAYLOAD_SECRET || 'your-secret-here',
      local: true,
    });

    console.log('🔍 Checking user roles in database...\n');

    // Get all users
    const users = await payload.find({
      collection: 'users',
      limit: 1000,
      depth: 0,
    });

    console.log(`Found ${users.docs.length} users:\n`);

    let issuesFound = 0;

    users.docs.forEach((user, index) => {
      const roles = user.roles || [];
      const roleCount = roles.length;
      
      console.log(`${index + 1}. User: ${user.email}`);
      console.log(`   ID: ${user.id}`);
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
    console.log(`Total users: ${users.docs.length}`);
    console.log(`Issues found: ${issuesFound}`);
    
    if (issuesFound === 0) {
      console.log('✅ All users have exactly one valid role!');
    } else {
      console.log('❌ Some users have role issues that need to be fixed.');
    }

    // Also check role distribution
    const roleStats = {};
    users.docs.forEach(user => {
      const roles = user.roles || [];
      roles.forEach(role => {
        roleStats[role] = (roleStats[role] || 0) + 1;
      });
    });

    console.log('\n📈 ROLE DISTRIBUTION:');
    Object.entries(roleStats).forEach(([role, count]) => {
      console.log(`${role}: ${count} user${count !== 1 ? 's' : ''}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking user roles:', error);
    process.exit(1);
  }
}

checkUserRoles();
