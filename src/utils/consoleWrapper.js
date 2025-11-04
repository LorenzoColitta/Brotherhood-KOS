/**
 * Console wrapper to throttle console output and avoid log rate limits on Railway/Render.
 * This prevents the application from being throttled or terminated due to excessive logging.
 * 
 * Usage: Import at the top of your main application entry point (e.g., src/bot/index.js):
 *   import './utils/consoleWrapper.js';
 */

let MAX_LOGS_PER_SEC = parseInt(process.env.MAX_LOGS_PER_SEC || '10', 10);
// Ensure MAX_LOGS_PER_SEC is a positive number
if (!MAX_LOGS_PER_SEC || MAX_LOGS_PER_SEC <= 0 || isNaN(MAX_LOGS_PER_SEC)) {
  MAX_LOGS_PER_SEC = 10;
}
const WINDOW_MS = 1000;
const MAX_BUFFER_SIZE = 1000;

let logCount = 0;
let windowStart = Date.now();
const bufferedLogs = [];

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

/**
 * Throttle function that limits log output based on MAX_LOGS_PER_SEC
 */
function throttledLog(method, args) {
  const now = Date.now();
  
  // Reset window if time has passed
  if (now - windowStart >= WINDOW_MS) {
    windowStart = now;
    logCount = 0;
    
    // Flush buffered logs if any
    if (bufferedLogs.length > 0) {
      const logsToFlush = Math.min(bufferedLogs.length, MAX_LOGS_PER_SEC);
      const toFlush = bufferedLogs.splice(0, logsToFlush);
      toFlush.forEach(({ method: m, args: a }) => {
        originalConsole[m](...a);
        logCount++;
      });
    }
  }
  
  // If under the limit, log immediately
  if (logCount < MAX_LOGS_PER_SEC) {
    originalConsole[method](...args);
    logCount++;
  } else {
    // Buffer the log for next window
    bufferedLogs.push({ method, args });
    
    // Prevent buffer from growing too large
    if (bufferedLogs.length > MAX_BUFFER_SIZE) {
      bufferedLogs.shift();
    }
  }
}

// Override console methods
console.log = function(...args) {
  throttledLog('log', args);
};

console.error = function(...args) {
  throttledLog('error', args);
};

console.warn = function(...args) {
  throttledLog('warn', args);
};

console.info = function(...args) {
  throttledLog('info', args);
};

console.debug = function(...args) {
  throttledLog('debug', args);
};

// Log that wrapper is active
originalConsole.info(`[ConsoleWrapper] Console rate limiting active: ${MAX_LOGS_PER_SEC} logs/sec`);
