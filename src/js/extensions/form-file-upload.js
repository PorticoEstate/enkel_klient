/**
 * File Upload Extension
 * Handles file uploads with progress and validation
 */
class FormFileUploadExtension {
  constructor(formHandler, options = {}) {
    this.formHandler = formHandler;
    this.options = {
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      allowedTypes: options.allowedTypes || ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      multiple: options.multiple || false,
      ...options
    };
    this.uploadedFiles = [];
    this.init();
  }

  init() {
    this.setupFileInputs();
    this.setupDropZone();
  }

  setupFileInputs() {
    const form = this.formHandler.getForm();
    const fileInputs = form.find('input[type="file"]');
    
    // Setup change handlers for each file input
    fileInputs.each((index, input) => {
      $(input).on('change', (e) => {
        this.handleFileSelect(e.target);
      });
    });
    
    // Setup click handler for file select button (once, outside the loop)
    const fileSelectBtn = form.find('.file-select-btn, #file-select-btn');
    if (fileSelectBtn.length > 0 && fileInputs.length > 0) {
      console.log('FormFileUploadExtension: Setting up file select button handler');
      fileSelectBtn.off('click.fileUpload keydown.fileUpload').on('click.fileUpload keydown.fileUpload', (e) => {
        console.log('File select button clicked/keyed:', e.type);
        if (e.type === 'click' || (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' '))) {
          e.preventDefault();
          console.log('Triggering file input click...');
          $(fileInputs[0]).trigger('click'); // Trigger the first file input
        }
      });
    } else {
      console.warn('FormFileUploadExtension: File select button or file input not found');
    }
  }

  handleFileSelect(input) {
    const files = Array.from(input.files);
    
    files.forEach(file => {
      if (this.validateFile(file)) {
        this.uploadFile(file, input);
      }
    });
  }

  validateFile(file) {
    // Size validation
    if (file.size > this.options.maxFileSize) {
      this.showError(`File ${file.name} is too large. Maximum size is ${this.formatFileSize(this.options.maxFileSize)}`);
      return false;
    }

    // Type validation
    const extension = file.name.split('.').pop().toLowerCase();
    if (!this.options.allowedTypes.includes(extension)) {
      this.showError(`File type .${extension} is not allowed`);
      return false;
    }

    return true;
  }

  uploadFile(file, input) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('field', input.name);

    const progressId = 'progress_' + Date.now();
    this.showProgress(file.name, progressId);

    $.ajax({
      url: this.formHandler.uploadUrl || '/upload',
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      xhr: () => {
        const xhr = new window.XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            this.updateProgress(progressId, percent);
          }
        });
        return xhr;
      },
      success: (data) => {
        this.handleUploadSuccess(data, file, progressId);
      },
      error: (xhr) => {
        this.handleUploadError(xhr, file, progressId);
      }
    });
  }

  showProgress(filename, progressId) {
    const progressHtml = `
      <div id="${progressId}" class="upload-progress">
        <div class="upload-filename">${filename}</div>
        <div class="progress">
          <div class="progress-bar" role="progressbar" style="width: 0%"></div>
        </div>
      </div>
    `;
    this.formHandler.getForm().find('.upload-area').append(progressHtml);
  }

  updateProgress(progressId, percent) {
    $(`#${progressId} .progress-bar`).css('width', percent + '%');
  }

  handleUploadSuccess(data, file, progressId) {
    $(`#${progressId}`).remove();
    this.uploadedFiles.push({
      name: file.name,
      id: data.fileId,
      url: data.url
    });
    this.showUploadedFile(file.name, data.url);
  }

  handleUploadError(xhr, file, progressId) {
    $(`#${progressId}`).remove();
    this.showError(`Failed to upload ${file.name}: ${xhr.responseText || 'Unknown error'}`);
  }

  showUploadedFile(filename, url) {
    const fileHtml = `
      <div class="uploaded-file">
        <a href="${url}" target="_blank">${filename}</a>
        <button type="button" class="remove-file" data-url="${url}">Remove</button>
      </div>
    `;
    this.formHandler.getForm().find('.uploaded-files').append(fileHtml);
  }

  showError(message) {
    const errorHtml = `<div class="alert alert-danger upload-error">${message}</div>`;
    this.formHandler.getForm().find('.upload-area').prepend(errorHtml);
    setTimeout(() => {
      $('.upload-error').fadeOut();
    }, 5000);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getUploadedFiles() {
    return this.uploadedFiles;
  }

  /**
   * Set whether file upload is required
   * @param {boolean} required - Whether file upload is required
   */
  setRequired(required) {
    this.options.required = required;
    const form = this.formHandler.getForm();
    const fileInputs = form.find('input[type="file"]');
    
    fileInputs.each((index, input) => {
      if (required) {
        $(input).attr('required', 'required');
        $(input).attr('aria-required', 'true');
      } else {
        $(input).removeAttr('required');
        $(input).attr('aria-required', 'false');
      }
    });

    // Update visual indicators
    const fileUploadContainer = form.find('.file-upload-container, .upload-area');
    if (fileUploadContainer.length) {
      const label = fileUploadContainer.find('label');
      if (required) {
        if (!label.find('.required-indicator').length) {
          label.append('<span class="required-indicator text-danger" aria-hidden="true"> *</span>');
        }
      } else {
        label.find('.required-indicator').remove();
      }
    }
  }

  /**
   * Check if file upload is required
   * @returns {boolean}
   */
  isRequired() {
    return this.options.required || false;
  }

  /**
   * Validate if required files are present
   * @returns {boolean}
   */
  validateRequired() {
    if (this.isRequired() && this.uploadedFiles.length === 0) {
      this.showError('File upload is required');
      return false;
    }
    return true;
  }

  /**
   * Clear all uploaded files
   */
  clearFiles() {
    this.uploadedFiles = [];
    const form = this.formHandler.getForm();
    form.find('.uploaded-files').empty();
    form.find('input[type="file"]').val('');
  }

  /**
   * Set up drop zone functionality
   */
  setupDropZone() {
    const form = this.formHandler.getForm();
    const uploadArea = form.find('.upload-area, .file-upload-container');
    
    if (uploadArea.length) {
      uploadArea.on('dragover', (e) => {
        e.preventDefault();
        uploadArea.addClass('drag-over');
      });

      uploadArea.on('dragleave', (e) => {
        e.preventDefault();
        uploadArea.removeClass('drag-over');
      });

      uploadArea.on('drop', (e) => {
        e.preventDefault();
        uploadArea.removeClass('drag-over');
        
        const files = Array.from(e.originalEvent.dataTransfer.files);
        const fileInput = form.find('input[type="file"]')[0];
        
        if (fileInput) {
          // Create a new FileList-like object
          Object.defineProperty(fileInput, 'files', {
            value: files,
            writable: false
          });
          
          files.forEach(file => {
            if (this.validateFile(file)) {
              this.uploadFile(file, fileInput);
            }
          });
        }
      });
    }
  }
}

FormHandler.registerExtension('fileUpload', FormFileUploadExtension);
