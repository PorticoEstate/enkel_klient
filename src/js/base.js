

/**
 * Centralized Debug System
 * Controls console output based on debug flags and log levels
 */
const Debug = (() => {
    // Private state
    let isEnabled = false;
    let logLevel = 'info'; // 'error', 'warn', 'info', 'debug', 'trace'
    let logPrefix = '[EnkelKlient]';
    
    // Log levels hierarchy
    const LOG_LEVELS = {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
        trace: 4
    };
    
    // Private methods
    function shouldLog(level) {
        return isEnabled && LOG_LEVELS[level] <= LOG_LEVELS[logLevel];
    }
    
    // Helper function to parse a single stack line
    function parseStackLine(line) {
        // Pattern 1: "at functionName (file.js:line:column)"
        let match = line.match(/at\s+([^\s]+)\s+\(([^:]+):(\d+):(\d+)\)/);
        if (match) {
            const [, fnName, filePath, lineNum] = match;
            const fileName = filePath ? filePath.split('/').pop() : 'unknown';
            return { fileName, line: lineNum, function: fnName };
        }
        
        // Pattern 2: "at file.js:line:column"
        match = line.match(/at\s+([^:]+):(\d+):(\d+)/);
        if (match) {
            const [, filePath, lineNum] = match;
            const fileName = filePath ? filePath.split('/').pop() : 'unknown';
            return { fileName, line: lineNum, function: 'anonymous' };
        }
        
        // Pattern 3: Chrome format: "at https://example.com/file.js:line:column"
        match = line.match(/at\s+(?:https?:\/\/[^\/]+)?\/([^:]+):(\d+):(\d+)/);
        if (match) {
            const [, filePath, lineNum] = match;
            const fileName = filePath ? filePath.split('/').pop() : 'unknown';
            return { fileName, line: lineNum, function: 'anonymous' };
        }
        
        // Pattern 4: Last attempt - just try to find any file:line pattern
        match = line.match(/([^\/\s]+\.js):(\d+)/);
        if (match) {
            const [, fileName, lineNum] = match;
            return { fileName, line: lineNum, function: 'anonymous' };
        }
        
        // If no pattern matches, return unknown
        return { fileName: 'unknown', line: '?', function: 'unknown' };
    }
    
    function getCallerInfo() {
        try {
            // Create an error to capture the stack
            const err = new Error();
            const stack = err.stack.split('\n');
            
            // Find the first stack frame that is NOT from base.js
            // We need to skip the first few frames:
            // 0: Error constructor
            // 1: getCallerInfo (this function)
            // 2: formatMessage
            // 3: debug/info/warn/error method
            // 4: actual caller (what we want)
            
            for (let i = 0; i < stack.length; i++) {
                const line = stack[i].trim();
                
                // Skip empty lines
                if (!line) continue;
                
                // Skip lines that don't contain file information
                if (!line.includes('.js')) continue;
                
                // Skip lines from base.js (this file)
                if (line.includes('base.js')) continue;
                
                // Skip Error constructor lines
                if (line.includes('Error')) continue;
                
                // This should be our caller - extract file and line info
                const result = parseStackLine(line);
                if (result.fileName !== 'unknown') {
                    return result;
                }
            }
            
            // Fallback to unknown if we can't find anything
            return { fileName: 'unknown', line: '?', function: 'unknown' };
            
        } catch (e) {
            console.warn('Error getting caller info:', e);
            return { fileName: 'unknown', line: '?', function: 'unknown' };
        }
    }
    
    function formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        const caller = getCallerInfo();
        
        // Include caller info in the message itself so it's always visible
        const enhancedMessage = `${message} [from: ${caller.fileName}:${caller.line}]`;
        const prefix = `${logPrefix} [${level.toUpperCase()}] ${timestamp}`;
        
        if (data !== undefined) {
            return [prefix, enhancedMessage, data];
        }
        return [prefix, enhancedMessage];
    }
    
    // Public API
    return {
        /**
         * Enable/disable debug output
         * @param {boolean} enabled 
         */
        setEnabled(enabled) {
            isEnabled = !!enabled;
        },
        
        /**
         * Set log level
         * @param {string} level - 'error', 'warn', 'info', 'debug', 'trace'
         */
        setLevel(level) {
            if (LOG_LEVELS.hasOwnProperty(level)) {
                logLevel = level;
            }
        },
        
        /**
         * Set log prefix
         * @param {string} prefix 
         */
        setPrefix(prefix) {
            logPrefix = prefix || '[EnkelKlient]';
        },
        
        /**
         * Check if debug is enabled
         * @returns {boolean}
         */
        isEnabled() {
            return isEnabled;
        },
        
        /**
         * Get current log level
         * @returns {string}
         */
        getLevel() {
            return logLevel;
        },
        
        /**
         * Log error message
         * @param {string} message 
         * @param {*} data 
         */
        error(message, data) {
            if (shouldLog('error')) {
                console.error(...formatMessage('error', message, data));
            }
        },
        
        /**
         * Log warning message
         * @param {string} message 
         * @param {*} data 
         */
        warn(message, data) {
            if (shouldLog('warn')) {
                console.warn(...formatMessage('warn', message, data));
            }
        },
        
        /**
         * Log info message
         * @param {string} message 
         * @param {*} data 
         */
        info(message, data) {
            if (shouldLog('info')) {
                console.info(...formatMessage('info', message, data));
            }
        },
        
        /**
         * Log debug message
         * @param {string} message 
         * @param {*} data 
         */
        debug(message, data) {
            if (shouldLog('debug')) {
                console.log(...formatMessage('debug', message, data));
            }
        },
        
        /**
         * Log trace message
         * @param {string} message 
         * @param {*} data 
         */
        trace(message, data) {
            if (shouldLog('trace')) {
                console.trace(...formatMessage('trace', message, data));
            }
        },
        
        /**
         * Log object/data structure
         * @param {string} label 
         * @param {*} data 
         */
        dump(label, data) {
            if (shouldLog('debug')) {
                const caller = getCallerInfo();
                const prefix = `${logPrefix} [DUMP] ${label} (${caller.fileName}:${caller.line})`;
                console.group(prefix);
                console.log(data);
                console.groupEnd();
            }
        },
        
        /**
         * Time a function execution
         * @param {string} label 
         * @param {Function} fn 
         * @returns {*} Function result
         */
        time(label, fn) {
            if (shouldLog('debug')) {
                console.time(`${logPrefix} ${label}`);
                const result = fn();
                console.timeEnd(`${logPrefix} ${label}`);
                return result;
            }
            return fn();
        },
        
        /**
         * Save current debug settings to localStorage
         * @returns {boolean} Success status
         */
        saveToLocalStorage() {
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.setItem('enkel_debug', isEnabled ? 'true' : 'false');
                    localStorage.setItem('enkel_debug_level', logLevel);
                    this.info('Debug settings saved to localStorage', { enabled: isEnabled, level: logLevel });
                    return true;
                } catch (e) {
                    this.warn('Could not save debug settings to localStorage:', e);
                    return false;
                }
            }
            this.warn('localStorage not available');
            return false;
        },
        
        /**
         * Clear debug settings from localStorage
         * @returns {boolean} Success status
         */
        clearFromLocalStorage() {
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.removeItem('enkel_debug');
                    localStorage.removeItem('enkel_debug_level');
                    // Use raw console.log since we need this message whether debug is enabled or not
                    console.log('[EnkelKlient] Debug settings cleared from localStorage');
                    return true;
                } catch (e) {
                    // Use raw console.warn since we need this message whether debug is enabled or not
                    console.warn('[EnkelKlient] Could not clear debug settings from localStorage:', e);
                    return false;
                }
            }
            // Use raw console.warn since we need this message whether debug is enabled or not
            console.warn('[EnkelKlient] localStorage not available');
            return false;
        }
    };
})();

/**
 * Auto-configure debug system based on environment
 */
(function initializeDebug() {
    // Check for debug flag in URL params first (takes priority)
    if (typeof window !== 'undefined' && window.location) {
        const urlParams = new URLSearchParams(window.location.search);
        const debugParam = urlParams.get('debug');
        
        if (debugParam !== null) {
            if (debugParam === 'clear') {
                // Clear debug settings from localStorage
                if (typeof localStorage !== 'undefined') {
                    try {
                        localStorage.removeItem('enkel_debug');
                        localStorage.removeItem('enkel_debug_level');
                        // Using raw console.log since Debug might be disabled
                        console.log('[EnkelKlient] Debug mode cleared from localStorage');
                    } catch (e) {
                        // Using raw console.warn since Debug might be disabled
                        console.warn('[EnkelKlient] Could not clear debug settings from localStorage:', e);
                    }
                }
                Debug.setEnabled(false);
                console.log('[EnkelKlient] Debug mode disabled and cleared');
                return; // Exit early, don't enable debug
            } else {
                // Enable debug and save to localStorage
                Debug.setEnabled(true);
                const level = (debugParam !== '1' && debugParam !== 'true' && debugParam !== '') ? debugParam : 'info';
                Debug.setLevel(level);
                
                // Save to localStorage for persistence
                if (typeof localStorage !== 'undefined') {
                    try {
                        localStorage.setItem('enkel_debug', 'true');
                        localStorage.setItem('enkel_debug_level', level);
                        Debug.info('Debug enabled via URL parameter and saved to localStorage', { level: Debug.getLevel() });
                    } catch (e) {
                        Debug.warn('Could not save debug settings to localStorage:', e);
                        Debug.info('Debug enabled via URL parameter (not persisted)', { level: Debug.getLevel() });
                    }
                } else {
                    Debug.info('Debug enabled via URL parameter (localStorage not available)', { level: Debug.getLevel() });
                }
                return; // URL param takes priority, don't check other sources
            }
        }
    }
    
    // Check for debug flag in localStorage (if no URL param)
    if (typeof localStorage !== 'undefined') {
        try {
            const localDebug = localStorage.getItem('enkel_debug');
            if (localDebug === 'true' || localDebug === '1') {
                Debug.setEnabled(true);
                const localLevel = localStorage.getItem('enkel_debug_level') || 'info';
                Debug.setLevel(localLevel);
                Debug.info('Debug enabled via localStorage', { level: Debug.getLevel() });
                return; // localStorage takes priority over global variable
            }
        } catch (e) {
            // localStorage might not be available in some environments
        }
    }
    
    // Check for global debug variable (lowest priority)
    if (typeof window !== 'undefined' && typeof window.ENKEL_DEBUG !== 'undefined' && window.ENKEL_DEBUG) {
        Debug.setEnabled(true);
        if (typeof window.ENKEL_DEBUG === 'string') {
            Debug.setLevel(window.ENKEL_DEBUG);
        }
        Debug.info('Debug enabled via global variable', { level: Debug.getLevel() });
    }
})();
