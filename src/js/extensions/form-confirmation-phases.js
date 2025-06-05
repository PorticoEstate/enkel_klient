/**
 * FormConfirmation Phases Module
 * Handles two-phase submission process (Phase 1: Submit data, Phase 2: Upload files)
 */

// Phase handling functionality for FormConfirmationExtension
const FormConfirmationPhases = {
  
  // Set up handlers for phase-specific buttons
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
  },
  
  // Phase 1: Submit form data only
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
  },
  
  // Phase 2: Upload files
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
  },
  
  // Complete the submission process
  completeProcess($modal) {
    // Show completion step
    const $completeStep = $modal.find('#step-complete');
    $completeStep.show().addClass('complete');
    
    // Update button
    const $completeButton = $modal.find('.btn-complete-process');
    $completeButton.prop('disabled', true).text(this.getTranslation('form_confirmation.process_completed', 'Process completed'));
    
    // Clear autosaved data after successful process completion
    this.clearAutosaveData();
    
    // Wait a moment to show completion, then redirect
    setTimeout(() => {
      window.location.href = this.formHandler.redirectUrl || window.location.href;
    }, 2000);
  },
  
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
      
      // Submit to the same URL as the form but with a JSON response flag
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
  },
  
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
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
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
  },
  
  // Helper method to clear autosave data with fallback logic
  clearAutosaveData() {
    try {
      // Try to clear autosave data using the autosave extension
      const autoSaveExt = this.formHandler.getExtension('autoSave');
      if (autoSaveExt && typeof autoSaveExt.clearSavedData === 'function') {
        autoSaveExt.clearSavedData();
        Debug.debug('✓ Autosave data cleared via extension');
      } else {
        // Fallback: Clear autosave data manually
        const formId = this.formHandler.getFormId();
        if (formId) {
          localStorage.removeItem(`autosave_${formId}`);
          Debug.debug('✓ Autosave data cleared via localStorage fallback');
        }
      }
    } catch (error) {
      Debug.warn('Failed to clear autosave data:', error);
    }
  },
  
  // Helper method to check if the form is editable
  isFormEditable() {
    // Return false if the form is locked (after Phase 1 completion)
    if (this.isFormLocked) {
      Debug.debug('Form editing prevented: Form is locked after Phase 1 submission');
      return false;
    }
    
    // Add any other conditions that might prevent editing here
    return true;
  },
  
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
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormConfirmationPhases;
} else if (typeof window !== 'undefined') {
  window.FormConfirmationPhases = FormConfirmationPhases;
}
