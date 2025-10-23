import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const payload = await getPayload({ config })

console.log('\n🔍 Testing Transaction Access for All Verified Tenants...\n')

// Get all tenants
const allTenants = await payload.find({
  collection: 'tenants',
  limit: 100
})

console.log(`🏢 Total tenants: ${allTenants.totalDocs}\n`)

for (const tenant of allTenants.docs) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Tenant: ${tenant.name}`)
  console.log(`  ID: ${tenant.id}`)
  console.log(`  Slug: ${tenant.slug}`)
  console.log(`  Verification Status: ${tenant.verificationStatus}`)
  console.log(`  Is Verified: ${tenant.isVerified}`)
  
  // Check if tenant can access transactions
  const canAccessTransactions = tenant.isVerified && 
    (tenant.verificationStatus === 'document_verified' || 
     tenant.verificationStatus === 'physically_verified')
  
  console.log(`  Can Access Transactions: ${canAccessTransactions ? '✅ YES' : '❌ NO'}`)
  
  // Get transactions for this tenant
  const transactions = await payload.find({
    collection: 'transactions',
    where: {
      tenant: { equals: tenant.id }
    },
    limit: 100
  })
  
  console.log(`  Total Transactions: ${transactions.totalDocs}`)
  
  if (transactions.totalDocs > 0) {
    const pending = transactions.docs.filter(tx => tx.status === 'pending').length
    const awaiting = transactions.docs.filter(tx => tx.status === 'awaiting_verification').length
    const verified = transactions.docs.filter(tx => tx.status === 'verified').length
    const rejected = transactions.docs.filter(tx => tx.status === 'rejected').length
    
    console.log(`    - Pending: ${pending}`)
    console.log(`    - Awaiting Verification: ${awaiting} ${awaiting > 0 ? '⏳' : ''}`)
    console.log(`    - Verified: ${verified}`)
    console.log(`    - Rejected: ${rejected}`)
    
    if (awaiting > 0 && canAccessTransactions) {
      console.log(`\n  📌 ACTION REQUIRED: ${tenant.name} can verify ${awaiting} transaction(s)`)
      console.log(`     URL: http://localhost:3000/admin/verify-payments`)
    }
  }
}

console.log(`\n${'='.repeat(60)}`)
console.log('📊 SUMMARY')
console.log('='.repeat(60))

const verifiedTenants = allTenants.docs.filter(t => 
  t.isVerified && 
  (t.verificationStatus === 'document_verified' || 
   t.verificationStatus === 'physically_verified')
)

console.log(`Verified Tenants (can access transactions): ${verifiedTenants.length}`)
verifiedTenants.forEach(t => {
  console.log(`  ✅ ${t.name} (${t.verificationStatus})`)
})

const unverifiedTenants = allTenants.docs.filter(t => 
  !t.isVerified || 
  (t.verificationStatus !== 'document_verified' && 
   t.verificationStatus !== 'physically_verified')
)

if (unverifiedTenants.length > 0) {
  console.log(`\nUnverified/Rejected Tenants (cannot access): ${unverifiedTenants.length}`)
  unverifiedTenants.forEach(t => {
    console.log(`  ❌ ${t.name} (${t.verificationStatus})`)
  })
}

process.exit(0)
