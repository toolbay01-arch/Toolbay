import { getPayload } from 'payload';
import config from './src/payload.config.ts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function checkData() {
  try {
    const payload = await getPayload({ config });
    
    const tenants = await payload.find({ collection: 'tenants', limit: 10 });
    console.log('Existing tenants:', tenants.docs.length);
    tenants.docs.forEach(t => console.log('- Tenant:', t.slug, 'Verified:', t.isVerified));
    
    const users = await payload.find({ collection: 'users', limit: 10 });
    console.log('Existing users:', users.docs.length);
    users.docs.forEach(u => console.log('- User:', u.email, 'Roles:', u.roles));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();
