/**
 * FormHandler - Core functionality only
 * Lightweight, focused form handler for basic operations
 * 
 * Created: May 26, 2025
 * Focuses only on essential form handling without bloat
 */

class FormHandler {
  constructor(options) {
    // Required options
    this.formId = options.formId;
    this.redirectUrl = options.redirectUrl || `${strBaseURL}/${this.formId}`;
    this.uploadUrl = options.uploadUrl || `${strBaseURL}/${this.formId}/upload`;
    
    // DOM elements
    this.$form = $('#' + this.formId);
    this.form = document.getElementById(this.formId);
    
    // Extensions system
    this.extensions = new Map();
    this.extensionOptions = options.extensions || {};
    
    // Hook system
    this.hooks = new Map();
    
    // Initialize
    this.init();
  }

  init() {
    this.setupFormSubmission();
    this.loadExtensions();
  }

  // Extension management
  loadExtensions() {
    console.log('🔍 Loading extensions. extensionOptions:', this.extensionOptions);
    console.log('🔍 Available extensions:', Object.keys(FormHandler.extensions || {}));
    
    // Define hook registration order to ensure validation runs before confirmation
    const extensionOrder = ['validation', 'accessibility', 'autoSave', 'fileUpload', 'confirmation'];
    
    // Load extensions in correct order first
    extensionOrder.forEach(extensionName => {
      if (this.extensionOptions[extensionName]) {
        console.log(`🔍 Loading extension: ${extensionName} with options:`, this.extensionOptions[extensionName]);
        this.loadExtension(extensionName, this.extensionOptions[extensionName]);
      }
    });
    
    // Load any remaining extensions not in the predefined order
    Object.keys(this.extensionOptions).forEach(extensionName => {
      if (!extensionOrder.includes(extensionName)) {
        console.log(`🔍 Loading extension: ${extensionName} with options:`, this.extensionOptions[extensionName]);
        this.loadExtension(extensionName, this.extensionOptions[extensionName]);
      }
    });
  }

  loadExtension(name, options = {}) {
    console.log(`🔍 loadExtension called for: ${name} with options:`, options);
    const ExtensionClass = FormHandler.extensions?.[name];
    console.log(`🔍 ExtensionClass found for ${name}:`, !!ExtensionClass);
    if (ExtensionClass) {
      console.log(`🔍 Creating new ${name} extension instance...`);
      const extension = new ExtensionClass(this, options);
      this.extensions.set(name, extension);
      console.log(`✅ Loaded extension: ${name}`);
    } else {
      console.warn(`❌ Extension not found: ${name}`);
      console.warn(`Available extensions:`, Object.keys(FormHandler.extensions || {}));
    }
  }

  getExtension(name) {
    return this.extensions.get(name);
  }

  // Enhanced form submission with extension hooks
  setupFormSubmission() {
    this.$form.on('submit', (e) => {
      e.preventDefault();
      console.log('🚀 Form submission initiated');
      
      // Create form data for hooks
      const formData = new FormData(this.form);
      console.log('📝 Form data created:', formData);
      
      // Pre-submit hooks
      console.log('🔍 Executing beforeSubmit hooks...');
      const hookResult = this.executeHook('beforeSubmit', formData);
      console.log('📋 beforeSubmit hooks result:', hookResult);
      
      if (!hookResult) {
        console.log('❌ Form submission blocked by beforeSubmit hooks');
        return false;
      }
      
      console.log('✅ All beforeSubmit hooks passed, proceeding with submission');
      this.submitForm();
    });
  }

  // Hook system
  addHook(hookName, callback) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName).push(callback);
  }

  removeHook(hookName, callback) {
    if (this.hooks.has(hookName)) {
      const callbacks = this.hooks.get(hookName);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  executeHook(hookName, ...args) {
    console.log(`🎯 Executing hook: ${hookName}`);
    let result = true;
    
    // Execute registered hook callbacks
    if (this.hooks.has(hookName)) {
      const callbacks = this.hooks.get(hookName);
      console.log(`📋 Found ${callbacks.length} registered callbacks for ${hookName}`);
      
      for (let i = 0; i < callbacks.length; i++) {
        const callback = callbacks[i];
        try {
          console.log(`🔄 Executing callback ${i + 1}/${callbacks.length} for ${hookName}`);
          const hookResult = callback(...args);
          console.log(`✅ Callback ${i + 1} result:`, hookResult);
          
          if (hookResult === false) {
            console.log(`❌ Callback ${i + 1} returned false, stopping execution`);
            result = false;
            break; // Stop executing remaining callbacks
          }
        } catch (error) {
          console.error(`Error in hook ${hookName} callback ${i + 1}:`, error);
          result = false;
          break; // Stop on error too
        }
      }
    }
    
    // Also execute extension hook methods (for backward compatibility)
    // Only if registered callbacks haven't already failed
    if (result !== false) {
      this.extensions.forEach((extension, name) => {
        if (typeof extension[hookName] === 'function') {
          try {
            console.log(`🔧 Executing extension method ${hookName} on ${name}`);
            const hookResult = extension[hookName](...args);
            console.log(`✅ Extension ${name} ${hookName} result:`, hookResult);
            
            if (hookResult === false) {
              console.log(`❌ Extension ${name} ${hookName} returned false, blocking execution`);
              result = false;
              return false; // Stop forEach iteration
            }
          } catch (error) {
            console.error(`Error in extension hook ${hookName} on ${name}:`, error);
            result = false;
            return false; // Stop forEach iteration
          }
        }
      });
    }
    
    console.log(`🏁 Hook ${hookName} final result:`, result);
    return result;
  }
  
  submitForm() {
    const formData = new FormData(this.form);
    const requestUrl = this.$form.attr("action");
    
    $.ajax({
      cache: false,
      contentType: false,
      processData: false,
      type: 'POST',
      url: `${requestUrl}?phpgw_return_as=json`,
      data: formData,
      success: (data) => this.handleSuccess(data),
      error: (xhr, status, error) => this.handleError(xhr, status, error)
    });
  }
  
  handleSuccess(data) {
    // Post-success hooks
    this.executeHook('afterSuccess', data);
    
    if (data && data.status === "saved") {
      window.location.href = this.redirectUrl;
    } else if (data && data.message) {
      this.showErrors(data.message);
    }
  }
  
  handleError(xhr, status, error) {
    console.error('Submission error:', error);
    
    // Post-error hooks
    this.executeHook('afterError', xhr, status, error);
    
    this.showErrors(['A technical error occurred. Please try again.']);
  }
  
  showErrors(messages) {
    const $alert = $('<div class="alert alert-danger" role="alert"></div>');
    messages.forEach(msg => $alert.append($('<p></p>').text(msg)));
    this.$form.prepend($alert);
  }
  
  // Minimal API for extensions
  getForm() { return this.$form; }
  getFormElement() { return this.form; }
  getFormId() { return this.formId; }
  
  // Validation compatibility method
  validateField(field) {
    // Delegate to validation extension if available
    const validationExtension = this.getExtension('validation');
    if (validationExtension && typeof validationExtension.validateField === 'function') {
      return validationExtension.validateField(field);
    } else {
      // Fallback: trigger change event to activate any validation listeners
      if (field && field.trigger) {
        field.trigger('change');
      }
      return true; // Assume valid if no validation extension
    }
  }
}

// Static extension registry
FormHandler.extensions = {};

FormHandler.registerExtension = function(name, extensionClass) {
  this.extensions[name] = extensionClass;
  console.log(`Registered extension: ${name}`);
};

window.FormHandler = FormHandler;
