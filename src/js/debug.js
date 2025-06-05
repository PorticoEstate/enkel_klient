/**
 * Debug utility for EnkelKlient
 * Provides consistent debugging output across the application
 */

(function() {
  'use strict';
  
  // Debug configuration
  const DEBUG_ENABLED = true; // Set to false in production
  const DEBUG_PREFIX = '[EnkelKlient]';
  
  // Debug levels
  const LEVELS = {
    DEBUG: 'DEBUG',
    INFO: 'INFO', 
    WARN: 'WARN',
    ERROR: 'ERROR'
  };
  
  // Colors for console output
  const COLORS = {
    DEBUG: 'color: #666; font-weight: normal;',
    INFO: 'color: #0066cc; font-weight: normal;',
    WARN: 'color: #ff9900; font-weight: bold;',
    ERROR: 'color: #cc0000; font-weight: bold;'
  };
  
  /**
   * Main Debug object
   */
  const Debug = {
    
    /**
     * Check if debugging is enabled
     */
    isEnabled() {
      return DEBUG_ENABLED;
    },
    
    /**
     * Log debug message
     */
    debug(...args) {
      if (!DEBUG_ENABLED) return;
      this._log(LEVELS.DEBUG, args);
    },
    
    /**
     * Log info message
     */
    info(...args) {
      if (!DEBUG_ENABLED) return;
      this._log(LEVELS.INFO, args);
    },
    
    /**
     * Log warning message
     */
    warn(...args) {
      if (!DEBUG_ENABLED) return;
      this._log(LEVELS.WARN, args);
    },
    
    /**
     * Log error message
     */
    error(...args) {
      if (!DEBUG_ENABLED) return;
      this._log(LEVELS.ERROR, args);
    },
    
    /**
     * Internal logging method
     */
    _log(level, args) {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = `${DEBUG_PREFIX} [${level}]`;
      const style = COLORS[level];
      
      // Format arguments
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          return JSON.stringify(arg, null, 2);
        }
        return String(arg);
      }).join(' ');
      
      // Output to console with styling
      if (typeof console !== 'undefined') {
        const fullMessage = `${prefix} ${message}`;
        
        switch (level) {
          case LEVELS.ERROR:
            console.error(`%c${fullMessage}`, style);
            break;
          case LEVELS.WARN:
            console.warn(`%c${fullMessage}`, style);
            break;
          case LEVELS.INFO:
            console.info(`%c${fullMessage}`, style);
            break;
          default:
            console.log(`%c${fullMessage}`, style);
        }
      }
    },
    
    /**
     * Group related debug messages
     */
    group(label) {
      if (!DEBUG_ENABLED) return;
      if (typeof console !== 'undefined' && console.group) {
        console.group(`${DEBUG_PREFIX} ${label}`);
      }
    },
    
    /**
     * End debug group
     */
    groupEnd() {
      if (!DEBUG_ENABLED) return;
      if (typeof console !== 'undefined' && console.groupEnd) {
        console.groupEnd();
      }
    },
    
    /**
     * Time a debug operation
     */
    time(label) {
      if (!DEBUG_ENABLED) return;
      if (typeof console !== 'undefined' && console.time) {
        console.time(`${DEBUG_PREFIX} ${label}`);
      }
    },
    
    /**
     * End timing
     */
    timeEnd(label) {
      if (!DEBUG_ENABLED) return;
      if (typeof console !== 'undefined' && console.timeEnd) {
        console.timeEnd(`${DEBUG_PREFIX} ${label}`);
      }
    },
    
    /**
     * Log object properties in a table format
     */
    table(data, columns) {
      if (!DEBUG_ENABLED) return;
      if (typeof console !== 'undefined' && console.table) {
        console.table(data, columns);
      }
    }
  };
  
  // Export Debug object globally
  if (typeof window !== 'undefined') {
    window.Debug = Debug;
  }
  
  // Also export for Node.js environments
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Debug;
  }
  
  // Initial debug message
  Debug.debug('Debug utility initialized');
  
})();
