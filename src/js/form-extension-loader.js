/**
 * Extension Loader for FormHandler Core
 * Provides convenient methods to load and manage form extensions
 */

class FormExtensionLoader {
  constructor() {
    this.loadedExtensions = new Set();
    this.extensionPaths = {
      validation: '/src/js/extensions/form-validation.js',
      autoSave: '/src/js/extensions/form-autosave.js', 
      fileUpload: '/src/js/extensions/file-upload.js',
      accessibility: '/src/js/extensions/form-accessibility.js',
      confirmation: '/src/js/extensions/form-confirmation.js'
    };
  }

  /**
   * Load extensions dynamically based on form requirements
   * @param {Array} extensionNames - Array of extension names to load
   * @returns {Promise} Promise that resolves when all extensions are loaded
   */
  async loadExtensions(extensionNames) {
    const loadPromises = extensionNames.map(name => this.loadExtension(name));
    return Promise.all(loadPromises);
  }

  /**
   * Load a single extension
   * @param {string} extensionName - Name of the extension to load
   * @returns {Promise} Promise that resolves when extension is loaded
   */
  async loadExtension(extensionName) {
    if (this.loadedExtensions.has(extensionName)) {
      return Promise.resolve();
    }

    const path = this.extensionPaths[extensionName];
    if (!path) {
      console.warn(`Unknown extension: ${extensionName}`);
      return Promise.reject(new Error(`Extension ${extensionName} not found`));
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = path;
      script.onload = () => {
        this.loadedExtensions.add(extensionName);
        console.log(`✅ Loaded extension: ${extensionName}`);
        resolve();
      };
      script.onerror = () => {
        console.error(`❌ Failed to load extension: ${extensionName}`);
        reject(new Error(`Failed to load ${extensionName}`));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Create FormHandler with automatic extension loading
   * @param {Object} config - FormHandler configuration
   * @returns {Promise<FormHandler>} Promise that resolves to initialized FormHandler
   */
  async createFormHandler(config) {
    const extensionNames = Object.keys(config.extensions || {});
    
    if (extensionNames.length > 0) {
      console.log(`🔄 Loading extensions: ${extensionNames.join(', ')}`);
      await this.loadExtensions(extensionNames);
    }

    const formHandler = new FormHandler(config);
    console.log(`✅ FormHandler created for form: ${config.formId}`);
    return formHandler;
  }

  /**
   * Get recommended extensions for different form types
   * @param {string} formType - Type of form (simple, complex, upload, etc.)
   * @returns {Object} Recommended extension configuration
   */
  getRecommendedExtensions(formType) {
    const presets = {
      simple: {
        accessibility: {
          announceErrors: true,
          markRequired: true
        }
      },
      
      contact: {
        validation: {
          realTimeValidation: true,
          wcagCompliant: true
        },
        accessibility: {
          announceErrors: true,
          markRequired: true
        }
      },

      upload: {
        fileUpload: {
          required: true,
          allowedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png'],
          maxFileSizeMB: 10
        },
        validation: {
          realTimeValidation: true,
          wcagCompliant: true
        },
        accessibility: {
          announceErrors: true,
          markRequired: true
        }
      },

      complex: {
        validation: {
          realTimeValidation: true,
          wcagCompliant: true
        },
        autoSave: {
          interval: 30000
        },
        accessibility: {
          announceErrors: true,
          markRequired: true
        },
        confirmation: {
          showSummary: true,
          requireConfirmation: true
        }
      },

      helpdesk: {
        fileUpload: {
          required: false,
          allowedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png'],
          maxFileSizeMB: 10
        },
        validation: {
          realTimeValidation: true,
          wcagCompliant: true
        },
        accessibility: {
          announceErrors: true,
          markRequired: true
        }
      },

      invoice: {
        fileUpload: {
          required: true,
          allowedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
          maxFileSizeMB: 15
        },
        validation: {
          realTimeValidation: true,
          wcagCompliant: true
        },
        autoSave: {
          interval: 30000,
          storageKey: 'invoice_autosave'
        },
        accessibility: {
          announceErrors: true,
          markRequired: true
        }
      }
    };

    return presets[formType] || presets.simple;
  }

  /**
   * Quick setup for common form types
   * @param {string} formId - Form ID
   * @param {string} formType - Form type preset
   * @param {Object} overrides - Configuration overrides
   * @returns {Promise<FormHandler>} Configured FormHandler
   */
  async quickSetup(formId, formType = 'simple', overrides = {}) {
    const baseConfig = {
      formId: formId,
      redirectUrl: `${window.strBaseURL || ''}/${formId}`,
      extensions: this.getRecommendedExtensions(formType)
    };

    const config = this.deepMerge(baseConfig, overrides);
    return this.createFormHandler(config);
  }

  /**
   * Deep merge configuration objects
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * List all available extensions
   * @returns {Array} Array of available extension names
   */
  getAvailableExtensions() {
    return Object.keys(this.extensionPaths);
  }

  /**
   * Check if extension is loaded
   * @param {string} extensionName - Extension name to check
   * @returns {boolean} True if extension is loaded
   */
  isExtensionLoaded(extensionName) {
    return this.loadedExtensions.has(extensionName);
  }
}

// Create global instance
window.FormExtensionLoader = FormExtensionLoader;
window.formExtensionLoader = new FormExtensionLoader();
