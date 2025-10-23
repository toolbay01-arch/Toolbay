import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const payload = await getPayload({ config })

console.log('\n🔍 Checking Leo tenant orders access...\n')

// 1. Find Leo user
const leoUsers = await payload.find({
  collection: 'users',
  where: {
    email: { equals: 'leo@murlink.com' }
  },
  depth: 1
})

if (leoUsers.docs.length === 0) {
  console.log('❌ Leo user not found')
  process.exit(0)
}

const leoUser = leoUsers.docs[0]
console.log('✅ Leo user found:', leoUser.email)
console.log('   User ID:', leoUser.id)
console.log('   Roles:', leoUser.roles)
console.log('   Tenants:', leoUser.tenants?.map(t => ({
  tenant: typeof t.tenant === 'string' ? t.tenant : t.tenant.id,
  name: typeof t.tenant === 'string' ? 'ID only' : t.tenant.name
})))

// 2. Get Leo's tenant
const tenantId = leoUser.tenants?.[0]?.tenant
const tenantIdString = typeof tenantId === 'string' ? tenantId : tenantId?.id

if (!tenantIdString) {
  console.log('❌ Leo has no tenant')
  process.exit(0)
}

const tenant = await payload.findByID({
  collection: 'tenants',
  id: tenantIdString
})

console.log('\n�� Leo tenant:', tenant.name)
console.log('   Tenant ID:', tenant.id)
console.log('   Verification Status:', tenant.verificationStatus)
console.log('   Is Verified:', tenant.isVerified)

// 3. Get products owned by Leo's tenant
const products = await payload.find({
  collection: 'products',
  where: {
    tenant: { equals: tenantIdString }
  },
  limit: 100
})

console.log('\n🛍️  Products owned by Leo:')
const productIds = products.docs.map(p => p.id)
products.docs.forEach(p => {
  console.log(`   - ${p.name} (ID: ${p.id})`)
})

// 4. Check all orders in system
const allOrders = await payload.find({
  collection: 'orders',
  limit: 100,
  depth: 2
})

console.log(`\n📋 Total orders in system: ${allOrders.totalDocs}`)

// 5. Check orders related to Leo's products
const ordersForLeoProducts = allOrders.docs.filter(order => {
  const productId = typeof order.product === 'string' ? order.product : order.product?.id
  return productIds.includes(productId)
})

console.log(`\n✅ Orders for Leo's products: ${ordersForLeoProducts.length}`)
ordersForLeoProducts.forEach(order => {
  const productId = typeof order.product === 'string' ? order.product : order.product?.id
  const productName = typeof order.product === 'string' ? 'Unknown' : order.product?.name
  console.log(`   - Order ID: ${order.id}`)
  console.log(`     Product: ${productName} (${productId})`)
  console.log(`     User: ${typeof order.user === 'string' ? order.user : order.user?.email}`)
  console.log(`     Status: ${order.status}`)
  console.log(`     Transaction: ${typeof order.transaction === 'string' ? order.transaction : order.transaction?.paymentReference || 'None'}`)
})

// 6. Check pending transactions for Leo
const transactions = await payload.find({
  collection: 'transactions',
  where: {
    and: [
      { tenant: { equals: tenantIdString } },
      { status: { equals: 'awaiting_verification' } }
    ]
  },
  depth: 2
})

console.log(`\n💳 Pending transactions for Leo: ${transactions.totalDocs}`)
transactions.docs.forEach(tx => {
  console.log(`   - TX ID: ${tx.id}`)
  console.log(`     Reference: ${tx.paymentReference}`)
  console.log(`     Status: ${tx.status}`)
  console.log(`     Customer: ${tx.customerName}`)
  console.log(`     Amount: ${tx.totalAmount} RWF`)
  console.log(`     MTN TX ID: ${tx.mtnTransactionId || 'Not submitted'}`)
  console.log(`     Products:`)
  tx.products?.forEach(item => {
    const prodName = typeof item.product === 'string' ? 'Unknown' : item.product?.name
    console.log(`       - ${prodName} @ ${item.price} RWF`)
  })
})

// 7. Test Orders access control
console.log('\n🔐 Testing Orders access control...')
console.log('   Verification required: physically_verified')
console.log('   Leo status:', tenant.verificationStatus)

if (tenant.verificationStatus !== 'physically_verified') {
  console.log('   ⚠️  Leo is NOT physically verified - cannot see orders!')
} else {
  console.log('   ✅ Leo is physically verified - should see orders')
}

process.exit(0)
