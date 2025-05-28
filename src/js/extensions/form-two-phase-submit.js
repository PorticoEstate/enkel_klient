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
              <div class="button-group-left">
                <button type="button" class="btn btn-secondary form-summary-edit">${editButton}</button>
              </div>
              <div class="button-group-right">
                <button type="button" class="btn btn-outline-primary phase2-only" id="run-phase2-only" style="display: none;">
                  Upload Files Only
                </button>
                <button type="button" class="btn btn-primary form-summary-submit" id="two-phase-submit">${submitButton}</button>
              </div>
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
      
      // Two-phase submit button - run both phases
      $modal.find('#two-phase-submit').on('click', () => {
        this.startTwoPhaseSubmission($modal, { autoContinue: false });
      });
      
      // Show the Phase 2 only button if we have an existing record ID
      const $phase2Button = $modal.find('#run-phase2-only');
      if (this.recordId) {
        $phase2Button.show();
        
        // Phase 2 only button handler
        $phase2Button.on('click', () => {
          this.startTwoPhaseSubmission($modal, { 
            skipPhase1: true, 
            autoContinue: false,
            skipRedirect: false
          });
        });
      }
    }
    
    async startTwoPhaseSubmission($modal, options = {}) {
      const $submitBtn = $modal.find('#two-phase-submit');
      const $editBtn = $modal.find('.form-summary-edit');
      const $progressContainer = $modal.find('.two-phase-progress');
      
      // Remove any existing controls if rerunning
      $modal.find('.phase-controls').remove();
      
      // Disable buttons and show progress
      $submitBtn.prop('disabled', true).text('Submitting...');
      $editBtn.prop('disabled', true);
      $progressContainer.show();
      
      try {
        // Should we run phase 1? (Default: yes)
        if (!options.skipPhase1) {
          // Phase 1: Submit form data
          console.log('🚀 Starting Phase 1: Form data submission');
          this.updateStepStatus('step-form-data', 'active');
          
          const recordId = await this.submitFormData();
          this.recordId = recordId;
          
          this.updateStepStatus('step-form-data', 'complete');
          console.log('✅ Phase 1 complete, record ID:', recordId);
          
          // Add pause between phases with button to continue
          const fileCount = this.getFileCount();
          if (fileCount > 0 && !options.autoContinue) {
            const $phaseControls = $(`
              <div class="phase-controls" style="margin-top: 15px; text-align: right;">
                <button type="button" class="btn btn-primary btn-continue-phase2">
                  Continue to File Upload <span style="margin-left: 5px;">▶</span>
                </button>
              </div>
            `);
            $modal.find('#step-form-data').after($phaseControls);
            
            // Wait for user to click continue
            await new Promise(resolve => {
              $phaseControls.find('.btn-continue-phase2').on('click', function() {
                $(this).prop('disabled', true).text('Starting file upload...');
                resolve();
              });
            });
            
            $phaseControls.remove();
          }
        }
        
        // Phase 2: Upload files (if any) - Skip if no files or explicitly skipping
        const fileCount = this.getFileCount();
        if (fileCount > 0 && !options.skipPhase2) {
          console.log(`🚀 Starting Phase 2: File upload (${fileCount} files)`);
          this.updateStepStatus('step-file-upload', 'active');
          $modal.find('#step-file-upload').show();
          
          // Store modal for manual testing access
          this.currentModal = $modal;
          
          await this.uploadFiles($modal);
          this.updateStepStatus('step-file-upload', 'complete');
          console.log('✅ Phase 2 complete: Files uploaded');
          
          // Add pause after file upload with completion button
          if (!options.autoContinue) {
            const $phaseControls = $(`
              <div class="phase-controls" style="margin-top: 15px; text-align: right;">
                <button type="button" class="btn btn-primary btn-complete">
                  Complete Submission <span style="margin-left: 5px;">✓</span>
                </button>
              </div>
            `);
            $modal.find('#step-file-upload').after($phaseControls);
            
            // Wait for user to click complete
            await new Promise(resolve => {
              $phaseControls.find('.btn-complete').on('click', function() {
                $(this).prop('disabled', true).text('Completing...');
                resolve();
              });
            });
            
            $phaseControls.remove();
          }
        }
        
        // Phase 3: Complete
        this.updateStepStatus('step-complete', 'complete');
        $modal.find('#step-complete').show();
        
        // Wait a moment to show completion, then redirect (unless skipRedirect is true)
        if (!options.skipRedirect) {
          setTimeout(() => {
            window.location.href = this.formHandler.redirectUrl;
          }, 1500);
        }
        
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
        // Locate the file input element first
        const $fileInput = this.$form.find('input[type="file"]');
        let actualFileInput = $fileInput.length > 0 ? $fileInput : $('#fileupload');
        
        // Ensure file items exist in the DOM and get an accurate file count
        const fileCount = actualFileInput.length > 0 && actualFileInput[0].files ? 
                          this.ensureFileItemsExist(actualFileInput) : 
                          this.getFileCount();
                          
        console.log(`File count for upload: ${fileCount} (from input: ${actualFileInput.length > 0 && actualFileInput[0].files ? actualFileInput[0].files.length : 0})`);
        
        if (fileCount === 0) {
          console.log('No files to upload, skipping phase 2');
          resolve();
          return;
        }
        
        // Update UI
        const $progressContainer = $modal.find('.file-progress-container');
        const $progressBar = $modal.find('.progress-bar');
        const $progressText = $modal.find('.progress-text');
        
        $progressContainer.show();
        
        // Force using direct upload as a more reliable method
        this.useDirectUpload = true;
        
        // Check for files in the UI
        const $fileItems = $('.file-item');
        console.log(`Found ${$fileItems.length} file items in the DOM and ${fileCount} files from updated count`);
        
        // Double-check if we need to ensure file items exist
        if ($fileItems.length === 0 && actualFileInput && actualFileInput.length > 0 && actualFileInput[0].files && actualFileInput[0].files.length > 0) {
          console.log('No file items in UI but files exist in input, creating file items');
          this.ensureFileItemsExist(actualFileInput);
        }
        
        // Check if there are any unprocessed files
        let hasUnprocessedFiles = false;
        $fileItems.each(function() {
          const $item = $(this);
          if (!$item.hasClass('done')) {
            hasUnprocessedFiles = true;
            console.log('Unprocessed file found:', $item.data('filename') || 'File');
          }
        });
        
        if (!hasUnprocessedFiles && $fileItems.length > 0) {
          console.log('All files appear to be already processed. Will continue with upload anyway.');
        }
        
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
        this.fileUploader.options.onComplete = (success, errorInfo) => {
          if (success) {
            $progressBar.css('width', '100%');
            $progressText.text('100% complete');
            resolve();
          } else {
            let errorMessage = 'File upload failed';
            
            // Extract more specific error message if available
            if (errorInfo) {
              if (typeof errorInfo === 'string') {
                errorMessage = errorInfo;
              } else if (typeof errorInfo === 'object') {
                if (errorInfo.message) {
                  errorMessage = Array.isArray(errorInfo.message) ? errorInfo.message.join(', ') : errorInfo.message;
                } else if (errorInfo.error) {
                  errorMessage = errorInfo.error;
                }
              }
            }
            
            // Update the UI to show error state
            $progressBar.css('background-color', '#dc3545');
            $progressText.text('Upload failed');
            
            reject(new Error(errorMessage));
          }
          
          if (originalOnComplete) {
            originalOnComplete(success, errorInfo);
          }
        };
        
        // Start file upload with record ID, indicating phase 2
        console.log('📤 Starting file upload for record ID:', this.recordId);
        
        // Dynamically determine the upload URL based on form ID
        const formId = this.formHandler.getFormId();
		let baseUrl = `${window.strBaseURL || ''}/${formId}/upload`;
        
        const hasQueryParams = baseUrl.includes('?');
        const separator = hasQueryParams ? '&' : '?';
        const uploadUrl = `${baseUrl}${separator}id=${this.recordId}&phase2=true`;
        console.log('Direct upload using endpoint:', uploadUrl);
        
        // Force direct upload for all files
        this.useDirectUpload = true;
        
        // Find all file inputs that might contain files
        let $allFileInputs = $('input[type="file"]');
        let foundFilesInput = null;
        
        // First check if we already have a valid file input with files
        if (actualFileInput && actualFileInput.length > 0 && actualFileInput[0].files && actualFileInput[0].files.length > 0) {
          foundFilesInput = actualFileInput;
          console.log(`Using already found file input with ${foundFilesInput[0].files.length} files`);
        } else {
          // Find the first input that has files
          $allFileInputs.each(function() {
            if (this.files && this.files.length > 0) {
              foundFilesInput = $(this);
              console.log(`Found files in input: ${this.id || 'unnamed input'}, files: ${this.files.length}`);
              return false; // Break the loop
            }
          });
        }
        
        // If we found a file input with files, use our direct upload method
        if (foundFilesInput) {
          console.log('Using direct upload with found input containing files');
          this.directUploadFiles(foundFilesInput, uploadUrl)
            .then(() => {
              console.log('Direct upload complete');
              resolve();
            })
            .catch(err => {
              console.error('Direct upload failed:', err);
              reject(err);
            });
          return;
        }
        
        // Fall back to standard method if we couldn't find files
        console.log('Falling back to standard upload method');
        
        // Ensure the upload URL is properly set in multiple places for redundancy
        if (this.fileUploader.settings) {
          this.fileUploader.settings.uploadUrl = uploadUrl;
        }
        
        // Update the data-url attribute on the file input
        const $standardFileInput = $('#fileupload');
        if ($standardFileInput.length) {
          $standardFileInput.attr('data-url', uploadUrl);
          try {
            // Update the URL in the jQuery fileupload plugin if initialized
            if ($standardFileInput.data('blueimp-fileupload')) {
              $standardFileInput.fileupload('option', 'url', uploadUrl);
              
              // Also set formData to include randcheck token (POST parameter only, not in URL)
              let randcheckValue = null;
              
              // Try multiple methods to find the randcheck token
              if (this.$form && this.$form.length) {
                randcheckValue = this.$form.find('input[name="randcheck"]').val();
              }
              
              if (!randcheckValue) {
                randcheckValue = $('input[name="randcheck"]').val();
              }
              
              if (!randcheckValue) {
                $('input[type="hidden"]').each(function() {
                  if ($(this).attr('name') === 'randcheck') {
                    randcheckValue = $(this).val();
                    return false;
                  }
                });
              }
              
              // Create a formData object with all required parameters as POST only
              const formDataObject = {
                id: this.recordId,
                phase2: 'true'
              };
              
              // Add randcheck if available
              if (randcheckValue) {
                formDataObject.randcheck = randcheckValue;
                console.log('Setting randcheck token for standard upload as POST parameter: ' + randcheckValue);
              }
              
              // Set the formData option
              $standardFileInput.fileupload('option', 'formData', formDataObject);
            }
          } catch (e) {
            console.error('Error updating upload URL:', e);
          }
        }
        
        // Send all files using the standard method
        console.log('Sending files using standard sendAllFiles method...');
        this.fileUploader.sendAllFiles(this.recordId);
      });
    }
    
    directUploadFiles($fileInput, uploadUrl) {
      return new Promise((resolve, reject) => {
        if (!$fileInput || !$fileInput.length || !$fileInput[0].files || !$fileInput[0].files.length) {
          console.warn('No files to upload in directUploadFiles');
          resolve();
          return;
        }
        
        const files = Array.from($fileInput[0].files);
        console.log(`Attempting direct upload of ${files.length} files to URL: ${uploadUrl}`);
        
        // Make sure the file uploader knows about these files
        if (this.fileUploader && typeof this.fileUploader.updatePendingCount === 'function') {
          this.fileUploader.updatePendingCount(files.length);
        }
        
        let completed = 0;
        const errors = [];
        
        // Get the progress callback if available
        const progressCallback = this.fileUploader.options?.onProgress;
        
        // Track total progress
        const calculateProgress = () => {
          const percent = Math.round((completed / files.length) * 100);
          if (progressCallback) {
            progressCallback(percent);
          }
          return percent;
        };
        
        // Update progress for individual files
        const updateFileProgress = (filename, percent) => {
          // Find file item in the DOM
          const $fileItem = $(`.file-item[data-filename="${filename.replace(/"/g, '\\"')}"]`);
          if ($fileItem.length) {
            const $progressBar = $fileItem.find('.progress-bar');
            if ($progressBar.length) {
              $progressBar.css('width', `${percent}%`);
            }
          }
        };
        
        // Mark file as done after upload
        const markFileAsComplete = (filename) => {
          const $fileItem = $(`.file-item[data-filename="${filename.replace(/"/g, '\\"')}"]`);
          if ($fileItem.length) {
            $fileItem.addClass('done');
            const $checkIcon = $('<span class="success-icon" style="color: green; margin-left: 5px;">✓</span>');
            $fileItem.find('.file-info').append($checkIcon);
          }
        };
        
        files.forEach((file, index) => {
          console.log(`Direct uploading file ${index + 1}/${files.length}: ${file.name}`);
          
          // For Phase 2, create a minimal FormData object with only necessary fields
          // We only need the file, record ID, phase2 flag, and randcheck token
          // This avoids sending the entire form data again since it was already processed in Phase 1
          const formData = new FormData();
          formData.append('files[]', file);
          formData.append('id', this.recordId);
          formData.append('phase2', 'true');
          
          // Get the randcheck value from the form and include it in the upload
          // Try multiple methods to find the randcheck token
          let randcheckValue = null;
          
          try {
            // Method 1: Try the form directly
            if (this.$form && this.$form.length) {
              randcheckValue = this.$form.find('input[name="randcheck"]').val();
              console.log('Found randcheck in form:', randcheckValue);
            }
            
            // Method 2: Try searching in the entire document
            if (!randcheckValue) {
              randcheckValue = $('input[name="randcheck"]').val();
              if (randcheckValue) {
                console.log('Found randcheck in document:', randcheckValue);
              }
            }
            
            // Method 3: Try to get it from the hidden inputs in the document
            if (!randcheckValue) {
              $('input[type="hidden"]').each(function() {
                const name = $(this).attr('name');
                const val = $(this).val();
                console.log('Checking hidden input:', name, val);
                if (name === 'randcheck') {
                  randcheckValue = val;
                  console.log('Found randcheck in hidden inputs:', randcheckValue);
                  return false; // Break the loop
                }
              });
            }
            
            // Method 4: Look for it on the window object (sometimes added by the app)
            if (!randcheckValue && window.csrfToken) {
              randcheckValue = window.csrfToken;
              console.log('Found randcheck in window.csrfToken:', randcheckValue);
            }
            
            // Method 5: Extract from URL if present
            if (!randcheckValue) {
              const match = window.location.search.match(/[?&]randcheck=([^&]*)/);
              if (match) {
                randcheckValue = match[1];
                console.log('Found randcheck in URL:', randcheckValue);
              }
            }
            
            // Method 6: Check if we have it stored in the class instance
            if (!randcheckValue && this.randcheckValue) {
              randcheckValue = this.randcheckValue;
              console.log('Using stored randcheck value:', randcheckValue);
            }
            
            if (randcheckValue) {
              // Store it for future use
              this.randcheckValue = randcheckValue;
              
              // Add it to the form data - only as POST parameter, not in URL
              formData.append('randcheck', randcheckValue);
              console.log('✓ Including randcheck token in file upload as POST parameter:', randcheckValue);
            } else {
              console.warn('⚠️ No randcheck token found in the form');
            }
            
            // Log the entire FormData for debugging
            console.log('FormData fields:');
            for (const pair of formData.entries()) {
              console.log(pair[0] + ': ' + (pair[0] === 'randcheck' ? '[FOUND]' : pair[1]));
            }
          } catch (e) {
            console.error('Error processing randcheck token:', e);
          }
          
          updateFileProgress(file.name, 0);
          
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
                  updateFileProgress(file.name, percentComplete);
                }
              }, false);
              return xhr;
            },
            success: (response) => {
              // Check if the response indicates an error (even though HTTP status is 200)
              if (typeof response === 'object' && response.status === 'error') {
                console.error(`Server returned error for file ${file.name}:`, response.message);
                errors.push(`${file.name} (${response.message || 'Server error'})`);
                
                // Mark the file item as failed in the UI
                const $fileItem = $(`.file-item[data-filename="${file.name.replace(/"/g, '\\"')}"]`);
                if ($fileItem.length) {
                  $fileItem.addClass('failed');
                  const $errorIcon = $('<span class="error-icon" style="color: red; margin-left: 5px;">✗</span>');
                  $fileItem.find('.file-info').append($errorIcon);
                  $fileItem.append($('<div class="error-message" style="color: red; font-size: 12px; margin-top: 5px;">').text(response.message || 'Upload failed'));
                }
              } else {
                console.log(`File ${file.name} uploaded successfully`);
                markFileAsComplete(file.name);
              }
              
              completed++;
              calculateProgress();
              
              if (completed === files.length) {
                if (errors.length === 0) {
                  resolve();
                } else {
                  reject(new Error(`Failed to upload ${errors.length} files: ${errors.join(', ')}`));
                }
              }
            },
            error: (xhr, status, error) => {
              console.error(`Failed to upload file ${file.name}:`, error);
              
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
                console.log('Could not parse error response as JSON');
              }
              
              errors.push(`${file.name} (${errorMessage})`);
              completed++;
              calculateProgress();
              
              // Mark the file item as failed in the UI
              const $fileItem = $(`.file-item[data-filename="${file.name.replace(/"/g, '\\"')}"]`);
              if ($fileItem.length) {
                $fileItem.addClass('failed');
                const $errorIcon = $('<span class="error-icon" style="color: red; margin-left: 5px;">✗</span>');
                $fileItem.find('.file-info').append($errorIcon);
                $fileItem.append($('<div class="error-message" style="color: red; font-size: 12px; margin-top: 5px;">').text(errorMessage));
              }
              
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
      const $phase2Btn = $modal.find('#run-phase2-only');
      const $editBtn = $modal.find('.form-summary-edit');
      
      // Re-enable buttons
      $submitBtn.prop('disabled', false).text('Retry');
      if ($phase2Btn.is(':visible')) {
        $phase2Btn.prop('disabled', false);
      }
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
      
      // Remove any phase controls
      $modal.find('.phase-controls').remove();
    }
    
    initializeFileUploader() {
      // Try to find existing FileUploader instance
      if (window.FileUploader && typeof window.FileUploader === 'function') {
        const formId = this.formHandler.getFormId();
        
        // Dynamically determine the upload URL based on form ID
 
        let  uploadUrl = `${window.strBaseURL || ''}/${formId}/upload`;
        
        
        console.log('Using file upload endpoint:', uploadUrl);
        
        // Try to get the randcheck value to include in URLs
        let randcheckValue = null;
        
        // Try multiple methods to find the randcheck token
        if (this.$form && this.$form.length) {
          randcheckValue = this.$form.find('input[name="randcheck"]').val();
        }
        
        if (!randcheckValue) {
          randcheckValue = $('input[name="randcheck"]').val();
        }
        
        if (!randcheckValue) {
          $('input[type="hidden"]').each(function() {
            if ($(this).attr('name') === 'randcheck') {
              randcheckValue = $(this).val();
              return false; // Break the loop
            }
          });
        }
        
        // Log if we found or didn't find the token
        if (randcheckValue) {
          console.log('Found randcheck token for file uploader initialization');
        } else {
          console.warn('No randcheck token found for file uploader initialization');
        }
        
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
          
          // If we have the randcheck token, add it to the uploader's data
          if (randcheckValue && this.fileUploader.settings) {
            // Store the randcheck token in the uploader instance for later use
            this.randcheckValue = randcheckValue;
            
            // Try to set it in the jQuery fileupload plugin if initialized
            try {
              const $fileInput = $('#' + this.fileUploader.settings.fileInputId);
              if ($fileInput.length && $fileInput.data('blueimp-fileupload')) {
                // Set formData to include randcheck as POST parameter only
                $fileInput.fileupload('option', 'formData', {
                  randcheck: randcheckValue
                });
                console.log('Added randcheck token to fileupload formData as POST parameter');
              }
            } catch (e) {
              console.warn('Error setting randcheck in fileupload plugin:', e);
            }
          }
          
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
    
    // Helper method to ensure UI file items exist for all files in input
    ensureFileItemsExist($fileInput) {
      if (!$fileInput || !$fileInput.length || !$fileInput[0].files || !$fileInput[0].files.length) {
        console.log('No files to process in ensureFileItemsExist');
        return;
      }
      
      console.log(`Ensuring file items exist for ${$fileInput[0].files.length} files`);
      const files = Array.from($fileInput[0].files);
      
      // First, try to find existing file-item divs
      const $existingItems = $('.file-item');
      if ($existingItems.length > 0) {
        console.log(`Found ${$existingItems.length} existing file items, will enhance them`);
      }
      
      // Find or create the container for file items
      let $container = $('#content_upload_download .presentation.files');
      if (!$container.length) {
        $container = $('#content_upload_download');
        if (!$container.length) {
          // Create container if it doesn't exist
          $container = $('<div id="content_upload_download"><div class="presentation files"></div></div>');
          $('body').append($container);
          $container = $('#content_upload_download .presentation.files');
        }
      }
      
      // Process each file
      files.forEach((file, index) => {
        // Check if we already have this file in the UI
        let $item = $existingItems.filter(function() {
          return $(this).data('filename') === file.name;
        });
        
        // If not found, create a new item
        if (!$item.length) {
          console.log(`Creating new file item for: ${file.name}`);
          $item = $('<div class="file file-item" tabindex="0" role="listitem">')
            .attr({
              'id': `file-item-${index}`,
              'aria-label': `File: ${file.name}, Size: ${file.size}`,
              'data-filename': file.name,
              'data-size': file.size
            })
            .appendTo($container);
          
          // Add file info
          const $fileInfo = $('<div class="file-info">')
            .append($('<span class="file-name">').text(file.name))
            .append($('<span class="file-size">').text((file.size/1024).toFixed(1) + ' KB'))
            .appendTo($item);
          
          // Add progress container
          $('<div class="progress-container">')
            .append($('<div class="progress-bar">'))
            .appendTo($item);
        }
        
        // Ensure each file item has a start button
        if ($item.find('.start_file_upload').length === 0) {
          // Create a specially configured button that will properly trigger upload
          const $btn = $('<button type="button" class="start_file_upload" style="display:none">start</button>');
          
          // Add special data attributes to help with upload
          $btn.attr({
            'data-filename': file.name,
            'data-size': file.size,
            'data-item-id': $item.attr('id') || `file-item-${index}`,
            'data-file-index': index
          });
          
          // Store a reference to the actual file object
          $btn.data('file', file);
          
          $item.append($btn);
          console.log(`Created upload button for: ${file.name}`);
        } else {
          // Update existing button with file data
          const $btn = $item.find('.start_file_upload');
          $btn.data('file', file);
          $btn.attr('data-file-index', index);
          console.log(`Updated existing upload button for: ${file.name}`);
        }
      });
      
      // Update the pending count in the file uploader
      if (this.fileUploader && typeof this.fileUploader.updatePendingCount === 'function') {
        this.fileUploader.updatePendingCount(files.length);
      }
      
      return files.length;
    }
    
    // Manual testing methods
    manualRunPhase1() {
      // Create a test modal for displaying progress
      const $testModal = $(`
        <div class="form-summary-modal manual-test" role="dialog" aria-modal="true">
          <div class="form-summary-backdrop"></div>
          <div class="form-summary-content">
            <div class="form-summary-header">
              <h2>Manual Test: Phase 1</h2>
              <button type="button" class="form-summary-close">&times;</button>
            </div>
            <div class="form-summary-body">
              <div class="two-phase-progress">
                <h4>📤 Submission Progress</h4>
                <div class="progress-step active" id="step-form-data">
                  <div class="step-indicator">⏳</div>
                  <span class="step-text">Submitting form data...</span>
                </div>
                <div class="progress-step" id="manual-response" style="margin-top: 15px; display: none;">
                  <div class="response-content"></div>
                </div>
              </div>
            </div>
            <div class="form-summary-footer">
              <div class="button-group-left">
                <button type="button" class="btn btn-secondary close-test">Close</button>
              </div>
              <div class="button-group-right">
                <button type="button" class="btn btn-primary" id="run-phase2" style="display: none;">
                  Continue to Phase 2
                </button>
              </div>
            </div>
          </div>
        </div>
      `);
      
      $('body').append($testModal);
      this.addSummaryStyles();
      
      // Add close handler
      $testModal.find('.close-test, .form-summary-close, .form-summary-backdrop').on('click', () => {
        $testModal.remove();
      });
      
      // Run phase 1
      this.submitFormData().then(id => {
        this.recordId = id;
        $testModal.find('#step-form-data .step-indicator').text('✅');
        $testModal.find('#step-form-data').addClass('complete').removeClass('active');
        
        const $response = $testModal.find('#manual-response');
        $response.show().addClass('complete');
        $response.find('.response-content').html(`
          <div style="padding: 10px; background: #d4edda; border-radius: 4px; margin-top: 10px;">
            <strong>Success!</strong> Record ID: ${id}<br>
            <p class="mt-2">You can now proceed to Phase 2 to upload files.</p>
          </div>
        `);
        
        // Show the Phase 2 button
        const $phase2Button = $testModal.find('#run-phase2');
        $phase2Button.show();
        
        // Add handler for phase 2 button
        $phase2Button.on('click', () => {
          $testModal.remove();
          this.manualRunPhase2(id);
        });
        
        console.log('✅ Phase 1 complete, record ID:', id);
        console.log('💡 To run Phase 2 manually, call: formHandler.getExtension("twoPhaseSubmit").manualRunPhase2(' + id + ')');
        
      }).catch(error => {
        $testModal.find('#step-form-data .step-indicator').text('❌');
        $testModal.find('#step-form-data').removeClass('active');
        
        const $response = $testModal.find('#manual-response');
        $response.show();
        $response.find('.response-content').html(`
          <div style="padding: 10px; background: #f8d7da; border-radius: 4px; margin-top: 10px;">
            <strong>Error:</strong> ${error.message}
          </div>
        `);
        
        console.error('❌ Phase 1 failed:', error);
      });
      
      return $testModal;
    }
    
    manualRunPhase2(recordId) {
      // Use the provided ID or the stored one
      this.recordId = recordId || this.recordId;
      
      if (!this.recordId) {
        console.error('❌ No record ID available. Please run Phase 1 first or provide a record ID.');
        alert('No record ID available. Please run Phase 1 first or provide a record ID.');
        return;
      }
      
      // Create a test modal for displaying progress
      const $testModal = $(`
        <div class="form-summary-modal manual-test" role="dialog" aria-modal="true">
          <div class="form-summary-backdrop"></div>
          <div class="form-summary-content">
            <div class="form-summary-header">
              <h2>Manual Test: Phase 2</h2>
              <button type="button" class="form-summary-close">&times;</button>
            </div>
            <div class="form-summary-body">
              <div class="two-phase-progress">
                <h4>📤 File Upload Progress</h4>
                <div class="progress-step active" id="step-file-upload">
                  <div class="step-indicator">⏳</div>
                  <span class="step-text">Uploading files for record ID: ${this.recordId}</span>
                  <div class="file-progress-container" style="margin-top: 10px;">
                    <div class="progress">
                      <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">0% complete</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-summary-footer">
              <div class="button-group-left">
                <button type="button" class="btn btn-secondary close-test">Close</button>
              </div>
              <div class="button-group-right">
                <button type="button" class="btn btn-primary" id="complete-button" style="display: none;">
                  Complete Process
                </button>
              </div>
            </div>
          </div>
        </div>
      `);
      
      $('body').append($testModal);
      this.addSummaryStyles();
      
      // Add close handler
      $testModal.find('.close-test, .form-summary-close, .form-summary-backdrop').on('click', () => {
        $testModal.remove();
      });
      
      // Run phase 2
      this.uploadFiles($testModal).then(() => {
        $testModal.find('#step-file-upload .step-indicator').text('✅');
        $testModal.find('#step-file-upload').addClass('complete').removeClass('active');
        console.log('✅ Phase 2 complete: Files uploaded');
        
        // Show completion button
        const $completeButton = $testModal.find('#complete-button');
        $completeButton.show();
        
        $completeButton.on('click', () => {
          // Show completion step
          $testModal.find('.form-summary-body').append(`
            <div class="progress-step complete" id="step-complete">
              <div class="step-indicator">✅</div>
              <span class="step-text">Submission complete!</span>
            </div>
          `);
          
          // Disable the complete button
          $completeButton.prop('disabled', true).text('Process Completed');
          
          // You could redirect here if needed
          // setTimeout(() => window.location.href = this.formHandler.redirectUrl, 2000);
        });
        
      }).catch(error => {
        $testModal.find('#step-file-upload .step-indicator').text('❌');
        $testModal.find('#step-file-upload').removeClass('active');
        $testModal.find('.form-summary-body').prepend(`
          <div class="alert alert-danger" role="alert">
            <strong>File upload failed:</strong> ${error.message}
          </div>
        `);
        console.error('❌ Phase 2 failed:', error);
      });
      
      return $testModal;
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
            .form-summary-footer .button-group-left { margin-right: auto; }
            .form-summary-footer .button-group-right { display: flex; gap: 10px; }
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
              padding: 8px 16px; border: 1px solid transparent; border-radius: 4px; cursor: pointer;
              font-weight: 500; text-decoration: none; display: inline-block;
            }
            .btn-secondary { background: #6c757d; color: white; }
            .btn-primary { background: #007bff; color: white; }
            .btn-outline-primary { 
              background: transparent; color: #007bff; border-color: #007bff;
            }
            .btn-outline-primary:hover {
              background: rgba(0, 123, 255, 0.1);
            }
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
