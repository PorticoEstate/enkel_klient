/**
 * FormConfirmation Extension
 * Handles WCAG 3.3.4 confirmation features (summary and dialogs)
 */

// Define the class only if it doesn't exist already
var FormConfirmationExtension = FormConfirmationExtension || (function() {
  return class FormConfirmationExtension {
  constructor(formHandler, options = {}) {
    this.formHandler = formHandler;
    this.$form = formHandler.getForm();
    this.options = {
      showSummary: false,
      showDialog: false,
      ...options
    };
    
    // Form state tracking
    this.recordId = null;
    this.isFormLocked = false;
    
    // Initialize immediately since we have formHandler
    this.init();
  }
  
  init() {
    // Initialize form confirmation features  
    if (this.options.showSummary || this.options.showDialog) {
      this.setupConfirmationFlow();
    }
    
    // Make sure styles are added early
    if (this.options.showSummary) {
      this.addStyles();
    }
  }
  
  setupConfirmationFlow() {
    // Use beforeSubmit hook instead of intercepting click
    // This allows validation to run first
    this.formHandler.addHook('beforeSubmit', (formData) => {
      return this.handleConfirmationBeforeSubmit(formData);
    });
    
    // Add click handler for the submit button
    const $submitBtn = this.$form.find('button[type="submit"], input[type="submit"]');
    if ($submitBtn.length) {
      $submitBtn.on('click', (e) => {
        // Let the form validation and the hook handle this
      });
    }
  }
  
  handleConfirmationBeforeSubmit(formData) {
    // CRITICAL: First check if form is valid before showing confirmation
    const validationExtension = this.formHandler.getExtension('validation');
    if (validationExtension && typeof validationExtension.isValid === 'function') {
      const isValid = validationExtension.isValid();
      Debug.debug('🔍 Confirmation extension: Form validation result:', isValid);
      
      if (!isValid) {
        Debug.debug('❌ Confirmation extension: Form has validation errors, not showing summary');
        // Let validation extension handle error display
        return false; // Block submission due to validation errors
      }
    }
    
    // Form is valid, proceed with confirmation logic
    Debug.debug('✅ Confirmation extension: Form is valid, proceeding with confirmation');
    this.formData = this.collectFormData();
    
    // Check if form has files that need two-phase submission
    const hasFiles = this.shouldUseTwoPhaseSubmission();
    
    // Always show form summary for review when using confirmation or when there are files
    if (this.options.showSummary || hasFiles) {
      Debug.debug('Showing form summary for review before submission');
      this.showFormSummary();
      return false; // Prevent normal submission, we'll handle it in the modal
    }
    // Option 3: Show simple confirmation dialog
    else if (this.options.showDialog) {
      this.showConfirmationDialog();
      return false; // Prevent normal submission, we'll handle it in the dialog
    }
    
    // Option 4: Regular submission (no confirmation, no files)
    return true;
  }
  
  shouldUseTwoPhaseSubmission() {
    // Check if form has file uploads that need two-phase processing
    const hasFileInputs = this.$form.find('input[type="file"]').length > 0;
    const hasFileUploader = window.FileUploader && this.$form.find('#fileupload, .fileupload').length > 0;
    
    // Use the centralized file counting method which respects UI deletions
    const fileCount = this.getFileCount();
    const hasFilesToUpload = fileCount > 0;
    
    Debug.debug('shouldUseTwoPhaseSubmission check:', {
      hasFileInputs,
      hasFileUploader,
      fileCount,
      hasFilesToUpload,
      result: (hasFileInputs || hasFileUploader) && hasFilesToUpload
    });
    
    return (hasFileInputs || hasFileUploader) && hasFilesToUpload;
  }
  
  getFileCount() {
    // Try to get file count from FileUploadExtension first (most accurate)
    const fileUploadExt = this.formHandler.getExtension('fileUpload');
    if (fileUploadExt && typeof fileUploadExt.getFileCount === 'function') {
      try {
        return fileUploadExt.getFileCount();
      } catch (e) {
        Debug.warn('Error getting file count from FileUploadExtension:', e);
      }
    }
    
    // Try to get file count from FileUploader instance
    if (window.fileUploaderInstance && typeof window.fileUploaderInstance.getPendingCount === 'function') {
      try {
        return window.fileUploaderInstance.getPendingCount();
      } catch (e) {
        Debug.warn('Error getting file count from FileUploader:', e);
      }
    }
    
    // Check for active file items in the UI first (respects deletions)
    const fileItemCount = this.$form.find('.file-item:not(.done):not(.deleted)').length;
    if (fileItemCount > 0) {
      return fileItemCount;
    }
    
    // Fallback: check file input directly (only if no UI file items exist)
    let count = 0;
    this.$form.find('input[type="file"]').each(function() {
      if (this.files) {
        count += this.files.length;
      }
    });
    
    return count;
  }
  
  collectFormData() {
    const data = {};
    
    // Fields to exclude from summary (system/hidden fields)
    const excludeFields = [
      'randcheck',           // CSRF token
      'csrf_token',          // Alternative CSRF token name
      '_token',              // Common token name
      'authenticity_token',  // Rails-style token
      'form_id',             // Form identifier
      'action',              // Form action override
      'redirect_url'         // Redirect URL override
    ];
    
    this.$form.find('input, select, textarea').each(function() {
      const $field = $(this);
      const name = $field.attr('name') || $field.attr('id');
      const type = $field.attr('type');
      
      // Skip fields without names or system field types
      if (!name || type === 'file' || type === 'submit' || type === 'button') return;
      
      // Skip hidden fields and excluded system fields
      if (type === 'hidden' || excludeFields.includes(name)) return;
      
      // Skip empty values
      const value = $field.val();
      if (!value || (typeof value === 'string' && value.trim() === '')) return;
      
      if (type === 'checkbox' || type === 'radio') {
        if ($field.is(':checked')) {
          data[name] = value;
        }
      } else {
        data[name] = value;
      }
    });
    return data;
  }
  
  showFormSummary() {
    const summaryHtml = this.generateSummaryHtml();
    const hasPhases = this.shouldUseTwoPhaseSubmission();
    const fileCount = this.getFileCount();
    
    // Set a flag to track if the close button should be initially disabled
    const shouldDisableCloseButton = hasPhases && fileCount > 0;
    
    // Get translations with fallbacks
    const reviewTitle = this.getTranslation('form_confirmation.review_title', 'Review Your Information');
    const reviewIntro = this.getTranslation('form_confirmation.review_intro', 'Please review your information before submitting:');
    const editButton = this.getTranslation('form_confirmation.edit_all_button', 'Edit');
    const submitButton = this.getTranslation('form_confirmation.submit_button', 'Submit');
    
    // Prepare information about file attachments if any
    const fileAttachmentsHeading = this.getTranslation('form_confirmation.file_attachments_heading', 'File Attachments');
    const fileAttachmentsDescription = this.getTranslation('form_confirmation.file_attachments_description', '{count} file(s) will be uploaded after form submission.')
      .replace('{count}', fileCount);
    
    const fileUploadInfo = fileCount > 0 ? 
      `<div class="file-upload-info">
        <h4>📎 ${fileAttachmentsHeading}</h4>
        <p>${fileAttachmentsDescription}</p>
      </div>` : '';
    
    // Prepare progress tracking area for phases
    const submissionProgressHeading = this.getTranslation('form_confirmation.submission_progress_heading', 'Submission Progress');
    const phase1Title = this.getTranslation('form_confirmation.phase1_title', 'Phase 1: Submitting form data...');
    const phase2Title = this.getTranslation('form_confirmation.phase2_title', 'Phase 2: Uploading files...');
    const percentComplete = this.getTranslation('form_confirmation.percent_complete', '{percent}% complete').replace('{percent}', '0');
    const submissionComplete = this.getTranslation('form_confirmation.submission_complete', 'Submission complete!');
    
    const progressTrackingHtml = hasPhases ? 
      `<div class="two-phase-progress" style="display: none;">
        <h4>📤 ${submissionProgressHeading}</h4>
        <div class="progress-step" id="step-form-data">
          <div class="step-indicator">⏳</div>
          <span class="step-text">${phase1Title}</span>
        </div>
        <div class="progress-step" id="step-file-upload" style="display: none;">
          <div class="step-indicator">⏳</div>
          <span class="step-text">${phase2Title}</span>
          <div class="file-progress-container" style="margin-top: 10px; display: none;">
            <div class="progress">
              <div class="progress-bar" role="progressbar" style="width: 0%"></div>
            </div>
            <div class="progress-text">${percentComplete}</div>
          </div>
        </div>
        <div class="progress-step" id="step-complete" style="display: none;">
          <div class="step-indicator">✅</div>
          <span class="step-text">${submissionComplete}</span>
        </div>
      </div>` : '';
    
    const $modal = $(`
      <div class="form-summary-modal" role="dialog" aria-modal="true">
        <div class="form-summary-backdrop"></div>
        <div class="form-summary-content">
          <div class="form-summary-header">
            <h2>${reviewTitle}</h2>
            <button type="button" class="form-summary-close" ${shouldDisableCloseButton ? 'data-phase-locked="true"' : ''}>&times;</button>
          </div>
          <div class="form-summary-body">
            <p>${reviewIntro}</p>
            ${summaryHtml}
            ${fileUploadInfo}
            ${progressTrackingHtml}
          </div>
          <div class="form-summary-footer">
            <div class="button-group-left">
              <button type="button" class="btn btn-secondary form-summary-edit">${editButton}</button>
            </div>
            <div class="button-group-right">
              ${hasPhases ? 
                `<button type="button" class="btn btn-success btn-run-phase1">${this.getTranslation('form_confirmation.run_phase1_button', 'Run Phase 1 (Submit Data)')}</button>
                <button type="button" class="btn btn-primary btn-run-phase2" disabled>${this.getTranslation('form_confirmation.run_phase2_button', 'Run Phase 2 (Upload Files)')}</button>
                <button type="button" class="btn btn-outline-primary btn-complete-process" disabled>${this.getTranslation('form_confirmation.complete_process_button', 'Complete Process')}</button>` 
                : 
                `<button type="button" class="btn btn-primary form-summary-submit">${submitButton}</button>`
              }
            </div>
          </div>
        </div>
      </div>
    `);
    
    $('body').append($modal);
    this.addStyles();
    this.setupSummaryEvents($modal, hasPhases);
  }
  
  generateSummaryHtml() {
    const editButtonText = this.getTranslation('form_confirmation.edit_field_button', 'Edit');
    let html = '<dl class="form-summary-list">';
    
    Object.keys(this.formData).forEach(name => {
      const value = this.formData[name];
      if (value && value.trim()) {
        const label = this.getFieldLabel(name);
        const fieldId = this.getFieldId(name);
        
        html += `
          <div class="form-summary-item" data-field-name="${name}">
            <dt>${label}:</dt>
            <dd>
              ${this.formatFieldValueWithContainer(value)}
              <button type="button" class="btn-edit-field" data-field="${name}" data-field-id="${fieldId}">
                <span class="edit-icon">✎</span> ${editButtonText}
              </button>
            </dd>
          </div>
        `;
      }
    });
    
    html += '</dl>';
    return html;
  }
  
  getFieldLabel(fieldName) {
    // Escape special characters in fieldName for CSS selector
    const escapedFieldName = fieldName.replace(/([[\]().])/g, '\\$1');
    const escapedFieldId = fieldName.replace(/([[\]().])/g, '\\$1');
    
    // Try to find the field by name attribute (escaped)
    let $field = this.$form.find(`[name="${escapedFieldName}"]`);
    
    // If not found by name, try by ID (escaped)
    if (!$field.length) {
      $field = this.$form.find(`#${escapedFieldId}`);
    }
    
    if ($field.length) {
      const fieldId = $field.attr('id');
      if (fieldId) {
        // Escape the field ID for the label selector
        const escapedId = fieldId.replace(/([[\]().])/g, '\\$1');
        const $label = this.$form.find(`label[for="${escapedId}"]`);
        if ($label.length) {
          return $label.text().replace(/\*\s*$/, '').trim();
        }
      }
      
      // Try to find a parent label or nearby label
      const $parentLabel = $field.closest('label');
      if ($parentLabel.length) {
        return $parentLabel.text().replace(/\*\s*$/, '').trim();
      }
      
      // Look for a label that contains this field
      const $containingLabel = this.$form.find('label').filter(function() {
        return $(this).find($field).length > 0;
      });
      if ($containingLabel.length) {
        return $containingLabel.text().replace(/\*\s*$/, '').trim();
      }
    }
    
    // Fallback: return a cleaned version of the field name
    return fieldName.replace(/([[\]()._])/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
  // Get the field ID from a field name
  getFieldId(fieldName) {
    // Escape special characters in fieldName for CSS selector
    const escapedFieldName = fieldName.replace(/([[\]().])/g, '\\$1');
    
    // Try to find the field by name attribute
    let $field = this.$form.find(`[name="${escapedFieldName}"]`);
    
    // If not found by name, try by ID
    if (!$field.length) {
      $field = this.$form.find(`#${escapedFieldName}`);
    }
    
    // Return the field ID if found, otherwise return the field name
    return $field.length ? ($field.attr('id') || fieldName) : fieldName;
  }
  
  getTranslation(key, fallback) {
    // Try to get translation from global translations object
    if (typeof window.translations !== 'undefined') {
      const keys = key.split('.');
      let value = window.translations;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && value.hasOwnProperty(k)) {
          value = value[k];
        } else {
          return fallback;
        }
      }
      
      return typeof value === 'string' ? value : fallback;
    }
    
    return fallback;
  }
  
  /**
   * Format a field value with proper container and classes
   * @param {string} value - The field value to format
   * @returns {string} - Properly formatted value in a container
   */
  formatFieldValueWithContainer(value) {
    if (!value || typeof value !== 'string') {
      return `<span class="field-value">${this.escapeHtml(String(value || ''))}</span>`;
    }
    
    // Check if this looks like HTML content (from rich text editor)
    if (this.isHtmlContent(value)) {
      // Format as HTML with proper sanitization and styling
      const formattedContent = this.formatHtmlContent(value);
      return `<span class="field-value rich-content">${formattedContent}</span>`;
    } else {
      // Treat as plain text and escape it
      return `<span class="field-value">${this.escapeHtml(value)}</span>`;
    }
  }
  
  /**
   * Format a field value for display, detecting and handling HTML content
   * @param {string} value - The field value to format
   * @returns {string} - Properly formatted value for display
   */
  formatFieldValue(value) {
    if (!value || typeof value !== 'string') {
      return this.escapeHtml(String(value || ''));
    }
    
    // Check if this looks like HTML content (from rich text editor)
    if (this.isHtmlContent(value)) {
      // Format as HTML with proper sanitization and styling
      return this.formatHtmlContent(value);
    } else {
      // Treat as plain text and escape it
      return this.escapeHtml(value);
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Detect if a string contains HTML content
   * @param {string} str - The string to check
   * @returns {boolean} - True if the string appears to contain HTML
   */
  isHtmlContent(str) {
    if (!str || typeof str !== 'string') return false;
    
    // Check for common HTML patterns
    const htmlPatterns = [
      /<[a-z][\s\S]*>/i,           // Basic HTML tags
      /&[a-z]+;/i,                 // HTML entities
      /<\/[a-z]+>/i,               // Closing tags
      /<br\s*\/?>/i,               // Line breaks
      /<p[\s>]/i,                  // Paragraphs
      /<div[\s>]/i,                // Divs
      /<span[\s>]/i,               // Spans
      /<strong[\s>]/i,             // Strong/bold
      /<em[\s>]/i,                 // Emphasis/italic
      /<ul[\s>]/i,                 // Lists
      /<ol[\s>]/i,                 // Ordered lists
      /<li[\s>]/i,                 // List items
      /<h[1-6][\s>]/i,             // Headers
      /<a[\s>]/i,                  // Links
    ];
    
    // Also check if it looks like Quill editor content
    const quillPatterns = [
      /<p><br><\/p>/,              // Empty Quill paragraph
      /class="ql-/,                // Quill CSS classes
      /<p>.*<\/p>/,                // Paragraph content from Quill
    ];
    
    return htmlPatterns.some(pattern => pattern.test(str)) || 
           quillPatterns.some(pattern => pattern.test(str));
  }
  
  /**
   * Format HTML content for display in the form summary
   * @param {string} htmlContent - The HTML content to format
   * @returns {string} - Safely formatted HTML for display
   */
  formatHtmlContent(htmlContent) {
    if (!htmlContent || typeof htmlContent !== 'string') return '';
    
    // Create a temporary div to work with the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Remove potentially dangerous elements and attributes
    this.sanitizeHtmlContent(tempDiv);
    
    // Apply formatting for better readability in summary
    this.enhanceHtmlForSummary(tempDiv);
    
    return tempDiv.innerHTML;
  }
  
  /**
   * Sanitize HTML content by removing dangerous elements and attributes
   * @param {Element} container - The container element to sanitize
   */
  sanitizeHtmlContent(container) {
    // Remove script tags and other dangerous elements
    const dangerousElements = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'];
    dangerousElements.forEach(tagName => {
      const elements = container.querySelectorAll(tagName);
      elements.forEach(el => el.remove());
    });
    
    // Remove dangerous attributes
    const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'];
    const allElements = container.querySelectorAll('*');
    allElements.forEach(el => {
      dangerousAttrs.forEach(attr => {
        if (el.hasAttribute(attr)) {
          el.removeAttribute(attr);
        }
      });
      
      // Remove href attributes that could be dangerous
      if (el.hasAttribute('href')) {
        const href = el.getAttribute('href');
        if (href.startsWith('javascript:') || href.startsWith('data:')) {
          el.removeAttribute('href');
        }
      }
    });
  }
  
  /**
   * Enhance HTML content for better display in the form summary
   * @param {Element} container - The container element to enhance
   */
  enhanceHtmlForSummary(container) {
    // Add styling classes for better presentation
    const styleMap = {
      'p': 'summary-paragraph',
      'h1, h2, h3, h4, h5, h6': 'summary-heading',
      'ul, ol': 'summary-list',
      'li': 'summary-list-item',
      'strong, b': 'summary-bold',
      'em, i': 'summary-italic',
      'a': 'summary-link',
      'blockquote': 'summary-quote'
    };
    
    Object.keys(styleMap).forEach(selector => {
      const elements = container.querySelectorAll(selector);
      elements.forEach(el => {
        el.classList.add(styleMap[selector]);
      });
    });
    
    // Handle empty paragraphs from Quill
    const emptyPs = container.querySelectorAll('p');
    emptyPs.forEach(p => {
      if (p.innerHTML === '<br>' || p.innerHTML.trim() === '') {
        p.style.display = 'none';
      }
    });
    
    // Limit content length for summary display
    this.truncateContentIfNeeded(container);
  }
  
  /**
   * Truncate content if it's too long for the summary display
   * @param {Element} container - The container element to potentially truncate
   */
  truncateContentIfNeeded(container) {
    const maxLength = 500; // Maximum characters to show in summary
    const textContent = container.textContent || '';
    
    if (textContent.length > maxLength) {
      // Store the original HTML content before truncation
      const originalContent = container.innerHTML;
      
      // Find a good place to cut off
      const truncatedText = textContent.substring(0, maxLength);
      const lastSpaceIndex = truncatedText.lastIndexOf(' ');
      const cutPoint = lastSpaceIndex > maxLength * 0.8 ? lastSpaceIndex : maxLength;
      
      // Create a truncated version
      container.innerHTML = this.escapeHtml(textContent.substring(0, cutPoint)) + 
        `<span class="content-truncated">... <button type="button" class="btn-show-full-content">Show full content</button></span>`;
      
      // Store the original content for expansion
      container.setAttribute('data-full-content', originalContent);
    }
  }
  
  setupSummaryEvents($modal, hasPhases) {
    // Close modal events - Only for the close button, not the backdrop
    $modal.find('.form-summary-close').on('click', (e) => {
      // Check if the modal can be closed (all required phases completed)
      if (!this.canCloseModal()) {
        e.preventDefault();
        e.stopPropagation();
        
        // Show a message explaining why the modal can't be closed
        const phaseIncompleteMessage = this.getTranslation('form_confirmation.phase_incomplete_notice', 'Please complete the file upload process before closing this dialog.');
        alert(phaseIncompleteMessage);
        return false;
      }
      
      // No issues found, allow closing
      $modal.remove();
    });
    
    // Add separate handler for the edit button that respects locked state
    $modal.find('.form-summary-edit').on('click', (e) => {
      // Check if form is editable using our helper method
      if (!this.isFormEditable()) {
        e.preventDefault();
        e.stopPropagation();
        
        // Show a tooltip or alert about the locked state
        const formLockedMessage = this.getTranslation('form_confirmation.form_locked_notice', 'The form is locked after Phase 1 submission and cannot be edited.');
        alert(formLockedMessage);
        return false;
      }
      
      // Otherwise proceed with normal close action
      $modal.remove();
    });
    
    // Field-specific edit buttons
    $modal.on('click', '.btn-edit-field', (e) => {
      // Check if form is editable using our helper method
      if (!this.isFormEditable()) {
        e.preventDefault();
        e.stopPropagation();
        
        const $button = $(e.currentTarget);
        // Visual feedback that editing is not allowed
        $button.addClass('edit-denied');
        setTimeout(() => {
          $button.removeClass('edit-denied');
        }, 1000);
        
        return false;
      }
      
      const $button = $(e.currentTarget);
      const fieldId = $button.data('field-id');
      const fieldName = $button.data('field');
      
      // Close the modal
      $modal.remove();
      
      // Find the field in the form
      const $field = this.$form.find(`#${fieldId}, [name="${fieldName}"]`).first();
      
      if ($field.length) {
        // Check if this is a textarea with a rich text editor
        let $targetElement = $field;
        
        if ($field.is('textarea')) {
          // Check for Quill editor
          const quillEditorId = `quill-${fieldId}`;
          const $quillEditor = this.$form.find(`#${quillEditorId}`);
          
          if ($quillEditor.length) {
            Debug.debug(`Found Quill editor for textarea ${fieldId}, targeting editor container`);
            $targetElement = $quillEditor;
            
            // Also try to focus the Quill instance directly
            if (window.quillInstances && window.quillInstances[fieldId]) {
              setTimeout(() => {
                try {
                  window.quillInstances[fieldId].focus();
                  Debug.debug(`Focused Quill editor instance for ${fieldId}`);
                } catch (e) {
                  Debug.warn(`Could not focus Quill editor for ${fieldId}:`, e);
                }
              }, 700);
            }
          } else {
            // Check for other rich text editors by looking for common patterns
            const $editorContainer = this.$form.find(`[data-quill-id="${fieldId}"], .ql-container[data-field-id="${fieldId}"]`).first();
            
            if ($editorContainer.length) {
              Debug.debug(`Found rich text editor container for textarea ${fieldId}`);
              $targetElement = $editorContainer;
            }
          }
        }
        
        // Scroll to the target element (either the field or the editor container)
        const offset = $targetElement.offset().top - 100;
        $('html, body').animate({
          scrollTop: offset
        }, 500);
        
        // Focus on the target element after scrolling
        setTimeout(() => {
          // For rich text editors, we might need special focus handling
          if ($targetElement.hasClass('ql-container') || $targetElement.find('.ql-editor').length) {
            // This is a Quill editor container
            const $editor = $targetElement.find('.ql-editor').first();
            if ($editor.length) {
              $editor.focus();
              Debug.debug(`Focused Quill editor content area for ${fieldName}`);
            } else {
              $targetElement.focus();
            }
          } else {
            // Regular field focus
            $targetElement.focus();
          }
          
          // Add a temporary highlight effect to the target element
          $targetElement.addClass('field-highlight');
          setTimeout(() => {
            $targetElement.removeClass('field-highlight');
          }, 2000);
        }, 600);
      } else {
        Debug.warn(`Field not found: ${fieldName} (ID: ${fieldId})`);
      }
    });
    
    // Show full content button handler
    $modal.on('click', '.btn-show-full-content', (e) => {
      e.preventDefault();
      const $button = $(e.currentTarget);
      const $fieldValue = $button.closest('.field-value');
      const fullContent = $fieldValue.data('full-content');
      
      if (fullContent) {
        $fieldValue.html(fullContent);
        // Remove the data attribute to prevent repeated expansion
        $fieldValue.removeData('full-content');
      }
    });
    
    if (hasPhases) {
      // Two-phase submission handlers
      this.setupPhaseHandlers($modal);
    } else {
      // Standard submission
      $modal.find('.form-summary-submit').on('click', () => {
        $modal.remove();
        this.formHandler.submitForm();
      });
    }
  }
  
  // Automatic two-phase submit without requiring user interaction
  async automaticTwoPhaseSubmit() {
    // Show a simple loading overlay
    const $overlay = $(`
      <div class="form-submit-overlay">
        <div class="submit-progress">
          <div class="spinner"></div>
          <p>Submitting your form...</p>
          <div class="progress">
            <div class="progress-bar" role="progressbar" style="width: 0%"></div>
          </div>
          <p class="status-text">Processing...</p>
        </div>
      </div>
    `);
    
    $('body').append($overlay);
    
    // Add styles for the overlay
    if ($('#form-submit-overlay-styles').length === 0) {
      $('head').append(`
        <style id="form-submit-overlay-styles">
          .form-submit-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
          }
          .submit-progress {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            width: 400px;
            text-align: center;
          }
          .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border-left-color: #007bff;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .submit-progress .progress {
            margin: 15px 0;
            height: 10px;
          }
          .status-text {
            margin-top: 10px;
            font-weight: bold;
          }
          .error-message {
            color: #dc3545;
            margin-top: 15px;
            padding: 10px;
            background-color: #f8d7da;
            border-radius: 4px;
          }
        </style>
      `);
    }
    
    try {
      // Phase 1: Submit form data
      const submittingFormData = this.getTranslation('form_confirmation.submitting_form_data', 'Submitting form data...');
      $overlay.find('.status-text').text(submittingFormData);
      $overlay.find('.progress-bar').css('width', '30%');
      
      const recordId = await this.submitFormData();
      this.recordId = recordId;
      
      // Phase 2: Upload files (if any)
      const fileCount = this.getFileCount();
      if (fileCount > 0) {
        const uploadingFiles = this.getTranslation('form_confirmation.uploading_files', 'Uploading files...');
        $overlay.find('.status-text').text(uploadingFiles);
        $overlay.find('.progress-bar').css('width', '60%');
        
        await this.uploadFiles();
      }
      
      // Complete
      const submissionComplete = this.getTranslation('form_confirmation.submission_complete', 'Submission complete!');
      $overlay.find('.status-text').text(submissionComplete);
      $overlay.find('.progress-bar').css('width', '100%');
      
      // Redirect after a brief delay
      setTimeout(() => {
        window.location.href = this.formHandler.redirectUrl || window.location.href;
      }, 1500);
      
    } catch (error) {
      Debug.error('Form submission failed:', error);
      
      // Show error in overlay
      $overlay.find('.spinner').hide();
      
      const errorHeading = this.getTranslation('form_confirmation.phase_error_heading', 'Error:');
      const closeButton = this.getTranslation('form_confirmation.cancel_button', 'Close');
      
      $overlay.find('.status-text').html(`
        <div class="error-message">
          <strong>${errorHeading}</strong> ${error.message}<br>
          <button class="btn btn-secondary close-overlay" style="margin-top:10px;">${closeButton}</button>
        </div>
      `);
      
      // Add close handler
      $overlay.find('.close-overlay').on('click', () => {
        $overlay.remove();
      });
    }
  }
  
  setupPhaseHandlers($modal) {
    // Store modal reference
    this.$currentModal = $modal;
    
    // Phase 1 button: Submit form data
    $modal.find('.btn-run-phase1').on('click', () => {
      this.runPhase1($modal);
    });
    
    // Phase 2 button: Upload files
    $modal.find('.btn-run-phase2').on('click', () => {
      this.runPhase2($modal);
    });
    
    // Complete process button: Finish submission
    $modal.find('.btn-complete-process').on('click', () => {
      this.completeProcess($modal);
    });
  }
  
  async runPhase1($modal) {
    // Show progress tracking
    $modal.find('.two-phase-progress').show();
    const $phase1Button = $modal.find('.btn-run-phase1');
    const $phase1Step = $modal.find('#step-form-data');
    
    // Add notice about not closing the modal
    if (this.getFileCount() > 0 && !$modal.find('.phase-incomplete-notice').length) {
      const closeWarningText = this.getTranslation('form_confirmation.close_warning', 
        'Please complete both phases before closing this dialog. The close button will be enabled once all uploads are complete.');
      $modal.find('.form-summary-header').append(`
        <div class="phase-incomplete-notice" role="alert">
          <span aria-hidden="true">⚠️</span> ${closeWarningText}
        </div>
      `);
      
      // Add styling for the notice
      if (!$('#phase-notice-styles').length) {
        $('head').append(`
          <style id="phase-notice-styles">
            .phase-incomplete-notice {
              font-size: 14px;
              color: #856404;
              background-color: #fff3cd;
              border: 1px solid #ffeeba;
              border-radius: 4px;
              padding: 8px 12px;
              margin-top: 10px;
              width: 100%;
            }
          </style>
        `);
      }
    }
    
    // Update button state
    $phase1Button.prop('disabled', true).text(this.getTranslation('form_confirmation.submitting_data', 'Submitting data...'));
    $phase1Step.addClass('active');
    
    try {
      // Submit form data without files (using our own method)
      const recordId = await this.submitFormData();
      this.recordId = recordId;
      
      Debug.debug('Form data submitted successfully, record ID:', recordId);
      
      // Lock the form after successful Phase 1 completion
      Debug.debug('Setting form locked state to prevent editing');
      this.isFormLocked = true;
      this.lockFormFields($modal);
      
      // Update UI to show success
      $phase1Step.removeClass('active').addClass('complete');
      $phase1Step.find('.step-indicator').text('✅');
      $phase1Button.text(this.getTranslation('form_confirmation.data_submitted', 'Data submitted'));
      
      // Enable phase 2 button
      $modal.find('.btn-run-phase2').prop('disabled', false);
      
      // Show success message
      const successHeading = this.getTranslation('form_confirmation.phase_success_heading', 'Success!');
      const successRecord = this.getTranslation('form_confirmation.phase_success_record', 'Record ID: {id}').replace('{id}', recordId);
      
      $phase1Step.append(`
        <div class="phase-success">
          <p><strong>${successHeading}</strong> ${successRecord}</p>
        </div>
      `);
      
      Debug.debug('✅ Phase 1 complete, record ID:', recordId);
      Debug.debug('🔒 Form is now locked to prevent editing');
      
      // Clear autosaved data after successful Phase 1 completion
      this.clearAutosaveData();
      
    } catch (error) {
      Debug.error('❌ Phase 1 failed:', error);
      
      // Update UI to show error
      $phase1Step.removeClass('active');
      $phase1Step.find('.step-indicator').text('❌');
      
      const errorHeading = this.getTranslation('form_confirmation.phase_error_heading', 'Error:');
      
      $phase1Step.append(`
        <div class="phase-error">
          <p><strong>${errorHeading}</strong> ${error.message}</p>
        </div>
      `);
      
      // Reset button for retry
      $phase1Button.prop('disabled', false).text(this.getTranslation('form_confirmation.retry_phase1', 'Retry Phase 1'));
    }
  }
  
  async runPhase2($modal) {
    if (!this.recordId) {
      alert('No record ID available. Please run Phase 1 first.');
      return;
    }
    
    const $phase2Button = $modal.find('.btn-run-phase2');
    const $phase2Step = $modal.find('#step-file-upload');
    
    // Update UI
    $phase2Step.show().addClass('active');
    $modal.find('.file-progress-container').show();
    $phase2Button.prop('disabled', true).text(this.getTranslation('form_confirmation.uploading_files', 'Uploading files...'));
    
    // Debug: Log file information before upload
    Debug.debug('--- File Upload Debug Info ---');
    Debug.debug('Record ID:', this.recordId);
    
    // Check window.fileUploaderInstance
    if (window.fileUploaderInstance) {
      Debug.debug('Global fileUploaderInstance exists:', window.fileUploaderInstance);
      if (typeof window.fileUploaderInstance.getPendingCount === 'function') {
        Debug.debug('Pending files count:', window.fileUploaderInstance.getPendingCount());
      }
    } else {
      Debug.debug('No global fileUploaderInstance found');
    }
    
    // Check for file elements in the DOM
    Debug.debug('File input elements:', $('input[type="file"]').length);
    Debug.debug('File items in UI:', $('.file-item').length);
    Debug.debug('------------------------');
    
    try {
      // Store modal for progress updates
      this.$currentModal = $modal;
      
      // Run file upload with our own method
      await this.uploadFiles($modal);
      
      // Update UI for success
      $phase2Step.removeClass('active').addClass('complete');
      $phase2Step.find('.step-indicator').text('✅');
      $phase2Button.text(this.getTranslation('form_confirmation.files_uploaded', 'Files uploaded'));
      
      // Enable completion button
      $modal.find('.btn-complete-process').prop('disabled', false);
      
      // Remove the warning notice as it's no longer needed
      $modal.find('.phase-incomplete-notice').fadeOut(function() {
        $(this).remove();
      });
      
      // Remove both form locked notices after Phase 2 completion
      $modal.find('.form-locked-notice').fadeOut(function() {
        $(this).remove();
      });
      
      // Also remove the form locked banner from the main form
      this.$form.find('.form-locked-banner').fadeOut(function() {
        $(this).remove();
      });
      
      // Enable the close button now that all phases are complete
      $modal.find('.form-summary-close').removeAttr('data-phase-locked');
      
      Debug.debug('✅ Phase 2 complete: Files uploaded');
      
      // Clear any remaining autosaved data after successful Phase 2 completion
      this.clearAutosaveData();
      
    } catch (error) {
      Debug.error('❌ Phase 2 failed:', error);
      
      // Update UI to show error
      $phase2Step.removeClass('active');
      $phase2Step.find('.step-indicator').text('❌');
      
      const errorHeading = this.getTranslation('form_confirmation.phase_error_heading', 'Error:');
      
      $phase2Step.append(`
        <div class="phase-error">
          <p><strong>${errorHeading}</strong> ${error.message}</p>
        </div>
      `);
      
      // Reset button for retry
      $phase2Button.prop('disabled', false).text(this.getTranslation('form_confirmation.retry_phase2', 'Retry Phase 2'));
    }
  }
  
  completeProcess($modal) {
    // Show completion step
    const $completeStep = $modal.find('#step-complete');
    $completeStep.show().addClass('complete');
    
    // Update button
    const $completeButton = $modal.find('.btn-complete-process');
    $completeButton.prop('disabled', true).text(this.getTranslation('form_confirmation.process_completed', 'Process completed'));
    
    // Wait a moment to show completion, then redirect
    setTimeout(() => {
      window.location.href = this.formHandler.redirectUrl || window.location.href;
    }, 2000);
  }
  
  // Helper method to check if the form is editable
  isFormEditable() {
    // Return false if the form is locked (after Phase 1 completion)
    if (this.isFormLocked) {
      Debug.debug('Form editing prevented: Form is locked after Phase 1 submission');
      return false;
    }
    
    // Add any other conditions that might prevent editing here
    return true;
  }
  
  // Helper method to check if all required phases are complete
  canCloseModal() {
    // If two-phase submission is not needed or the form is not locked, closing is allowed
    const hasFilesToUpload = this.shouldUseTwoPhaseSubmission();
    
    // If there are no files to upload, the modal can be closed anytime
    if (!hasFilesToUpload) {
      return true;
    }
    
    // If form is locked (Phase 1 completed) but there are files to upload,
    // we should check if Phase 2 is also complete before allowing the modal to close
    if (this.isFormLocked) {
      // Check if Phase 2 has been completed 
      // (presence of record ID and no files remaining to upload)
      const fileCount = this.getFileCount();
      if (this.recordId && fileCount === 0) {
        // Both phases are complete, can close modal
        return true;
      } else {
        // Phase 2 not completed yet, don't allow closing
        Debug.debug('Preventing modal close: Phase 2 (file upload) not completed');
        return false;
      }
    }
    
    // Default to allowing closing if there's no special condition
    return true;
  }
  
  // Helper method to clear autosave data with fallback logic
  clearAutosaveData() {
    try {
      // Try to get the autosave extension first
      const autosaveExtension = this.formHandler.getExtension ? this.formHandler.getExtension('autoSave') : null;
      
      if (autosaveExtension && typeof autosaveExtension.clearSavedData === 'function') {
        Debug.debug('🧹 Clearing autosave data via extension method');
        autosaveExtension.clearSavedData();
      } else {
        // Fallback: manually clear localStorage for this form
        const formId = this.formHandler.getFormId();
        const storageKey = `autosave_${formId}`;
        localStorage.removeItem(storageKey);
        Debug.debug(`🧹 Cleared autosave data manually for ${storageKey}`);
      }
      
      Debug.debug('✅ Autosave data cleared successfully');
    } catch (error) {
      Debug.warn('❌ Error clearing autosave data:', error);
    }
  }
  
  // Phase 1: Submit form data without files
  submitFormData() {
    return new Promise((resolve, reject) => {
      // Create a new FormData object without including file inputs
      const form = this.formHandler.getFormElement();
      const formData = new FormData();
      
      // Manually add all form fields except file inputs
      const formElements = form.elements;
      for (let i = 0; i < formElements.length; i++) {
        const field = formElements[i];
        const name = field.name;
        
        // Skip file inputs - these will be handled in phase 2
        if (field.type === 'file') continue;
        
        // Skip submit buttons
        if (field.type === 'submit') continue;
        
        // For checkbox/radio, only add if checked
        if ((field.type === 'checkbox' || field.type === 'radio') && !field.checked) continue;
        
        // Add the field value to FormData
        if (name) {
          formData.append(name, field.value);
        }
      }
      
      const requestUrl = this.$form.attr("action");
      
      $.ajax({
        cache: false,
        contentType: false,
        processData: false,
        type: 'POST',
        url: `${requestUrl}?phpgw_return_as=json`,
        data: formData,
        success: (data) => {
          if (data && data.status === "saved" && data.id) {
            this.recordId = data.id;
            Debug.debug(`✅ Form data submitted successfully, record ID: ${data.id}`);
            resolve(data.id);
          } else {
            reject(new Error(`Server returned unexpected response: ${JSON.stringify(data)}`));
          }
        },
        error: (xhr, status, error) => {
          reject(new Error(`Form submission failed: ${error}`));
        }
      });
    });
  }
  
  addStyles() {
    if ($('#form-confirmation-styles').length === 0) {
      $('head').append(`
        <style id="form-confirmation-styles">
          .form-summary-modal {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 9999; display: flex; align-items: center; justify-content: center;
          }
          .form-summary-backdrop {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.5);
          }
          .form-summary-content {
            position: relative; background: white; border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2); max-width: 90vw; width: 700px;
            max-height: 90vh; overflow-y: auto;
          }
          .form-summary-header, .form-summary-footer {
            padding: 20px; border-bottom: 1px solid #e1e1e1;
            display: flex; justify-content: space-between; align-items: center;
          }
          .form-summary-footer { 
            border-top: 1px solid #e1e1e1; 
            border-bottom: none; 
          }
          .form-summary-footer .button-group-left { 
            margin-right: auto; 
          }
          .form-summary-footer .button-group-right { 
            display: flex; 
            gap: 10px; 
          }
          .form-summary-body { padding: 20px; }
          .form-summary-close { 
            background: none; 
            border: none; 
            font-size: 24px; 
            cursor: pointer;
          }
          .form-summary-close[data-phase-locked="true"] {
            opacity: 0.5;
            cursor: not-allowed;
          }
          .form-summary-list { margin: 0; }
          .form-summary-item { display: flex; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
          .form-summary-item dt { font-weight: 600; width: 150px; margin: 0; }
          .form-summary-item dd { margin: 0 0 0 16px; flex: 1; display: flex; justify-content: space-between; align-items: center; }
          .form-summary-item .field-value { flex: 1; }
          .btn-edit-field { 
            background: transparent;
            border: 1px solid #007bff;
            border-radius: 3px;
            color: #007bff;
            padding: 2px 8px;
            font-size: 12px;
            cursor: pointer;
            margin-left: 10px;
          }
          .btn-edit-field:hover { 
            background: rgba(0, 123, 255, 0.1);
          }
          .edit-icon {
            font-size: 12px;
            margin-right: 3px;
          }
          .btn { 
            padding: 8px 16px; 
            border: 1px solid transparent; 
            border-radius: 4px; 
            cursor: pointer;
            font-weight: 500; 
          }
          .btn-secondary { background: #6c757d; color: white; }
          .btn-primary { background: #007bff; color: white; }
          .btn-success { background: #28a745; color: white; }
          .btn-outline-primary { 
            background: transparent; 
            color: #007bff; 
            border-color: #007bff;
          }
          .btn-outline-primary:hover {
            background: rgba(0, 123, 255, 0.1);
          }
          .btn:disabled { opacity: 0.6; cursor: not-allowed; }
          
          .file-upload-info { 
            background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;
            border-left: 4px solid #007bff;
          }
          .file-upload-info h4 { margin: 0 0 8px 0; color: #007bff; }
          
          .two-phase-progress { 
            background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 15px 0;
            border-left: 4px solid #28a745;
          }
          .two-phase-progress h4 { margin: 0 0 15px 0; color: #28a745; }
          
          .progress-step { 
            display: flex; flex-wrap: wrap; margin: 10px 0; padding: 8px;
            border-radius: 4px; transition: background-color 0.3s;
          }
          .progress-step.active { background: #fff3cd; }
          .progress-step.complete { background: #d1edff; }
          
          .step-indicator { 
            font-size: 18px; margin-right: 10px; min-width: 24px; text-align: center;
          }
          .step-text { font-weight: 500; }
          
          .phase-success, .phase-error {
            width: 100%;
            margin-top: 8px;
            padding: 8px;
            border-radius: 4px;
          }
          
          .phase-success {
            background: #d4edda;
            color: #155724;
          }
          
          .phase-error {
            background: #f8d7da;
            color: #721c24;
          }
          
          .progress { 
            height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden;
            margin: 5px 0;
          }
          .progress-bar { 
            height: 100%; background: #007bff; transition: width 0.3s ease;
          }
          .progress-text { 
            font-size: 12px; color: #6c757d; text-align: center;
          }
          
          /* Field highlight effect when navigating from summary */
          @keyframes highlightField {
            0%   { background-color: #fff9c4; box-shadow: 0 0 0 3px #ffeb3b; }
            50%  { background-color: #fff9c4; box-shadow: 0 0 0 3px #ffeb3b; }
            100% { background-color: transparent; box-shadow: none; }
          }
          
          .field-highlight {
            animation: highlightField 2s ease-out;
          }
          
          /* Enhanced highlighting for rich text editors */
          .ql-container.field-highlight {
            animation: highlightField 2s ease-out;
          }
          
          .ql-container.field-highlight .ql-editor {
            animation: highlightField 2s ease-out;
          }
          
          /* HTML Content Display Styles */
          .field-value .summary-paragraph {
            margin: 6px 0;
            line-height: 1.4;
          }
          
          .field-value .summary-heading {
            font-weight: 600;
            margin: 8px 0 4px 0;
            color: #333;
          }
          
          .field-value .summary-list {
            margin: 6px 0;
            padding-left: 20px;
          }
          
          .field-value .summary-list-item {
            margin: 2px 0;
          }
          
          .field-value .summary-bold {
            font-weight: 600;
          }
          
          .field-value .summary-italic {
            font-style: italic;
          }
          
          .field-value .summary-link {
            color: #007bff;
            text-decoration: underline;
          }
          
          .field-value .summary-quote {
            border-left: 3px solid #007bff;
            margin: 8px 0;
            padding-left: 12px;
            color: #666;
          }
          
          .field-value .content-truncated {
            color: #666;
            font-style: italic;
          }
          
          .field-value .btn-show-full-content {
            background: none;
            border: none;
            color: #007bff;
            cursor: pointer;
            text-decoration: underline;
            font-size: 12px;
            padding: 0;
            margin-left: 5px;
          }
          
          .field-value .btn-show-full-content:hover {
            color: #0056b3;
          }
          
          /* Rich text content container */
          .field-value.rich-content {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 8px;
            max-height: 200px;
            overflow-y: auto;
          }
          
          .form-submit-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
          }
          .submit-progress {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            width: 400px;
            text-align: center;
          }
          .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border-left-color: #007bff;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .submit-progress .progress {
            margin: 15px 0;
            height: 10px;
          }
          .status-text {
            margin-top: 10px;
            font-weight: bold;
          }
          .error-message {
            color: #dc3545;
            margin-top: 15px;
            padding: 10px;
            background-color: #f8d7da;
            border-radius: 4px;
          }
        </style>
      `);
    }
  }
  
  // Phase 2: Upload files
  async uploadFiles($modal) {
    return new Promise((resolve, reject) => {
      // Check if we have a FileUploadExtension that can handle the uploads properly
      const fileUploadExt = this.formHandler.getExtension('fileUpload');
      
      if (fileUploadExt && typeof fileUploadExt.sendAllFiles === 'function') {
        Debug.debug('Using FileUploadExtension for Phase 2 upload');
        
        // Get the current file count to ensure we have files to upload
        // Use multiple methods to detect files, prioritizing UI-based detection
        let fileCount = 0;
        
        // Method 1: Check FileUploadExtension's count
        try {
          fileCount = fileUploadExt.getFileCount();
          Debug.debug(`FileUploadExtension.getFileCount() returned: ${fileCount}`);
        } catch (e) {
          Debug.warn('Error calling FileUploadExtension.getFileCount():', e);
        }
        
        // Method 2: If FileUploadExtension returns 0, check UI directly
        if (fileCount === 0) {
          const fileItemsInUI = this.$form.find('.file-item:not(.done):not(.deleted)').length;
          Debug.debug(`Direct UI check found ${fileItemsInUI} file items`);
          fileCount = fileItemsInUI;
        }
        
        // Method 3: Also check our own getFileCount method as final fallback
        if (fileCount === 0) {
          fileCount = this.getFileCount();
          Debug.debug(`Fallback getFileCount() returned: ${fileCount}`);
        }
        
        if (fileCount === 0) {
          Debug.debug('No files to upload via FileUploadExtension, skipping phase 2');
          resolve();
          return;
        }
        
        Debug.debug(`Starting upload of ${fileCount} files via FileUploadExtension`);
        
        // Set up progress tracking for the uploads
        let uploadedCount = 0;
        const totalFiles = fileCount;
        
        // Listen for upload completion events
        const handleUploadDone = () => {
          uploadedCount++;
          const percent = Math.round((uploadedCount / totalFiles) * 100);
          
          // Update progress UI if modal exists
          if ($modal) {
            $modal.find('.progress-bar').css('width', percent + '%');
            $modal.find('.progress-text').text(`${percent}% complete`);
            $modal.find('.file-progress-container').show();
          }
          
          Debug.debug(`File upload progress: ${uploadedCount}/${totalFiles} (${percent}%)`);
          
          if (uploadedCount >= totalFiles) {
            Debug.debug('All files uploaded successfully via FileUploadExtension');
            // Clean up event listeners and timeout
            this.$form.off('fileuploaddone.phase2');
            this.$form.off('fileuploadfail.phase2');
            if (uploadTimeout) {
              clearTimeout(uploadTimeout);
            }
            resolve();
          }
        };
        
        const handleUploadFail = (e, data) => {
          Debug.error('File upload failed via FileUploadExtension:', data?.errorThrown || 'Unknown error');
          // Clean up event listeners and timeout
          this.$form.off('fileuploaddone.phase2');
          this.$form.off('fileuploadfail.phase2');
          if (uploadTimeout) {
            clearTimeout(uploadTimeout);
          }
          reject(new Error(`File upload failed: ${data?.errorThrown || 'Unknown error'}`));
        };
        
        // Set up event listeners for upload completion
        this.$form.on('fileuploaddone.phase2', handleUploadDone);
        this.$form.on('fileuploadfail.phase2', handleUploadFail);
        
        // Set up a timeout to prevent hanging (30 seconds per file + 10 seconds buffer)
        const uploadTimeout = setTimeout(() => {
          Debug.warn('File upload timeout reached, resolving anyway');
          this.$form.off('fileuploaddone.phase2');
          this.$form.off('fileuploadfail.phase2');
          resolve(); // Resolve instead of reject to allow form completion
        }, (totalFiles * 30 + 10) * 1000);
        
        // Start the uploads using the FileUploadExtension's method
        fileUploadExt.sendAllFiles(this.recordId);
        
      } else {
        // Fallback to the old method for cases where FileUploadExtension is not available
        Debug.debug('FileUploadExtension not available, falling back to direct file input method');
        
        // Locate file inputs with files
        let $fileInputs = this.$form.find('input[type="file"]');
        let fileInput = null;
        
        // Find the first input with files
        $fileInputs.each(function() {
          if (this.files && this.files.length > 0) {
            fileInput = this;
            return false; // break the loop
          }
        });
        
        if (!fileInput || fileInput.files.length === 0) {
          Debug.debug('No files to upload, skipping phase 2');
          resolve();
          return;
        }
        
        // Update progress UI if modal exists
        if ($modal) {
          const $progressBar = $modal.find('.progress-bar');
          const $progressText = $modal.find('.progress-text');
          $modal.find('.file-progress-container').show();
        }
        
        // Prepare upload URL
        const formId = this.formHandler.getFormId();
        const baseUrl = `${window.strBaseURL || ''}/${formId}/upload`;
        const hasQueryParams = baseUrl.includes('?');
        const separator = hasQueryParams ? '&' : '?';
        const uploadUrl = `${baseUrl}${separator}id=${this.recordId}&phase2=true`;
        
        // Use direct upload method
        this.directUploadFiles($(fileInput), uploadUrl)
          .then(() => {
            Debug.debug('File upload completed successfully');
            resolve();
          })
          .catch(err => {
            Debug.error('File upload failed:', err);
            reject(err);
          });
      }
    });
  }
  
  // Alias for backward compatibility
  addSummaryStyles() {
    this.addStyles();
  }
  
  // Direct file upload implementation
  directUploadFiles($fileInput, uploadUrl) {
    return new Promise((resolve, reject) => {
      if (!$fileInput || !$fileInput.length || !$fileInput[0].files || !$fileInput[0].files.length) {
        Debug.debug('No files to upload in directUploadFiles');
        resolve();
        return;
      }
      
      const files = Array.from($fileInput[0].files);
      Debug.debug(`Uploading ${files.length} files to ${uploadUrl}`);
      
      let completed = 0;
      const errors = [];
      
      // Update UI progress if available
      const updateProgress = (percent) => {
        if (this.$currentModal) {
          this.$currentModal.find('.progress-bar').css('width', percent + '%');
          this.$currentModal.find('.progress-text').text(`${percent}% complete`);
        }
      };
      
      files.forEach((file) => {
        // Create minimal FormData with only necessary fields
        const formData = new FormData();
        formData.append('files[]', file);
        formData.append('id', this.recordId);
        formData.append('phase2', 'true');
        
        // Find randcheck token
        let randcheckValue = null;
        if (this.$form && this.$form.length) {
          randcheckValue = this.$form.find('input[name="randcheck"]').val();
        }
        if (!randcheckValue) {
          randcheckValue = $('input[name="randcheck"]').val();
        }
        if (!randcheckValue && window.csrfToken) {
          randcheckValue = window.csrfToken;
        }
        
        if (randcheckValue) {
          // Add it to the form data - only as POST parameter
          formData.append('randcheck', randcheckValue);
          Debug.debug('✓ Including randcheck token in file upload as POST parameter');
        } else {
          Debug.warn('⚠️ No randcheck token found for file upload');
        }
        
        $.ajax({
          url: uploadUrl,
          data: formData,
          type: 'POST',
          contentType: false,
          processData: false,
          xhr: () => {
            const xhr = new window.XMLHttpRequest();
            xhr.upload.addEventListener("progress", (evt) => {
              if (evt.lengthComputable) {
                const percentComplete = Math.round((evt.loaded / evt.total) * 100);
                Debug.debug(`Upload progress: ${percentComplete}%`);
                // Update individual file progress if we had UI for it
              }
            }, false);
            return xhr;
          },
          success: (response) => {
            // Check if the response indicates an error (even though HTTP status is 200)
            if (typeof response === 'object' && response.status === 'error') {
              Debug.error(`Server returned error for file ${file.name}:`, response.message);
              errors.push(`${file.name} (${response.message || 'Server error'})`);
            } else {
              Debug.debug(`File ${file.name} uploaded successfully`);
            }
            
            completed++;
            const percent = Math.round((completed / files.length) * 100);
            updateProgress(percent);
            
            if (completed === files.length) {
              if (errors.length === 0) {
                resolve();
              } else {
                reject(new Error(`Failed to upload ${errors.length} files: ${errors.join(', ')}`));
              }
            }
          },
          error: (xhr, status, error) => {
            Debug.error(`Failed to upload file ${file.name}:`, error);
            
            // Try to parse the response to get more detailed error info
            let errorMessage = error;
            try {
              if (xhr.responseText) {
                const jsonResponse = JSON.parse(xhr.responseText);
                if (jsonResponse.message) {
                  errorMessage = Array.isArray(jsonResponse.message) ? jsonResponse.message.join(', ') : jsonResponse.message;
                }
              }
            } catch (e) {
              Debug.debug('Could not parse error response as JSON');
            }
            
            errors.push(`${file.name} (${errorMessage})`);
            completed++;
            const percent = Math.round((completed / files.length) * 100);
            updateProgress(percent);
            
            if (completed === files.length) {
              if (errors.length === files.length) {
                reject(new Error(`All files failed to upload: ${errors.join(', ')}`));
              } else {
                reject(new Error(`Failed to upload some files: ${errors.join(', ')}`));
              }
            }
          }
        });
      });
    });
  }
  
  showConfirmationDialog() {
    const message = this.getConfirmationMessage();
    
    const confirmed = confirm(message);
    if (confirmed) {
      this.formHandler.submitForm();
    }
  }
  
  getConfirmationMessage() {
    const formName = this.formHandler.getFormId();
    const messages = {
      'helpdesk': 'Are you sure you want to submit this support request?',
      'nokkelbestilling': 'Are you sure you want to submit this key order?',
      'inspection_1': 'Are you sure you want to submit this inspection report?',
          'invoicerequest': 'Are you sure you want to submit this invoice request?'
    };
    
    return messages[formName] || 'Are you sure you want to submit this form?';
  }
  
  // Lock form fields after Phase 1 submission
  lockFormFields($modal) {
    Debug.debug('Locking form fields after Phase 1 submission');
    
    // If we have a modal, update it to show the form is locked
    if ($modal) {
      // Disable the edit buttons in the modal
      $modal.find('.form-summary-edit').prop('disabled', true)
        .addClass('form-locked')
        .attr('title', 'Form is locked after submission')
        .text('Form Locked 🔒');
      
      // Disable all field-specific edit buttons
      $modal.find('.btn-edit-field').prop('disabled', true)
        .addClass('form-locked')
        .attr('title', 'Field is locked after submission')
        .html('<span class="edit-icon">🔒</span> Locked');
      
      // Add a form locked notice
      if ($modal.find('.form-locked-notice').length === 0) {
        const modalNoticeText = this.getTranslation('form_confirmation.form_locked_modal_notice', 
          'Form data has been successfully submitted and is now locked. You can continue with file upload but cannot edit the submitted information.');
        
        $modal.find('.form-summary-body').prepend(`
          <div class="form-locked-notice alert alert-info" role="alert">
            <strong>🔒 Form Locked:</strong> ${modalNoticeText}
          </div>
        `);
      }
    }
    
    // Also disable form fields in the background form
    this.$form.find('input:not([type="file"]), select, textarea').prop('disabled', true);
    
    // Add visual indication that the form is locked
    if (!this.$form.hasClass('form-locked')) {
      this.$form.addClass('form-locked');
      
      // Add styles for locked form if not already present
      if ($('#form-locked-styles').length === 0) {
        $('head').append(`
          <style id="form-locked-styles">
            .form-locked input:not([type="file"]), 
            .form-locked select, 
            .form-locked textarea {
              background-color: #e9ecef;
              cursor: not-allowed;
              opacity: 0.8;
              border-color: #ced4da;
            }
            
            .btn-edit-field.form-locked {
              background-color: #e9ecef;
              border-color: #6c757d;
              color: #6c757d;
              cursor: not-allowed;
            }
            
            .form-summary-edit.form-locked {
              background-color: #e9ecef;
              border: 1px solid #6c757d;
              color: #6c757d;
              cursor: not-allowed;
            }
            
            .form-locked-notice {
              background-color: #d1ecf1;
              border: 1px solid #bee5eb;
              color: #0c5460;
              padding: 12px;
              margin-bottom: 15px;
              border-radius: 4px;
            }
            
            /* Add transition effects for smooth visual feedback */
            .field-locked {
              position: relative;
            }
            
            .field-locked::after {
              content: "🔒";
              position: absolute;
              right: 10px;
              top: 50%;
              transform: translateY(-50%);
              font-size: 14px;
            }
            
            /* Animation for denied edit attempts */
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
              20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
            
            .edit-denied {
              animation: shake 0.6s ease;
              border-color: #dc3545 !important;
              box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
            }
          </style>
        `);
      }
    }
    
    // Add a visual indicator to the form about the locked state
    if (!this.$form.find('.form-locked-banner').length) {
      const bannerNoticeText = this.getTranslation('form_confirmation.form_locked_banner_notice', 
        'Your form data has been submitted (Record ID: {recordId}). Form fields are locked to prevent changes. You can still upload files if needed.')
        .replace('{recordId}', this.recordId);
      
      this.$form.prepend(`
        <div class="form-locked-banner form-locked-notice" style="margin-bottom: 20px;">
          <strong>🔒 Form Locked:</strong> ${bannerNoticeText}
        </div>
      `);
    }
    
    Debug.debug('Form fields locked successfully');
  }
  } // End of FormConfirmationExtension class
})(); // End of IIFE returning the class definition

// Register extension with FormHandler
if (typeof FormHandler !== 'undefined') {
  FormHandler.extensions = FormHandler.extensions || {};
  FormHandler.extensions.confirmation = FormConfirmationExtension;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormConfirmationExtension;
} else {
  window.FormConfirmationExtension = FormConfirmationExtension;
}