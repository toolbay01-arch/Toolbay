import { getPayloadSingleton } from '@/lib/payload-singleton'

async function diagnoseTransactions() {
  const payload = await getPayloadSingleton()

  try {
    console.log('\n🔍 Diagnosing Transaction Issues...\n')
    console.log('='.repeat(80))

    // Get all transactions with minimal depth to avoid circular refs
    const transactions = await payload.find({
      collection: 'transactions',
      limit: 1000,
      depth: 0, // No relationships
    })

    console.log(`Found ${transactions.totalDocs} transactions\n`)

    for (const transaction of transactions.docs) {
      console.log(`\n📝 Transaction: ${transaction.paymentReference || transaction.id}`)
      console.log(`   Status: ${transaction.status}`)
      console.log(`   Customer: ${typeof transaction.customer} - ${transaction.customer}`)
      console.log(`   Tenant: ${typeof transaction.tenant} - ${transaction.tenant}`)
      console.log(`   ExpiresAt: ${typeof transaction.expiresAt} - ${transaction.expiresAt}`)
      console.log(`   VerifiedAt: ${typeof transaction.verifiedAt} - ${transaction.verifiedAt}`)
      console.log(`   Order: ${typeof transaction.order} - ${transaction.order}`)
      console.log(`   VerifiedBy: ${typeof transaction.verifiedBy} - ${transaction.verifiedBy}`)
      
      // Check for problematic fields
      const issues = []
      
      if (transaction.customer && typeof transaction.customer !== 'string') {
        issues.push(`customer is ${typeof transaction.customer} instead of string`)
      }
      if (transaction.tenant && typeof transaction.tenant !== 'string') {
        issues.push(`tenant is ${typeof transaction.tenant} instead of string`)
      }
      if (transaction.order && typeof transaction.order !== 'string') {
        issues.push(`order is ${typeof transaction.order} instead of string`)
      }
      if (transaction.verifiedBy && typeof transaction.verifiedBy !== 'string') {
        issues.push(`verifiedBy is ${typeof transaction.verifiedBy} instead of string`)
      }
      if (transaction.expiresAt && typeof transaction.expiresAt !== 'string') {
        issues.push(`expiresAt is ${typeof transaction.expiresAt} instead of string`)
      }
      if (transaction.verifiedAt && typeof transaction.verifiedAt !== 'string') {
        issues.push(`verifiedAt is ${typeof transaction.verifiedAt} instead of string`)
      }
      
      if (issues.length > 0) {
        console.log(`   ⚠️  ISSUES:`)
        issues.forEach(issue => console.log(`      - ${issue}`))
      } else {
        console.log(`   ✅ No type issues`)
      }
    }

    console.log('\n' + '='.repeat(80))

  } catch (error) {
    console.error('❌ Error:', error)
    console.error('Stack:', error.stack)
  } finally {
    process.exit(0)
  }
}

diagnoseTransactions()
