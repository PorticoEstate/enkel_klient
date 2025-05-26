/**
 * FormHandler - Common form handling functionality
 * Centralizes validation, submission, file uploads, and accessibility
 * 
 * Created: May 23, 2025
 * Provides consistent form handling across all forms in the application
 * WCAG 2.1 compliant with improved keyboard accessibility and screen reader support
 * 
 * Updated: Dec 2024 - Added WCAG 3.3.4 Error Prevention compliance features:
 * - Confirmation dialogs for critical forms
 * - Form summary with edit capability
 * - Enhanced real-time validation
 * - Configuration-driven form summary display
 */

class FormHandler {
  /**
   * Initialize a new form handler
   * @param {Object} options Configuration options
   * @param {string} options.formId Form ID attribute
   * @param {string} options.redirectUrl URL to redirect after successful submission
   * @param {string} options.uploadUrl URL for file uploads
   * @param {boolean} options.fileRequired Whether file upload is required
   * @param {Array} options.allowedFileTypes Array of allowed file extensions
   * @param {number} options.maxFileSizeMB Maximum file size in megabytes
   */
  constructor(options) {
    // Required options
    this.formId = options.formId;
    
    // Optional with defaults
    this.redirectUrl = options.redirectUrl || `${strBaseURL}/${this.formId}`;
    this.uploadUrl = options.uploadUrl || `${strBaseURL}/${this.formId}/upload`;
    this.fileRequired = options.fileRequired || false;
    this.allowedFileTypes = options.allowedFileTypes || ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];
    this.maxFileSizeMB = options.maxFileSizeMB || 15;
    
    // jQuery and DOM elements
    this.$form = $('#' + this.formId);
    this.form = document.getElementById(this.formId);
    
    // File uploader instance
    this.fileUploader = null;
    
    // Custom event handlers
    this.customHandlers = options.customHandlers || {};
    
    // WCAG 3.3.4 Error Prevention features
    this.formConfig = {};
    this.formSummaryEnabled = false;
    this.confirmationDialogEnabled = false;
    this.formData = {};
    this.isInConfirmationMode = false;
    this.originalSubmitHandler = null;
    
    // Initialize the form handler
    this.init();
  }
  
  /**
   * Initialize all form functionality
   */
  init() {
    // Early exit if form not found
    if (!this.form || !this.$form.length) {
      console.error(`Form with ID '${this.formId}' not found`);
      return;
    }
    
    // Load configuration for this form
    this.loadFormConfiguration();
    
    // Setup form components
    this.createScreenReaderStatus();
    this.markRequiredFields();
    this.initFileUploader();
    this.setupFormValidation();
    this.initAccessibility();
    
    // Setup WCAG 3.3.4 Error Prevention features
    this.initErrorPrevention();
    
    // Setup form submission handler (may be modified by error prevention features)
    this.setupSubmitHandler();
    
    // Set focus on first input field
    this.focusFirstField();
    
    // Log initialization
    console.log(`FormHandler initialized for form '${this.formId}' with error prevention features`);
  }
  
  /**
   * Create screen reader status element if needed
   */
  createScreenReaderStatus() {
    if (!$('#form-status').length) {
      $('<div>', {
        id: 'form-status',
        'class': 'sr-only',
        'aria-live': 'polite'
      }).appendTo('body');
    }
  }
  
  /**
   * Mark all required fields with visual indicator and ARIA attributes
   */
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
  
  /**
   * Set focus on the first focusable input field
   */
  focusFirstField() {
    try {
      const firstInput = this.$form.find('input:visible, select:visible, textarea:visible').not('[disabled]').first();
      if (firstInput.length) {
        firstInput.focus();
      }
    } catch (error) {
      console.warn('Could not focus on first field:', error);
    }
  }
  
  /**
   * Initialize file uploader component
   */
  initFileUploader() {
    try {
      // Use the generic function from form-accessibility.js if available
      if (typeof initializeAccessibleFileUpload === 'function') {
        // Initialize with form-specific options
        this.fileUploader = initializeAccessibleFileUpload(this.formId, {
          uploadUrl: this.uploadUrl,
          required: this.fileRequired,
          allowedFileTypes: this.allowedFileTypes,
          maxFileSizeMB: this.maxFileSizeMB,
          onComplete: (success) => this.handleUploadComplete(success),
          onAdd: (fileName) => this.announceToScreenReader(`File added: ${fileName}`),
          onProgress: (progress) => this.updateProgressBar(progress)
        });
      }
      // Fallback to direct initialization if generic function is not available
      else if (typeof FileUploader === 'function') {
        this.fileUploader = new FileUploader({
          formId: this.formId,
          uploadUrl: this.uploadUrl,
          required: this.fileRequired,
          allowedFileTypes: this.allowedFileTypes,
          maxFileSizeMB: this.maxFileSizeMB,
          onComplete: (success) => this.handleUploadComplete(success),
          onFileAdded: (fileName) => this.announceToScreenReader(`File added: ${fileName}`),
          onUploadProgress: (progress) => this.updateProgressBar(progress),
          onFileUploadSuccess: (fileName) => this.announceToScreenReader(`File uploaded: ${fileName}`),
          onFileUploadError: (fileName, error) => this.announceToScreenReader(`Error uploading ${fileName}: ${error}`)
        });
        
        this.fileUploader.initialize();
      }
    } catch (e) {
      console.error('Error initializing file uploader:', e);
    }
  }
  
  /**
   * Set up form validation using common validator
   */
  setupFormValidation() {
    // Use common validator if it exists
    if (typeof setupFormValidation === 'function') {
      setupFormValidation(this.$form);
    }
    
    // Enhance field validation with accessibility features
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
  }
  
  /**
   * Initialize accessibility features for the form
   */
  initAccessibility() {
    // Make file upload more accessible
    this.enhanceFileUploadAccessibility();
    
    // Add keyboard navigation for interactive elements
    this.enhanceKeyboardNavigation();
    
    // Add location autocomplete accessibility if needed
    if ($('#location_name').length) {
      this.enhanceLocationAccessibility();
    }
    
    // Fire custom accessibility initialization if provided
    if (typeof this.customHandlers.initAccessibility === 'function') {
      this.customHandlers.initAccessibility.call(this);
    }
  }
  
  /**
   * Enhance file upload accessibility
   */
  enhanceFileUploadAccessibility() {
    // Make the file upload area keyboard accessible
    $('#drop-area').attr('role', 'button')
      .on('keydown', function(e) {
        // Trigger file input dialog on Enter or Space
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          $('#fileupload').click();
        }
      });
      
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
  
  /**
   * Enhance keyboard navigation throughout form
   */
  enhanceKeyboardNavigation() {
    // Add skip to form handling
    $('.skip-link').on('click', function(e) {
      e.preventDefault();
      const target = $($(this).attr('href'));
      
      // Focus without setting tabindex
      target.focus();
    });
  }
  
  /**
   * Enhance location search autocomplete accessibility
   */
  enhanceLocationAccessibility() {
    // Handle location search autocomplete for screen readers
    $('#location_name').on('focus', () => {
      $('#location_name').attr('aria-expanded', 'false');
    });
    
    // When results appear
    $('.selection').on('DOMNodeInserted', function() {
      if ($(this).children().length > 0) {
        $('#location_name').attr('aria-expanded', 'true');
      }
    });
    
    // When results are cleared
    $('.selection').on('DOMNodeRemoved', function() {
      if ($(this).children().length === 0) {
        $('#location_name').attr('aria-expanded', 'false');
      }
    });
  }
  
  /**
   * Set up the form submission handler
   */
  setupSubmitHandler() {
    // Only set up form submit handler if confirmation features are not enabled
    // (confirmation features use click handlers on submit button instead)
    if (!this.formSummaryEnabled && !this.confirmationDialogEnabled) {
      this.$form.on('submit', (e) => {
        // Use standard validation flow
        if (!this.validateForm()) {
          e.preventDefault();
          return false;
        }
        
        // Check file validation if required
        if (this.fileRequired && !this.validateFileUpload()) {
          e.preventDefault();
          return false;
        }
        
        // Proceed with normal submission
        e.preventDefault();
        this.submitForm();
      });
    }
  }
  
  /**
   * Validate form fields
   * @returns {boolean} Whether the form is valid
   */
  validateForm() {
    // Use the common form validator if it exists
    if (typeof validateAllFields === 'function') {
      return validateAllFields(this.$form);
    }
    
    // Fallback to basic validation
    let isValid = true;
    this.$form.find(':required').each(function() {
      if (!this.value) {
        $(this).addClass('is-invalid')
          .attr('aria-invalid', 'true');
        isValid = false;
      }
    });
    
    return isValid;
  }
  
  /**
   * Validate file upload
   * @returns {boolean} Whether the file upload is valid
   */
  validateFileUpload() {
    // Safely check for pending files
    let pendingFiles = 0;
    try {
      pendingFiles = this.fileUploader && typeof this.fileUploader.getPendingCount === 'function' ? 
        this.fileUploader.getPendingCount() : 0;
    } catch (e) {
      console.warn("Error checking pending files count:", e);
    }
    
    const isValid = pendingFiles > 0;
    
    if (!isValid) {
      const errorMsg = 'File upload is required';
      $('#file-upload-status').text(errorMsg);
      
      // Add file upload error to error summary if it exists
      const $errorSummary = this.$form.find('.error-summary ul');
      if ($errorSummary.length > 0) {
        $errorSummary.append('<li>' + errorMsg + '</li>');
      } else {
        // Create accessible alert if no error summary exists
        this.createAccessibleAlert(errorMsg, 'danger');
      }
      
      this.announceToScreenReader('Error: ' + errorMsg);
    }
    
    return isValid;
  }
  
  /**
   * Submit the form to the server
   */
  submitForm() {
    // Block doubleclick
    this.$form.find('button[type="submit"]').prop('disabled', true)
      .attr('aria-disabled', 'true')
      .append('<span class="sr-only">Submitting form, please wait...</span>');
    $('#fileupload').prop('disabled', true);
    
    // Show spinner
    this.showSubmissionSpinner();
    
    try {
      this.ajaxSubmit();
    } catch (e) {
      console.error('Error during AJAX submission:', e);
      this.removeSubmissionSpinner();
      
      this.$form.find('button[type="submit"]').prop('disabled', false)
        .attr('aria-disabled', 'false')
        .find('.sr-only').remove();
      $('#fileupload').prop('disabled', false);
      
      this.createAccessibleAlert('An error occurred while submitting the form: ' + e.message, 'danger');
    }
  }
  
  /**
   * Show submission spinner
   */
  showSubmissionSpinner() {
    $('<div id="spinner" class="d-flex align-items-center">')
      .append($('<strong>').text('Submitting...'))
      .append($('<div class="spinner-border ml-auto" role="status" aria-hidden="true"></div>'))
      .insertAfter(this.form);
    window.scrollBy(0, 100);
    
    // Announce to screen readers that form is processing
    this.announceToScreenReader('Form is being processed, please wait...');
    
    // Disable form elements for accessibility
    this.$form.find('input, select, textarea, button').attr('aria-busy', 'true');
  }
  
  /**
   * Remove submission spinner
   */
  removeSubmissionSpinner() {
    const element = document.getElementById('spinner');
    if (element) {
      element.parentNode.removeChild(element);
    }
    
    // Re-enable form elements
    this.$form.find('input, select, textarea, button').attr('aria-busy', 'false');
  }
  
  /**
   * Submit the form via AJAX
   */
  ajaxSubmit() {
    const requestUrl = this.$form.attr("action");
    let formdata = false;
    
    if (window.FormData) {
      try {
        formdata = new FormData(this.form);
      } catch (e) {
        console.error('FormData error:', e);
        this.announceToScreenReader('Error creating form data');
      }
    }
    
    $.ajax({
      cache: false,
      contentType: false,
      processData: false,
      type: 'POST',
      url: `${requestUrl}?phpgw_return_as=json`,
      data: formdata ? formdata : this.$form.serialize(),
      success: (data, textStatus, jqXHR) => this.handleSubmitSuccess(data, textStatus, jqXHR),
      error: (jqXHR, textStatus, errorThrown) => this.handleSubmitError(jqXHR, textStatus, errorThrown)
    });
  }
  
  /**
   * Handle successful form submission
   * @param {Object} data Response data
   * @param {string} textStatus Status text
   * @param {Object} jqXHR jQuery XHR object
   */
  handleSubmitSuccess(data, textStatus, jqXHR) {
    if (data) {
      if (data.status == "saved") {
        const id = data.id;
        
        // Announce success to screen readers
        this.announceToScreenReader('Form saved successfully');
        
        // Safely check for pending files
        let pendingFiles = 0;
        try {
          pendingFiles = this.fileUploader && typeof this.fileUploader.getPendingCount === 'function' ? 
            this.fileUploader.getPendingCount() : 0;
        } catch (e) {
          console.warn("Error checking pending files count:", e);
        }
        
        if (pendingFiles === 0) {
          // Wait a moment to ensure screen readers announce the success message
          setTimeout(() => {
            window.location.href = this.redirectUrl;
          }, 500);
        } else {
          this.announceToScreenReader('Uploading files...');
          this.fileUploader.sendAllFiles(id);
        }
      } else {
        this.$form.find('button[type="submit"]').prop('disabled', false)
          .attr('aria-disabled', 'false')
          .find('.sr-only').remove();
        $('#fileupload').prop('disabled', false);
        this.removeSubmissionSpinner();
        
        let errorMessage = '';
        $.each(data.message, function(index, error) {
          errorMessage += error + "\n";
        });
        
        // Update screen reader status with errors
        this.announceToScreenReader('Form submission error: ' + errorMessage);
        
        // Create accessible error alert
        const alertElement = $('<div role="alert" class="alert alert-danger"></div>');
        $.each(data.message, function(index, error) {
          alertElement.append($('<p></p>').text(error));
        });
        
        // Insert at the top of the form
        this.$form.prepend(alertElement);
      }
    }
  }
  
  /**
   * Handle form submission error
   * @param {Object} jqXHR jQuery XHR object
   * @param {string} textStatus Status text
   * @param {string} errorThrown Error thrown
   */
  handleSubmitError(jqXHR, textStatus, errorThrown) {
    console.error('Ajax error:', textStatus, errorThrown);
    this.$form.find('button[type="submit"]').prop('disabled', false)
      .attr('aria-disabled', 'false')
      .find('.sr-only').remove();
    $('#fileupload').prop('disabled', false);
    this.removeSubmissionSpinner();
    
    const errorMsg = 'A technical error occurred during form submission. Please try again later.';
    this.announceToScreenReader('Form submission error: ' + errorMsg);
    
    // Create accessible error alert
    const alertElement = $('<div role="alert" class="alert alert-danger"></div>')
      .append($('<h2 class="h6">Technical Error</h2>'))
      .append($('<p></p>').text(errorMsg));
    
    // Insert at the top of the form
    this.$form.prepend(alertElement);
  }
  
  /**
   * Handle upload completion
   * @param {boolean} success Whether upload was successful
   */
  handleUploadComplete(success) {
    if (success) {
      // Update screen reader status before navigation
      this.announceToScreenReader('Form submitted successfully. Redirecting to confirmation page.');
      
      // Allow time for screen reader announcement
      window.setTimeout(() => {
        window.location.href = this.redirectUrl;
      }, 500);
    } else {
      // Update screen reader status with error
      this.announceToScreenReader('There was a problem with your file upload.');
      
      // Small delay to allow user to see error messages
      window.setTimeout(() => {
        window.location.href = this.redirectUrl;
      }, 1000);
    }
  }
  
  /**
   * Update progress bar ARIA attributes
   * @param {number} progress Progress percentage
   */
  updateProgressBar(progress) {
    const $progress = $('#progress');
    if ($progress.length) {
      $progress.attr('aria-valuenow', progress)
        .attr('aria-valuetext', `${progress}%`);
    }
  }
  
  /**
   * Update screen reader status with announcement
   * @param {string} message Message to announce
   */
  announceToScreenReader(message) {
    const statusEl = document.getElementById('form-status');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }
  
  /**
   * Creates an accessible alert message
   * @param {string} message Message to display
   * @param {string} type Alert type: info, success, warning, danger
   */
  createAccessibleAlert(message, type) {
    // Remove existing alerts
    $('.alert-accessible').remove();
    
    // Create alert with proper ARIA role
    const $alert = $('<div>', {
      'class': 'alert alert-' + (type || 'info') + ' alert-accessible',
      'role': 'alert',
      'aria-live': 'assertive'
    }).text(message);
    
    // Add to page
    this.$form.before($alert);
    
    // Scroll to alert
    $('html, body').animate({
      scrollTop: $alert.offset().top - 100
    }, 200);
    
    // Announce to screen reader
    this.announceToScreenReader(message);
  }
  
  /**
   * Set whether file upload is required
   * @param {boolean} required Whether files are required
   */
  setFileRequired(required) {
    this.fileRequired = !!required;
    
    // Safely check for pending files
    let pendingFiles = 0;
    try {
      pendingFiles = this.fileUploader && typeof this.fileUploader.getPendingCount === 'function' ? 
        this.fileUploader.getPendingCount() : 0;
    } catch (e) {
      console.warn("Error checking pending files count:", e);
    }
    
    // Update the file uploader's required state
    if (this.fileRequired && pendingFiles === 0) {
      $('#fileupload').attr('required', 'required')
        .attr('aria-required', 'true');
      
      // Update label to indicate required
      $('#fileupload-label').addClass('required');
      
      // Announce to screen readers
      this.announceToScreenReader('File upload is now required');
    } else {
      $('#fileupload').removeAttr('required')
        .attr('aria-required', 'false');
      
      // Update label to remove required indication
      $('#fileupload-label').removeClass('required');
      
      if (!this.fileRequired) {
        this.announceToScreenReader('File upload is no longer required');
      }
    }
    
    // Update the FileUploader instance if it has that capability
    if (this.fileUploader && typeof this.fileUploader.setRequired === 'function') {
      this.fileUploader.setRequired(this.fileRequired);
    }
  }
  
  /**
   * Load form configuration from global config or server
   */
  loadFormConfiguration() {
    // Try to get configuration from global window object (if available)
    if (typeof window.formConfigs !== 'undefined' && window.formConfigs[this.formId]) {
      this.formConfig = window.formConfigs[this.formId];
    } else {
      // Default configuration - can be overridden by server-side config
      this.formConfig = {
        form_summary_on_submit: false,
        confirmation_dialog: false,
        auto_save: false,
        validation_level: 'standard'
      };
      
      // Try to load from data attributes on the form element
      if (this.form) {
        const configAttr = this.form.getAttribute('data-form-config');
        if (configAttr) {
          try {
            const parsedConfig = JSON.parse(configAttr);
            this.formConfig = { ...this.formConfig, ...parsedConfig };
          } catch (e) {
            console.warn('Invalid form configuration in data-form-config attribute:', e);
          }
        }
        
        // Check for individual data attributes
        if (this.form.getAttribute('data-form-summary') === 'true') {
          this.formConfig.form_summary_on_submit = true;
        }
        if (this.form.getAttribute('data-confirmation-dialog') === 'true') {
          this.formConfig.confirmation_dialog = true;
        }
      }
    }
    
    // Set flags based on configuration
    this.formSummaryEnabled = this.formConfig.form_summary_on_submit === true;
    this.confirmationDialogEnabled = this.formConfig.confirmation_dialog === true;
    
    console.log(`Form configuration loaded for ${this.formId}:`, this.formConfig);
  }
  
  /**
   * Initialize WCAG 3.3.4 Error Prevention features
   */
  initErrorPrevention() {
    // Enhanced real-time validation
    this.setupEnhancedValidation();
    
    // Auto-save functionality (if enabled)
    if (this.formConfig.auto_save) {
      this.initAutoSave();
    }
    
    // Form change tracking for data loss prevention
    this.initChangeTracking();
    
    // Setup confirmation features if enabled
    if (this.formSummaryEnabled || this.confirmationDialogEnabled) {
      this.initConfirmationFeatures();
    }
  }
  
  /**
   * Setup enhanced real-time validation
   */
  setupEnhancedValidation() {
    // Enhanced validation with immediate feedback
    this.$form.find('input, select, textarea').on('blur focusout', (e) => {
      const field = e.target;
      this.validateFieldRealTime(field);
    });
    
    // Validate on input for immediate feedback (with debouncing)
    let validationTimeout;
    this.$form.find('input[type="email"], input[type="tel"], input[type="url"]').on('input', (e) => {
      clearTimeout(validationTimeout);
      validationTimeout = setTimeout(() => {
        this.validateFieldRealTime(e.target);
      }, 500); // 500ms debounce
    });
    
    // Enhanced required field validation
    this.$form.find('[required]').on('change', (e) => {
      this.validateFieldRealTime(e.target);
    });
  }
  
  /**
   * Validate a field in real-time with enhanced feedback
   * @param {HTMLElement} field - The field to validate
   */
  validateFieldRealTime(field) {
    if (!field) return;
    
    const $field = $(field);
    const fieldId = $field.attr('id');
    const fieldName = $('label[for="' + fieldId + '"]').text().trim() || fieldId;
    let isValid = true;
    let errorMessage = '';
    
    // Check if field is required and empty
    if (field.hasAttribute('required') && !field.value.trim()) {
      isValid = false;
      errorMessage = `${fieldName} is required`;
    }
    // Validate email fields
    else if (field.type === 'email' && field.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(field.value)) {
        isValid = false;
        errorMessage = 'Please enter a valid email address';
      }
    }
    // Validate phone fields
    else if ((field.type === 'tel' || fieldId.includes('phone')) && field.value) {
      const phoneRegex = /^[\d\s\+\-\(\)]{8,}$/;
      if (!phoneRegex.test(field.value.replace(/\s/g, ''))) {
        isValid = false;
        errorMessage = 'Please enter a valid phone number (minimum 8 digits)';
      }
    }
    // Use native validation if available
    else if (field.validity && !field.validity.valid) {
      isValid = false;
      errorMessage = field.validationMessage || `${fieldName} is invalid`;
    }
    
    // Update field appearance and ARIA attributes
    if (isValid) {
      $field.removeClass('is-invalid').addClass('is-valid')
        .attr('aria-invalid', 'false');
      this.removeFieldError(fieldId);
    } else {
      $field.removeClass('is-valid').addClass('is-invalid')
        .attr('aria-invalid', 'true');
      this.showFieldError(fieldId, errorMessage);
    }
    
    return isValid;
  }
  
  /**
   * Show error message for a specific field
   * @param {string} fieldId - The field ID
   * @param {string} message - The error message
   */
  showFieldError(fieldId, message) {
    const $field = $('#' + fieldId);
    const errorId = fieldId + '-error';
    
    // Remove existing error
    $('#' + errorId).remove();
    
    // Create new error message
    const $error = $('<div>', {
      id: errorId,
      class: 'invalid-feedback',
      text: message,
      'aria-live': 'polite'
    });
    
    // Insert error after field or its parent container
    if ($field.parent().hasClass('form-group') || $field.parent().hasClass('input-group')) {
      $field.parent().after($error);
    } else {
      $field.after($error);
    }
    
    // Set aria-describedby
    $field.attr('aria-describedby', errorId);
  }
  
  /**
   * Remove error message for a specific field
   * @param {string} fieldId - The field ID
   */
  removeFieldError(fieldId) {
    const errorId = fieldId + '-error';
    $('#' + errorId).remove();
    
    const $field = $('#' + fieldId);
    const describedBy = $field.attr('aria-describedby');
    if (describedBy === errorId) {
      $field.removeAttr('aria-describedby');
    }
  }
  
  /**
   * Initialize auto-save functionality
   */
  initAutoSave() {
    let autoSaveTimeout;
    const autoSaveInterval = 30000; // 30 seconds
    
    // Save form data periodically
    this.$form.find('input, select, textarea').on('change input', () => {
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => {
        this.saveFormDraft();
      }, autoSaveInterval);
    });
    
    // Try to restore saved data on load
    this.restoreFormDraft();
  }
  
  /**
   * Save form data as draft
   */
  saveFormDraft() {
    try {
      const formData = this.collectFormData();
      const draftKey = `form_draft_${this.formId}`;
      localStorage.setItem(draftKey, JSON.stringify({
        data: formData,
        timestamp: Date.now(),
        formId: this.formId
      }));
      
      // Announce to screen readers
      this.announceToScreenReader(this.getTranslation('draft_saved'));
    } catch (e) {
      console.warn('Could not save form draft:', e);
    }
  }
  
  /**
   * Restore form data from draft
   */
  restoreFormDraft() {
    try {
      const draftKey = `form_draft_${this.formId}`;
      const draftData = localStorage.getItem(draftKey);
      
      if (draftData) {
        const draft = JSON.parse(draftData);
        const hoursSinceLastSave = (Date.now() - draft.timestamp) / (1000 * 60 * 60);
        
        // Only restore if draft is less than 24 hours old
        if (hoursSinceLastSave < 24) {
          this.populateFormData(draft.data);
          this.announceToScreenReader(this.getTranslation('draft_restored'));
          
          // Show notification to user
          this.showDraftRestoreNotification();
        } else {
          // Clean up old draft
          localStorage.removeItem(draftKey);
        }
      }
    } catch (e) {
      console.warn('Could not restore form draft:', e);
    }
  }
  
  /**
   * Show notification about restored draft
   */
  showDraftRestoreNotification() {
    const $notification = $(`
      <div class="alert alert-info alert-dismissible" role="alert">
        <strong>Draft Restored:</strong> Your previous form data has been restored.
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `);
    
    this.$form.prepend($notification);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      $notification.fadeOut();
    }, 10000);
  }
  
  /**
   * Initialize change tracking for data loss prevention
   */
  initChangeTracking() {
    let hasChanges = false;
    
    // Track form changes
    this.$form.find('input, select, textarea').on('change input', () => {
      hasChanges = true;
    });
    
    // Warn before page unload if there are unsaved changes
    $(window).on('beforeunload', (e) => {
      if (hasChanges && !this.isInConfirmationMode) {
        const message = this.getTranslation('changes_detected');
        e.returnValue = message;
        return message;
      }
    });
    
    // Clear warning when form is submitted
    this.$form.on('submit', () => {
      hasChanges = false;
    });
  }
  
  /**
   * Initialize confirmation features (form summary and confirmation dialogs)
   */
  initConfirmationFeatures() {
    console.log(`Initializing confirmation features for ${this.formId}`);
    console.log(`Form summary enabled: ${this.formSummaryEnabled}`);
    console.log(`Confirmation dialog enabled: ${this.confirmationDialogEnabled}`);
    
    // Store original submit handler
    this.originalSubmitHandler = this.$form.find('[type="submit"]').off('click.original').on('click.original', (e) => {
      console.log('Submit button clicked - using confirmation features');
      e.preventDefault();
      e.stopPropagation();
      this.handleConfirmationSubmit(e);
    });
    
    console.log(`Confirmation features enabled for ${this.formId}`);
  }
  
  /**
   * Handle form submission with confirmation features
   * @param {Event} e - The submit event
   */
  handleConfirmationSubmit(e) {
    e.preventDefault();
    
    console.log(`handleConfirmationSubmit called for ${this.formId}`);
    console.log(`Form summary enabled: ${this.formSummaryEnabled}`);
    console.log(`Confirmation dialog enabled: ${this.confirmationDialogEnabled}`);
    console.log(`Form config:`, this.formConfig);
    
    // First validate the form
    if (!this.validateForm()) {
      console.log('Form validation failed');
      return false;
    }
    
    // Check file validation if required
    if (this.fileRequired && !this.validateFileUpload()) {
      console.log('File validation failed');
      return false;
    }
    
    // Collect current form data
    this.formData = this.collectFormData();
    
    // Show confirmation based on configuration
    if (this.formSummaryEnabled) {
      console.log('Showing form summary modal');
      this.showFormSummary();
    } else if (this.confirmationDialogEnabled) {
      console.log('Showing confirmation dialog');
      this.showConfirmationDialog();
    } else {
      console.log('Using fallback to normal submission');
      // Fallback to normal submission
      this.submitForm();
    }
  }
  
  /**
   * Collect all form data including files
   * @returns {Object} Form data object
   */
  collectFormData() {
    const data = {};
    
    // Collect form fields
    this.$form.find('input, select, textarea').each(function() {
      const $field = $(this);
      const name = $field.attr('name') || $field.attr('id');
      const type = $field.attr('type');
      
      if (!name) return;
      
      if (type === 'checkbox' || type === 'radio') {
        if ($field.is(':checked')) {
          data[name] = $field.val();
        }
      } else if (type !== 'file' && type !== 'submit' && type !== 'button') {
        data[name] = $field.val();
      }
    });
    
    // Collect file information
    const fileInfo = this.getFileUploadInfo();
    if (fileInfo.length > 0) {
      data._files = fileInfo;
    }
    
    return data;
  }
  
  /**
   * Get information about uploaded files
   * @returns {Array} Array of file information objects
   */
  getFileUploadInfo() {
    const files = [];
    
    // Check for files in the file uploader
    if (this.fileUploader && typeof this.fileUploader.getFiles === 'function') {
      const uploadedFiles = this.fileUploader.getFiles();
      uploadedFiles.forEach(file => {
        files.push({
          name: file.name || 'Unknown file',
          size: file.size || 0,
          type: file.type || 'Unknown type'
        });
      });
    }
    
    // Check for files in file input
    this.$form.find('input[type="file"]').each(function() {
      const fileInput = this;
      if (fileInput.files && fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach(file => {
          files.push({
            name: file.name,
            size: file.size,
            type: file.type
          });
        });
      }
    });
    
    return files;
  }
  
  /**
   * Show form summary with edit capability
   */
  showFormSummary() {
    this.isInConfirmationMode = true;
    
    // Create summary content
    const summaryHtml = this.generateFormSummaryHtml();
    
    // Create modal or overlay
    const $modal = $(`
      <div class="form-summary-modal" role="dialog" aria-labelledby="form-summary-title" aria-modal="true">
        <div class="form-summary-backdrop"></div>
        <div class="form-summary-content">
          <div class="form-summary-header">
            <h2 id="form-summary-title">${this.getTranslation('review_title')}</h2>
            <button type="button" class="form-summary-close" aria-label="${this.getTranslation('close_summary')}">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="form-summary-body">
            <p class="form-summary-intro">${this.getTranslation('review_intro')}</p>
            ${summaryHtml}
          </div>
          <div class="form-summary-footer">
            <button type="button" class="btn btn-secondary form-summary-edit-all">${this.getTranslation('edit_all_button')}</button>
            <button type="button" class="btn btn-primary form-summary-submit">${this.getTranslation('submit_button')}</button>
          </div>
        </div>
      </div>
    `);
    
    // Add modal to page
    $('body').append($modal);
    
    // Add CSS for modal
    this.addFormSummaryStyles();
    
    // Setup modal events
    this.setupFormSummaryEvents($modal);
    
    // Focus management
    $modal.find('.form-summary-close').focus();
    
    // Announce to screen readers
    this.announceToScreenReader(this.getTranslation('summary_opened'));
    
    // Trap focus in modal
    this.trapFocus($modal);
  }
  
  /**
   * Generate HTML for form summary
   * @returns {string} HTML string for the summary
   */
  generateFormSummaryHtml() {
    let html = '<div class="form-summary-sections">';
    
    // Group fields by sections
    const sections = this.groupFieldsBySection();
    
    Object.keys(sections).forEach(sectionName => {
      html += `<div class="form-summary-section">`;
      if (sectionName !== 'default') {
        html += `<h3 class="form-summary-section-title">${sectionName}</h3>`;
      }
      html += '<dl class="form-summary-list">';
      
      sections[sectionName].forEach(field => {
        if (field.value && field.value.trim()) {
          html += `
            <div class="form-summary-item" data-field="${field.name}">
              <dt class="form-summary-label">${field.label}:</dt>
              <dd class="form-summary-value">
                ${this.formatFieldValue(field)}
                <button type="button" class="btn btn-sm btn-outline-primary form-summary-edit-field" 
                        data-field="${field.name}" aria-label="${this.getTranslation('edit_button')} ${field.label}">
                  ${this.getTranslation('edit_button')}
                </button>
              </dd>
            </div>
          `;
        }
      });
      
      html += '</dl></div>';
    });
    
    // Add file information
    if (this.formData._files && this.formData._files.length > 0) {
      html += `
        <div class="form-summary-section">
          <h3 class="form-summary-section-title">${this.getTranslation('uploaded_files')}</h3>
          <ul class="form-summary-files">
      `;
      
      this.formData._files.forEach(file => {
        const fileSize = this.formatFileSize(file.size);
        html += `
          <li class="form-summary-file">
            <span class="file-name">${this.escapeHtml(file.name)}</span>
            <span class="file-details">(${fileSize}, ${this.escapeHtml(file.type)})</span>
          </li>
        `;
      });
      
      html += '</ul></div>';
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * Group form fields by their parent fieldset or logical sections
   * @returns {Object} Grouped fields object
   */
  groupFieldsBySection() {
    const sections = { default: [] };
    
    Object.keys(this.formData).forEach(name => {
      if (name === '_files') return;
      
      const $field = this.$form.find(`[name="${name}"], #${name}`);
      if (!$field.length) return;
      
      const label = this.getFieldLabel($field);
      const value = this.formData[name];
      
      // Find section (fieldset or logical grouping)
      let sectionName = 'default';
      const $fieldset = $field.closest('fieldset');
      if ($fieldset.length) {
        const $legend = $fieldset.find('legend').first();
        if ($legend.length) {
          sectionName = $legend.text().trim();
        }
      }
      
      if (!sections[sectionName]) {
        sections[sectionName] = [];
      }
      
      sections[sectionName].push({
        name: name,
        label: label,
        value: value,
        type: $field.attr('type') || 'text',
        element: $field
      });
    });
    
    return sections;
  }
  
  /**
   * Get the label text for a field
   * @param {jQuery} $field - The field element
   * @returns {string} Label text
   */
  getFieldLabel($field) {
    const fieldId = $field.attr('id');
    const fieldName = $field.attr('name');
    
    // Try to find label by 'for' attribute
    let $label = $(`label[for="${fieldId}"]`);
    if (!$label.length && fieldName) {
      $label = $(`label[for="${fieldName}"]`);
    }
    
    // Try to find label as previous sibling
    if (!$label.length) {
      $label = $field.prev('label');
    }
    
    // Try to find label as parent element
    if (!$label.length) {
      $label = $field.closest('label');
    }
    
    if ($label.length) {
      return $label.text().replace(/\*\s*$/, '').trim(); // Remove required asterisk
    }
    
    // Fallback to field name or placeholder
    return $field.attr('placeholder') || fieldName || fieldId || 'Field';
  }
  
  /**
   * Format field value for display in summary
   * @param {Object} field - Field information object
   * @returns {string} Formatted value
   */
  formatFieldValue(field) {
    let value = field.value;
    
    // Handle different field types
    switch (field.type) {
      case 'email':
        return `<a href="mailto:${this.escapeHtml(value)}">${this.escapeHtml(value)}</a>`;
      case 'tel':
        return `<a href="tel:${this.escapeHtml(value)}">${this.escapeHtml(value)}</a>`;
      case 'url':
        return `<a href="${this.escapeHtml(value)}" target="_blank">${this.escapeHtml(value)}</a>`;
      case 'checkbox':
        return value ? 'Yes' : 'No';
      case 'radio':
        // Try to get the label for the selected radio option
        const $radio = field.element.filter(`[value="${value}"]`);
        if ($radio.length) {
          const $radioLabel = $(`label[for="${$radio.attr('id')}"]`);
          if ($radioLabel.length) {
            return this.escapeHtml($radioLabel.text().trim());
          }
        }
        return this.escapeHtml(value);
      case 'select':
        const $option = field.element.find(`option[value="${value}"]`);
        return this.escapeHtml($option.length ? $option.text() : value);
      case 'textarea':
        // Truncate long text and preserve line breaks
        const truncated = value.length > 200 ? value.substring(0, 200) + '...' : value;
        return `<div class="form-summary-textarea">${this.escapeHtml(truncated).replace(/\n/g, '<br>')}</div>`;
      default:
        return this.escapeHtml(value);
    }
  }
  
  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Setup event handlers for form summary modal
   * @param {jQuery} $modal - The modal element
   */
  setupFormSummaryEvents($modal) {
    // Close modal events
    $modal.find('.form-summary-close, .form-summary-backdrop').on('click', () => {
      this.closeFormSummary($modal);
    });
    
    // Edit all fields - close modal and return to form
    $modal.find('.form-summary-edit-all').on('click', () => {
      this.closeFormSummary($modal);
    });
    
    // Edit individual field
    $modal.find('.form-summary-edit-field').on('click', (e) => {
      const fieldName = $(e.target).data('field');
      this.closeFormSummary($modal);
      this.focusField(fieldName);
    });
    
    // Submit form from summary
    $modal.find('.form-summary-submit').on('click', () => {
      this.closeFormSummary($modal);
      this.submitForm();
    });
    
    // Keyboard handling
    $modal.on('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeFormSummary($modal);
      }
    });
  }
  
  /**
   * Close form summary modal
   * @param {jQuery} $modal - The modal element
   */
  closeFormSummary($modal) {
    this.isInConfirmationMode = false;
    $modal.remove();
    // Return focus to the submit button
    this.$form.find('button[type="submit"]').focus();
    this.announceToScreenReader(this.getTranslation('summary_closed'));
  }
  
  /**
   * Focus on a specific field
   * @param {string} fieldName - Name of the field to focus
   */
  focusField(fieldName) {
    const $field = this.$form.find(`[name="${fieldName}"], #${fieldName}`);
    if ($field.length) {
      $field.focus();
      // Scroll field into view
      $field[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.announceToScreenReader(this.getTranslation('field_focused', { field: this.getFieldLabel($field) }));
    }
  }
  
  /**
   * Add CSS styles for form summary modal
   */
  addFormSummaryStyles() {
    if ($('#form-summary-styles').length === 0) {
      const styles = `
        <style id="form-summary-styles">
          .form-summary-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .form-summary-backdrop {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            cursor: pointer;
          }
          
          .form-summary-content {
            position: relative;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            max-width: 90vw;
            max-height: 90vh;
            width: 800px;
            display: flex;
            flex-direction: column;
          }
          
          .form-summary-header {
            padding: 20px 24px 16px;
            border-bottom: 1px solid #e1e1e1;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .form-summary-header h2 {
            margin: 0;
            font-size: 1.5rem;
            color: #333;
          }
          
          .form-summary-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            padding: 4px 8px;
            color: #666;
            border-radius: 4px;
          }
          
          .form-summary-close:hover,
          .form-summary-close:focus {
            background: #f0f0f0;
            color: #333;
          }
          
          .form-summary-body {
            padding: 20px 24px;
            overflow-y: auto;
            flex: 1;
          }
          
          .form-summary-intro {
            margin-bottom: 20px;
            color: #666;
            font-size: 0.95rem;
          }
          
          .form-summary-section {
            margin-bottom: 24px;
          }
          
          .form-summary-section-title {
            font-size: 1.2rem;
            margin: 0 0 12px 0;
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 4px;
          }
          
          .form-summary-list {
            margin: 0;
          }
          
          .form-summary-item {
            display: flex;
            padding: 12px 0;
            border-bottom: 1px solid #f0f0f0;
          }
          
          .form-summary-item:last-child {
            border-bottom: none;
          }
          
          .form-summary-label {
            font-weight: 600;
            width: 200px;
            margin: 0;
            color: #333;
            flex-shrink: 0;
          }
          
          .form-summary-value {
            margin: 0 0 0 16px;
            flex: 1;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          
          .form-summary-edit-field {
            margin-left: 12px;
            padding: 4px 12px;
            font-size: 0.85rem;
            flex-shrink: 0;
          }
          
          .form-summary-textarea {
            white-space: pre-wrap;
            line-height: 1.4;
          }
          
          .form-summary-files {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          
          .form-summary-file {
            padding: 8px 0;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .file-name {
            font-weight: 500;
          }
          
          .file-details {
            color: #666;
            font-size: 0.9rem;
          }
          
          .form-summary-footer {
            padding: 16px 24px;
            border-top: 1px solid #e1e1e1;
            display: flex;
            justify-content: space-between;
            gap: 12px;
          }
          
          .form-summary-footer .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.95rem;
            transition: background-color 0.2s;
          }
          
          .btn-secondary {
            background: #6c757d;
            color: white;
          }
          
          .btn-secondary:hover,
          .btn-secondary:focus {
            background: #5a6268;
          }
          
          .btn-primary {
            background: #007bff;
            color: white;
          }
          
          .btn-primary:hover,
          .btn-primary:focus {
            background: #0056b3;
          }
          
          @media (max-width: 768px) {
            .form-summary-content {
              width: 95vw;
              margin: 20px;
            }
            
            .form-summary-item {
              flex-direction: column;
            }
            
            .form-summary-label {
              width: 100%;
              margin-bottom: 4px;
            }
            
            .form-summary-value {
              margin: 0;
            }
            
            .form-summary-footer {
              flex-direction: column;
            }
          }
        </style>
      `;
      $('head').append(styles);
    }
  }
  
  /**
   * Trap focus within a modal element
   * @param {jQuery} $modal - The modal element
   */
  trapFocus($modal) {
    const focusableElements = $modal.find('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements.first();
    const lastElement = focusableElements.last();
    
    $modal.on('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement[0]) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement[0]) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    });
  }
  
  /**
   * Show confirmation dialog for critical forms
   */
  showConfirmationDialog() {
    const formName = this.$form.attr('id') || 'form';
    const message = this.getConfirmationMessage(formName);
    
    const $dialog = $(`
      <div class="confirmation-dialog-modal" role="dialog" aria-labelledby="confirmation-dialog-title" aria-modal="true">
        <div class="confirmation-dialog-backdrop"></div>
        <div class="confirmation-dialog-content">
          <div class="confirmation-dialog-header">
            <h2 id="confirmation-dialog-title">${this.getTranslation('confirm_title')}</h2>
          </div>
          <div class="confirmation-dialog-body">
            <p>${message}</p>
          </div>
          <div class="confirmation-dialog-footer">
            <button type="button" class="btn btn-secondary confirmation-cancel">${this.getTranslation('cancel_button')}</button>
            <button type="button" class="btn btn-primary confirmation-submit">${this.getTranslation('yes_submit_button')}</button>
          </div>
        </div>
      </div>
    `);
    
    // Add dialog to page
    $('body').append($dialog);
    
    // Add CSS for dialog
    this.addConfirmationDialogStyles();
    
    // Setup dialog events
    this.setupConfirmationDialogEvents($dialog);
    
    // Focus management
    $dialog.find('.confirmation-submit').focus();
    
    // Announce to screen readers
    this.announceToScreenReader(this.getTranslation('confirmation_opened'));
    
    // Trap focus in dialog
    this.trapFocus($dialog);
  }
  
  /**
   * Get confirmation message based on form type
   * @param {string} formName - Name of the form
   * @returns {string} Confirmation message
   */
  getConfirmationMessage(formName) {
    const messageKeys = {
      'helpdesk-form': 'helpdesk_confirm',
      'nokkelbestilling-form': 'nokkelbestilling_confirm',
      'inspection-form': 'inspection_confirm',
      'invoicerequest-form': 'invoicerequest_confirm'
    };
    
    const messageKey = messageKeys[formName] || 'default_confirm';
    return this.getTranslation(messageKey);
  }
  
  /**
   * Setup event handlers for confirmation dialog
   * @param {jQuery} $dialog - The dialog element
   */
  setupConfirmationDialogEvents($dialog) {
    // Cancel button and backdrop
    $dialog.find('.confirmation-cancel, .confirmation-dialog-backdrop').on('click', () => {
      this.closeConfirmationDialog($dialog);
    });
    
    // Submit button
    $dialog.find('.confirmation-submit').on('click', () => {
      this.closeConfirmationDialog($dialog);
      this.submitForm();
    });
    
    // Keyboard handling
    $dialog.on('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeConfirmationDialog($dialog);
      }
    });
  }
  
  /**
   * Close confirmation dialog
   * @param {jQuery} $dialog - The dialog element
   */
  closeConfirmationDialog($dialog) {
    this.isInConfirmationMode = false;
    $dialog.remove();
    // Return focus to the submit button
    this.$form.find('button[type="submit"]').focus();
    this.announceToScreenReader(this.getTranslation('confirmation_closed'));
  }
  
  /**
   * Add CSS styles for confirmation dialog
   */
  addConfirmationDialogStyles() {
    if ($('#confirmation-dialog-styles').length === 0) {
      const styles = `
        <style id="confirmation-dialog-styles">
          .confirmation-dialog-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .confirmation-dialog-backdrop {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            cursor: pointer;
          }
          
          .confirmation-dialog-content {
            position: relative;
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            max-width: 90vw;
            width: 500px;
          }
          
          .confirmation-dialog-header {
            padding: 20px 24px 16px;
            border-bottom: 1px solid #e1e1e1;
          }
          
          .confirmation-dialog-header h2 {
            margin: 0;
            font-size: 1.3rem;
            color: #333;
          }
          
          .confirmation-dialog-body {
            padding: 20px 24px;
          }
          
          .confirmation-dialog-body p {
            margin: 0;
            line-height: 1.5;
            color: #555;
          }
          
          .confirmation-dialog-footer {
            padding: 16px 24px;
            border-top: 1px solid #e1e1e1;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }
          
          .confirmation-dialog-footer .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.95rem;
            transition: background-color 0.2s;
          }
        </style>
      `;
      $('head').append(styles);
    }
  }
  
  /**
   * Get translation string
   * @param {string} key - Translation key
   * @param {Object} replacements - Values to replace in the translation
   * @returns {string} Translated string
   */
  getTranslation(key, replacements = {}) {
    // Check if translations are available globally
    if (typeof window.translations !== 'undefined' && window.translations.form_confirmation) {
      let translation = window.translations.form_confirmation[key];
      if (translation) {
        // Replace placeholders
        Object.keys(replacements).forEach(placeholder => {
          translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
        });
        return translation;
      }
    }
    
    // Fallback translations
    const fallbacks = {
      'review_title': 'Review Your Information',
      'review_intro': 'Please review your information before submitting. You can edit any field by clicking the "Edit" button next to it.',
      'confirm_title': 'Confirm Submission',
      'edit_button': 'Edit',
      'edit_all_button': 'Edit Form',
      'submit_button': 'Submit Form',
      'cancel_button': 'Cancel',
      'yes_submit_button': 'Yes, Submit',
      'close_summary': 'Close summary',
      'uploaded_files': 'Uploaded Files',
      'helpdesk_confirm': 'Are you sure you want to submit this support request? Once submitted, it will be sent to our support team.',
      'nokkelbestilling_confirm': 'Are you sure you want to submit this key order? Once submitted, your order will be processed.',
      'inspection_confirm': 'Are you sure you want to submit this inspection report? Once submitted, it cannot be modified.',
      'invoicerequest_confirm': 'Are you sure you want to submit this invoice request? Once submitted, it will be processed for payment.',
      'default_confirm': 'Are you sure you want to submit this form? Once submitted, it cannot be modified.',
      'summary_opened': 'Form summary displayed. Review your information before submitting.',
      'summary_closed': 'Form summary closed. You are back to the form.',
      'confirmation_opened': 'Confirmation dialog displayed. Please confirm your submission.',
      'confirmation_closed': 'Confirmation dialog closed.',
      'field_focused': 'Focused on {field} field for editing.',
      'form_being_submitted': 'Form is being submitted, please wait...',
      'draft_saved': 'Form draft saved automatically.',
      'draft_restored': 'Previous form draft restored.',
      'changes_detected': 'You have unsaved changes. Are you sure you want to leave?'
    };
    
    let translation = fallbacks[key] || key;
    
    // Replace placeholders
    Object.keys(replacements).forEach(placeholder => {
      translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
    });
    
    return translation;
  }

  /**
   * Populate form fields with data
   * @param {Object} data - Form data to populate
   */
  populateFormData(data) {
    Object.keys(data).forEach(name => {
      if (name === '_files') return; // Skip file data
      
      const $field = this.$form.find(`[name="${name}"], #${name}`);
      if (!$field.length) return;
      
      const type = $field.attr('type');
      const value = data[name];
      
      if (type === 'checkbox' || type === 'radio') {
        $field.filter(`[value="${value}"]`).prop('checked', true);
      } else if ($field.is('select')) {
        $field.val(value);
      } else if (type !== 'file' && type !== 'submit' && type !== 'button') {
        $field.val(value);
      }
    });
    
    // Trigger change events to update any dependent fields
    this.$form.find('input, select, textarea').trigger('change');
  }
}

// Export the FormHandler class for use in other files
window.FormHandler = FormHandler;
