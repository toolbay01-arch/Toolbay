import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const payload = await getPayload({ config })

console.log('\n🔍 Checking Leo user access...\n')

// Find all users with tenant "leo"
const allUsers = await payload.find({
  collection: 'users',
  limit: 100,
  depth: 2
})

console.log(`📋 Total users: ${allUsers.totalDocs}\n`)

const leoTenantId = '68d85cd93ae4b743ffe7563b'

// Find users associated with leo tenant
const leoUsers = allUsers.docs.filter(user => {
  return user.tenants?.some(t => {
    const tenantId = typeof t.tenant === 'string' ? t.tenant : t.tenant?.id
    return tenantId === leoTenantId
  })
})

console.log(`✅ Users with leo tenant: ${leoUsers.length}\n`)

leoUsers.forEach(user => {
  console.log(`User: ${user.email}`)
  console.log(`  ID: ${user.id}`)
  console.log(`  Username: ${user.username || 'N/A'}`)
  console.log(`  Roles: ${user.roles?.join(', ') || 'None'}`)
  console.log(`  Tenants:`)
  user.tenants?.forEach(t => {
    const tenantName = typeof t.tenant === 'string' ? 'Unknown' : t.tenant?.name
    const tenantId = typeof t.tenant === 'string' ? t.tenant : t.tenant?.id
    const role = t.role
    console.log(`    - ${tenantName} (${tenantId}) - Role: ${role}`)
  })
  console.log('')
})

// Get pending transactions for leo
const pendingTx = await payload.find({
  collection: 'transactions',
  where: {
    and: [
      { tenant: { equals: leoTenantId } },
      { status: { equals: 'awaiting_verification' } }
    ]
  },
  depth: 2
})

console.log(`\n💳 Pending transactions awaiting Leo's verification: ${pendingTx.totalDocs}`)
pendingTx.docs.forEach(tx => {
  console.log(`  - ${tx.paymentReference}: ${tx.customerName} - ${tx.totalAmount} RWF`)
  console.log(`    MTN TX ID: ${tx.mtnTransactionId}`)
})

console.log('\n📝 INSTRUCTIONS:')
console.log('1. Leo user should log in at: http://localhost:3000/admin')
console.log('2. Navigate to: http://localhost:3000/admin/verify-payments')
console.log('3. Verify the 2 pending transactions')
console.log('4. Orders will be created automatically after verification')

process.exit(0)
