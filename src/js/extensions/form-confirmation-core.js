/**
 * FormConfirmation Core Module
 * Handles main confirmation logic, lifecycle management, and coordination
 */

// Core functionality for FormConfirmationExtension
const FormConfirmationCore = {
  
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
    this.formData = null;
    this.$currentModal = null;
    
    // Initialize immediately since we have formHandler
    this.init();
  },
  
  init() {
    // Initialize form confirmation features  
    if (this.options.showSummary || this.options.showDialog) {
      this.setupConfirmationFlow();
    }
    
    // Make sure styles are added early
    if (this.options.showSummary) {
      this.addStyles();
    }
  },
  
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
  },
  
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
  },
  
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
  },
  
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
  },
  
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
  },
  
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
  },
  
  showConfirmationDialog() {
    const message = this.getConfirmationMessage();
    
    const confirmed = confirm(message);
    if (confirmed) {
      this.formHandler.submitForm();
    }
  },
  
  getConfirmationMessage() {
    const formName = this.formHandler.getFormId();
    const messages = {
      'helpdesk': 'Are you sure you want to submit this support request?',
      'nokkelbestilling': 'Are you sure you want to submit this key order?',
      'inspection_1': 'Are you sure you want to submit this inspection report?',
      'invoicerequest': 'Are you sure you want to submit this invoice request?'
    };
    
    return messages[formName] || 'Are you sure you want to submit this form?';
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
        return true;
      } else {
        Debug.debug('Modal close prevented: Phase 2 not yet completed (recordId:', this.recordId, ', fileCount:', fileCount, ')');
        return false;
      }
    }
    
    // Default to allowing closing if there's no special condition
    return true;
  },
  
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
  },

};
