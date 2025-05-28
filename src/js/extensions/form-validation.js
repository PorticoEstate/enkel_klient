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
    console.log('🔍 FormValidationExtension initialized with options:', this.options);
    this.init();
  }

  init() {
    // Register beforeSubmit hook for validation
    this.formHandler.addHook('beforeSubmit', (formData) => {
      return this.beforeSubmit(formData);
    });

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
    console.log('🔍 Setting up real-time validation for form:', form.attr('id'));
    
    // Setup location validator if both fields exist
    this.setupLocationValidator();
    
    // Real-time validation on input (as user types)
    form.find('input, textarea').on('input.realTimeValidation', (e) => {
      console.log('📝 Input event triggered for:', e.target.id || e.target.name);
      // Add slight delay to avoid excessive validation while typing
      clearTimeout($(e.target).data('validation-timeout'));
      const timeout = setTimeout(() => {
        console.log('⏱️ Validating field after delay:', e.target.id || e.target.name);
        this.validateField(e.target);
      }, 300); // 300ms delay
      $(e.target).data('validation-timeout', timeout);
    });
    
    // Immediate validation on blur and change for all form elements
    form.find('input, textarea, select').on('blur.realTimeValidation change.realTimeValidation', (e) => {
      console.log('🎯 Blur/change event triggered for:', e.target.id || e.target.name);
      // Clear any pending input validation timeout
      clearTimeout($(e.target).data('validation-timeout'));
      this.validateField(e.target);
    });
    
    // Special handling for radio buttons and checkboxes
    form.find('input[type="radio"], input[type="checkbox"]').on('change.realTimeValidation', (e) => {
      console.log('☑️ Radio/checkbox change event triggered for:', e.target.id || e.target.name);
      this.validateField(e.target);
    });
    
    console.log('✅ Real-time validation setup complete');
  }

  setupAccessibility() {
    // Extract WCAG compliance features
    const form = this.formHandler.getForm();
    form.find('input[required]').attr('aria-required', 'true');
    // Add other accessibility features
  }

  validateField(field) {
    try {
      const $field = $(field);
      console.log('🔍 validateField called for:', $field.attr('id') || $field.attr('name'));
      
      if (!$field.length) return true;
      
      const value = $field.val();
      const fieldType = $field.attr('type');
      const isRequired = $field.attr('required') !== undefined;
      
      let isValid = true;
      let errorMessage = '';
      
      // Check required fields
      if (isRequired && (!value || value.trim() === '')) {
        isValid = false;
        errorMessage = this.getRequiredFieldMessage($field);
      }
      // Validate email fields
      else if (fieldType === 'email' && value && !this.isValidEmail(value)) {
        isValid = false;
        errorMessage = this.getEmailValidationMessage();
      }
      // Validate phone fields
      else if ((fieldType === 'tel' || $field.attr('name').includes('phone')) && value && !this.isValidPhone(value)) {
        isValid = false;
        errorMessage = this.getPhoneValidationMessage();
      }
      // Validate location field (checks if location_code has a value)
      else if ($field.attr('id') === 'location_name' && value && !this.isValidLocation($field)) {
        isValid = false;
        errorMessage = this.getLocationValidationMessage();
      }
      // Use HTML5 validation if available
      else if (field.validity && !field.validity.valid) {
        isValid = false;
        errorMessage = field.validationMessage || 'Invalid input';
      }
      
      // Update field appearance
      if (isValid) {
        this.markFieldValid($field);
      } else {
        this.markFieldInvalid($field, errorMessage);
      }
      
      return isValid;
    } catch (error) {
      console.warn('Error validating field:', error);
      return true; // Assume valid on error to avoid blocking
    }
  }

  // Critical beforeSubmit hook - required by FormHandlerCore
  beforeSubmit() {
    console.log('🔍 Validation extension beforeSubmit hook called');
    const isValid = this.isValid();
    console.log('📋 Form validation result:', isValid);
    
    if (!isValid) {
      const errors = this.getErrors();
      console.log('❌ Validation errors:', errors);
      this.displayErrors(errors);
    }
    
    return isValid;
  }

  // Public API
  isValid() {
    try {
      const form = this.formHandler.getForm();
      if (!form || !form.length) {
        console.warn('No form found for validation');
        return false;
      }

      let isValid = true;
      let errorCount = 0;
      const processedRadioGroups = new Set();

      // Check required radio button groups first (special handling needed)
      form.find('input[type="radio"][required]').each((index, field) => {
        const $field = $(field);
        const name = $field.attr('name');
        
        // Skip if we've already processed this radio group
        if (processedRadioGroups.has(name)) {
          return;
        }
        processedRadioGroups.add(name);
        
        // Check if any radio button in this group is selected
        const $radioGroup = form.find(`input[type="radio"][name="${name}"]`);
        const isAnySelected = $radioGroup.is(':checked');
        
        if (!isAnySelected) {
          // Mark all radio buttons in group as invalid
          $radioGroup.each((i, radio) => {
            this.markFieldInvalid($(radio), this.getRequiredFieldMessage($(radio)));
          });
          isValid = false;
          errorCount++;
        } else {
          // Mark all radio buttons in group as valid
          $radioGroup.each((i, radio) => {
            this.markFieldValid($(radio));
          });
        }
      });

      // Check other required fields (excluding radio buttons already processed)
      form.find('[required]').not('input[type="radio"]').each((index, field) => {
        const $field = $(field);
        const fieldType = $field.attr('type');
        let value = $field.val();
        
        // Handle checkboxes
        if (fieldType === 'checkbox') {
          value = $field.is(':checked') ? $field.val() : '';
        }
        
        if (!value || value.trim() === '') {
          this.markFieldInvalid($field, this.getRequiredFieldMessage($field));
          isValid = false;
          errorCount++;
        } else {
          this.markFieldValid($field);
        }
      });

      // Validate specific field types
      form.find('input[type="email"]').each((index, field) => {
        const $field = $(field);
        const value = $field.val();
        
        if (value && !this.isValidEmail(value)) {
          this.markFieldInvalid($field, this.getEmailValidationMessage());
          isValid = false;
          errorCount++;
        }
      });

      form.find('input[type="tel"], input[name*="phone"]').each((index, field) => {
        const $field = $(field);
        const value = $field.val();
        
        if (value && !this.isValidPhone(value)) {
          this.markFieldInvalid($field, this.getPhoneValidationMessage());
          isValid = false;
          errorCount++;
        }
      });

      console.log(`Validation completed: ${isValid ? 'VALID' : 'INVALID'} (${errorCount} errors)`);
      return isValid;

    } catch (error) {
      console.error('Error during form validation:', error);
      return false; // Fail safe - don't allow submission if validation fails
    }
  }

  getErrors() {
    const errors = [];
    const form = this.formHandler.getForm();
    const processedRadioGroups = new Set();
    
    if (!form || !form.length) {
      return ['Form not found'];
    }

    // Collect all validation errors with field information
    form.find('.is-invalid').each((index, field) => {
      const $field = $(field);
      const fieldType = $field.attr('type');
      const fieldId = $field.attr('id');
      const fieldName = this.getFieldLabel($field);
      const errorMessage = $field.attr('data-validation-error') || 'is invalid';
      
      // Handle radio button groups - only add one error per group
      if (fieldType === 'radio') {
        const name = $field.attr('name');
        if (processedRadioGroups.has(name)) {
          return; // Skip - already processed this radio group
        }
        processedRadioGroups.add(name);
        
        // Get the fieldset legend or first radio button's label for group name
        const $fieldset = $field.closest('fieldset');
        let groupName = fieldName;
        if ($fieldset.length) {
          const $legend = $fieldset.find('legend');
          if ($legend.length) {
            groupName = $legend.text().trim();
          }
        }
        
        // Use the first radio button's ID for linking
        errors.push({
          fieldId: fieldId,
          fieldName: groupName,
          message: errorMessage,
          fullMessage: `${groupName} ${errorMessage}`
        });
      } else {
        // Regular field error
        errors.push({
          fieldId: fieldId,
          fieldName: fieldName,
          message: errorMessage,
          fullMessage: `${fieldName} ${errorMessage}`
        });
      }
    });

    return errors;
  }

  // Helper methods
  markFieldValid($field) {
    $field.removeClass('is-invalid').addClass('is-valid')
          .attr('aria-invalid', 'false')
          .removeAttr('data-validation-error');
          
    // Remove any existing error message
    const fieldId = $field.attr('id');
    if (fieldId) {
      $(`#${fieldId}-error`).remove();
    }
  }

  markFieldInvalid($field, message) {
    $field.removeClass('is-valid').addClass('is-invalid')
          .attr('aria-invalid', 'true')
          .attr('data-validation-error', message);
          
    // Add error message if not exists
    const fieldId = $field.attr('id');
    if (fieldId && !$(`#${fieldId}-error`).length) {
      const $errorElement = $(`<div id="${fieldId}-error" class="invalid-feedback" role="alert">${message}</div>`);
      $field.after($errorElement);
      $field.attr('aria-describedby', `${fieldId}-error`);
    }
  }

  displayErrors(errors) {
    // Remove any existing error summary
    this.formHandler.getForm().find('.validation-error-summary').remove();
    
    if (errors.length === 0) {
      return;
    }

    // Get translations if available
    const translations = window.translations || {};
    const errorSummaryTitle = translations.form_validation_errors || 'Please correct the following errors:';

    // Create error summary with clickable links
    const errorList = errors.map(error => {
      if (typeof error === 'object' && error.fieldId) {
        return `<li><a href="#${error.fieldId}" onclick="document.getElementById('${error.fieldId}').focus(); return false;">${error.fullMessage}</a></li>`;
      } else {
        // Fallback for string errors
        return `<li>${error}</li>`;
      }
    }).join('');

    const $errorSummary = $(`
      <div class="validation-error-summary alert alert-danger" role="alert" tabindex="-1">
        <h3 class="h6" id="error-summary-title">${errorSummaryTitle}</h3>
        <ul class="mb-0" aria-labelledby="error-summary-title">
          ${errorList}
        </ul>
      </div>
    `);

    // Insert at top of form
    this.formHandler.getForm().prepend($errorSummary);
    
    // Focus on error summary for accessibility
    $errorSummary.focus();

    // Announce to screen readers
    const errorCount = errors.length;
    const message = `${errorCount} validation error${errorCount !== 1 ? 's' : ''} found. Please review and correct the highlighted fields.`;
    
    // Use FormHandler's screen reader announcement if available
    if (typeof this.formHandler.announceToScreenReader === 'function') {
      this.formHandler.announceToScreenReader(message);
    } else {
      this.announceToScreenReader(message);
    }
  }

  getFieldLabel($field) {
    const fieldId = $field.attr('id');
    const fieldName = $field.attr('name');
    
    // Try to find label by 'for' attribute
    if (fieldId) {
      const $label = $(`label[for="${fieldId}"]`);
      if ($label.length) {
        return $label.text().trim().replace('*', '');
      }
    }
    
    // Try to find closest label
    const $closestLabel = $field.closest('.form-group, .field-group').find('label').first();
    if ($closestLabel.length) {
      return $closestLabel.text().trim().replace('*', '');
    }
    
    // Fallback to field name or id
    return fieldName || fieldId || 'Field';
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone) {
    // Remove all non-digit characters and check length
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 8;
  }
  
  isValidLocation($field) {
    // Location validation requires both location_name and location_code fields
    const locationName = $field.val();
    const locationCode = $("#location_code").val();
    
    console.log('🏙️ Location validation - name:', locationName, 'code:', locationCode);
    return locationName && 
           locationName.trim() !== "" && 
           locationCode && 
           locationCode.trim() !== "";
  }

  // Translation helper methods
  getRequiredFieldMessage($field) {
    // Try to get translated message, fallback to English
    const translations = window.translations || {};
    return translations.field_required || 'is required';
  }

  getEmailValidationMessage() {
    const translations = window.translations || {};
    return translations.invalid_email || 'Please enter a valid email address';
  }

  getPhoneValidationMessage() {
    const translations = window.translations || {};
    return translations.invalid_phone || 'Please enter a valid phone number (minimum 8 digits)';
  }
  
  getLocationValidationMessage() {
    const translations = window.translations || {};
    return translations.invalid_location || 'Please select a valid location from the list';
  }

  announceToScreenReader(message) {
    // Fallback screen reader announcement
    let $status = $('#form-validation-status');
    if (!$status.length) {
      $status = $('<div id="form-validation-status" class="sr-only" aria-live="polite"></div>');
      $('body').append($status);
    }
    $status.text(message);
  }
  
  setupLocationValidator() {
    try {
      const form = this.formHandler.getForm();
      const locationCodeInput = form.find('#location_code')[0];
      const locationNameField = form.find('#location_name')[0];
      
      if (locationCodeInput && locationNameField) {
        console.log('🏙️ Setting up location validator for', locationNameField.id);
        
        // Monitor changes to the location_code field
        $(locationCodeInput).on('change input', () => {
          console.log('🏙️ Location code changed:', locationCodeInput.value);
          this.validateField(locationNameField);
        });
        
        // Use MutationObserver for programmatic changes to the location_code field
        const observer = new MutationObserver(() => {
          console.log('🏙️ Location code modified via DOM mutation');
          this.validateField(locationNameField);
        });
        
        // Observe the value attribute and DOM changes
        observer.observe(locationCodeInput, {
          attributes: true,
          attributeFilter: ['value'],
          childList: false,
          subtree: false
        });
      }
    } catch (error) {
      console.error('❌ Error setting up location validator:', error);
    }
  }
}

// Register extension
if (typeof FormHandler !== 'undefined') {
  FormHandler.registerExtension = FormHandler.registerExtension || function(name, extensionClass) {
    this.extensions = this.extensions || {};
    this.extensions[name] = extensionClass;
  };
  FormHandler.registerExtension('validation', FormValidationExtension);
}
}
