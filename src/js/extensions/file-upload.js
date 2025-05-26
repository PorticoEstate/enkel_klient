/**
 * FileUpload Extension for FormHandler Core
 * Handles file upload functionality with validation and accessibility
 */

// Prevent multiple declarations
if (typeof FileUploadExtension === 'undefined') {
  class FileUploadExtension {
  constructor(formHandler, options = {}) {
    this.formHandler = formHandler;
    
    // Normalize options to handle different naming conventions
    const normalizedOptions = {
      required: false,
      allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
      maxFileSizeMB: 15,
      ...options
    };
    
    // Handle alternative naming conventions
    if (options.allowedTypes && !options.allowedFileTypes) {
      normalizedOptions.allowedFileTypes = options.allowedTypes.map(type => 
        type.startsWith('.') ? type : '.' + type
      );
    }
    
    if (options.maxFileSize && !options.maxFileSizeMB) {
      normalizedOptions.maxFileSizeMB = options.maxFileSize / (1024 * 1024); // Convert bytes to MB
    }
    
    this.options = normalizedOptions;
    console.log('FileUploadExtension: Initialized with options:', this.options);
    this.init();
  }
  
  init() {
    this.$form = this.formHandler.getForm();
    this.uploadUrl = this.options.uploadUrl || `${strBaseURL}/${this.formHandler.getFormId()}/upload`;
    
    this.initFileUploader();
    this.setupValidation();
  }
  
  initFileUploader() {
    // Initialize jQuery fileupload plugin directly since FileUploader class may not be available
    const fileInput = this.$form.find('input[type="file"]').first();
    
    if (fileInput.length && $.fn.fileupload) {
      console.log('FileUploadExtension: Initializing jQuery fileupload plugin directly');
      
      // Initialize the plugin
      fileInput.fileupload({
        url: this.uploadUrl,
        dropZone: this.$form.find('#drop-area'),
        autoUpload: false,
        sequentialUploads: true,
        replaceFileInput: false,
        
        add: (e, data) => {
          console.log('Files added:', data.files);
          this.handleFilesAdded(data);
        },
        
        submit: (e, data) => {
          console.log('File submit:', data.files[0].name);
          return true;
        },
        
        done: (e, data) => {
          console.log('File upload complete:', data.files[0].name);
          this.handleUploadComplete(true);
        },
        
        fail: (e, data) => {
          console.log('File upload failed:', data.files[0].name);
          this.handleUploadComplete(false);
        }
      });
      
      // Set up drag-and-drop visual feedback after plugin initialization
      this.setupDropZoneEvents();
      
    } else if (typeof FileUploader === 'function') {
      // Fallback to FileUploader class if available
      console.log('FileUploadExtension: Using FileUploader class');
      this.fileUploader = new FileUploader({
        formId: this.formHandler.getFormId(),
        uploadUrl: this.uploadUrl,
        required: this.options.required,
        allowedFileTypes: this.options.allowedFileTypes,
        maxFileSizeMB: this.options.maxFileSizeMB,
        onComplete: (success) => this.handleUploadComplete(success)
      });
      
      this.fileUploader.initialize();
    } else {
      console.warn('FileUploadExtension: Neither jQuery fileupload plugin nor FileUploader class available');
    }
    
    // Ensure file-select-btn works (fallback if neither method handles it)
    this.setupFileSelectButton();
  }
  
  handleFilesAdded(data) {
    // Add each file to the display queue
    const files = Array.from(data.files);
    console.log('FileUploadExtension: Processing files:', files);
    
    files.forEach((file, index) => {
      console.log(`FileUploadExtension: Validating file ${file.name} (${file.size} bytes)`);
      if (this.validateFile(file)) {
        console.log(`FileUploadExtension: File ${file.name} passed validation, adding to queue`);
        this.addFileToQueue(file, data);
        this.updateFileCount();
      } else {
        console.log(`FileUploadExtension: File ${file.name} failed validation`);
      }
    });
  }
  
  validateFile(file) {
    console.log(`FileUploadExtension: Validating file ${file.name}`);
    console.log(`FileUploadExtension: File size: ${file.size} bytes (max: ${this.options.maxFileSizeMB * 1024 * 1024})`);
    console.log(`FileUploadExtension: Allowed types: ${this.options.allowedFileTypes.join(', ')}`);
    
    // Check file size
    if (file.size > this.options.maxFileSizeMB * 1024 * 1024) {
      this.showError(`File ${file.name} is too large. Maximum size is ${this.options.maxFileSizeMB}MB`);
      return false;
    }
    
    // Check file type
    const fileName = file.name.toLowerCase();
    const allowedTypes = this.options.allowedFileTypes.map(type => type.toLowerCase().replace('.', ''));
    const fileExt = fileName.split('.').pop();
    
    console.log(`FileUploadExtension: File extension: ${fileExt}, allowed extensions: ${allowedTypes.join(', ')}`);
    
    if (allowedTypes.length && !allowedTypes.includes(fileExt)) {
      this.showError(`File type .${fileExt} is not allowed. Allowed types: ${this.options.allowedFileTypes.join(', ')}`);
      return false;
    }
    
    console.log(`FileUploadExtension: File ${file.name} passed validation`);
    return true;
  }
  
  addFileToQueue(file, data) {
    console.log(`FileUploadExtension: Adding file ${file.name} to queue`);
    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const fileItem = $(`
      <div class="file-item" data-file-id="${fileId}">
        <div class="file-info">
          <span class="file-name">${file.name}</span>
          <span class="file-size">(${this.formatFileSize(file.size)})</span>
        </div>
        <button type="button" class="btn btn-sm btn-danger delete" aria-label="Remove ${file.name}">
          &times;
        </button>
      </div>
    `);
    
    // Store the data context for upload
    fileItem.data('uploadData', data);
    
    // Add to the files display area
    const filesContainer = this.$form.find('.presentation.files');
    console.log(`FileUploadExtension: Looking for files container: ${filesContainer.length} found`);
    
    if (filesContainer.length) {
      console.log('FileUploadExtension: Adding to .presentation.files container');
      filesContainer.append(fileItem);
    } else {
      // Fallback: create a simple files list
      console.log('FileUploadExtension: .presentation.files not found, creating fallback list');
      let filesList = this.$form.find('.uploaded-files-list');
      if (!filesList.length) {
        console.log('FileUploadExtension: Creating new .uploaded-files-list');
        filesList = $('<div class="uploaded-files-list"></div>');
        this.$form.find('#drop-area').after(filesList);
      }
      filesList.append(fileItem);
    }
    
    // Add delete handler
    fileItem.find('.delete').on('click', () => {
      fileItem.remove();
      this.updateFileCount();
    });
    
    console.log(`FileUploadExtension: File ${file.name} added to queue with ID ${fileId}`);
  }
  
  updateFileCount() {
    const fileCount = this.$form.find('.file-item').length;
    const counter = this.$form.find('#files-count');
    if (counter.length) {
      counter.text(fileCount);
    }
    console.log(`File count updated: ${fileCount}`);
  }
  
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  showError(message) {
    const alert = $(`<div class="alert alert-danger file-error" role="alert">${message}</div>`);
    this.$form.prepend(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      alert.fadeOut(() => alert.remove());
    }, 5000);
  }
  
  setupFileSelectButton() {
    const fileInput = this.$form.find('input[type="file"]').first();
    const fileSelectBtn = this.$form.find('.file-select-btn, #file-select-btn');
    
    if (fileSelectBtn.length > 0 && fileInput.length > 0) {
      console.log('FileUploadExtension: Setting up file select button handler');
      fileSelectBtn.off('click.fileUploadExt keydown.fileUploadExt').on('click.fileUploadExt keydown.fileUploadExt', (e) => {
        console.log('File select button clicked/keyed:', e.type);
        if (e.type === 'click' || (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' '))) {
          e.preventDefault();
          console.log('Triggering file input click...');
          fileInput[0].click();
        }
      });
    } else {
      console.warn('FileUploadExtension: File select button or file input not found');
    }
  }

  setupDropZoneEvents() {
    const dropArea = this.$form.find('#drop-area');
    const fileInput = this.$form.find('input[type="file"]').first();
    
    if (dropArea.length === 0) {
      console.warn('FileUploadExtension: Drop area not found');
      return;
    }
    
    console.log('FileUploadExtension: Setting up drop zone events');
    
    // Wait for the jQuery fileupload plugin to be fully initialized
    setTimeout(() => {
      const fileuploadData = fileInput.data('blueimp-fileupload');
      
      if (fileuploadData) {
        console.log('FileUploadExtension: jQuery fileupload plugin detected, ensuring drop zone connection');
        
        try {
          // Ensure the dropZone option is correctly set (similar to drop-fix.js)
          fileInput.fileupload('option', 'dropZone', dropArea);
          console.log('FileUploadExtension: Drop zone connection verified');
        } catch (error) {
          console.error('FileUploadExtension: Error setting drop zone option:', error);
        }
      } else {
        console.warn('FileUploadExtension: jQuery fileupload plugin not fully initialized yet');
      }
    }, 100);
    
    // Set up accessibility attributes
    dropArea.attr({
      'role': 'region',
      'aria-label': 'File drop zone',
      'tabindex': '-1',
      'aria-description': 'Drag and drop files here or press Alt+D to focus'
    });
    
    // Handle dragover/dragenter for visual feedback ONLY
    dropArea.on('dragover.fileUploadExt dragenter.fileUploadExt', (e) => {
      e.preventDefault();
      dropArea.addClass('is-dragover');
      console.log('FileUploadExtension: Dragover detected, added is-dragover class');
    });
    
    // Handle dragleave/dragend for visual feedback ONLY
    dropArea.on('dragleave.fileUploadExt dragend.fileUploadExt', (e) => {
      e.preventDefault();
      dropArea.removeClass('is-dragover');
      console.log('FileUploadExtension: Dragleave detected, removed is-dragover class');
    });
    
    // For drop event, ONLY handle visual feedback - let jQuery fileupload handle the files
    dropArea.on('drop.fileUploadExt', (e) => {
      console.log('FileUploadExtension: Drop event detected in drop area');
      dropArea.removeClass('is-dragover');
      // Do NOT prevent default or stop propagation - let jQuery fileupload handle the files
      console.log('FileUploadExtension: Removed visual feedback, letting plugin handle files');
    });
    
    // Set up keyboard accessibility
    $(document).on('keydown.fileUploadExtDropArea', (e) => {
      // Alt+D activates drop zone focus
      if (e.altKey && e.key === 'd') {
        e.preventDefault();
        dropArea.focus();
        console.log('FileUploadExtension: Drop zone activated via Alt+D');
      }
      
      // Escape exits drop zone focus
      if (e.key === 'Escape' && document.activeElement === dropArea[0]) {
        e.preventDefault();
        this.$form.find('#file-select-btn, .file-select-btn').first().focus();
        console.log('FileUploadExtension: Exited drop zone via Escape');
      }
    });
    
    // Handle click and keyboard activation on drop area
    dropArea.on('click.fileUploadExt keydown.fileUploadExt', (e) => {
      if (e.type === 'click' || (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' '))) {
        e.preventDefault();
        console.log('FileUploadExtension: Drop area activated, triggering file select');
        fileInput[0].click();
      }
    });
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

  cleanup() {
    // Clean up event handlers
    this.$form.find('#drop-area').off('.fileUploadExt');
    this.$form.find('#file-select-btn, .file-select-btn').off('.fileUploadExt');
    $(document).off('keydown.fileUploadExtDropArea');
    console.log('FileUploadExtension: Cleaned up event handlers');
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
