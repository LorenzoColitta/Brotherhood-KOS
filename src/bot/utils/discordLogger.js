import { logger } from '../../utils/logger.js';

/**
 * Logs a Discord API error with structured information
 * @param {string} prefix - Contextual prefix for the log message
 * @param {Error} err - The error object to log
 */
export function logDiscordError(prefix, err) {
    if (!err) {
        logger.error(prefix + ' Unknown error');
        return;
    }
    
    const errMsg = err.message || String(err);
    const code = err.code !== undefined ? err.code : (err.status || err.httpStatus || undefined);
    const httpStatus = err.httpStatus || err.status;
    
    // Log the main error message with code and HTTP status
    logger.error(`${prefix} message=${errMsg} code=${code}${httpStatus ? ` httpStatus=${httpStatus}` : ''}`);
    
    // Log the stack trace if available
    if (err.stack) {
        logger.error(err.stack);
    }
}
