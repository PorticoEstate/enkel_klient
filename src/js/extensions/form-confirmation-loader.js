/**
 * FormConfirmation Module Loader
 * Dynamically loads and initializes all form confirmation modules in the correct order
 */

(function() {
  'use strict';
  
  // Track loaded modules
  const loadedModules = new Set();
  const moduleLoadPromises = new Map();
  
  // Module dependencies and load order
  const moduleConfig = {
    'form-confirmation-core': {
      path: '/src/js/extensions/form-confirmation-core.js',
      dependencies: [],
      globalVar: 'FormConfirmationCore'
    },
    'form-confirmation-ui': {
      path: '/src/js/extensions/form-confirmation-ui.js', 
      dependencies: [],
      globalVar: 'FormConfirmationUI'
    },
    'form-confirmation-phases': {
      path: '/src/js/extensions/form-confirmation-phases.js',
      dependencies: ['form-confirmation-core'],
      globalVar: 'FormConfirmationPhases'
    },
    'form-confirmation-uploads': {
      path: '/src/js/extensions/form-confirmation-uploads.js',
      dependencies: [],
      globalVar: 'FormConfirmationUploads'
    }
  };
  
  /**
   * Load a JavaScript module dynamically
   */
  function loadModule(moduleId) {
    if (loadedModules.has(moduleId)) {
      return Promise.resolve();
    }
    
    if (moduleLoadPromises.has(moduleId)) {
      return moduleLoadPromises.get(moduleId);
    }
    
    const config = moduleConfig[moduleId];
    if (!config) {
      return Promise.reject(new Error(`Unknown module: ${moduleId}`));
    }
    
    // Load dependencies first
    const dependencyPromises = config.dependencies.map(dep => loadModule(dep));
    
    const loadPromise = Promise.all(dependencyPromises).then(() => {
      return new Promise((resolve, reject) => {
        // Check if module is already loaded globally
        if (config.globalVar && window[config.globalVar]) {
          loadedModules.add(moduleId);
          resolve();
          return;
        }
        
        const script = document.createElement('script');
        script.src = config.path;
        script.onload = () => {
          loadedModules.add(moduleId);
          Debug.debug(`FormConfirmation: Loaded module ${moduleId}`);
          resolve();
        };
        script.onerror = () => {
          reject(new Error(`Failed to load module: ${moduleId} from ${config.path}`));
        };
        
        document.head.appendChild(script);
      });
    });
    
    moduleLoadPromises.set(moduleId, loadPromise);
    return loadPromise;
  }
  
  /**
   * Load all form confirmation modules
   */
  async function loadAllModules() {
    try {
      Debug.debug('FormConfirmation: Starting module loading...');
      
      // Load modules in dependency order
      const moduleIds = Object.keys(moduleConfig);
      await Promise.all(moduleIds.map(moduleId => loadModule(moduleId)));
      
      Debug.debug('FormConfirmation: All modules loaded successfully');
      return true;
    } catch (error) {
      Debug.error('FormConfirmation: Module loading failed:', error);
      return false;
    }
  }
  
  /**
   * Initialize the modular FormConfirmation system
   */
  async function initializeModularFormConfirmation() {
    Debug.debug('FormConfirmation: Initializing modular system...');
    
    // Load all modules first
    const modulesLoaded = await loadAllModules();
    
    if (!modulesLoaded) {
      Debug.warn('FormConfirmation: Some modules failed to load, falling back to monolithic version');
      return false;
    }
    
    // Verify all required globals are available
    const requiredGlobals = ['FormConfirmationCore', 'FormConfirmationUI', 'FormConfirmationPhases', 'FormConfirmationUploads'];
    const missingGlobals = requiredGlobals.filter(global => !window[global]);
    
    if (missingGlobals.length > 0) {
      Debug.warn('FormConfirmation: Missing module globals:', missingGlobals);
      return false;
    }
    
    // Load the modular entry point
    try {
      const entryScript = document.createElement('script');
      entryScript.src = '/src/js/extensions/form-confirmation-modular.js';
      
      await new Promise((resolve, reject) => {
        entryScript.onload = resolve;
        entryScript.onerror = reject;
        document.head.appendChild(entryScript);
      });
      
      Debug.debug('FormConfirmation: Modular system initialized successfully');
      return true;
    } catch (error) {
      Debug.error('FormConfirmation: Failed to load modular entry point:', error);
      return false;
    }
  }
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModularFormConfirmation);
  } else {
    initializeModularFormConfirmation();
  }
  
  // Export for manual initialization if needed
  window.FormConfirmationLoader = {
    loadAllModules,
    initializeModularFormConfirmation,
    loadedModules: () => Array.from(loadedModules)
  };
  
})();
