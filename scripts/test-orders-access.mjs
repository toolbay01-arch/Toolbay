import { getPayloadSingleton } from '@/lib/payload-singleton'

async function testOrdersAccess() {
  const payload = await getPayloadSingleton()

  try {
    console.log('\n🔍 Testing Orders Access Control\n')
    console.log('='.repeat(80))

    // Get all tenants
    const tenants = await payload.find({
      collection: 'tenants',
      limit: 100,
    })

    console.log(`\nFound ${tenants.docs.length} tenants\n`)

    for (const tenant of tenants.docs) {
      console.log(`\n🏪 Tenant: ${tenant.name}`)
      console.log(`   Slug: ${tenant.slug}`)
      console.log(`   Verification Status: ${tenant.verificationStatus}`)
      console.log(`   Is Verified: ${tenant.isVerified}`)
      
      // Check if physically verified
      if (tenant.verificationStatus === 'physically_verified') {
        console.log(`   ✅ PHYSICALLY VERIFIED - Can see orders`)
        
        // Get products for this tenant
        const products = await payload.find({
          collection: 'products',
          where: {
            tenant: {
              equals: tenant.id,
            },
          },
          limit: 100,
        })
        
        console.log(`   Products: ${products.docs.length}`)
        
        if (products.docs.length > 0) {
          const productIds = products.docs.map(p => p.id)
          console.log(`   Product IDs: ${productIds.join(', ')}`)
          
          // Get orders for these products
          const orders = await payload.find({
            collection: 'orders',
            where: {
              product: {
                in: productIds,
              },
            },
            limit: 100,
          })
          
          console.log(`   📦 Orders visible to this tenant: ${orders.docs.length}`)
          
          if (orders.docs.length > 0) {
            orders.docs.forEach((order, i) => {
              console.log(`      ${i + 1}. Order ${order.name} - Product: ${typeof order.product === 'string' ? order.product : order.product?.id}`)
            })
          }
        }
      } else {
        console.log(`   ⚠️  NOT physically verified - Cannot see orders`)
      }
      
      console.log('-'.repeat(80))
    }

    console.log('\n✅ Test complete\n')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    process.exit(0)
  }
}

testOrdersAccess()
