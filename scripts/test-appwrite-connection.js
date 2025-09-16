/**
 * Test Appwrite connection and basic operations
 */

import { Client, Databases, Account } from 'appwrite';

// Configuration from environment
const APPWRITE_ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID || '68c841cf00032cd36a87';

console.log('🔧 Testing Appwrite connection...');
console.log('Endpoint:', APPWRITE_ENDPOINT);
console.log('Project ID:', APPWRITE_PROJECT_ID);

// Initialize client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

const databases = new Databases(client);
const account = new Account(client);

async function testConnection() {
  try {
    // Test basic connection
    console.log('\n📡 Testing basic connection...');
    
    // Try to connect to Appwrite (401 is expected without auth, but means server is reachable)
    try {
      const response = await fetch(`${APPWRITE_ENDPOINT}/health`);
      if (response.ok || response.status === 401) {
        console.log('✅ Appwrite server is reachable');
      } else {
        console.log('❌ Appwrite server responded with:', response.status, response.statusText);
        return;
      }
    } catch (error) {
      console.log('❌ Network error connecting to Appwrite:', error.message);
      console.log('This might be a network connectivity issue or incorrect endpoint');
      return;
    }

    // Test database access
    console.log('\n🗄️  Testing database access...');
    try {
      const databasesList = await databases.list();
      console.log('✅ Database access successful');
      console.log('Available databases:', databasesList.databases.map(db => db.name));
      
      // Check if main database exists
      const mainDb = databasesList.databases.find(db => db.$id === 'main');
      if (mainDb) {
        console.log('✅ Main database found');
        
        // Test collections
        try {
          const collections = await databases.listCollections('main');
          console.log('Available collections:', collections.collections.map(col => col.name));
          
          const patientsCollection = collections.collections.find(col => col.$id === 'patients');
          if (patientsCollection) {
            console.log('✅ Patients collection found');
          } else {
            console.log('⚠️  Patients collection not found - run setup script');
          }
        } catch (error) {
          console.log('⚠️  Could not list collections:', error.message);
        }
      } else {
        console.log('⚠️  Main database not found - run setup script');
      }
    } catch (error) {
      console.log('❌ Database access failed:', error.message);
      console.log('This might be normal if no API key is provided');
    }

    console.log('\n🎉 Connection test completed!');
    console.log('\nNext steps:');
    console.log('1. If collections are missing, run: node scripts/setup-appwrite-collections.js');
    console.log('2. Make sure you have proper API keys configured');
    console.log('3. Test the client creation in the application');

  } catch (error) {
    console.error('❌ Connection test failed:', error);
  }
}

// Run the test
testConnection();