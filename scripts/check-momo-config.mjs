import { getPayloadSingleton } from '@/lib/payload-singleton'

async function checkTenantMoMo() {
  const payload = await getPayloadSingleton()

  try {
    // Get all tenants
    const tenants = await payload.find({
      collection: 'tenants',
      limit: 100,
    })

    console.log('\n📊 TENANT MOMO CONFIGURATION CHECK\n')
    console.log('='.repeat(80))

    if (tenants.docs.length === 0) {
      console.log('❌ No tenants found in database')
      return
    }

    for (const tenant of tenants.docs) {
      console.log(`\n🏪 Store: ${tenant.name}`)
      console.log(`   Slug: ${tenant.slug}`)
      console.log(`   Payment Method: ${tenant.paymentMethod || 'NOT SET'}`)
      console.log(`   MoMo Code: ${tenant.momoCode || '❌ NOT CONFIGURED'}`)
      console.log(`   MoMo Account Name: ${tenant.momoAccountName || 'Not set'}`)
      console.log(`   MoMo Pay Code: ${tenant.momoPayCode || 'Not set'}`)
      console.log(`   Verified: ${tenant.isVerified ? '✅' : '❌'}`)
      console.log(`   Verification Status: ${tenant.verificationStatus || 'pending'}`)
      
      // Check if ready for MoMo payments
      if (tenant.paymentMethod === 'momo_pay') {
        if (tenant.momoCode && tenant.isVerified) {
          console.log(`   ✅ READY for MoMo payments`)
        } else {
          console.log(`   ⚠️  NOT READY:`)
          if (!tenant.momoCode) console.log(`      - Missing MoMo Code`)
          if (!tenant.isVerified) console.log(`      - Not verified`)
        }
      }
      console.log('-'.repeat(80))
    }

    console.log('\n💡 TO FIX:')
    console.log('1. Login to /admin')
    console.log('2. Go to Collections → Tenants')
    console.log('3. Edit your tenant')
    console.log('4. Set Payment Method to "Mobile Money (MOMO)"')
    console.log('5. Enter MoMo Code (e.g., TENANT1, SHOP123)')
    console.log('6. Enter MoMo Account Name (your business name)')
    console.log('7. Save changes\n')

  } catch (error) {
    console.error('❌ Error checking tenants:', error)
  } finally {
    process.exit(0)
  }
}

checkTenantMoMo()
