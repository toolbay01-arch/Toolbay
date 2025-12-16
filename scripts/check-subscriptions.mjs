#!/usr/bin/env node
/**
 * Check Push Subscriptions in Database
 * Quick script to check if there are any push subscriptions
 */

import { MongoClient } from 'mongodb'

const MONGODB_URI = "mongodb+srv://Leo:H4ckGeJLJANoaT6O@ticoai.wwfr4.mongodb.net/toolboxx?retryWrites=true&w=majority&appName=TicoAI"

async function checkSubscriptions() {
  console.log('🔍 Connecting to production database...\n')

  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Connected to database\n')

    const db = client.db('toolboxx')
    const collection = db.collection('push-subscriptions')

    // Count total subscriptions
    const totalCount = await collection.countDocuments()
    console.log(`📊 Total push subscriptions: ${totalCount}\n`)

    if (totalCount === 0) {
      console.log('❌ No subscriptions found in database')
      console.log('   You need to subscribe first from the production app')
      console.log('   Visit: https://toolboxx-production.up.railway.app/')
      console.log('   Click "Enable Notifications" and grant permission\n')
      return false
    }

    // Fetch all subscriptions
    const subscriptions = await collection.find({}).toArray()

    console.log('📋 Subscription Details:\n')
    subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. Subscription ID: ${sub._id}`)
      console.log(`   User: ${sub.user || 'Anonymous'}`)
      console.log(`   Endpoint: ${sub.endpoint?.substring(0, 60)}...`)
      console.log(`   Created: ${sub.createdAt || 'Unknown'}`)
      console.log(`   Updated: ${sub.updatedAt || 'Unknown'}`)
      console.log('')
    })

    console.log('✅ Ready to send notifications!')
    console.log('   Run: bun run scripts/test-offline-notifications.mjs\n')
    return true

  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  } finally {
    await client.close()
    console.log('🔌 Database connection closed')
  }
}

checkSubscriptions()
  .then(hasSubscriptions => {
    process.exit(hasSubscriptions ? 0 : 1)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
