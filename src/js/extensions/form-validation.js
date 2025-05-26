/**
 * Form Validation Extension
 * Handles real-time validation, WCAG compliance, and accessibility
 */
class FormValidationExtension {
  constructor(formHandler, options = {}) {
    this.formHandler = formHandler;
    this.options = {
      realTimeValidation: options.realTimeValidation || false,
      wcagCompliant: options.wcagCompliant || true,
      ...options
    };
    this.init();
  }

  init() {
    if (this.options.realTimeValidation) {
      this.setupRealTimeValidation();
    }
    if (this.options.wcagCompliant) {
      this.setupAccessibility();
    }
  }

  setupRealTimeValidation() {
    // Extract validation logic from bloated version
    const form = this.formHandler.getForm();
    form.find('input, textarea, select').on('blur change', (e) => {
      this.validateField(e.target);
    });
  }

  setupAccessibility() {
    // Extract WCAG compliance features
    const form = this.formHandler.getForm();
    form.find('input[required]').attr('aria-required', 'true');
    // Add other accessibility features
  }

  validateField(field) {
    // Individual field validation logic
    // Much simpler than the bloated version
  }

  // Public API
  isValid() {
    // Return overall form validity
  }

  getErrors() {
    // Return validation errors
  }
}

// Register extension
FormHandler.registerExtension = function(name, extensionClass) {
  this.extensions = this.extensions || {};
  this.extensions[name] = extensionClass;
};

FormHandler.registerExtension('validation', FormValidationExtension);
