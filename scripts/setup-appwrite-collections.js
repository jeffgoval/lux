/**
 * Script to setup Appwrite collections for the application
 * Run this script to create the necessary collections and attributes
 */

import { Client, Databases, Permission, Role } from 'appwrite';

// Configuration
const APPWRITE_ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID || '68c841cf00032cd36a87';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY; // Admin API key needed

const DATABASE_ID = 'main';

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

if (APPWRITE_API_KEY) {
  client.setKey(APPWRITE_API_KEY);
}

const databases = new Databases(client);

async function setupCollections() {
  try {
    console.log('🚀 Setting up Appwrite collections...');

    // Create database if it doesn't exist
    try {
      await databases.get(DATABASE_ID);
      console.log('✅ Database already exists');
    } catch (error) {
      console.log('📝 Creating database...');
      await databases.create(DATABASE_ID, 'Main Database');
      console.log('✅ Database created');
    }

    // Setup Patients collection (for clients)
    await setupPatientsCollection();

    console.log('🎉 All collections setup completed!');
  } catch (error) {
    console.error('❌ Error setting up collections:', error);
    process.exit(1);
  }
}

async function setupPatientsCollection() {
  const collectionId = 'patients';
  
  try {
    // Check if collection exists
    await databases.getCollection(DATABASE_ID, collectionId);
    console.log('✅ Patients collection already exists');
    return;
  } catch (error) {
    // Collection doesn't exist, create it
  }

  console.log('📝 Creating Patients collection...');

  // Create collection
  await databases.createCollection(
    DATABASE_ID,
    collectionId,
    'Patients',
    [
      Permission.read(Role.any()),
      Permission.create(Role.users()),
      Permission.update(Role.users()),
      Permission.delete(Role.users())
    ],
    true // Document security enabled
  );

  // Create attributes
  const attributes = [
    // Basic fields
    { key: 'clinicId', type: 'string', size: 255, required: true },
    { key: 'code', type: 'string', size: 50, required: true },
    
    // Encrypted personal information
    { key: 'personalInfoEncrypted', type: 'string', size: 10000, required: true },
    
    // Searchable data (non-sensitive)
    { key: 'searchableData', type: 'string', size: 2000, required: true }, // JSON string
    
    // Business metrics
    { key: 'businessMetrics', type: 'string', size: 2000, required: true }, // JSON string
    
    // LGPD consents
    { key: 'consents', type: 'string', size: 2000, required: true }, // JSON string
    
    // Tags and VIP level
    { key: 'tags', type: 'string', size: 1000, required: false }, // JSON array as string
    { key: 'vipLevel', type: 'string', size: 50, required: false },
    
    // Audit fields
    { key: 'createdBy', type: 'string', size: 255, required: true },
    { key: 'updatedBy', type: 'string', size: 255, required: true }
  ];

  for (const attr of attributes) {
    try {
      await databases.createStringAttribute(
        DATABASE_ID,
        collectionId,
        attr.key,
        attr.size,
        attr.required
      );
      console.log(`✅ Created attribute: ${attr.key}`);
    } catch (error) {
      console.log(`⚠️  Attribute ${attr.key} might already exist:`, error.message);
    }
  }

  // Create indexes for better performance
  const indexes = [
    { key: 'clinicId_idx', attributes: ['clinicId'] },
    { key: 'code_idx', attributes: ['code'] },
    { key: 'createdBy_idx', attributes: ['createdBy'] }
  ];

  for (const index of indexes) {
    try {
      await databases.createIndex(
        DATABASE_ID,
        collectionId,
        index.key,
        'key',
        index.attributes
      );
      console.log(`✅ Created index: ${index.key}`);
    } catch (error) {
      console.log(`⚠️  Index ${index.key} might already exist:`, error.message);
    }
  }

  console.log('✅ Patients collection setup completed');
}

// Run the setup
if (require.main === module) {
  if (!APPWRITE_API_KEY) {
    console.error('❌ APPWRITE_API_KEY environment variable is required');
    console.log('Please set your Appwrite API key:');
    console.log('export APPWRITE_API_KEY=your_api_key_here');
    process.exit(1);
  }
  
  setupCollections();
}

export { setupCollections };