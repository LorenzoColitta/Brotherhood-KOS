#!/usr/bin/env node

/**
 * Script to set admin password for the KOS system
 * Usage: node scripts/set-admin-password.js <password>
 */

import { connectToDatabase, disconnectFromDatabase } from '../src/database/mongo-connection.js';
import { setAdminPassword } from '../src/services/admin.service.js';

const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Please provide a password');
  console.log('Usage: node scripts/set-admin-password.js <password>');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ Error: Password must be at least 8 characters long');
  process.exit(1);
}

(async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectToDatabase();
    
    console.log('🔑 Setting admin password...');
    await setAdminPassword(password);
    
    console.log('✅ Admin password has been set successfully!');
    console.log('💡 You can now use this password for admin API endpoints.');
    
    await disconnectFromDatabase();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
