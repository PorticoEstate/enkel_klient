/**
 * FormAccessibility Extension
 * Handles form-specific accessibility functionality using global accessibility helpers
 * Integrates with accessibility-helpers.js for unified accessibility management
 */

// Prevent multiple declarations
if (typeof FormAccessibilityExtension === 'undefined') {
  // Check for jQuery dependency
  if (typeof $ === 'undefined') {
    Debug.error('FormAccessibilityExtension requires jQuery');
  } else {
    class FormAccessibilityExtension {
      constructor(formHandler, options = {}) {
        if (!formHandler) {
          throw new Error('FormAccessibilityExtension requires a FormHandler instance');
        }
        
        this.formHandler = formHandler;
        this.options = {
          announceErrors: true,
          markRequired: true,
          setInitialFocus: true,
          enhanceKeyboardNavigation: true,
          announceDelay: 100,
          debounceDelay: 300,
          useGlobalHelpers: true,
          ...options
        };
        this.debounceTimers = new Map();
        this.observers = [];
        this.eventListeners = [];
        
        // Check if global accessibility helpers are available
        this.hasGlobalHelpers = typeof announceToScreenReader === 'function' && 
                                typeof makeInputsAccessible === 'function' &&
                                typeof createScreenReaderAnnouncer === 'function';
        
        // Additional global functions check for enhanced integration
        this.hasDropzoneHelper = typeof makeDropzoneAccessible === 'function';
        this.hasFormStatusHelper = typeof announceFormStatus === 'function';
        
        if (this.hasGlobalHelpers && this.options.useGlobalHelpers) {
          const helpers = [];
          if (typeof announceToScreenReader === 'function') helpers.push('announceToScreenReader');
          if (typeof makeInputsAccessible === 'function') helpers.push('makeInputsAccessible');
          if (typeof createScreenReaderAnnouncer === 'function') helpers.push('createScreenReaderAnnouncer');
          if (this.hasDropzoneHelper) helpers.push('makeDropzoneAccessible');
          if (this.hasFormStatusHelper) helpers.push('announceFormStatus');
          
          Debug.debug('FormAccessibilityExtension: Using global accessibility helpers:', helpers.join(', '));
        } else {
          Debug.debug('FormAccessibilityExtension: Using fallback implementations');
        }
        
        this.init();
      }
      
      init() {
        try {
          this.$form = this.formHandler.getForm();
          
          if (!this.$form || !this.$form.length) {
            Debug.warn('FormAccessibilityExtension: No form found');
            return;
          }

          this.createScreenReaderStatus();
          
          if (this.options.markRequired) {
            this.markRequiredFields();
          }
          
          this.setupAccessibilityFeatures();
          
          if (this.options.enhanceKeyboardNavigation) {
            this.setupKeyboardAccessibility();
          }
          
          if (this.options.setInitialFocus) {
            setTimeout(() => {
              this.setInitialFocus();
            }, 100);
          }

          // Add ARIA landmarks
          this.setupARIALandmarks();
          
        } catch (error) {
          Debug.error('FormAccessibilityExtension initialization failed:', error);
        }
      }

      createScreenReaderStatus() {
        // Use global helper if available and no form-specific status needed
        if (this.hasGlobalHelpers && typeof createScreenReaderAnnouncer === 'function') {
          createScreenReaderAnnouncer();
          return;
        }
        
        // Fallback: Create form-specific status regions
        if (!$('#form-status').length) {
          $('<div>', {
            id: 'form-status',
            'class': 'sr-only',
            'aria-live': 'polite',
            'aria-atomic': 'true'
          }).appendTo('body');
        }

        // Create assertive announcer for urgent messages
        if (!$('#form-status-assertive').length) {
          $('<div>', {
            id: 'form-status-assertive',
            'class': 'sr-only',
            'aria-live': 'assertive',
            'aria-atomic': 'true'
          }).appendTo('body');
        }
      }

      markRequiredFields() {
        if (!this.$form || !this.$form.length) return;
        
        this.$form.find(':required').each((index, element) => {
          const $field = $(element);
          const id = $field.attr('id');
          
          if (!id) {
            Debug.warn('Required field missing ID attribute', element);
            return;
          }
          
          const $label = $(`label[for="${id}"]`);
          
          if ($label.length) {
            $label.addClass('required');
            
            if (!$label.find('.required-field').length) {
              $label.append(' <span class="required-field" aria-hidden="true">*</span>');
            }
          }
          
          $field.attr({
            'aria-required': 'true',
            'aria-invalid': $field.attr('aria-invalid') || 'false'
          });

          // Add describedby for required fields
          const requiredHint = `${id}-required-hint`;
          if (!$(`#${requiredHint}`).length) {
            $('<span>', {
              id: requiredHint,
              'class': 'sr-only',
              text: 'Required field'
            }).insertAfter($field);
            
            const describedBy = $field.attr('aria-describedby') || '';
            $field.attr('aria-describedby', 
              describedBy ? `${describedBy} ${requiredHint}` : requiredHint
            );
          }
        });
      }

      setupAccessibilityFeatures() {
        // Use global helper to enhance form inputs if available
        if (this.hasGlobalHelpers && typeof makeInputsAccessible === 'function') {
          makeInputsAccessible(this.$form[0]);
        }
        
        // Enhanced field validation with accessibility features
        const invalidHandler = (e) => {
          const field = e.target;
          const $field = $(field);
          const id = $field.attr('id');
          
          if (!id) {
            Debug.warn('Field missing ID for accessibility features', field);
            return;
          }
          
          const $label = $(`label[for="${id}"]`);
          const fieldName = $label.text().trim().replace(/\*\s*$/, '') || 'Field';
          
          $field.attr('aria-invalid', 'true');
          
          // Create or update error message
          this.showFieldError(field, field.validationMessage || 'Invalid input');
          
          this.announceToScreenReader(`Validation error in ${fieldName}: ${field.validationMessage}`, true);
        };

        const validHandler = (e) => {
          const $field = $(e.target);
          if (e.target.validity && e.target.validity.valid) {
            $field.attr('aria-invalid', 'false');
            // Remove error message
            const errorId = $field.attr('id') + '-error';
            $(`#${errorId}`).remove();
            
            // Update aria-describedby
            const describedBy = $field.attr('aria-describedby') || '';
            const newDescribedBy = describedBy.replace(new RegExp(`\\b${errorId}\\b`, 'g'), '').trim();
            if (newDescribedBy) {
              $field.attr('aria-describedby', newDescribedBy);
            } else {
              $field.removeAttr('aria-describedby');
            }
          }
        };

        this.$form.find('input, select, textarea').on('invalid', invalidHandler);
        this.$form.find('input, select, textarea').on('input change', validHandler);
        
        this.eventListeners.push(
          { selector: 'input, select, textarea', event: 'invalid', handler: invalidHandler },
          { selector: 'input, select, textarea', event: 'input change', handler: validHandler }
        );

        this.enhanceFileUploadAccessibility();
        this.setupFieldDescriptions();
      }

      setupKeyboardAccessibility() {
        const skipLinkHandler = (e) => {
          e.preventDefault();
          const href = $(e.currentTarget).attr('href');
          const target = $(href);
          
          if (target.length) {
            target.attr('tabindex', '-1').focus();
          }
        };

        const keydownHandler = (e) => {
          if (e.key === 'Escape') {
            $(e.target).blur();
          }
          
          // Add Tab trapping for modal-like forms
          if (e.key === 'Tab' && this.$form.hasClass('modal-form')) {
            this.trapTabKey(e);
          }
        };

        $('.skip-link').on('click', skipLinkHandler);
        this.$form.find('button, a, input, select, textarea').on('keydown', keydownHandler);
        
        this.eventListeners.push(
          { selector: '.skip-link', event: 'click', handler: skipLinkHandler },
          { selector: 'button, a, input, select, textarea', event: 'keydown', handler: keydownHandler }
        );
      }

      trapTabKey(e) {
        const focusableElements = this.$form.find(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        ).filter(':visible');
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements.first();
        const lastElement = focusableElements.last();
        
        if (e.shiftKey) {
          if (document.activeElement === firstElement[0]) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement[0]) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }

      setInitialFocus() {
        try {
          const firstError = this.$form.find('[aria-invalid="true"]:visible').first();
          if (firstError.length) {
            firstError.focus();
            return;
          }
          
          const firstInput = this.$form.find('input:visible, select:visible, textarea:visible')
            .not('[disabled]')
            .first();
          if (firstInput.length) {
            firstInput.focus();
          }
        } catch (error) {
          Debug.warn('Could not set initial focus:', error);
        }
      }

      enhanceFileUploadAccessibility() {
        // Use global helper if available
        if (this.hasDropzoneHelper && this.options.useGlobalHelpers) {
          const $dropArea = this.$form.find('#drop-area, .drop-area, [data-drop-area]').first();
          const $fileInput = this.$form.find('#fileupload, input[type="file"]').first();
          
          if ($dropArea.length && $fileInput.length) {
            // Ensure elements have IDs for global helper
            let dropAreaId = $dropArea.attr('id');
            let fileInputId = $fileInput.attr('id');
            
            if (!dropAreaId) {
              dropAreaId = 'drop-area-' + Date.now();
              $dropArea.attr('id', dropAreaId);
            }
            
            if (!fileInputId) {
              fileInputId = 'fileupload-' + Date.now();
              $fileInput.attr('id', fileInputId);
            }
            
            makeDropzoneAccessible(dropAreaId, fileInputId);
          }
        } else {
          // Fallback implementation for standalone operation
          const $dropArea = this.$form.find('#drop-area, .drop-area, [data-drop-area]').first();
          if ($dropArea.length) {
            $dropArea.attr({
              'role': 'button',
              'tabindex': '0',
              'aria-label': 'Click or press Enter to select files for upload'
            }).on('keydown', function(e) {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const $fileInput = $(this).closest('form').find('input[type="file"]').first();
                if ($fileInput.length) {
                  $fileInput[0].click();
                }
              }
            });
          }
        }
        
        // File count monitoring (always apply as it's form-specific)
        const filesCount = document.getElementById('files-count');
        if (filesCount) {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.target.id === 'files-count') {
                const count = mutation.target.textContent;
                this.announceToScreenReader(`File count updated: ${count}`);
              }
            });
          });
          
          observer.observe(filesCount, {
            childList: true,
            characterData: true,
            subtree: true
          });
          
          this.observers.push(observer);
        }
      }

      setupARIALandmarks() {
        if (!this.$form.attr('role')) {
          this.$form.attr('role', 'form');
        }
        
        // Add form description if available
        const formDescription = this.$form.find('.form-description').first();
        if (formDescription.length) {
          const descId = 'form-description-' + Date.now();
          formDescription.attr('id', descId);
          this.$form.attr('aria-describedby', descId);
        }
      }

      setupFieldDescriptions() {
        this.$form.find('[data-description]').each((index, element) => {
          const $field = $(element);
          const description = $field.data('description');
          const fieldId = $field.attr('id');
          
          if (!fieldId) {
            Debug.warn('Field with description missing ID attribute', element);
            return;
          }
          
          const descId = fieldId + '-desc';
          
          if (!$(`#${descId}`).length && description) {
            $('<div>', {
              id: descId,
              'class': 'field-description sr-only',
              text: description
            }).insertAfter($field);
            
            const describedBy = $field.attr('aria-describedby') || '';
            $field.attr('aria-describedby', 
              describedBy ? `${describedBy} ${descId}` : descId
            );
          }
        });
      }

      showFieldError(field, message) {
        const $field = $(field);
        const fieldId = $field.attr('id');
        
        if (!fieldId) {
          Debug.warn('Cannot show error for field without ID', field);
          return;
        }
        
        const errorId = fieldId + '-error';
        
        // Remove existing error
        $(`#${errorId}`).remove();
        
        // Create new error message
        $('<div>', {
          id: errorId,
          'class': 'field-error',
          'role': 'alert',
          text: message
        }).insertAfter($field);
        
        // Update aria-describedby
        const describedBy = $field.attr('aria-describedby') || '';
        if (!describedBy.includes(errorId)) {
          $field.attr('aria-describedby', 
            describedBy ? `${describedBy} ${errorId}` : errorId
          );
        }
      }

      announceToScreenReader(message, isUrgent = false) {
        if (!message || typeof message !== 'string') {
          Debug.warn('Invalid message for screen reader announcement');
          return;
        }
        
        // Direct implementation to avoid recursion
        this._createScreenReaderAnnouncement(message, isUrgent);
      }
      
      _createScreenReaderAnnouncement(message, isUrgent = false) {
        // Sanitize message to prevent XSS
        const sanitizedMessage = message.replace(/[<>]/g, '');
        
        const statusElId = isUrgent ? 'form-status-assertive' : 'form-status';
        const statusEl = document.getElementById(statusElId);
        
        if (!statusEl) {
          Debug.warn('Screen reader status element not found');
          return;
        }
        
        // Clear previous message for better detection
        statusEl.textContent = '';
        
        // Use a small delay to ensure screen readers pick up the change
        setTimeout(() => {
          statusEl.textContent = sanitizedMessage;
          
          // Clear message after a delay to allow re-announcing same message
          setTimeout(() => {
            statusEl.textContent = '';
          }, 1000);
        }, this.options.announceDelay);
      }

      // Debounced version for frequent updates
      announceToScreenReaderDebounced(message, key = 'default', isUrgent = false) {
        if (this.debounceTimers.has(key)) {
          clearTimeout(this.debounceTimers.get(key));
        }
        
        const timer = setTimeout(() => {
          this.announceToScreenReader(message, isUrgent);
          this.debounceTimers.delete(key);
        }, this.options.debounceDelay);
        
        this.debounceTimers.set(key, timer);
      }

      // Hook methods for form events
      beforeSubmit() {
        if (this.options.announceErrors) {
          // Use global form status helper if available
          if (this.hasFormStatusHelper && typeof announceFormStatus === 'function') {
            announceFormStatus('Form is being submitted, please wait...', this.$form.attr('id'));
          } else {
            this.announceToScreenReader('Form is being submitted, please wait...');
          }
        }
        return true;
      }

      afterSuccess(data) {
        if (this.options.announceErrors) {
          // Use global form status helper if available
          if (this.hasFormStatusHelper && typeof announceFormStatus === 'function') {
            announceFormStatus('Form submitted successfully', this.$form.attr('id'));
          } else {
            this.announceToScreenReader('Form submitted successfully', true);
          }
        }
      }

      afterError(xhr, status, error) {
        if (this.options.announceErrors) {
          const message = xhr.responseJSON?.message || 'Form submission failed. Please check for errors and try again.';
          // Use global form status helper if available
          if (this.hasFormStatusHelper && typeof announceFormStatus === 'function') {
            announceFormStatus(message, this.$form.attr('id'));
          } else {
            this.announceToScreenReader(message, true);
          }
        }
      }

      // Utility methods for enhanced accessibility
      
      /**
       * Get the current accessibility configuration status
       * @returns {Object} Configuration status object
       */
      getAccessibilityStatus() {
        return {
          hasGlobalHelpers: this.hasGlobalHelpers,
          hasDropzoneHelper: this.hasDropzoneHelper,
          hasFormStatusHelper: this.hasFormStatusHelper,
          useGlobalHelpers: this.options.useGlobalHelpers,
          formId: this.$form?.attr('id'),
          observerCount: this.observers.length,
          eventListenerCount: this.eventListeners.length
        };
      }
      
      /**
       * Manually trigger screen reader announcement (for external use)
       * @param {string} message - Message to announce
       * @param {boolean} isUrgent - Whether to use assertive priority
       */
      announce(message, isUrgent = false) {
        this.announceToScreenReader(message, isUrgent);
      }
      
      /**
       * Check if a field has accessibility enhancements
       * @param {string|HTMLElement|jQuery} field - Field identifier, element, or jQuery object
       * @returns {boolean} Whether the field has accessibility enhancements
       */
      isFieldAccessible(field) {
        const $field = typeof field === 'string' ? $(`#${field}`) : $(field);
        
        return $field.length > 0 && (
          $field.attr('aria-describedby') ||
          $field.attr('aria-labelledby') ||
          $field.attr('aria-label') ||
          $field.prev('label[for="' + $field.attr('id') + '"]').length > 0
        );
      }
      
      /**
       * Refresh accessibility features for dynamically added form elements
       * @param {jQuery} $container - Container with new elements (defaults to form)
       */
      refreshAccessibility($container = null) {
        const $target = $container || this.$form;
        
        if (!$target || !$target.length) return;
        
        // Re-apply global helpers if available
        if (this.hasGlobalHelpers && this.options.useGlobalHelpers) {
          if (typeof makeInputsAccessible === 'function') {
            makeInputsAccessible($target[0]);
          }
        }
        
        // Re-apply required field marking
        if (this.options.markRequired) {
          this.markRequiredFields();
        }
        
        // Re-apply field descriptions
        this.setupFieldDescriptions();
      }

      // Cleanup method
      destroy() {
        try {
          // Disconnect observers
          this.observers.forEach(observer => observer.disconnect());
          this.observers = [];
          
          // Clear debounce timers
          this.debounceTimers.forEach(timer => clearTimeout(timer));
          this.debounceTimers.clear();
          
          // Remove event listeners
          this.eventListeners.forEach(({ selector, event, handler }) => {
            if (this.$form && this.$form.length) {
              this.$form.find(selector).off(event, handler);
            }
          });
          this.eventListeners = [];
          
          // Only remove status elements if we're using fallback implementations
          // Don't remove global status elements managed by accessibility-helpers.js
          if (!this.hasGlobalHelpers || !this.options.useGlobalHelpers) {
            $('#form-status, #form-status-assertive').remove();
          }
        } catch (error) {
          Debug.error('Error during FormAccessibilityExtension cleanup:', error);
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
}