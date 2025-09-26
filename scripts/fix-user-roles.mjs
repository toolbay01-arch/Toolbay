import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixUserRoles() {
  try {
    console.log('🔧 Connecting to database...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URI);
    
    console.log('✅ Connected! Fixing user roles...\n');
    
    // Find all users with "user" role
    const usersWithUserRole = await mongoose.connection.db.collection('users').find({
      roles: { $in: ['user'] }
    }).toArray();
    
    console.log(`Found ${usersWithUserRole.length} users with "user" role:\n`);
    
    for (const user of usersWithUserRole) {
      console.log(`Updating user: ${user.email}`);
      console.log(`  Current roles: [${user.roles.join(', ')}]`);
      
      // Update the role from "user" to "tenant"
      const newRoles = user.roles.map(role => role === 'user' ? 'tenant' : role);
      
      await mongoose.connection.db.collection('users').updateOne(
        { _id: user._id },
        { $set: { roles: newRoles } }
      );
      
      console.log(`  New roles: [${newRoles.join(', ')}]`);
      console.log('  ✅ Updated!\n');
    }
    
    // Verify the changes
    console.log('🔍 Verifying changes...\n');
    
    const allUsers = await mongoose.connection.db.collection('users').find({}).toArray();
    
    let issuesFound = 0;
    
    allUsers.forEach((user, index) => {
      const roles = user.roles || [];
      const roleCount = roles.length;
      
      console.log(`${index + 1}. User: ${user.email}`);
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
    
    console.log('📊 FINAL SUMMARY:');
    console.log(`Total users: ${allUsers.length}`);
    console.log(`Issues found: ${issuesFound}`);
    
    if (issuesFound === 0) {
      console.log('✅ All users now have exactly one valid role!');
    } else {
      console.log('❌ Some users still have role issues.');
    }

    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fixing user roles:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixUserRoles();
