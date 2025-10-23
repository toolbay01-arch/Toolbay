import { getPayload } from 'payload'
import config from '../src/payload.config.ts'

const payload = await getPayload({ config })

console.log('\n🔍 Finding Leo user and tenant...\n')

// 1. List all users
const allUsers = await payload.find({
  collection: 'users',
  limit: 100,
  depth: 1
})

console.log(`📋 Total users: ${allUsers.totalDocs}\n`)
allUsers.docs.forEach(user => {
  console.log(`User: ${user.email}`)
  console.log(`  ID: ${user.id}`)
  console.log(`  Username: ${user.username || 'N/A'}`)
  console.log(`  Roles: ${user.roles?.join(', ') || 'None'}`)
  if (user.tenants && user.tenants.length > 0) {
    console.log(`  Tenants:`)
    user.tenants.forEach(t => {
      const tenantName = typeof t.tenant === 'string' ? 'ID only' : t.tenant?.name
      const tenantId = typeof t.tenant === 'string' ? t.tenant : t.tenant?.id
      console.log(`    - ${tenantName} (${tenantId})`)
    })
  }
  console.log('')
})

// 2. List all tenants
const allTenants = await payload.find({
  collection: 'tenants',
  limit: 100
})

console.log(`\n🏢 Total tenants: ${allTenants.totalDocs}\n`)
allTenants.docs.forEach(tenant => {
  console.log(`Tenant: ${tenant.name}`)
  console.log(`  ID: ${tenant.id}`)
  console.log(`  Slug: ${tenant.slug}`)
  console.log(`  Verification: ${tenant.verificationStatus}`)
  console.log(`  Is Verified: ${tenant.isVerified}`)
  console.log('')
})

// 3. Find tenant named "leo" or with slug "leo"
const leoTenants = allTenants.docs.filter(t => 
  t.name?.toLowerCase().includes('leo') || 
  t.slug?.toLowerCase().includes('leo')
)

if (leoTenants.length > 0) {
  console.log('\n✅ Found Leo-related tenants:')
  leoTenants.forEach(tenant => {
    console.log(`  - ${tenant.name} (slug: ${tenant.slug}, id: ${tenant.id})`)
    console.log(`    Verification: ${tenant.verificationStatus}`)
  })
}

process.exit(0)
