/**
 * FormConfirmation Extension
 * Handles WCAG 3.3.4 confirmation features (summary and dialogs)
 */

// Prevent multiple declarations
if (typeof FormConfirmationExtension === 'undefined') {
  class FormConfirmationExtension {
  constructor(formHandler, options = {}) {
    this.formHandler = formHandler;
    this.$form = formHandler.getForm();
    this.options = {
      showSummary: false,
      showDialog: false,
      ...options
    };
    
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
    // This is called AFTER validation passes
    this.formData = this.collectFormData();
    
    // Always use our own phased submission when files are present
    if (this.options.showSummary) {
      // Show our custom summary with phased buttons if files are present
      this.showFormSummary();
      return false; // Prevent normal submission, we'll handle it in the modal
    } else if (this.options.showDialog) {
      this.showConfirmationDialog();
      return false; // Prevent normal submission, we'll handle it in the dialog
    }
    
    // If no confirmation needed, allow normal submission
    return true;
  }
  
  shouldUseTwoPhaseSubmission() {
    // Check if form has file uploads that need two-phase processing
    const hasFileInputs = this.$form.find('input[type="file"]').length > 0;
    const hasFileUploader = window.FileUploader && this.$form.find('#fileupload, .fileupload').length > 0;
    
    // Check if there are actually files to upload
    let hasFilesToUpload = false;
    if (hasFileInputs) {
      this.$form.find('input[type="file"]').each(function() {
        if (this.files && this.files.length > 0) {
          hasFilesToUpload = true;
          return false; // break
        }
      });
    }
    
    // Check if FileUploader has pending files
    if (hasFileUploader && window.fileUploaderInstance) {
      try {
        if (typeof window.fileUploaderInstance.getPendingCount === 'function') {
          hasFilesToUpload = hasFilesToUpload || window.fileUploaderInstance.getPendingCount() > 0;
        }
      } catch (e) {
        console.log('Could not check FileUploader pending count:', e);
      }
    }
    
    return (hasFileInputs || hasFileUploader) && hasFilesToUpload;
  }
  
  getFileCount() {
    // Try to get file count from FileUploader first
    if (window.fileUploaderInstance && typeof window.fileUploaderInstance.getPendingCount === 'function') {
      try {
        return window.fileUploaderInstance.getPendingCount();
      } catch (e) {
        console.warn('Error getting file count from FileUploader:', e);
      }
    }
    
    // Try to get file count from two-phase extension if available
    const twoPhaseExt = this.formHandler.getExtension('twoPhaseSubmit');
    if (twoPhaseExt && typeof twoPhaseExt.getFileCount === 'function') {
      try {
        return twoPhaseExt.getFileCount();
      } catch (e) {
        console.warn('Error getting file count from TwoPhaseSubmit extension:', e);
      }
    }
    
    // Fallback: check file input directly
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
    
    // Get translations with fallbacks
    const reviewTitle = this.getTranslation('form_confirmation.review_title', 'Review Your Information');
    const reviewIntro = this.getTranslation('form_confirmation.review_intro', 'Please review your information before submitting:');
    const editButton = this.getTranslation('form_confirmation.edit_all_button', 'Edit');
    const submitButton = this.getTranslation('form_confirmation.submit_button', 'Submit');
    
    // Prepare information about file attachments if any
    const fileUploadInfo = fileCount > 0 ? 
      `<div class="file-upload-info">
        <h4>📎 File Attachments</h4>
        <p>${fileCount} file(s) will be uploaded after form submission.</p>
      </div>` : '';
    
    // Prepare progress tracking area for phases
    const progressTrackingHtml = hasPhases ? 
      `<div class="two-phase-progress" style="display: none;">
        <h4>📤 Submission Progress</h4>
        <div class="progress-step" id="step-form-data">
          <div class="step-indicator">⏳</div>
          <span class="step-text">Phase 1: Submitting form data...</span>
        </div>
        <div class="progress-step" id="step-file-upload" style="display: none;">
          <div class="step-indicator">⏳</div>
          <span class="step-text">Phase 2: Uploading files...</span>
          <div class="file-progress-container" style="margin-top: 10px; display: none;">
            <div class="progress">
              <div class="progress-bar" role="progressbar" style="width: 0%"></div>
            </div>
            <div class="progress-text">0% complete</div>
          </div>
        </div>
        <div class="progress-step" id="step-complete" style="display: none;">
          <div class="step-indicator">✅</div>
          <span class="step-text">Submission complete!</span>
        </div>
      </div>` : '';
    
    const $modal = $(`
      <div class="form-summary-modal" role="dialog" aria-modal="true">
        <div class="form-summary-backdrop"></div>
        <div class="form-summary-content">
          <div class="form-summary-header">
            <h2>${reviewTitle}</h2>
            <button type="button" class="form-summary-close">&times;</button>
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
                `<button type="button" class="btn btn-success btn-run-phase1">Run Phase 1 (Submit Data)</button>
                <button type="button" class="btn btn-primary btn-run-phase2" disabled>Run Phase 2 (Upload Files)</button>
                <button type="button" class="btn btn-outline-primary btn-complete-process" disabled>Complete Process</button>` 
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
    let html = '<dl class="form-summary-list">';
    
    Object.keys(this.formData).forEach(name => {
      const value = this.formData[name];
      if (value && value.trim()) {
        const label = this.getFieldLabel(name);
        html += `
          <div class="form-summary-item">
            <dt>${label}:</dt>
            <dd>${this.escapeHtml(value)}</dd>
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
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  setupSummaryEvents($modal, hasPhases) {
    // Close modal events
    $modal.find('.form-summary-close, .form-summary-backdrop, .form-summary-edit').on('click', () => {
      $modal.remove();
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
    
    // Update button state
    $phase1Button.prop('disabled', true).text('Submitting data...');
    $phase1Step.addClass('active');
    
    try {
      // Get two-phase extension
      const twoPhaseExt = this.formHandler.getExtension('twoPhaseSubmit');
      if (!twoPhaseExt) {
        throw new Error('Two-phase submission extension not available');
      }
      
      // Submit form data without files
      const recordId = await twoPhaseExt.submitFormData();
      twoPhaseExt.recordId = recordId;
      
      // Update UI to show success
      $phase1Step.removeClass('active').addClass('complete');
      $phase1Step.find('.step-indicator').text('✅');
      $phase1Button.text('Data submitted');
      
      // Enable phase 2 button
      $modal.find('.btn-run-phase2').prop('disabled', false);
      
      // Show success message
      $phase1Step.append(`
        <div class="phase-success">
          <p><strong>Success!</strong> Record ID: ${recordId}</p>
        </div>
      `);
      
      console.log('✅ Phase 1 complete, record ID:', recordId);
      
    } catch (error) {
      console.error('❌ Phase 1 failed:', error);
      
      // Update UI to show error
      $phase1Step.removeClass('active');
      $phase1Step.find('.step-indicator').text('❌');
      $phase1Step.append(`
        <div class="phase-error">
          <p><strong>Error:</strong> ${error.message}</p>
        </div>
      `);
      
      // Reset button for retry
      $phase1Button.prop('disabled', false).text('Retry Phase 1');
    }
  }
  
  async runPhase2($modal) {
    // Get two-phase extension
    const twoPhaseExt = this.formHandler.getExtension('twoPhaseSubmit');
    if (!twoPhaseExt || !twoPhaseExt.recordId) {
      alert('No record ID available. Please run Phase 1 first.');
      return;
    }
    
    const $phase2Button = $modal.find('.btn-run-phase2');
    const $phase2Step = $modal.find('#step-file-upload');
    
    // Update UI
    $phase2Step.show().addClass('active');
    $modal.find('.file-progress-container').show();
    $phase2Button.prop('disabled', true).text('Uploading files...');
    
    // Debug: Log file information before upload
    console.log('--- File Upload Debug Info ---');
    console.log('Record ID:', twoPhaseExt.recordId);
    
    // Check window.fileUploaderInstance
    if (window.fileUploaderInstance) {
      console.log('Global fileUploaderInstance exists:', window.fileUploaderInstance);
      if (typeof window.fileUploaderInstance.getPendingCount === 'function') {
        console.log('Pending files count:', window.fileUploaderInstance.getPendingCount());
      }
    } else {
      console.log('No global fileUploaderInstance found');
    }
    
    // Check twoPhaseExt.fileUploader
    if (twoPhaseExt.fileUploader) {
      console.log('TwoPhaseExt fileUploader exists');
      if (typeof twoPhaseExt.fileUploader.getPendingCount === 'function') {
        console.log('TwoPhaseExt pending files count:', twoPhaseExt.fileUploader.getPendingCount());
      }
    } else {
      console.log('No twoPhaseExt.fileUploader found');
    }
    
    // Check for file elements in the DOM
    console.log('File input elements:', $('input[type="file"]').length);
    console.log('File items in UI:', $('.file-item').length);
    console.log('Start upload buttons:', $('.start_file_upload').length);
    console.log('------------------------');
    
    try {
      // Run file upload
      await twoPhaseExt.uploadFiles($modal);
      
      // Update UI for success
      $phase2Step.removeClass('active').addClass('complete');
      $phase2Step.find('.step-indicator').text('✅');
      $phase2Button.text('Files uploaded');
      
      // Enable completion button
      $modal.find('.btn-complete-process').prop('disabled', false);
      
      console.log('✅ Phase 2 complete: Files uploaded');
      
    } catch (error) {
      console.error('❌ Phase 2 failed:', error);
      
      // Update UI to show error
      $phase2Step.removeClass('active');
      $phase2Step.find('.step-indicator').text('❌');
      $phase2Step.append(`
        <div class="phase-error">
          <p><strong>Error:</strong> ${error.message}</p>
        </div>
      `);
      
      // Reset button for retry
      $phase2Button.prop('disabled', false).text('Retry Phase 2');
    }
  }
  
  completeProcess($modal) {
    // Show completion step
    const $completeStep = $modal.find('#step-complete');
    $completeStep.show().addClass('complete');
    
    // Update button
    const $completeButton = $modal.find('.btn-complete-process');
    $completeButton.prop('disabled', true).text('Process completed');
    
    // Wait a moment to show completion, then redirect
    setTimeout(() => {
      window.location.href = this.formHandler.redirectUrl || window.location.href;
    }, 2000);
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
            background: rgba(0, 0, 0, 0.5); cursor: pointer;
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
          .form-summary-close { background: none; border: none; font-size: 24px; cursor: pointer; }
          .form-summary-list { margin: 0; }
          .form-summary-item { display: flex; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
          .form-summary-item dt { font-weight: 600; width: 150px; margin: 0; }
          .form-summary-item dd { margin: 0 0 0 16px; flex: 1; }
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
        </style>
      `);
    }
  }
  
  // Alias for backward compatibility
  addSummaryStyles() {
    this.addStyles();
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
      'inspection': 'Are you sure you want to submit this inspection report?',
          'invoicerequest': 'Are you sure you want to submit this invoice request?'
    };
    
    return messages[formName] || 'Are you sure you want to submit this form?';
  }
}

// Register extension with FormHandler
if (typeof FormHandler !== 'undefined') {
  FormHandler.extensions = FormHandler.extensions || {};
  FormHandler.extensions.confirmation = FormConfirmationExtension;
}

window.FormConfirmationExtension = FormConfirmationExtension;
}
