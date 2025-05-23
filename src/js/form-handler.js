/**
 * FormHandler - Common form handling functionality
 * Centralizes validation, submission, file uploads, and accessibility
 * 
 * Created: May 23, 2025
 * Provides consistent form handling across all forms in the application
 * WCAG 2.1 compliant with improved keyboard accessibility and screen reader support
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
    
    // Setup form components
    this.createScreenReaderStatus();
    this.markRequiredFields();
    this.initFileUploader();
    this.setupFormValidation();
    this.initAccessibility();
    this.setupSubmitHandler();
    
    // Set focus on first input field
    this.focusFirstField();
    
    // Log initialization
    console.log(`FormHandler initialized for form '${this.formId}'`);
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
    } catch(e) {
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
    this.$form.on('submit', (e) => {
      e.preventDefault();
      
      // Run custom pre-validation if it exists
      if (typeof this.customHandlers.preValidate === 'function') {
        if (this.customHandlers.preValidate.call(this) === false) {
          return false;
        }
      }
      
      // Check form validity
      let formValid = this.validateForm();
      
      // Check file upload validity if required
      let fileValid = true;
      if (this.fileRequired) {
        fileValid = this.validateFileUpload();
      }
      
      // If either validation fails, stop submission
      if (!formValid || !fileValid) {
        return false;
      }
      
      // Update form status
      this.announceToScreenReader('Form is being submitted, please wait...');
      
      // Submit form
      this.submitForm();
    });
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
}

// Export the FormHandler class for use in other files
window.FormHandler = FormHandler;
