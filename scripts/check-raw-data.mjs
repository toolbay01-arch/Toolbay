import { getPayloadSingleton } from '@/lib/payload-singleton'
import { MongoClient } from 'mongodb'

async function checkRawData() {
  const payload = await getPayloadSingleton()

  try {
    console.log('\n🔍 Checking Raw MongoDB Data...\n')
    console.log('='.repeat(80))

    // Get MongoDB connection URL from environment
    const mongoURL = process.env.DATABASE_URI || 'mongodb://127.0.0.1:27017/toolboxx'
    const client = new MongoClient(mongoURL)
    
    await client.connect()
    console.log('✅ Connected to MongoDB directly')
    
    const db = client.db()
    const transactions = await db.collection('transactions').find({}).toArray()
    
    console.log(`\nFound ${transactions.length} transactions in MongoDB\n`)
    
    for (const transaction of transactions) {
      console.log(`\n📝 Transaction: ${transaction.paymentReference || transaction._id}`)
      console.log(`   Products type: ${Array.isArray(transaction.products) ? 'Array' : typeof transaction.products}`)
      
      if (Array.isArray(transaction.products)) {
        console.log(`   Products count: ${transaction.products.length}`)
        transaction.products.forEach((item, index) => {
          console.log(`   Product ${index + 1}:`)
          console.log(`      product type: ${typeof item.product}`)
          console.log(`      product value: ${JSON.stringify(item.product)}`)
          console.log(`      price: ${item.price}`)
          
          // Check if product is an ObjectId or something else
          if (item.product && typeof item.product === 'object') {
            console.log(`      ⚠️  ISSUE: product is object instead of ID string!`)
            console.log(`      Object keys: ${Object.keys(item.product).join(', ')}`)
          }
        })
      }
      
      // Check other fields
      console.log(`   customer type: ${typeof transaction.customer}`)
      console.log(`   tenant type: ${typeof transaction.tenant}`)
      console.log(`   verifiedBy type: ${typeof transaction.verifiedBy}`)
      console.log(`   expiresAt type: ${typeof transaction.expiresAt}`)
    }
    
    await client.close()
    console.log('\n' + '='.repeat(80))
    console.log('\n✅ Check complete\n')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    process.exit(0)
  }
}

checkRawData()
