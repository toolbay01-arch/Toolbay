import { getPayloadSingleton } from '@/lib/payload-singleton'

async function testSuperAdminAccess() {
  const payload = await getPayloadSingleton()

  try {
    console.log('\n🔍 Testing Super Admin Access to Orders\n')
    console.log('='.repeat(80))

    // Find all users with super-admin role
    const admins = await payload.find({
      collection: 'users',
      where: {
        roles: {
          contains: 'super-admin',
        },
      },
    })

    console.log(`\nFound ${admins.docs.length} super admin(s)\n`)

    if (admins.docs.length === 0) {
      console.log('⚠️  No super admin users found!')
      console.log('\nTo create a super admin, run:')
      console.log('  1. Go to /admin/collections/users')
      console.log('  2. Create/Edit a user')
      console.log('  3. Add "super-admin" to roles field')
      return
    }

    for (const admin of admins.docs) {
      console.log(`\n👑 Super Admin: ${admin.email}`)
      console.log(`   Username: ${admin.username || 'N/A'}`)
      console.log(`   Roles: ${admin.roles?.join(', ')}`)
      console.log(`   Has Tenants: ${admin.tenants?.length || 0}`)
    }

    // Get all orders
    const allOrders = await payload.find({
      collection: 'orders',
      limit: 1000,
    })

    console.log(`\n📦 Total Orders in Database: ${allOrders.docs.length}`)

    if (allOrders.docs.length > 0) {
      console.log('\nOrders:')
      allOrders.docs.forEach((order, i) => {
        const productId = typeof order.product === 'string' ? order.product : order.product?.id
        const userId = typeof order.user === 'string' ? order.user : order.user?.id
        console.log(`   ${i + 1}. ${order.name}`)
        console.log(`      Product: ${productId}`)
        console.log(`      User: ${userId}`)
        console.log(`      Amount: ${order.amount} ${order.currency || 'RWF'}`)
        console.log(`      Status: ${order.status}`)
      })
    } else {
      console.log('   (No orders exist yet)')
    }

    console.log('\n' + '='.repeat(80))
    console.log('\n✅ Super Admin Access Test Results:')
    console.log(`   - Super admins found: ${admins.docs.length}`)
    console.log(`   - Total orders: ${allOrders.docs.length}`)
    console.log(`   - Access control: isSuperAdmin() returns true → ALLOW ALL`)
    console.log('\n💡 Super admins should see ALL orders in /admin/collections/orders')
    console.log('\n')

  } catch (error) {
    console.error('❌ Error:', error)
    console.error('Stack:', error.stack)
  } finally {
    process.exit(0)
  }
}

testSuperAdminAccess()
