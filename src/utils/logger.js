/**
 * Simple logger utility for consistent logging across the application
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function formatTimestamp() {
  return new Date().toISOString();
}

export const logger = {
  info(message, ...args) {
    console.log(`${colors.blue}[INFO]${colors.reset} [${formatTimestamp()}] ${message}`, ...args);
  },
  
  success(message, ...args) {
    console.log(`${colors.green}[SUCCESS]${colors.reset} [${formatTimestamp()}] ${message}`, ...args);
  },
  
  warn(message, ...args) {
    console.warn(`${colors.yellow}[WARN]${colors.reset} [${formatTimestamp()}] ${message}`, ...args);
  },
  
  error(message, ...args) {
    console.error(`${colors.red}[ERROR]${colors.reset} [${formatTimestamp()}] ${message}`, ...args);
  },
  
  debug(message, ...args) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${colors.magenta}[DEBUG]${colors.reset} [${formatTimestamp()}] ${message}`, ...args);
    }
  },
};
