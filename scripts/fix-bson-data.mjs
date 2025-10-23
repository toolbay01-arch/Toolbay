import { MongoClient, ObjectId } from 'mongodb'

async function fixBSONData() {
  const mongoURL = process.env.DATABASE_URI || 'mongodb://127.0.0.1:27017/toolboxx'
  const client = new MongoClient(mongoURL)
  
  try {
    await client.connect()
    console.log('\n🔧 Fixing BSON Data Issues...\n')
    console.log('='.repeat(80))
    
    const db = client.db()
    const transactions = await db.collection('transactions').find({}).toArray()
    
    console.log(`\nFound ${transactions.length} transactions\n`)
    
    let fixed = 0
    let errors = 0
    
    for (const transaction of transactions) {
      try {
        const updates = {}
        let needsUpdate = false
        
        console.log(`\n📝 Processing: ${transaction.paymentReference || transaction._id}`)
        
        // Fix customer (ObjectId to string)
        if (transaction.customer && transaction.customer instanceof ObjectId) {
          updates.customer = transaction.customer.toString()
          needsUpdate = true
          console.log(`   ✓ Fixed customer: Buffer → ${updates.customer}`)
        } else if (transaction.customer && typeof transaction.customer === 'object' && transaction.customer.buffer) {
          const id = new ObjectId(transaction.customer.buffer)
          updates.customer = id.toString()
          needsUpdate = true
          console.log(`   ✓ Fixed customer: Buffer → ${updates.customer}`)
        }
        
        // Fix tenant (ObjectId to string)
        if (transaction.tenant && transaction.tenant instanceof ObjectId) {
          updates.tenant = transaction.tenant.toString()
          needsUpdate = true
          console.log(`   ✓ Fixed tenant: Buffer → ${updates.tenant}`)
        } else if (transaction.tenant && typeof transaction.tenant === 'object' && transaction.tenant.buffer) {
          const id = new ObjectId(transaction.tenant.buffer)
          updates.tenant = id.toString()
          needsUpdate = true
          console.log(`   ✓ Fixed tenant: Buffer → ${updates.tenant}`)
        }
        
        // Fix products array
        if (Array.isArray(transaction.products)) {
          const fixedProducts = transaction.products.map(item => {
            if (!item) return item
            
            const fixed = { ...item }
            
            if (item.product && item.product instanceof ObjectId) {
              fixed.product = item.product.toString()
            } else if (item.product && typeof item.product === 'object' && item.product.buffer) {
              const id = new ObjectId(item.product.buffer)
              fixed.product = id.toString()
            }
            
            return fixed
          })
          
          updates.products = fixedProducts
          needsUpdate = true
          console.log(`   ✓ Fixed ${fixedProducts.length} products`)
        }
        
        // Fix expiresAt (Date to ISO string)
        if (transaction.expiresAt && transaction.expiresAt instanceof Date) {
          updates.expiresAt = transaction.expiresAt.toISOString()
          needsUpdate = true
          console.log(`   ✓ Fixed expiresAt: Date → ISO string`)
        }
        
        // Fix verifiedAt (Date to ISO string)
        if (transaction.verifiedAt && transaction.verifiedAt instanceof Date) {
          updates.verifiedAt = transaction.verifiedAt.toISOString()
          needsUpdate = true
          console.log(`   ✓ Fixed verifiedAt: Date → ISO string`)
        }
        
        // Fix verifiedBy (ObjectId to string)
        if (transaction.verifiedBy && transaction.verifiedBy instanceof ObjectId) {
          updates.verifiedBy = transaction.verifiedBy.toString()
          needsUpdate = true
          console.log(`   ✓ Fixed verifiedBy: Buffer → ${updates.verifiedBy}`)
        } else if (transaction.verifiedBy && typeof transaction.verifiedBy === 'object' && transaction.verifiedBy.buffer) {
          const id = new ObjectId(transaction.verifiedBy.buffer)
          updates.verifiedBy = id.toString()
          needsUpdate = true
          console.log(`   ✓ Fixed verifiedBy: Buffer → ${updates.verifiedBy}`)
        }
        
        if (needsUpdate) {
          await db.collection('transactions').updateOne(
            { _id: transaction._id },
            { $set: updates }
          )
          fixed++
          console.log(`   ✅ Updated successfully`)
        } else {
          console.log(`   ⏭️  No changes needed`)
        }
        
      } catch (error) {
        errors++
        console.error(`   ❌ Error:`, error.message)
      }
    }
    
    console.log('\n' + '='.repeat(80))
    console.log(`\n✅ Migration complete!`)
    console.log(`   Fixed: ${fixed}`)
    console.log(`   Errors: ${errors}`)
    console.log(`   Total: ${transactions.length}\n`)
    
  } catch (error) {
    console.error('❌ Fatal error:', error)
  } finally {
    await client.close()
    process.exit(0)
  }
}

fixBSONData()
