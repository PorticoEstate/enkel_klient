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
  
  /**
   * Setup comprehensive keyboard accessibility features
   */
  setupKeyboardAccessibility() {
    console.log('🔤 Setting up keyboard accessibility features');
    
    // Setup autocomplete keyboard accessibility
    this.setupAutocompleteKeyboardSupport();
    
    // Setup rich text editor accessibility
    this.setupRichTextEditorAccessibility();
    
    // Setup form section navigation
    this.setupKeyboardSectionNavigation();
    
    // Setup keyboard support for custom components
    this.setupCustomComponentKeyboardSupport();
  }
  
  /**
   * Set focus on the first available input field
   */
  setInitialFocus() {
    try {
      console.log('🔤 Setting initial focus on form');
      
      // First check for a field with data-initial-focus attribute
      let focusField = this.$form.find('[data-initial-focus="true"]').first();
      
      if (focusField.length && !focusField.prop('disabled') && focusField.is(':visible')) {
        console.log('🔤 Found explicit initial focus field:', focusField.attr('id'));
        focusField.focus();
        return;
      }
      
      // Check for location field - common in many forms
      focusField = this.$form.find('#location_name');
      if (focusField.length && !focusField.prop('disabled') && focusField.is(':visible')) {
        console.log('🔤 Setting focus on location field');
        focusField.focus();
        return;
      }
      
      // Find first visible input field
      focusField = this.$form.find('input:visible:not([type=hidden]):not([readonly]), select:visible, textarea:visible')
        .not('[tabindex="-1"]')
        .filter(':enabled')
        .first();
      
      if (focusField.length) {
        console.log('🔤 Setting focus on first available field:', focusField.attr('id') || focusField.attr('name'));
        focusField.focus();
      } else {
        console.log('🔤 No focusable fields found');
      }
    } catch (error) {
      console.error('❌ Error setting initial focus:', error);
    }
  }
  
  /**
   * Setup keyboard support for autocomplete results
   * Works with various autocomplete libraries including jQuery UI and autoComplete.js
   */
  setupAutocompleteKeyboardSupport() {
    try {
      const selectors = [
        '.autoComplete_wrapper ul', 
        '.autoComplete_result', 
        '.ui-autocomplete li', 
        '[role="listbox"] [role="option"]',
        '.dropdown-menu .dropdown-item' // Bootstrap dropdowns
      ].join(', ');
      
      $(document).on('keydown', selectors, (e) => {
        const key = e.which || e.keyCode;

        // Enter or Space: select item
        if (key === 13 || key === 32) {
          e.preventDefault();
          $(document.activeElement).click();
        }
        
        // Escape key: dismiss dropdown and return focus
        if (key === 27) {
          e.preventDefault();
          const $input = $(e.target).closest('.autoComplete_wrapper, .ui-autocomplete-input, .dropdown')
                                    .find('input, button').first();
          $input.focus();
          this.announceToScreenReader('Autocomplete closed');
        }
        
        // Arrow keys for navigation within dropdown
        if (key === 38 || key === 40) { // Up or Down arrow
          e.preventDefault();
          
          const $items = $(e.target).parent().find(selectors);
          const currentIndex = $items.index(document.activeElement);
          let targetIndex = (key === 38) 
            ? (currentIndex > 0 ? currentIndex - 1 : $items.length - 1) 
            : (currentIndex < $items.length - 1 ? currentIndex + 1 : 0);
            
          $items.eq(targetIndex).focus();
        }
      });
      
      console.log('🔤 Autocomplete keyboard support initialized');
    } catch (error) {
      console.error('❌ Error setting up autocomplete keyboard support:', error);
    }
  }
  
  /**
   * Setup keyboard accessibility for rich text editors (Quill)
   */
  setupRichTextEditorAccessibility() {
    try {
      // Wait for any Quill instances to initialize
      setTimeout(() => {
        // Make toolbar buttons keyboard accessible
        $('.ql-toolbar button').attr('tabindex', '0');
        
        // Add ARIA labels to button groups
        $('.ql-toolbar .ql-formats').each(function(index) {
          $(this).attr('role', 'group');
          $(this).attr('aria-label', `Formatting options group ${index + 1}`);
        });
        
        // Add specific labels to common buttons
        const buttonLabels = {
          '.ql-bold': 'Bold',
          '.ql-italic': 'Italic',
          '.ql-underline': 'Underline',
          '.ql-link': 'Insert link',
          '.ql-list[value="ordered"]': 'Numbered list',
          '.ql-list[value="bullet"]': 'Bullet list',
          '.ql-header': 'Heading style',
          '.ql-image': 'Insert image'
        };
        
        Object.entries(buttonLabels).forEach(([selector, label]) => {
          $(selector).attr('aria-label', label);
        });
        
        console.log('🔤 Rich text editor accessibility setup complete');
      }, 500);
    } catch (error) {
      console.error('❌ Error setting up rich text editor accessibility:', error);
    }
  }
  
  /**
   * Setup keyboard navigation between form sections
   */
  setupKeyboardSectionNavigation() {
    try {
      const $sections = this.$form.find('fieldset, .form-section, .card');
      
      if ($sections.length <= 1) return;
      
      console.log(`🔤 Setting up keyboard navigation between ${$sections.length} form sections`);
      
      // Add skip links for keyboard users (visible only when focused)
      $sections.each((index, section) => {
        const $section = $(section);
        
        if (index < $sections.length - 1) {
          const $nextSection = $sections.eq(index + 1);
          const nextSectionLabel = $nextSection.find('legend, h2, h3, h4').first().text() || 'next section';
          
          const $skipLink = $('<button>', {
            'type': 'button',
            'class': 'btn btn-link skip-section-link sr-only sr-only-focusable',
            'text': `Skip to ${nextSectionLabel}`,
            'aria-label': `Skip to ${nextSectionLabel}`
          });
          
          $skipLink.on('click', () => {
            const $firstField = $nextSection.find(':input:visible:enabled').first();
            $firstField.focus();
          });
          
          // Add the skip link at the end of the current section
          $section.append($skipLink);
        }
      });
      
      console.log('🔤 Form section navigation setup complete');
    } catch (error) {
      console.error('❌ Error setting up keyboard section navigation:', error);
    }
  }
  
  /**
   * Setup keyboard support for custom form components
   */
  setupCustomComponentKeyboardSupport() {
    try {
      // File input enhancements
      this.$form.find('input[type="file"]').each((index, fileInput) => {
        const $fileInput = $(fileInput);
        const $customButton = $fileInput.next('.custom-file-button, .btn');
        
        if ($customButton.length) {
          $customButton.on('keydown', (e) => {
            // Space or Enter activates the file input
            if (e.which === 13 || e.which === 32) {
              e.preventDefault();
              $fileInput.click();
            }
          });
        }
      });
      
      // Custom select/dropdown enhancements
      this.$form.find('.custom-select, .custom-dropdown').each((index, select) => {
        $(select).attr('role', 'combobox');
      });
      
      console.log('🔤 Custom component keyboard support initialized');
    } catch (error) {
      console.error('❌ Error setting up custom component keyboard support:', error);
    }
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

// Register the extension (only if not already registered)
if (FormHandler && typeof FormHandler.registerExtension === 'function') {
  FormHandler.registerExtension('accessibility', FormAccessibilityExtension);
}

window.FormAccessibilityExtension = FormAccessibilityExtension;
}
