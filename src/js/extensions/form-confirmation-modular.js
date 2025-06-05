/**
 * FormConfirmation Extension - Modular Entry Point
 * Handles WCAG 3.3.4 confirmation features (summary and dialogs)
 * 
 * This is the new modular version that combines functionality from:
 * - form-confirmation-core.js (core logic and lifecycle)
 * - form-confirmation-ui.js (UI generation and styling)
 * - form-confirmation-phases.js (two-phase submission process)
 * - form-confirmation-uploads.js (file upload handling)
 */

// Define the class only if it doesn't exist already
var FormConfirmationExtension = FormConfirmationExtension || (function() {
  
  // Import the modular components
  // These will be mixed into the main class to provide functionality
  
  return class FormConfirmationExtension {
    constructor(formHandler, options = {}) {
      this.formHandler = formHandler;
      this.$form = formHandler.getForm();
      this.options = {
        showSummary: false,
        showDialog: false,
        ...options
      };
      
      // Form state tracking
      this.recordId = null;
      this.isFormLocked = false;
      this.formData = null;
      this.$currentModal = null;
      
      // Mix in functionality from modules
      this.mixinModules();
      
      // Initialize immediately since we have formHandler
      this.init();
    }
    
  /**
   * Mix in functionality from the modular components
   */
  mixinModules() {
    Debug.debug('🔧 FormConfirmationExtension: Starting module mixin process');
    
    // Mix in core functionality
    if (typeof FormConfirmationCore !== 'undefined') {
      Debug.debug('✅ FormConfirmationCore found, mixing in');
      Object.assign(this, FormConfirmationCore);
    } else {
      Debug.warn('❌ FormConfirmationCore not found');
    }
    
    // Mix in UI functionality
    if (typeof FormConfirmationUI !== 'undefined') {
      Debug.debug('✅ FormConfirmationUI found, mixing in');
      Object.assign(this, FormConfirmationUI);
    } else {
      Debug.warn('❌ FormConfirmationUI not found');
    }
    
    // Mix in phases functionality
    if (typeof FormConfirmationPhases !== 'undefined') {
      Debug.debug('✅ FormConfirmationPhases found, mixing in');
      Object.assign(this, FormConfirmationPhases);
    } else {
      Debug.warn('❌ FormConfirmationPhases not found');
    }
    
    // Mix in uploads functionality
    if (typeof FormConfirmationUploads !== 'undefined') {
      Debug.debug('✅ FormConfirmationUploads found, mixing in');
      Object.assign(this, FormConfirmationUploads);
    } else {
      Debug.warn('❌ FormConfirmationUploads not found');
    }
    
    Debug.debug('🔧 FormConfirmationExtension: Module mixin complete');
  }
    
    /**
     * Initialize form confirmation features
     * This method will be overridden by the core module if available
     */
    init() {
      // Initialize form confirmation features  
      if (this.options.showSummary || this.options.showDialog) {
        this.setupConfirmationFlow();
      }
      
      // Make sure styles are added early
      if (this.options.showSummary) {
        this.addStyles();
      }
    }
    
    /**
     * Setup confirmation flow
     * This method will be overridden by the core module if available
     */
    setupConfirmationFlow() {
      // Use beforeSubmit hook instead of intercepting click
      // This allows validation to run first
      this.formHandler.addHook('beforeSubmit', (formData) => {
        return this.handleConfirmationBeforeSubmit(formData);
      });
      
      // Add click handler for the submit button
      const $submitBtn = this.$form.find('button[type="submit"], input[type="submit"]');
      if ($submitBtn.length) {
        $submitBtn.on('click', (e) => {
          // Let the form validation and the hook handle this
        });
      }
    }
    
    /**
     * Handle confirmation before submit hook
     * This method will be overridden by the core module if available
     */
    handleConfirmationBeforeSubmit(formData) {
      // If dialog mode is enabled, show confirmation dialog
      if (this.options.showDialog) {
        return this.showConfirmationDialog(formData);
      }
      
      // If summary mode is enabled, show form summary
      if (this.options.showSummary) {
        return this.showFormSummary(formData);
      }
      
      // If neither mode is enabled, proceed normally
      return Promise.resolve(true);
    }
    
    /**
     * Fallback implementations for core methods
     * These will be overridden by the actual modules if they're loaded
     */
    
    showFormSummary(formData) {
      console.warn('FormConfirmation: UI module not loaded, cannot show form summary');
      return Promise.resolve(true);
    }
    
    showConfirmationDialog(formData) {
      console.warn('FormConfirmation: UI module not loaded, cannot show confirmation dialog');
      return Promise.resolve(true);
    }
    
    addStyles() {
      console.warn('FormConfirmation: UI module not loaded, cannot add styles');
    }
    
    runPhase1() {
      console.warn('FormConfirmation: Phases module not loaded, cannot run phase 1');
      return Promise.resolve();
    }
    
    runPhase2() {
      console.warn('FormConfirmation: Phases module not loaded, cannot run phase 2');
      return Promise.resolve();
    }
    
    uploadFiles() {
      console.warn('FormConfirmation: Uploads module not loaded, cannot upload files');
      return Promise.resolve();
    }
    
    countFiles() {
      console.warn('FormConfirmation: Uploads module not loaded, cannot count files');
      return 0;
    }
    
    /**
     * Utility methods that don't depend on modules
     */
    
    getTranslation(key, defaultValue) {
      // Use global translation function if available
      if (typeof __ === 'function') {
        return __(key);
      }
      
      // Fallback to default value
      return defaultValue || key;
    }
    
    isFormEditable() {
      return !this.isFormLocked;
    }
    
    canCloseModal() {
      return this.isFormEditable();
    }
    
    clearAutosaveData() {
      try {
        const autosaveExt = this.formHandler.getExtension('autosave');
        if (autosaveExt && typeof autosaveExt.clearData === 'function') {
          autosaveExt.clearData();
          Debug.debug('FormConfirmation: Cleared autosave data');
        }
      } catch (e) {
        Debug.warn('FormConfirmation: Could not clear autosave data:', e);
      }
    }
  };
})();

// Register the extension if FormHandler is available
if (typeof FormHandler !== 'undefined' && FormHandler.registerExtension) {
  FormHandler.registerExtension('confirmation', FormConfirmationExtension);
}
