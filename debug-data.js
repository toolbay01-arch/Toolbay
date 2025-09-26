const { getPayload } = require('payload');
const config = require('./dist/payload.config.js').default;

async function checkData() {
  try {
    const payload = await getPayload({ config });
    
    // Check tenants
    const tenants = await payload.find({
      collection: 'tenants',
      limit: 10
    });
    
    console.log('=== TENANTS DATA ===');
    console.log('Total tenants:', tenants.totalDocs);
    tenants.docs.forEach(tenant => {
      console.log(`- ID: ${tenant.id}, Name: ${tenant.name}, TIN: ${tenant.tinNumber}, Status: ${tenant.verificationStatus}`);
    });
    
    // Check users
    const users = await payload.find({
      collection: 'users',
      limit: 10
    });
    
    console.log('\n=== USERS DATA ===');
    console.log('Total users:', users.totalDocs);
    users.docs.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, Username: ${user.username}, Roles: ${user.roles}`);
      if (user.tenants) {
        console.log(`  Tenants: ${user.tenants.map(t => t.tenant).join(', ')}`);
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();
