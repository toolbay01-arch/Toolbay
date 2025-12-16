#!/usr/bin/env node
/**
 * Create Test Subscription
 * Manually create a push subscription in the database for testing
 * This simulates what happens when a user subscribes
 */

import { MongoClient } from 'mongodb'

const MONGODB_URI = "mongodb+srv://Leo:H4ckGeJLJANoaT6O@ticoai.wwfr4.mongodb.net/toolboxx?retryWrites=true&w=majority&appName=TicoAI"

async function createTestSubscription() {
  console.log('🔧 Creating test subscription...\n')

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    const db = client.db('toolboxx')
    
    // Get a user ID to attach the subscription to
    const users = await db.collection('users').find({}).limit(1).toArray()
    
    if (users.length === 0) {
      console.error('❌ No users found in database')
      console.error('   Create a user first by signing up on the app')
      return
    }

    const userId = users[0]._id.toString()
    console.log(`👤 Using user: ${users[0].email || userId}\n`)

    // Create a mock subscription (this won't work for real notifications, but good for testing DB)
    const testSubscription = {
      user: userId,
      endpoint: `https://fcm.googleapis.com/fcm/send/test-${Date.now()}`,
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8qUYewnzU',
      auth: 'tBHItJI5svbpez7KI4CCXg',
      userAgent: 'Test Script',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection('push-subscriptions').insertOne(testSubscription)
    
    console.log('✅ Test subscription created!')
    console.log(`   ID: ${result.insertedId}`)
    console.log(`   User: ${userId}`)
    console.log(`   Endpoint: ${testSubscription.endpoint}\n`)

    console.log('⚠️  NOTE: This is a MOCK subscription!')
    console.log('   It won\'t receive real notifications')
    console.log('   To test real notifications:')
    console.log('   1. Visit https://toolboxx-production.up.railway.app/')
    console.log('   2. Click "Enable Notifications"')
    console.log('   3. Grant permission when prompted')
    console.log('   4. Then run: bun run scripts/test-offline-notifications.mjs\n')

    // Verify it was created
    const count = await db.collection('push-subscriptions').countDocuments()
    console.log(`📊 Total subscriptions now: ${count}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await client.close()
    console.log('\n🔌 Database connection closed')
  }
}

createTestSubscription().catch(console.error)
