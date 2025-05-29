/**
 * FormAccessibility Extension
 * Handles all accessibility-related functionality
 */

// Prevent multiple declarations
if (typeof FormAccessibilityExtension === 'undefined') {
  class FormAccessibilityExtension {
    constructor(formHandler, options = {}) {
      this.formHandler = formHandler;
      this.options = {
        announceErrors: true,
        markRequired: true,
        setInitialFocus: true,
        enhanceKeyboardNavigation: true,
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
      
      // Initialize keyboard accessibility features
      if (this.options.enhanceKeyboardNavigation) {
        this.setupKeyboardAccessibility();
      }
      
      // Set initial focus if option is enabled
      if (this.options.setInitialFocus) {
        // Slight delay to ensure form is fully rendered
        setTimeout(() => {
          this.setInitialFocus();
        }, 100);
      }
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
        
        if ($label.length) {
          // Add required class to label
          $label.addClass('required');
          
          // Add visual indicator if not already present
          if (!$label.find('.required-field').length) {
            $label.append(' <span class="required-field" aria-hidden="true">*</span>');
          }
        }
        
        // Add aria-required attribute
        $(this).attr('aria-required', 'true');
        
        // Initialize aria-invalid as false
        if (!$(this).attr('aria-invalid')) {
          $(this).attr('aria-invalid', 'false');
        }
      });
    }

    setupAccessibilityFeatures() {
      // Enhanced field validation with accessibility features
      this.$form.find('input, select, textarea').on('invalid', (e) => {
        const field = e.target;
        const id = $(field).attr('id');
        const $label = $('label[for="' + id + '"]');
        const fieldName = $label.text().trim();
        
        // Set aria-invalid
        $(field).attr('aria-invalid', 'true');
        
        // Update screen reader status
        this.announceToScreenReader(`Validation error: ${fieldName}`);
      });
      
      // Reset aria-invalid on input
      this.$form.find('input, select, textarea').on('input change', function() {
        if (this.validity && this.validity.valid) {
          $(this).attr('aria-invalid', 'false');
        }
      });

      // Enhance file upload accessibility if present
      this.enhanceFileUploadAccessibility();
    }

    setupKeyboardAccessibility() {
      // Add skip to form handling
      $('.skip-link').on('click', function(e) {
        e.preventDefault();
        const target = $($(this).attr('href'));
        
        // Focus without setting tabindex
        target.focus();
      });

      // Enhanced keyboard navigation for interactive elements
      this.$form.find('button, a, input, select, textarea').on('keydown', (e) => {
        // Custom keyboard handling can be added here
        if (e.key === 'Escape') {
          // Allow escape to blur focus
          $(e.target).blur();
        }
      });
    }

    setInitialFocus() {
      try {
        const firstInput = this.$form.find('input:visible, select:visible, textarea:visible')
          .not('[disabled]')
          .first();
        if (firstInput.length) {
          firstInput.focus();
        }
      } catch (error) {
        console.warn('Could not focus on first field:', error);
      }
    }

    enhanceFileUploadAccessibility() {
      // Make the file upload area keyboard accessible
      const $dropArea = this.$form.find('#drop-area');
      if ($dropArea.length) {
        $dropArea.attr('role', 'button')
          .attr('tabindex', '0')
          .on('keydown', function(e) {
            // Trigger file input dialog on Enter or Space
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              $('#fileupload').click();
            }
          });
      }
        
      // Setup observer for file count changes if element exists
      const filesCount = document.getElementById('files-count');
      if (filesCount) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.target.id === 'files-count') {
              this.announceToScreenReader(`File count: ${mutation.target.textContent}`);
            }
          });
        });
        
        // Start observing
        observer.observe(filesCount, {
          childList: true,
          characterData: true,
          subtree: true
        });
      }
    }

    announceToScreenReader(message) {
      const statusEl = document.getElementById('form-status');
      if (statusEl) {
        statusEl.textContent = message;
      }
    }

    // Hook methods for form events
    beforeSubmit() {
      if (this.options.announceErrors) {
        this.announceToScreenReader('Form is being submitted, please wait...');
      }
      return true;
    }

    afterSuccess(data) {
      if (this.options.announceErrors) {
        this.announceToScreenReader('Form submitted successfully');
      }
    }

    afterError(xhr, status, error) {
      if (this.options.announceErrors) {
        this.announceToScreenReader('Form submission failed. Please check for errors and try again.');
      }
    }
  }

  // Register extension with FormHandler
  if (typeof FormHandler !== 'undefined') {
    FormHandler.extensions = FormHandler.extensions || {};
    FormHandler.extensions.accessibility = FormAccessibilityExtension;
  }

  window.FormAccessibilityExtension = FormAccessibilityExtension;
}
