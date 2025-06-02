/**
 * Extension Loader for FormHandler Core
 * Provides convenient methods to load and manage form extensions
 */

class FormExtensionLoader {
  constructor() {
    this.loadedExtensions = new Set();
    this.loadedDependencies = new Set();
    this.configurationSources = new Map(); // Cache for loaded configurations
    this.extensionPaths = {
      validation: `${window.strBaseURL || ''}/src/js/extensions/form-validation.js`,
      autoSave: `${window.strBaseURL || ''}/src/js/extensions/form-autosave.js`, 
      fileUpload: `${window.strBaseURL || ''}/src/js/extensions/file-upload.js`,
      accessibility: `${window.strBaseURL || ''}/src/js/extensions/form-accessibility.js`,
      confirmation: `${window.strBaseURL || ''}/src/js/extensions/form-confirmation.js`,
    };
    
    // Define dependencies for extensions
    this.extensionDependencies = {
      fileUpload: [
        `${window.strBaseURL || ''}/src/js/file-upload/js/vendor/jquery.ui.widget.js`,
        `${window.strBaseURL || ''}/src/js/file-upload/js/jquery.iframe-transport.js`,
        `${window.strBaseURL || ''}/src/js/file-upload/js/jquery.fileupload.js`,
        `${window.strBaseURL || ''}/src/js/file-upload/js/jquery.fileupload-process.js`,
        `${window.strBaseURL || ''}/src/js/file-upload/js/jquery.fileupload-validate.js`
      ]
    };
  }

  /**
   * Load dependencies for an extension
   * @param {string} extensionName - Name of the extension
   * @returns {Promise} Promise that resolves when all dependencies are loaded
   */
  async loadDependencies(extensionName) {
    const dependencies = this.extensionDependencies[extensionName];
    if (!dependencies || dependencies.length === 0) {
      return Promise.resolve();
    }

    // Load dependencies sequentially to ensure proper order
    for (const url of dependencies) {
      await this.loadDependency(url);
    }
  }

  /**
   * Load a single dependency (script)
   * @param {string} url - URL of the dependency
   * @returns {Promise} Promise that resolves when dependency is loaded
   */
  async loadDependency(url) {
    if (this.loadedDependencies.has(url)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        this.loadedDependencies.add(url);
        console.log(`✅ Loaded dependency: ${url}`);
        resolve();
      };
      script.onerror = () => {
        console.error(`❌ Failed to load dependency: ${url}`);
        reject(new Error(`Failed to load dependency ${url}`));
      };
      document.head.appendChild(script);
    });
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

    // Load dependencies first
    await this.loadDependencies(extensionName);

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
      // Define loading order to ensure validation runs before confirmation
      const loadOrder = ['validation', 'accessibility', 'autoSave', 'fileUpload', 'confirmation'];
      const orderedExtensions = [];
      
      // Add extensions in the predefined order
      loadOrder.forEach(name => {
        if (extensionNames.includes(name)) {
          orderedExtensions.push(name);
        }
      });
      
      // Add any remaining extensions not in the predefined order
      extensionNames.forEach(name => {
        if (!orderedExtensions.includes(name)) {
          orderedExtensions.push(name);
        }
      });
      
      console.log(`🔄 Loading extensions: ${orderedExtensions.join(', ')}`);
      await this.loadExtensions(orderedExtensions);
    }

    const formHandler = new FormHandler(config);
    console.log(`✅ FormHandler created for form: ${config.formId}`);
    return formHandler;
  }

  /**
   * Get minimal fallback extensions for forms without dynamic configuration
   * @deprecated Most forms now use dynamic configuration. This serves as emergency fallback only.
   * @param {string} formType - Type of form (simple, complex, upload, etc.)
   * @returns {Object} Minimal fallback extension configuration
   */
  getRecommendedExtensions(formType) {
    console.log(`⚠️ Using fallback preset for ${formType} - consider adding dynamic configuration`);
    
    // Minimal fallback - all forms get basic accessibility and validation
    const minimalFallback = {
      accessibility: {
        announceErrors: true,
        markRequired: true
      },
      validation: {
        realTimeValidation: true,
        wcagCompliant: true
      }
    };

    // Only keep essential presets for forms that truly need them
    const limitedPresets = {
      simple: minimalFallback,
      
      // Legacy fallback for forms not yet migrated to dynamic configuration
      upload: {
        ...minimalFallback,
        fileUpload: {
          required: false,
          allowedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png'],
          maxFileSizeMB: 10
        }
      }
    };

    return limitedPresets[formType] || minimalFallback;
  }

  /**
   * Load form configuration from multiple sources dynamically
   * Priority: 1. Data attributes, 2. JavaScript config files, 3. Twig template configs, 4. Hardcoded presets
   * @param {string} formId - Form ID to get configuration for
   * @returns {Object} Configuration object for the form
   */
  async loadFormConfiguration(formId) {
    // Check cache first
    if (this.configurationSources.has(formId)) {
      console.log(`📋 Using cached configuration for ${formId}`);
      return this.configurationSources.get(formId);
    }

    let config = {};

    // 1. Try loading from data attributes on the form element
    const dataAttrConfig = this.loadConfigFromDataAttributes(formId);
    if (dataAttrConfig && Object.keys(dataAttrConfig).length > 0) {
      config = this.deepMerge(config, dataAttrConfig);
      console.log(`📋 Loaded configuration from data attributes for ${formId}:`, dataAttrConfig);
    }

    // 2. Try loading from dedicated JavaScript configuration file
    const jsConfig = await this.loadConfigFromJavaScriptFile(formId);
    if (jsConfig && Object.keys(jsConfig).length > 0) {
      config = this.deepMerge(config, jsConfig);
      console.log(`📋 Loaded configuration from JavaScript file for ${formId}:`, jsConfig);
    }

    // 3. Check for Twig template configuration (already loaded via window.formConfigs)
    const twigConfig = this.loadConfigFromTwigTemplate(formId);
    if (twigConfig && Object.keys(twigConfig).length > 0) {
      config = this.deepMerge(config, twigConfig);
      console.log(`📋 Loaded configuration from Twig template for ${formId}:`, twigConfig);
    }

    // 4. Final fallback to minimal presets if no dynamic configuration found
    if (Object.keys(config).length === 0) {
      config = this.getRecommendedExtensions(formId);
      console.log(`📋 No dynamic configuration found for ${formId}, using minimal fallback preset`);
      console.log(`💡 Consider adding a dynamic configuration file at /src/js/config/forms/${formId}.js`);
    } else {
      console.log(`✅ Dynamic configuration successfully loaded for ${formId}`);
    }

    // Cache the final configuration
    this.configurationSources.set(formId, config);
    return config;
  }

  /**
   * Load configuration from data attributes on the form element
   * Example: <form data-form-config='{"validation": {"realTimeValidation": true}}'>
   * @param {string} formId - Form ID
   * @returns {Object} Configuration from data attributes
   */
  loadConfigFromDataAttributes(formId) {
    const formElement = document.getElementById(formId);
    if (!formElement) {
      console.log(`⚠️ Form element with ID "${formId}" not found for data attribute configuration`);
      return {};
    }

    try {
      // Check for JSON configuration in data-form-config attribute
      const configAttr = formElement.getAttribute('data-form-config');
      if (configAttr) {
        const config = JSON.parse(configAttr);
        console.log(`✅ Found data-form-config attribute for ${formId}`);
        return config;
      }

      // Check for individual extension configurations
      const config = {};
      const extensionNames = Object.keys(this.extensionPaths);
      
      extensionNames.forEach(extensionName => {
        const attrName = `data-${extensionName.toLowerCase()}-config`;
        const extensionConfig = formElement.getAttribute(attrName);
        if (extensionConfig) {
          try {
            config[extensionName] = JSON.parse(extensionConfig);
            console.log(`✅ Found ${attrName} attribute for ${formId}`);
          } catch (error) {
            console.warn(`⚠️ Invalid JSON in ${attrName} for ${formId}:`, error);
          }
        }
      });

      // Check for simple boolean flags
      const booleanFlags = [
        { attr: 'data-form-summary', key: 'confirmation', prop: 'showSummary' },
        { attr: 'data-confirmation-dialog', key: 'confirmation', prop: 'showDialog' },
        { attr: 'data-auto-save', key: 'autoSave', prop: 'enabled' },
        { attr: 'data-real-time-validation', key: 'validation', prop: 'realTimeValidation' },
        { attr: 'data-file-upload', key: 'fileUpload', prop: 'enabled' }
      ];

      booleanFlags.forEach(({ attr, key, prop }) => {
        if (formElement.hasAttribute(attr)) {
          const value = formElement.getAttribute(attr);
          config[key] = config[key] || {};
          config[key][prop] = value === 'true' || value === '1';
          console.log(`✅ Found ${attr} attribute for ${formId}: ${config[key][prop]}`);
        }
      });

      return config;
    } catch (error) {
      console.error(`❌ Error parsing data attributes for ${formId}:`, error);
      return {};
    }
  }

  /**
   * Load configuration from a dedicated JavaScript file
   * Looks for files like: /config/forms/{formId}.js or /src/js/config/{formId}-config.js
   * @param {string} formId - Form ID
   * @returns {Promise<Object>} Configuration from JavaScript file
   */
  async loadConfigFromJavaScriptFile(formId) {
    const configPaths = [
      `${window.strBaseURL || ''}/src/js/config/forms/${formId}.js`,
      `${window.strBaseURL || ''}/src/js/config/${formId}-config.js`
    ];

    for (const path of configPaths) {
      try {
        console.log(`🔍 Checking for configuration file: ${path}`);
        
        // Try to load the configuration file
        const response = await fetch(path);
        if (response.ok) {
          const configText = await response.text();
          
          // Execute the configuration script in a safe context
          const configFunction = new Function('formId', 'FormExtensionLoader', configText + '\nreturn typeof getFormConfig === "function" ? getFormConfig(formId) : {};');
          const config = configFunction(formId, this);
          
          if (config && Object.keys(config).length > 0) {
            console.log(`✅ Loaded configuration from ${path} for ${formId}`);
            return config;
          }
        }
      } catch (error) {
        // Silently continue to next path - this is expected behavior
        console.log(`⚠️ Configuration file not found or invalid: ${path}`);
      }
    }

    return {};
  }

  /**
   * Load configuration from Twig template (via window.formConfigs)
   * @param {string} formId - Form ID
   * @returns {Object} Configuration from Twig template
   */
  loadConfigFromTwigTemplate(formId) {
    if (typeof window.formConfigs !== 'undefined' && window.formConfigs[formId]) {
      const twigConfig = window.formConfigs[formId];
      
      // Convert Twig configuration to extension configuration format
      const config = {};

      // Map Twig config properties to extension configurations
      if (twigConfig.form_summary_on_submit === true || twigConfig.form_summary_on_submit === 'true') {
        config.confirmation = config.confirmation || {};
        config.confirmation.showSummary = true;
      }

      if (twigConfig.confirmation_dialog_enabled === true || twigConfig.confirmation_dialog_enabled === 'true') {
        config.confirmation = config.confirmation || {};
        config.confirmation.showDialog = true;
      }

      if (twigConfig.auto_save_enabled === true || twigConfig.auto_save_enabled === 'true') {
        config.autoSave = config.autoSave || {};
        config.autoSave.interval = 30000;
        config.autoSave.storageKey = `${formId}_autosave`;
      }

      if (twigConfig.enable_fileupload === true || twigConfig.enable_fileupload === 'true') {
        config.fileUpload = config.fileUpload || {};
        config.fileUpload.required = false;
      }

      if (twigConfig.change_tracking_enabled === true || twigConfig.change_tracking_enabled === 'true') {
        config.accessibility = config.accessibility || {};
        config.accessibility.trackChanges = true;
      }

      // Always enable accessibility and validation for WCAG compliance
      config.accessibility = config.accessibility || {};
      config.accessibility.announceErrors = true;
      config.accessibility.markRequired = true;

      config.validation = config.validation || {};
      config.validation.realTimeValidation = true;
      config.validation.wcagCompliant = true;

      return config;
    }

    return {};
  }

  /**
   * Quick setup for common form types
   * @param {string} formId - Form ID
   * @param {string} formType - Form type preset
   * @param {Object} overrides - Configuration overrides
   * @returns {Promise<FormHandler>} Configured FormHandler
   */
  async quickSetup(formId, formType = 'simple', overrides = {}) {
    // Load configuration dynamically
    const dynamicConfig = await this.loadFormConfiguration(formId);
    
    const baseConfig = {
      formId: formId,
      redirectUrl: `${window.strBaseURL || ''}/${formId}`,
      extensions: dynamicConfig
    };

    // Apply minimal fallback configuration only if no dynamic configuration exists
    if (Object.keys(dynamicConfig).length === 0) {
      baseConfig.extensions = this.getRecommendedExtensions(formType);
      console.log(`📋 No dynamic configuration found for ${formId}, using minimal fallback: ${formType}`);
      console.log(`💡 For better performance and features, consider creating: /src/js/config/forms/${formId}.js`);
    } else {
      console.log(`✅ Using dynamic configuration for ${formId}, found ${Object.keys(dynamicConfig).length} extension configurations`);
    }

    const config = this.deepMerge(baseConfig, overrides);
    console.log(`📋 Final configuration for ${formId}:`, config);
    
    return this.createFormHandler(config);
  }

  /**
   * Apply form configuration from window.formConfigs for WCAG 3.3.4 compliance
   * @deprecated Use loadFormConfiguration() instead for better flexibility
   * @param {string} formId - Form ID to check configuration for
   * @param {Object} config - Base configuration to modify
   */
  applyFormConfiguration(formId, config) {
    console.log(`⚠️ applyFormConfiguration() is deprecated. Use loadFormConfiguration() instead.`);
    
    if (typeof window.formConfigs !== 'undefined' && window.formConfigs[formId]) {
      const formConfig = window.formConfigs[formId];
      console.log(`📋 Applying legacy form configuration for ${formId}:`, formConfig);

      // WCAG 3.3.4 Error Prevention: Form Summary
      if (formConfig.form_summary_on_submit === true) {
        console.log(`✅ Enabling form summary for ${formId} (WCAG 3.3.4)`);
        config.extensions.confirmation = config.extensions.confirmation || {};
        config.extensions.confirmation.showSummary = true;
      }

      // WCAG 3.3.4 Error Prevention: Confirmation Dialog
      if (formConfig.confirmation_dialog_enabled === true) {
        console.log(`✅ Enabling confirmation dialog for ${formId} (WCAG 3.3.4)`);
        config.extensions.confirmation = config.extensions.confirmation || {};
        config.extensions.confirmation.showDialog = true;
      }

      // Auto-save configuration
      if (formConfig.auto_save_enabled === true) {
        console.log(`✅ Enabling auto-save for ${formId}`);
        config.extensions.autoSave = config.extensions.autoSave || {};
        config.extensions.autoSave.interval = 30000;
        config.extensions.autoSave.storageKey = `${formId}_autosave`;
      }

      // File upload configuration
      if (formConfig.enable_fileupload === true) {
        console.log(`✅ Enabling file upload for ${formId}`);
        config.extensions.fileUpload = config.extensions.fileUpload || {};
      }

      console.log(`📋 Final extension configuration for ${formId}:`, config.extensions);
    } else {
      console.log(`⚠️ No form configuration found for ${formId} in window.formConfigs`);
    }
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
