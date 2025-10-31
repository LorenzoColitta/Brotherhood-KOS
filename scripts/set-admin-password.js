import readline from 'readline';
import { connectToMongoDB, disconnectFromMongoDB } from '../src/database/mongo-connection.js';
import { setAdminPassword } from '../src/services/admin.service.js';
import config, { validateConfig } from '../src/config/config.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('Brotherhood KOS - Set Admin Password');
  console.log('='.repeat(60));
  console.log();

  try {
    // Validate configuration
    console.log('Validating configuration...');
    validateConfig();
    console.log('✅ Configuration valid\n');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await connectToMongoDB();
    console.log('✅ Connected to MongoDB\n');

    // Get password from user
    console.log('Password Requirements:');
    console.log('  - Minimum 8 characters');
    console.log('  - Will be hashed with SHA-256 before storage');
    console.log();

    const password = await question('Enter new admin password: ');

    if (!password) {
      console.log('\n❌ Password cannot be empty');
      process.exit(1);
    }

    if (password.length < 8) {
      console.log('\n❌ Password must be at least 8 characters long');
      process.exit(1);
    }

    // Confirm password
    const confirmPassword = await question('Confirm admin password: ');

    if (password !== confirmPassword) {
      console.log('\n❌ Passwords do not match');
      process.exit(1);
    }

    console.log('\nSetting admin password...');
    await setAdminPassword(password);
    console.log('✅ Admin password set successfully!\n');

    console.log('The admin password has been hashed and stored in the database.');
    console.log('You can now use it to authenticate with admin endpoints.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await disconnectFromMongoDB();
    process.exit(0);
  }
}

main();
