/**
 * Form Validation Extension
 * Handles real-time validation, WCAG compliance, and accessibility
 */

// Prevent multiple declarations
if (typeof FormValidationExtension === 'undefined') {
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
    try {
      const $field = $(field);
      if (!$field.length) return true;
      
      const fieldElement = $field[0];
      let isValid = true;
      
      // Basic HTML5 validation
      if (fieldElement.checkValidity) {
        isValid = fieldElement.checkValidity();
      }
      
      // Additional custom validation could go here
      
      // Update field appearance based on validation
      if (isValid) {
        $field.removeClass('is-invalid').addClass('is-valid');
      } else {
        $field.removeClass('is-valid').addClass('is-invalid');
      }
      
      return isValid;
    } catch (error) {
      console.warn('Error validating field:', error);
      return true; // Assume valid on error
    }
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
  // Register extension (only if not already registered)
  if (typeof FormHandler !== 'undefined') {
    FormHandler.registerExtension = FormHandler.registerExtension || function(name, extensionClass) {
      this.extensions = this.extensions || {};
      this.extensions[name] = extensionClass;
    };
    FormHandler.registerExtension('validation', FormValidationExtension);
  }
}
