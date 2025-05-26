/**
 * FormAccessibility Extension
 * Handles all accessibility-related functionality
 */

class FormAccessibilityExtension {
  constructor(formHandler, options = {}) {
    this.formHandler = formHandler;
    this.options = {
      announceErrors: true,
      markRequired: true,
      ...options
    };
    this.init();
  }
  
  init() {
    this.$form = this.formHandler.getForm();
    
    this.createScreenReaderStatus();
    if (this.options.markRequired) {
      this.markRequiredFields();
    }
    this.setupAccessibilityFeatures();
  }
  
  createScreenReaderStatus() {
    if (!$('#form-status').length) {
      $('<div>', {
        id: 'form-status',
        'class': 'sr-only',
        'aria-live': 'polite'
      }).appendTo('body');
    }
  }
  
  markRequiredFields() {
    this.$form.find(':required').each(function() {
      const id = $(this).attr('id');
      const $label = $('label[for="' + id + '"]');
      
      if ($label.length && !$label.find('.required-field').length) {
        $label.addClass('required')
          .append(' <span class="required-field" aria-hidden="true">*</span>');
      }
      
      $(this).attr('aria-required', 'true')
        .attr('aria-invalid', 'false');
    });
  }
  
  setupAccessibilityFeatures() {
    // Enhanced validation feedback
    this.$form.find('input, select, textarea').on('invalid', (e) => {
      const field = e.target;
      $(field).attr('aria-invalid', 'true');
      this.announceToScreenReader(`Validation error in ${this.getFieldLabel(field)}`);
    });
    
    // Reset on valid input
    this.$form.find('input, select, textarea').on('input change', function() {
      if (this.validity && this.validity.valid) {
        $(this).attr('aria-invalid', 'false');
      }
    });
  }
  
  getFieldLabel(field) {
    const id = $(field).attr('id');
    const $label = $('label[for="' + id + '"]');
    return $label.length ? $label.text().trim() : id;
  }
  
  announceToScreenReader(message) {
    const statusEl = document.getElementById('form-status');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }
}

// Register the extension
FormHandler.registerExtension('accessibility', FormAccessibilityExtension);

window.FormAccessibilityExtension = FormAccessibilityExtension;
