import { getPayloadSingleton } from '@/lib/payload-singleton'

async function migrateMoMoFields() {
  const payload = await getPayloadSingleton()

  try {
    console.log('\n🔄 MIGRATING MOMO FIELDS...\n')
    console.log('='.repeat(80))

    // Get all tenants with momoPayCode but missing momoCode
    const tenants = await payload.find({
      collection: 'tenants',
      limit: 100,
    })

    let migrated = 0
    let skipped = 0

    for (const tenant of tenants.docs) {
      // If tenant has momoPayCode but no momoCode, migrate it
      if (tenant.momoPayCode && !tenant.momoCode) {
        console.log(`\n📝 Migrating: ${tenant.name}`)
        console.log(`   momoPayCode: ${tenant.momoPayCode} → momoCode`)

        await payload.update({
          collection: 'tenants',
          id: tenant.id,
          data: {
            momoCode: tenant.momoPayCode,
          },
        })

        migrated++
        console.log(`   ✅ Migrated successfully`)
      } else if (tenant.momoCode) {
        console.log(`\n⏭️  Skipping: ${tenant.name} (already has momoCode: ${tenant.momoCode})`)
        skipped++
      } else {
        console.log(`\n⏭️  Skipping: ${tenant.name} (no momoPayCode to migrate)`)
        skipped++
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log(`\n✅ Migration complete!`)
    console.log(`   Migrated: ${migrated}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Total: ${tenants.docs.length}\n`)

  } catch (error) {
    console.error('❌ Migration error:', error)
  } finally {
    process.exit(0)
  }
}

migrateMoMoFields()
