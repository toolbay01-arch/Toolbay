import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function resetDatabase() {
  try {
    console.log('Connecting to database...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URI);
    
    console.log('Connected to database. Dropping all collections...');
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    // Drop each collection
    for (const collection of collections) {
      console.log(`Dropping collection: ${collection.name}`);
      await mongoose.connection.db.dropCollection(collection.name);
    }
    
    console.log('Database reset completed successfully!');
    console.log('Note: You may need to run the application once to recreate the collections.');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('Database reset failed:', error);
    process.exit(1);
  }
}

resetDatabase();
