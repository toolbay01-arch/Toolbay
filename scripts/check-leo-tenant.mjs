import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const payload = await getPayload({ config })

console.log('\n🔍 Checking Leo tenant data...\n')

const tenants = await payload.find({
  collection: 'tenants',
  where: {
    slug: {
      equals: 'leo'
    }
  },
  depth: 0,
})

if (tenants.docs.length > 0) {
  const tenant = tenants.docs[0]
  console.log('� Leo Tenant Fields:')
  console.log('- ID:', tenant.id)
  console.log('- Name:', tenant.businessName)
  console.log('- Slug:', tenant.slug)
  console.log('- Category:', tenant.category || '❌ MISSING')
  console.log('- Location:', tenant.location || '❌ MISSING')
  console.log('\nFull tenant data:')
  console.log(JSON.stringify(tenant, null, 2))
} else {
  console.log('❌ Leo tenant not found')
}

process.exit(0)
