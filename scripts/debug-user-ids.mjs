#!/usr/bin/env node
/**
 * Debug subscription user ID format
 */

import { MongoClient } from 'mongodb'

const MONGODB_URI = "mongodb+srv://Leo:H4ckGeJLJANoaT6O@ticoai.wwfr4.mongodb.net/toolboxx?retryWrites=true&w=majority&appName=TicoAI"

async function debugUserIds() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    const db = client.db('toolboxx')
    const subscriptions = await db.collection('push-subscriptions').find({}).toArray()
    
    console.log('🔍 Subscription User ID Analysis:\n')
    
    subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. Subscription ID: ${sub._id}`)
      console.log(`   user field type: ${typeof sub.user}`)
      console.log(`   user value: ${sub.user}`)
      console.log(`   user stringified: "${String(sub.user)}"`)
      console.log(`   endpoint: ${sub.endpoint?.substring(0, 50)}...`)
      console.log(`   p256dh (top level): ${sub.p256dh ? 'EXISTS' : 'MISSING'}`)
      console.log(`   auth (top level): ${sub.auth ? 'EXISTS' : 'MISSING'}`)
      console.log(`   keys object: ${sub.keys ? 'EXISTS' : 'MISSING'}`)
      if (sub.keys) {
        console.log(`   keys.p256dh: ${sub.keys.p256dh ? 'EXISTS' : 'MISSING'}`)
        console.log(`   keys.auth: ${sub.keys.auth ? 'EXISTS' : 'MISSING'}`)
      }
      if (typeof sub.user === 'object') {
        console.log(`   user._id: ${sub.user?._id}`)
        console.log(`   user is ObjectId: ${sub.user?.constructor?.name}`)
      }
      console.log('')
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await client.close()
  }
}

debugUserIds()
