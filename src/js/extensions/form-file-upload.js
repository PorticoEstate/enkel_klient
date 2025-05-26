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
  }

  setupFileInputs() {
    const form = this.formHandler.getForm();
    const fileInputs = form.find('input[type="file"]');
    
    fileInputs.each((index, input) => {
      $(input).on('change', (e) => {
        this.handleFileSelect(e.target);
      });
    });
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
}

FormHandler.registerExtension('fileUpload', FormFileUploadExtension);
