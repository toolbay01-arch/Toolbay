import { getPayloadSingleton } from '@/lib/payload-singleton'

async function fixTransactionDates() {
  const payload = await getPayloadSingleton()

  try {
    console.log('\n🔧 Fixing Transaction Date Fields...\n')
    console.log('='.repeat(80))

    // Get all transactions
    const transactions = await payload.find({
      collection: 'transactions',
      limit: 1000,
    })

    console.log(`Found ${transactions.totalDocs} transactions\n`)

    let fixed = 0
    let skipped = 0
    let errors = 0

    for (const transaction of transactions.docs) {
      try {
        let needsUpdate = false
        const updates = {}

        // Check expiresAt
        if (transaction.expiresAt && typeof transaction.expiresAt === 'object') {
          updates.expiresAt = new Date(transaction.expiresAt).toISOString()
          needsUpdate = true
          console.log(`⚠️  ${transaction.paymentReference}: expiresAt is Date object, converting...`)
        }

        // Check verifiedAt
        if (transaction.verifiedAt && typeof transaction.verifiedAt === 'object') {
          updates.verifiedAt = new Date(transaction.verifiedAt).toISOString()
          needsUpdate = true
          console.log(`⚠️  ${transaction.paymentReference}: verifiedAt is Date object, converting...`)
        }

        if (needsUpdate) {
          await payload.update({
            collection: 'transactions',
            id: transaction.id,
            data: updates,
          })
          fixed++
          console.log(`   ✅ Fixed: ${transaction.paymentReference}`)
        } else {
          skipped++
        }
      } catch (error) {
        errors++
        console.error(`   ❌ Error fixing ${transaction.paymentReference}:`, error.message)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log(`\n✅ Fix complete!`)
    console.log(`   Fixed: ${fixed}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Errors: ${errors}`)
    console.log(`   Total: ${transactions.totalDocs}\n`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    process.exit(0)
  }
}

fixTransactionDates()
