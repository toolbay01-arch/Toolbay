import { getPayloadSingleton } from '@/lib/payload-singleton'

async function testTransactionAccess() {
  const payload = await getPayloadSingleton()

  try {
    const transactionId = process.argv[2]
    
    if (!transactionId) {
      console.log('Usage: bun run scripts/test-transaction-access.mjs <transactionId>')
      console.log('\nFinding recent transactions...')
      
      const recent = await payload.find({
        collection: 'transactions',
        limit: 5,
        sort: '-createdAt',
      })
      
      if (recent.docs.length > 0) {
        console.log('\n📝 Recent Transactions:')
        recent.docs.forEach(t => {
          console.log(`\nID: ${t.id}`)
          console.log(`Reference: ${t.paymentReference}`)
          console.log(`Status: ${t.status}`)
          console.log(`Customer: ${t.customerName}`)
          console.log(`Amount: ${t.totalAmount}`)
        })
      }
      
      process.exit(0)
    }

    console.log(`\n🔍 Checking transaction: ${transactionId}\n`)
    
    // Try to fetch the transaction
    const transaction = await payload.findByID({
      collection: 'transactions',
      id: transactionId,
      depth: 2,
    })
    
    console.log('✅ Transaction found!')
    console.log('\nDetails:')
    console.log(`  Reference: ${transaction.paymentReference}`)
    console.log(`  Status: ${transaction.status}`)
    console.log(`  Customer ID: ${transaction.customer}`)
    console.log(`  Customer Name: ${transaction.customerName}`)
    console.log(`  Tenant ID: ${typeof transaction.tenant === 'string' ? transaction.tenant : transaction.tenant?.id}`)
    console.log(`  Total Amount: ${transaction.totalAmount}`)
    console.log(`  MTN TX ID: ${transaction.mtnTransactionId || 'Not submitted'}`)
    console.log(`  Expires: ${transaction.expiresAt}`)
    
    // Check customer
    console.log('\n👤 Customer Details:')
    const customer = await payload.findByID({
      collection: 'users',
      id: transaction.customer,
      depth: 1,
    })
    console.log(`  Email: ${customer.email}`)
    console.log(`  Username: ${customer.username}`)
    console.log(`  Roles: ${customer.roles?.join(', ') || 'None'}`)
    console.log(`  Tenants: ${customer.tenants?.length || 0}`)
    if (customer.tenants && customer.tenants.length > 0) {
      customer.tenants.forEach((t, i) => {
        const tenantId = typeof t.tenant === 'string' ? t.tenant : t.tenant?.id
        const tenantName = typeof t.tenant === 'string' ? '(ID only)' : t.tenant?.name
        console.log(`    ${i + 1}. ${tenantName} (${tenantId})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    process.exit(0)
  }
}

testTransactionAccess()
