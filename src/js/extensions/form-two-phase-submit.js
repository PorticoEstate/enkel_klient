/**
 * FormTwoPhaseSubmitExtension
 * Handles AJAX form submission with file chunking and progress bar
 * Two-phase process: 1) Submit form data to get record ID, 2) Upload files with progress
 */

// Prevent multiple declarations
if (typeof FormTwoPhaseSubmitExtension === 'undefined') {
  class FormTwoPhaseSubmitExtension {
    constructor(formHandler, options = {}) {
      this.formHandler = formHandler;
      this.$form = formHandler.getForm();
      this.options = {
        showSummary: true,
        enableFileUpload: true,
        ...options
      };
      
      // File upload state
      this.fileUploader = null;
      this.recordId = null;
      this.isSubmitting = false;
      
      this.init();
    }
    
    init() {
      if (this.options.showSummary) {
        this.setupConfirmationFlow();
      }
      
      // Initialize file uploader if needed
      if (this.options.enableFileUpload) {
        this.initializeFileUploader();
      }
    }
    
    setupConfirmationFlow() {
      // Use beforeSubmit hook to intercept normal submission
      this.formHandler.addHook('beforeSubmit', (formData) => {
        return this.handleConfirmationBeforeSubmit(formData);
      });
    }
    
    handleConfirmationBeforeSubmit(formData) {
      if (this.isSubmitting) {
        return true; // Allow the actual submission to proceed
      }
      
      // Collect form data for summary
      this.formData = this.collectFormData();
      
      // Show form summary with enhanced submit button
      this.showFormSummary();
      return false; // Prevent normal submission, we'll handle it in the modal
    }
    
    collectFormData() {
      const data = {};
      
      // Fields to exclude from summary (system/hidden fields)
      const excludeFields = [
        'randcheck', 'csrf_token', '_token', 'authenticity_token',
        'form_id', 'action', 'redirect_url'
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
      const fileCount = this.getFileCount();
      
      // Get translations with fallbacks
      const reviewTitle = this.getTranslation('form_confirmation.review_title', 'Review Your Information');
      const reviewIntro = this.getTranslation('form_confirmation.review_intro', 'Please review your information before submitting:');
      const editButton = this.getTranslation('form_confirmation.edit_all_button', 'Edit');
      const submitButton = this.getTranslation('form_confirmation.submit_button', 'Submit');
      
      const fileUploadInfo = fileCount > 0 ? 
        `<div class="file-upload-info">
          <h4>📎 File Attachments</h4>
          <p>${fileCount} file(s) will be uploaded after form submission.</p>
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
              <div class="two-phase-progress" style="display: none;">
                <h4>📤 Submission Progress</h4>
                <div class="progress-step" id="step-form-data">
                  <div class="step-indicator">⏳</div>
                  <span class="step-text">Submitting form data...</span>
                </div>
                <div class="progress-step" id="step-file-upload" style="display: none;">
                  <div class="step-indicator">⏳</div>
                  <span class="step-text">Uploading files...</span>
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
              </div>
            </div>
            <div class="form-summary-footer">
              <button type="button" class="btn btn-secondary form-summary-edit">${editButton}</button>
              <button type="button" class="btn btn-primary form-summary-submit" id="two-phase-submit">${submitButton}</button>
            </div>
          </div>
        </div>
      `);
      
      $('body').append($modal);
      this.addSummaryStyles();
      this.setupSummaryEvents($modal);
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
    
    setupSummaryEvents($modal) {
      // Close modal events
      $modal.find('.form-summary-close, .form-summary-backdrop, .form-summary-edit').on('click', () => {
        $modal.remove();
      });
      
      // Two-phase submit button
      $modal.find('#two-phase-submit').on('click', () => {
        this.startTwoPhaseSubmission($modal);
      });
    }
    
    async startTwoPhaseSubmission($modal) {
      const $submitBtn = $modal.find('#two-phase-submit');
      const $editBtn = $modal.find('.form-summary-edit');
      const $progressContainer = $modal.find('.two-phase-progress');
      
      // Disable buttons and show progress
      $submitBtn.prop('disabled', true).text('Submitting...');
      $editBtn.prop('disabled', true);
      $progressContainer.show();
      
      try {
        // Phase 1: Submit form data
        console.log('🚀 Starting Phase 1: Form data submission');
        this.updateStepStatus('step-form-data', 'active');
        
        const recordId = await this.submitFormData();
        this.recordId = recordId;
        
        this.updateStepStatus('step-form-data', 'complete');
        console.log('✅ Phase 1 complete, record ID:', recordId);
        
        // Phase 2: Upload files (if any)
        const fileCount = this.getFileCount();
        if (fileCount > 0) {
          console.log(`🚀 Starting Phase 2: File upload (${fileCount} files)`);
          this.updateStepStatus('step-file-upload', 'active');
          $modal.find('#step-file-upload').show();
          
          await this.uploadFiles($modal);
          this.updateStepStatus('step-file-upload', 'complete');
          console.log('✅ Phase 2 complete: Files uploaded');
        }
        
        // Phase 3: Complete
        this.updateStepStatus('step-complete', 'complete');
        $modal.find('#step-complete').show();
        
        // Wait a moment to show completion, then redirect
        setTimeout(() => {
          window.location.href = this.formHandler.redirectUrl;
        }, 1500);
        
      } catch (error) {
        console.error('❌ Two-phase submission failed:', error);
        this.handleSubmissionError(error, $modal);
      }
    }
    
    async submitFormData() {
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
        
        this.isSubmitting = true; // Flag to allow actual submission
        
        $.ajax({
          cache: false,
          contentType: false,
          processData: false,
          type: 'POST',
          url: `${requestUrl}?phpgw_return_as=json`,
          data: formData,
          success: (data) => {
            this.isSubmitting = false;
            if (data && data.status === "saved" && data.id) {
              resolve(data.id);
            } else if (data && data.message) {
              reject(new Error(`Form submission failed: ${data.message}`));
            } else {
              reject(new Error('Form submission failed: Invalid response'));
            }
          },
          error: (xhr, status, error) => {
            this.isSubmitting = false;
            reject(new Error(`Form submission failed: ${error}`));
          }
        });
      });
    }
    
    async uploadFiles($modal) {
      return new Promise((resolve, reject) => {
        if (!this.fileUploader || !this.recordId) {
          resolve(); // No files to upload or no record ID
          return;
        }
        
        const $progressContainer = $modal.find('.file-progress-container');
        const $progressBar = $modal.find('.progress-bar');
        const $progressText = $modal.find('.progress-text');
        
        $progressContainer.show();
        
        // Set up progress callback
        const originalOnProgress = this.fileUploader.options?.onProgress;
        this.fileUploader.options = this.fileUploader.options || {};
        this.fileUploader.options.onProgress = (percent) => {
          $progressBar.css('width', percent + '%');
          $progressText.text(`${percent}% complete`);
          
          if (originalOnProgress) {
            originalOnProgress(percent);
          }
        };
        
        // Set up completion callback
        const originalOnComplete = this.fileUploader.options?.onComplete;
        this.fileUploader.options.onComplete = (success) => {
          if (success) {
            $progressBar.css('width', '100%');
            $progressText.text('100% complete');
            resolve();
          } else {
            reject(new Error('File upload failed'));
          }
          
          if (originalOnComplete) {
            originalOnComplete(success);
          }
        };
        
        // Start file upload with record ID, indicating phase 2
        console.log('📤 Starting file upload for record ID:', this.recordId);
        
        // Update the URL to include phase2 parameter
        const originalUploadUrl = this.fileUploader.settings?.uploadUrl;
        if (originalUploadUrl) {
          this.fileUploader.settings.uploadUrl = `${originalUploadUrl}?phase2=true`;
        }
        
        this.fileUploader.sendAllFiles(this.recordId);
      });
    }
    
    updateStepStatus(stepId, status) {
      const $step = $(`#${stepId}`);
      const $indicator = $step.find('.step-indicator');
      
      $step.removeClass('active complete');
      
      if (status === 'active') {
        $step.addClass('active');
        $indicator.text('⏳');
      } else if (status === 'complete') {
        $step.addClass('complete');
        $indicator.text('✅');
      }
    }
    
    handleSubmissionError(error, $modal) {
      const $submitBtn = $modal.find('#two-phase-submit');
      const $editBtn = $modal.find('.form-summary-edit');
      
      // Re-enable buttons
      $submitBtn.prop('disabled', false).text('Retry');
      $editBtn.prop('disabled', false);
      
      // Show error message
      const $errorDiv = $('<div class="alert alert-danger" role="alert"></div>')
        .html(`<strong>Submission failed:</strong> ${error.message}`);
      
      $modal.find('.form-summary-body').prepend($errorDiv);
      
      // Mark current step as failed
      const $activeStep = $modal.find('.progress-step.active');
      if ($activeStep.length) {
        $activeStep.find('.step-indicator').text('❌');
        $activeStep.find('.step-text').append(' - Failed');
      }
    }
    
    initializeFileUploader() {
      // Try to find existing FileUploader instance
      if (window.FileUploader && typeof window.FileUploader === 'function') {
        const formId = this.formHandler.getFormId();
        const uploadUrl = this.options.uploadUrl || `${window.strBaseURL || ''}/${formId}/upload`;
        
        try {
          this.fileUploader = new window.FileUploader({
            formId: formId,
            uploadUrl: uploadUrl,
            fileInputId: 'fileupload',
            dropAreaId: 'drop-area',
            counterId: 'files-count',
            uploadContainerId: 'content_upload_download',
            required: false,
            multiple: true
          });
          
          console.log('✅ FileUploader initialized for two-phase submission');
        } catch (error) {
          console.warn('⚠️ Failed to initialize FileUploader:', error);
        }
      } else {
        console.warn('⚠️ FileUploader class not found');
      }
    }
    
    getFileCount() {
      if (this.fileUploader && typeof this.fileUploader.getPendingCount === 'function') {
        return this.fileUploader.getPendingCount();
      }
      
      // Fallback: check file input directly
      const $fileInput = this.$form.find('input[type="file"]');
      if ($fileInput.length && $fileInput[0].files) {
        return $fileInput[0].files.length;
      }
      
      return 0;
    }
    
    addSummaryStyles() {
      if ($('#form-two-phase-styles').length === 0) {
        $('head').append(`
          <style id="form-two-phase-styles">
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
            .form-summary-footer { border-top: 1px solid #e1e1e1; border-bottom: none; }
            .form-summary-body { padding: 20px; }
            .form-summary-close { background: none; border: none; font-size: 24px; cursor: pointer; }
            .form-summary-list { margin: 0; }
            .form-summary-item { display: flex; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
            .form-summary-item dt { font-weight: 600; width: 150px; margin: 0; }
            .form-summary-item dd { margin: 0 0 0 16px; flex: 1; }
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
              display: flex; align-items: center; margin: 10px 0; padding: 8px;
              border-radius: 4px; transition: background-color 0.3s;
            }
            .progress-step.active { background: #fff3cd; }
            .progress-step.complete { background: #d1edff; }
            .step-indicator { 
              font-size: 18px; margin-right: 10px; min-width: 24px; text-align: center;
            }
            .step-text { font-weight: 500; }
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
            .btn { 
              padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;
              font-weight: 500; text-decoration: none; display: inline-block;
            }
            .btn-secondary { background: #6c757d; color: white; }
            .btn-primary { background: #007bff; color: white; }
            .btn:disabled { opacity: 0.6; cursor: not-allowed; }
            .alert { 
              padding: 12px; border-radius: 4px; margin: 10px 0;
            }
            .alert-danger { 
              background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24;
            }
          </style>
        `);
      }
    }
  }

  // Register extension with FormHandler
  if (typeof FormHandler !== 'undefined') {
    FormHandler.extensions = FormHandler.extensions || {};
    FormHandler.extensions.twoPhaseSubmit = FormTwoPhaseSubmitExtension;
  }

  window.FormTwoPhaseSubmitExtension = FormTwoPhaseSubmitExtension;
}
