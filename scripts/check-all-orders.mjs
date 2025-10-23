import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const payload = await getPayload({ config })

console.log('\n🔍 Checking ALL orders and products across tenants...\n')

// 1. Get all tenants
const allTenants = await payload.find({
  collection: 'tenants',
  limit: 100
})

console.log(`🏢 Total tenants: ${allTenants.totalDocs}\n`)
const tenantMap = {}
allTenants.docs.forEach(tenant => {
  tenantMap[tenant.id] = tenant
  console.log(`Tenant: ${tenant.name}`)
  console.log(`  ID: ${tenant.id}`)
  console.log(`  Slug: ${tenant.slug}`)
  console.log(`  Verification: ${tenant.verificationStatus}`)
  console.log(`  Is Verified: ${tenant.isVerified}`)
  console.log('')
})

// 2. Get all products
const allProducts = await payload.find({
  collection: 'products',
  limit: 1000,
  depth: 1
})

console.log(`\n🛍️  Total products: ${allProducts.totalDocs}\n`)
const productMap = {}
const tenantProducts = {}

allProducts.docs.forEach(product => {
  productMap[product.id] = product
  const tenantId = typeof product.tenant === 'string' ? product.tenant : product.tenant?.id
  const tenantName = typeof product.tenant === 'string' ? tenantMap[product.tenant]?.name || 'Unknown' : product.tenant?.name
  
  if (!tenantProducts[tenantId]) {
    tenantProducts[tenantId] = []
  }
  tenantProducts[tenantId].push(product)
  
  console.log(`Product: ${product.name}`)
  console.log(`  ID: ${product.id}`)
  console.log(`  Tenant: ${tenantName} (${tenantId})`)
  console.log(`  Price: ${product.price} RWF`)
  console.log('')
})

// 3. Get all orders
const allOrders = await payload.find({
  collection: 'orders',
  limit: 1000,
  depth: 2
})

console.log(`\n📦 Total orders: ${allOrders.totalDocs}\n`)

if (allOrders.totalDocs === 0) {
  console.log('❌ NO ORDERS FOUND IN THE SYSTEM!\n')
} else {
  // Group orders by tenant
  const ordersByTenant = {}
  
  allOrders.docs.forEach(order => {
    const productId = typeof order.product === 'string' ? order.product : order.product?.id
    const product = productMap[productId]
    const tenantId = product ? (typeof product.tenant === 'string' ? product.tenant : product.tenant?.id) : null
    const tenantName = tenantId ? tenantMap[tenantId]?.name || 'Unknown' : 'Unknown'
    
    if (!ordersByTenant[tenantId || 'unknown']) {
      ordersByTenant[tenantId || 'unknown'] = {
        tenantName,
        orders: []
      }
    }
    
    ordersByTenant[tenantId || 'unknown'].orders.push(order)
  })
  
  // Display orders grouped by tenant
  Object.entries(ordersByTenant).forEach(([tenantId, data]) => {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🏢 TENANT: ${data.tenantName} (${tenantId})`)
    console.log(`📦 Orders: ${data.orders.length}`)
    console.log('='.repeat(60))
    
    data.orders.forEach((order, index) => {
      const productId = typeof order.product === 'string' ? order.product : order.product?.id
      const productName = typeof order.product === 'string' ? productMap[productId]?.name || 'Unknown' : order.product?.name
      const userName = typeof order.user === 'string' ? 'User ID: ' + order.user : order.user?.email || 'Unknown'
      const txRef = typeof order.transaction === 'string' ? order.transaction : order.transaction?.paymentReference || 'None'
      
      console.log(`\n  Order #${index + 1}:`)
      console.log(`    Order ID: ${order.id}`)
      console.log(`    Product: ${productName} (${productId})`)
      console.log(`    Customer: ${userName}`)
      console.log(`    Amount: ${order.amount} RWF`)
      console.log(`    Status: ${order.status}`)
      console.log(`    Transaction: ${txRef}`)
      console.log(`    Created: ${order.createdAt}`)
    })
  })
}

// 4. Get all transactions
const allTransactions = await payload.find({
  collection: 'transactions',
  limit: 1000,
  depth: 2
})

console.log(`\n\n💳 Total transactions: ${allTransactions.totalDocs}\n`)

if (allTransactions.totalDocs === 0) {
  console.log('❌ NO TRANSACTIONS FOUND IN THE SYSTEM!\n')
} else {
  // Group by tenant
  const txByTenant = {}
  
  allTransactions.docs.forEach(tx => {
    const tenantId = typeof tx.tenant === 'string' ? tx.tenant : tx.tenant?.id
    const tenantName = tenantMap[tenantId]?.name || 'Unknown'
    
    if (!txByTenant[tenantId]) {
      txByTenant[tenantId] = {
        tenantName,
        transactions: []
      }
    }
    
    txByTenant[tenantId].transactions.push(tx)
  })
  
  Object.entries(txByTenant).forEach(([tenantId, data]) => {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🏢 TENANT: ${data.tenantName} (${tenantId})`)
    console.log(`💳 Transactions: ${data.transactions.length}`)
    console.log('='.repeat(60))
    
    data.transactions.forEach((tx, index) => {
      console.log(`\n  Transaction #${index + 1}:`)
      console.log(`    TX ID: ${tx.id}`)
      console.log(`    Reference: ${tx.paymentReference}`)
      console.log(`    Status: ${tx.status}`)
      console.log(`    Customer: ${tx.customerName} (${tx.customerEmail})`)
      console.log(`    Phone: ${tx.customerPhone || 'N/A'}`)
      console.log(`    Amount: ${tx.totalAmount} RWF`)
      console.log(`    Platform Fee: ${tx.platformFee} RWF`)
      console.log(`    Tenant Amount: ${tx.tenantAmount} RWF`)
      console.log(`    MTN TX ID: ${tx.mtnTransactionId || 'Not submitted'}`)
      console.log(`    Expires: ${tx.expiresAt}`)
      console.log(`    Products:`)
      tx.products?.forEach(item => {
        const prodName = typeof item.product === 'string' ? productMap[item.product]?.name || 'Unknown' : item.product?.name
        console.log(`      - ${prodName} @ ${item.price} RWF`)
      })
    })
  })
}

// 5. Summary
console.log('\n\n' + '='.repeat(60))
console.log('📊 SUMMARY')
console.log('='.repeat(60))
console.log(`Tenants: ${allTenants.totalDocs}`)
console.log(`Products: ${allProducts.totalDocs}`)
console.log(`Orders: ${allOrders.totalDocs}`)
console.log(`Transactions: ${allTransactions.totalDocs}`)

// Check for awaiting verification transactions
const awaitingVerification = allTransactions.docs.filter(tx => tx.status === 'awaiting_verification')
console.log(`\n⏳ Transactions awaiting verification: ${awaitingVerification.length}`)
if (awaitingVerification.length > 0) {
  awaitingVerification.forEach(tx => {
    const tenantName = tenantMap[typeof tx.tenant === 'string' ? tx.tenant : tx.tenant?.id]?.name
    console.log(`  - ${tx.paymentReference} for ${tenantName} (${tx.totalAmount} RWF)`)
  })
}

process.exit(0)
