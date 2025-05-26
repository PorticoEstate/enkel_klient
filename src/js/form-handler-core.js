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
    
    // Initialize
    this.init();
  }

  init() {
    this.setupFormSubmission();
    this.loadExtensions();
  }

  // Extension management
  loadExtensions() {
    Object.keys(this.extensionOptions).forEach(extensionName => {
      this.loadExtension(extensionName, this.extensionOptions[extensionName]);
    });
  }

  loadExtension(name, options = {}) {
    const ExtensionClass = FormHandler.extensions?.[name];
    if (ExtensionClass) {
      const extension = new ExtensionClass(this, options);
      this.extensions.set(name, extension);
      console.log(`Loaded extension: ${name}`);
    } else {
      console.warn(`Extension not found: ${name}`);
    }
  }

  getExtension(name) {
    return this.extensions.get(name);
  }

  // Enhanced form submission with extension hooks
  setupFormSubmission() {
    this.$form.on('submit', (e) => {
      e.preventDefault();
      
      // Pre-submit hooks
      if (!this.executeHook('beforeSubmit')) {
        return false;
      }
      
      this.submitForm();
    });
  }

  executeHook(hookName, ...args) {
    let result = true;
    this.extensions.forEach((extension) => {
      if (typeof extension[hookName] === 'function') {
        const hookResult = extension[hookName](...args);
        if (hookResult === false) {
          result = false;
        }
      }
    });
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
}

// Static extension registry
FormHandler.extensions = {};

FormHandler.registerExtension = function(name, extensionClass) {
  this.extensions[name] = extensionClass;
  console.log(`Registered extension: ${name}`);
};

window.FormHandler = FormHandler;
