/**
 * Debug System Usage Examples
 * 
 * This file demonstrates how to use the centralized debug system
 * in your EnkelKlient application.
 */

// Example usage of debug functions
function exampleUsage() {
    // Basic logging
    Debug.info('Application started');
    Debug.debug('Processing user data', { userId: 123, action: 'login' });
    Debug.warn('Deprecated function called', { function: 'oldFunction' });
    Debug.error('Failed to load resource', { resource: 'user-data.json', error: 'Network timeout' });
    
    // Dump complex objects
    const userData = {
        id: 123,
        name: 'John Doe',
        preferences: {
            theme: 'dark',
            language: 'en'
        }
    };
    Debug.dump('User Data Object', userData);
    
    // Time function execution
    const result = Debug.time('Database Query', () => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000000; i++) {
            sum += i;
        }
        return sum;
    });
    
    Debug.info('Function completed', { result });
}

// Configuration examples
function configurationExamples() {
    // Enable debug mode programmatically
    Debug.setEnabled(true);
    Debug.setLevel('debug');
    Debug.setPrefix('[MyApp]');
    
    // Check current settings
    Debug.debug('Debug enabled:', Debug.isEnabled());
    Debug.debug('Current level:', Debug.getLevel());
}

/**
 * How to enable debug mode:
 * 
 * 1. URL Parameter:
 *    - ?debug=true (enables with 'info' level)
 *    - ?debug=trace (enables with 'trace' level)
 *    - ?debug=debug (enables with 'debug' level)
 * 
 * 2. localStorage:
 *    localStorage.setItem('enkel_debug', 'true');
 *    localStorage.setItem('enkel_debug_level', 'debug');
 * 
 * 3. Global Variable:
 *    window.ENKEL_DEBUG = true;
 *    window.ENKEL_DEBUG = 'trace'; // with specific level
 * 
 * 4. Programmatically:
 *    Debug.setEnabled(true);
 *    Debug.setLevel('debug');
 */

// Export for use in other modules (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { exampleUsage, configurationExamples };
}
