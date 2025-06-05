/**
 * FormConfirmation UI Module
 * Handles UI generation, styling, modal creation, and event handling
 */

// UI functionality for FormConfirmationExtension
const FormConfirmationUI = {
  
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
  },
  
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
  },
  
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
  },
  
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
  },
  
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
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
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
  },
  
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
  },
  
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
  },
  
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
  },
  
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
  },
  
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
          // Check for various rich text editor containers
          const $quillContainer = $field.siblings('.ql-container');
          const $ckeditorContainer = $field.siblings('.cke');
          const $tinyMCEContainer = $field.siblings('.mce-tinymce');
          
          if ($quillContainer.length) {
            $targetElement = $quillContainer;
          } else if ($ckeditorContainer.length) {
            $targetElement = $ckeditorContainer;
          } else if ($tinyMCEContainer.length) {
            $targetElement = $tinyMCEContainer;
          }
        }
        
        // Scroll to the target element (either the field or the editor container)
        const offset = $targetElement.offset().top - 100;
        $('html, body').animate({
          scrollTop: offset
        }, 500);
        
        // Focus on the target element after scrolling
        setTimeout(() => {
          $targetElement.addClass('field-highlight');
          if ($field.is('input, textarea, select')) {
            $field.focus();
          }
          
          // Remove highlight after animation
          setTimeout(() => {
            $targetElement.removeClass('field-highlight');
          }, 2000);
        }, 600);
      } else {
        Debug.warn('Field not found for editing:', { fieldId, fieldName });
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
  },
  
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
  },
  
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
  },
  
};
