#!/usr/bin/env node

/**
 * Script to set the admin password for the Brotherhood-KOS bot
 * 
 * Usage: 
 *   node scripts/set-admin-password.js
 *   OR with Doppler: doppler run -- node scripts/set-admin-password.js
 * 
 * This script will:
 * 1. Use ADMIN_PASSWORD from environment (Doppler) if available
 * 2. Otherwise, prompt for a new admin password
 * 3. Hash the password using SHA-256
 * 4. Store the hash in the bot_config table in Supabase
 * 
 * Note: This script requires SUPABASE_SERVICE_ROLE_KEY to be set
 * For Doppler users: Set ADMIN_PASSWORD in your Doppler config to skip prompting
 */

import { createInterface } from 'readline';
import { config, validateConfig } from '../src/config/config.js';
import { initializeSupabase } from '../src/database/connection.js';
import { setAdminPassword } from '../src/services/admin.service.js';
import { logger } from '../src/utils/logger.js';

// Create readline interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompt for input (hides password input)
 */
function prompt(question, hidden = false) {
  return new Promise((resolve) => {
    if (hidden) {
      // Hide password input
      const stdin = process.stdin;
      stdin.resume();
      stdin.setRawMode(true);
      
      process.stdout.write(question);
      let password = '';
      
      stdin.on('data', function onData(char) {
        char = char.toString('utf8');
        
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004': // Ctrl-D
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', onData);
            process.stdout.write('\n');
            resolve(password);
            break;
          case '\u0003': // Ctrl-C
            process.exit();
            break;
          case '\u007f': // Backspace
          case '\b':
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.clearLine(0);
              process.stdout.cursorTo(0);
              process.stdout.write(question + '*'.repeat(password.length));
            }
            break;
          default:
            password += char;
            process.stdout.write('*');
            break;
        }
      });
    } else {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    }
  });
}

/**
 * Main function
 */
async function main() {
  console.log('\n=================================');
  console.log('Brotherhood-KOS Admin Password Setup');
  console.log('=================================\n');
  
  try {
    // Validate configuration
    logger.info('Validating configuration...');
    validateConfig();
    
    // Initialize Supabase
    logger.info('Connecting to database...');
    initializeSupabase();
    
    let password;
    
    // Check if ADMIN_PASSWORD is set in environment (from Doppler or .env)
    if (process.env.ADMIN_PASSWORD) {
      logger.info('Using ADMIN_PASSWORD from environment (Doppler/env)...');
      password = process.env.ADMIN_PASSWORD;
      
      if (password.length < 8) {
        logger.error('ADMIN_PASSWORD must be at least 8 characters long.');
        process.exit(1);
      }
    } else {
      // Prompt for password if not in environment
      logger.info('ADMIN_PASSWORD not found in environment, prompting for input...');
      password = await prompt('Enter new admin password: ', true);
      
      if (!password || password.length < 8) {
        logger.error('Password must be at least 8 characters long.');
        process.exit(1);
      }
      
      // Confirm password
      const confirmPassword = await prompt('Confirm admin password: ', true);
      
      if (password !== confirmPassword) {
        logger.error('Passwords do not match.');
        process.exit(1);
      }
    }
    
    // Set the password
    logger.info('Setting admin password...');
    const success = await setAdminPassword(password);
    
    if (success) {
      logger.success('✅ Admin password has been set successfully!');
      logger.info('You can now use the /manage command in Discord to access admin features.');
    } else {
      logger.error('Failed to set admin password. Check logs for details.');
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Run the script
main();
