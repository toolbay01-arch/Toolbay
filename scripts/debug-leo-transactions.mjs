import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const payload = await getPayload({ config })

console.log('\n🔍 Debugging Leo Transactions Visibility...\n')

// 1. Find all tenants and their users
const allTenants = await payload.find({
  collection: 'tenants',
  limit: 100
})

console.log('🏢 All Tenants:')
for (const tenant of allTenants.docs) {
  console.log(`\nTenant: ${tenant.name}`)
  console.log(`  ID: ${tenant.id}`)
  console.log(`  Slug: ${tenant.slug}`)
  console.log(`  isVerified: ${tenant.isVerified}`)
  console.log(`  verificationStatus: ${tenant.verificationStatus}`)
  
  // Find users for this tenant
  const users = await payload.find({
    collection: 'users',
    limit: 100,
    depth: 1
  })
  
  const tenantUsers = users.docs.filter(user => {
    return user.tenants?.some(t => {
      const tId = typeof t.tenant === 'string' ? t.tenant : t.tenant?.id
      return tId === tenant.id
    })
  })
  
  console.log(`  Users: ${tenantUsers.length}`)
  tenantUsers.forEach(user => {
    console.log(`    - ${user.email} (roles: ${user.roles?.join(', ')})`)
  })
  
  // Check transactions for this tenant
  const transactions = await payload.find({
    collection: 'transactions',
    where: {
      tenant: { equals: tenant.id }
    },
    limit: 100
  })
  
  console.log(`  Transactions: ${transactions.totalDocs}`)
  
  const awaitingVerification = transactions.docs.filter(tx => tx.status === 'awaiting_verification').length
  if (awaitingVerification > 0) {
    console.log(`    ⏳ Awaiting Verification: ${awaitingVerification}`)
  }
}

// 2. Check Transactions collection access control
console.log('\n\n🔐 Checking Transactions Collection Access Control...\n')

const transactionsConfig = await import('../src/collections/Transactions.ts')
console.log('Transactions collection exists:', !!transactionsConfig.Transactions)
console.log('Has admin.hidden property:', !!transactionsConfig.Transactions.admin?.hidden)

if (transactionsConfig.Transactions.admin?.hidden) {
  console.log('⚠️  ISSUE: Transactions collection is hidden from non-super-admins!')
  console.log('    This prevents tenants from seeing transactions in Payload CMS UI')
}

// 3. Test specific access for Leo tenant
console.log('\n\n🧪 Testing Access for Leo Tenant...\n')

const leoTenant = allTenants.docs.find(t => t.slug === 'leo')
if (leoTenant) {
  console.log(`Leo Tenant Found: ${leoTenant.name}`)
  console.log(`  ID: ${leoTenant.id}`)
  console.log(`  isVerified: ${leoTenant.isVerified}`)
  console.log(`  verificationStatus: ${leoTenant.verificationStatus}`)
  
  const canAccess = leoTenant.isVerified && 
    (leoTenant.verificationStatus === 'document_verified' || 
     leoTenant.verificationStatus === 'physically_verified')
  
  console.log(`  Should Access Transactions: ${canAccess ? '✅ YES' : '❌ NO'}`)
  
  // Get Leo's transactions
  const leoTransactions = await payload.find({
    collection: 'transactions',
    where: {
      tenant: { equals: leoTenant.id }
    },
    limit: 100
  })
  
  console.log(`  Leo's Transactions in DB: ${leoTransactions.totalDocs}`)
  leoTransactions.docs.forEach(tx => {
    console.log(`    - ${tx.paymentReference} (${tx.status})`)
  })
} else {
  console.log('❌ Leo tenant not found!')
}

console.log('\n\n💡 SOLUTION:')
console.log('If Leo cannot see transactions in Payload CMS UI:')
console.log('1. Check that Transactions collection admin.hidden is removed or allows verified tenants')
console.log('2. Transactions collection should be visible in sidebar for verified tenants')
console.log('3. Access via: http://localhost:3000/admin/collections/transactions')
console.log('4. Or custom dashboard: http://localhost:3000/admin/verify-payments')

process.exit(0)
