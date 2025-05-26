/**
 * FileUpload Extension for FormHandler Core
 * Handles file upload functionality with validation and accessibility
 */

// Prevent multiple declarations
if (typeof FileUploadExtension === 'undefined') {
  class FileUploadExtension {
  constructor(formHandler, options = {}) {
    this.formHandler = formHandler;
    this.options = {
      required: false,
      allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
      maxFileSizeMB: 15,
      ...options
    };
    this.init();
  }
  
  init() {
    this.$form = this.formHandler.getForm();
    this.uploadUrl = this.options.uploadUrl || `${strBaseURL}/${this.formHandler.getFormId()}/upload`;
    
    this.initFileUploader();
    this.setupValidation();
  }
  
  initFileUploader() {
    // Initialize file uploader if FileUploader class exists
    if (typeof FileUploader === 'function') {
      this.fileUploader = new FileUploader({
        formId: this.formHandler.getFormId(),
        uploadUrl: this.uploadUrl,
        required: this.options.required,
        allowedFileTypes: this.options.allowedFileTypes,
        maxFileSizeMB: this.options.maxFileSizeMB,
        onComplete: (success) => this.handleUploadComplete(success)
      });
      
      this.fileUploader.initialize();
    }
  }
  
  setupValidation() {
    // Hook into form submission via core system
    this.beforeSubmit = () => {
      if (this.options.required && !this.validateFileUpload()) {
        return false; // Prevent submission
      }
      return true;
    };
  }
  
  validateFileUpload() {
    if (!this.options.required) return true;
    
    let hasFiles = false;
    
    // Check file uploader
    if (this.fileUploader && typeof this.fileUploader.getPendingCount === 'function') {
      hasFiles = this.fileUploader.getPendingCount() > 0;
    }
    
    // Check file inputs
    if (!hasFiles) {
      this.$form.find('input[type="file"]').each(function() {
        if (this.files && this.files.length > 0) {
          hasFiles = true;
          return false;
        }
      });
    }
    
    if (!hasFiles) {
      this.showFileError('File upload is required');
      return false;
    }
    
    return true;
  }
  
  showFileError(message) {
    const $alert = $('<div class="alert alert-danger" role="alert"></div>')
      .text(message);
    this.$form.prepend($alert);
  }
  
  handleUploadComplete(success) {
    if (success) {
      window.location.href = this.formHandler.redirectUrl;
    } else {
      this.showFileError('File upload failed');
    }
  }
  
  setRequired(required) {
    this.options.required = required;
    
    const $fileInput = $('#fileupload');
    if (required) {
      $fileInput.attr('required', 'required').attr('aria-required', 'true');
    } else {
      $fileInput.removeAttr('required').attr('aria-required', 'false');
    }
  }
  }

  // Register the extension (only if not already registered)
  if (FormHandler && typeof FormHandler.registerExtension === 'function') {
    FormHandler.registerExtension('fileUpload', FileUploadExtension);
  }

  window.FileUploadExtension = FileUploadExtension;
}
