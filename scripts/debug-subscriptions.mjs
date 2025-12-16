#!/usr/bin/env node
/**
 * Debug Production Notifications
 * Check why subscriptions aren't being saved
 */

import { MongoClient } from 'mongodb'

const MONGODB_URI = "mongodb+srv://Leo:H4ckGeJLJANoaT6O@ticoai.wwfr4.mongodb.net/toolboxx?retryWrites=true&w=majority&appName=TicoAI"

async function debugNotifications() {
  console.log('🔍 Debugging Production Notifications...\n')

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    const db = client.db('toolboxx')

    // Check if collection exists
    const collections = await db.listCollections({ name: 'push-subscriptions' }).toArray()
    console.log(`📁 Collection exists: ${collections.length > 0 ? 'YES' : 'NO'}`)
    
    if (collections.length === 0) {
      console.log('   Creating collection...')
      await db.createCollection('push-subscriptions')
      console.log('   ✅ Collection created\n')
    } else {
      console.log('')
    }

    // Check users collection to see if we have users
    const usersCount = await db.collection('users').countDocuments()
    console.log(`👥 Total users in database: ${usersCount}`)

    if (usersCount > 0) {
      const sampleUsers = await db.collection('users').find({}).limit(3).toArray()
      console.log('\n📋 Sample users:')
      sampleUsers.forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user._id}`)
        console.log(`   Email: ${user.email || 'No email'}`)
        console.log(`   Name: ${user.name || 'No name'}`)
        console.log('')
      })
    }

    // Check if push-subscriptions has any documents at all
    const pushCollection = db.collection('push-subscriptions')
    const allDocs = await pushCollection.find({}).toArray()
    
    console.log(`\n📊 Documents in push-subscriptions: ${allDocs.length}`)
    
    if (allDocs.length > 0) {
      console.log('\n🔍 Existing subscriptions:')
      allDocs.forEach((doc, index) => {
        console.log(`${index + 1}. ${JSON.stringify(doc, null, 2)}`)
      })
    }

    // Check indexes
    const indexes = await pushCollection.indexes()
    console.log('\n📑 Indexes on push-subscriptions:')
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`)
    })

    console.log('\n' + '='.repeat(60))
    console.log('💡 NEXT STEPS:')
    console.log('='.repeat(60))
    console.log('1. Visit: https://toolboxx-production.up.railway.app/')
    console.log('2. Open browser DevTools (F12) → Console')
    console.log('3. Look for these logs:')
    console.log('   - [WebPush] Service Worker ready and active')
    console.log('   - [NotificationBanner] showing notification banner')
    console.log('4. Click "Enable Notifications" button')
    console.log('5. Check console for:')
    console.log('   - [WebPush] Subscription created')
    console.log('   - [WebPush] Subscription saved to server')
    console.log('6. If you see errors, copy and share them')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await client.close()
    console.log('\n🔌 Database connection closed')
  }
}

debugNotifications().catch(console.error)
