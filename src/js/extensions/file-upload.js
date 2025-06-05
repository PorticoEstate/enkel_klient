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
      maxChunkSize: 8388000, // Add default chunk size (8MB)
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
    Debug.debug('FileUploadExtension: Initialized with options:', this.options);
    this.init();
  }
  
  init() {
    this.$form = this.formHandler.getForm();
    this.uploadUrl = this.options.uploadUrl || `${strBaseURL}/${this.formHandler.getFormId()}/upload`;
    
    this.initFileUploader();
    this.setupValidation();
    this.displayAllowedFileTypes();
  }
  
  displayAllowedFileTypes() {
    Debug.debug('FileUploadExtension: Displaying allowed file types in drop area');
    
    // Create a debug info div to show allowed file types
    const allowedTypesInfo = `
      <div class="file-types-debug alert alert-info mt-2" style="font-size: 0.9em;">
        <strong>🔍 Debug - Allowed file types:</strong> ${this.options.allowedFileTypes.join(', ')}<br>
        <strong>📏 Max file size:</strong> ${this.options.maxFileSizeMB}MB<br>
        <strong>📋 Form:</strong> ${this.formHandler.getFormId()}
      </div>
    `;
    
    // Add the info to the drop area
    const dropArea = this.$form.find('#drop-area');
    if (dropArea.length) {
      // Remove any existing debug info first
      dropArea.find('.file-types-debug').remove();
//      dropArea.append(allowedTypesInfo);
      Debug.debug('FileUploadExtension: Added file types debug info to drop area');
      
      // Also add it to the upload instructions
      const uploadInstructions = dropArea.find('#upload-instructions');
      if (uploadInstructions.length) {
        const originalText = uploadInstructions.text();
        const allowedTypesText = this.getTranslation('file_upload.allowed_types', 'Allowed types:');
        const maxFileSizeText = this.getTranslation('file_upload.max_file_size', 'max');
        
        if (!originalText.includes(allowedTypesText)) {
          uploadInstructions.append(`<br><small style="color:rgb(5, 43, 85);"><strong>${allowedTypesText}</strong> ${this.options.allowedFileTypes.join(', ')} (${maxFileSizeText} ${this.options.maxFileSizeMB}MB)</small>`);
        }
      }
    } else {
      Debug.warn('FileUploadExtension: Drop area not found for displaying file types');
    }
    
    // Also log to console for debugging
    Debug.debug('=== FileUploadExtension Configuration ===');
    Debug.debug('Form ID:', this.formHandler.getFormId());
    Debug.debug('Allowed file types:', this.options.allowedFileTypes);
    Debug.debug('Max file size:', this.options.maxFileSizeMB + 'MB');
    Debug.debug('Upload URL:', this.uploadUrl);
    Debug.debug('Required:', this.options.required);
    Debug.debug('========================================');
  }
  
  initFileUploader() {
    // Initialize jQuery fileupload plugin directly since FileUploader class may not be available
    const fileInput = this.$form.find('input[type="file"]').first();
    
    if (fileInput.length && $.fn.fileupload) {
      Debug.debug('FileUploadExtension: Initializing jQuery fileupload plugin directly');
      
      // Initialize the plugin
      fileInput.fileupload({
        url: this.uploadUrl,
        dropZone: this.$form.find('#drop-area'),
        autoUpload: false,
        sequentialUploads: true,
        replaceFileInput: false,
        
        // Enhanced chunking capabilities (from FileUploader)
        maxChunkSize: this.options.maxChunkSize || 8388000, // 8MB chunks by default
        limitConcurrentUploads: 1,
        
        // Add formData for security tokens (like FileUploader does)
        formData: () => {
          const formData = {};
          
          // Include randcheck token if available
          const randcheck = this.$form.find('input[name="randcheck"]').val();
          if (randcheck) {
            formData.randcheck = randcheck;
          }
          
          return formData;
        },
        
        add: (e, data) => {
          Debug.debug('Files added:', data.files);
          this.handleFilesAdded(data);
        },
        
        submit: (e, data) => {
          Debug.debug('File submit:', data.files[0].name);
          
          // Update URL for two-phase submission if needed
          if (this.uploadId) {
            const baseUrl = this.uploadUrl;
            const hasQueryParams = baseUrl.includes('?');
            const separator = hasQueryParams ? '&' : '?';
            data.url = `${baseUrl}${separator}id=${this.uploadId}&phase2=true`;
          }
          
          return true;
        },
        
        progress: (e, data) => {
          const percent = parseInt((data.loaded / data.total) * 100, 10);
          
          // Update progress bar in file item
          let $progressBar = data.context?.find('.progress-bar');
          
          // If no progress bar in context, try to find it by filename or fallback to any progress bar
          if (!$progressBar || !$progressBar.length) {
            const fileName = data.files?.[0]?.name;
            if (fileName) {
              // Try to find the file item by filename
              const $fileItem = this.$form.find('.file-item').filter(function() {
                return $(this).find('.file-name').text().trim() === fileName;
              });
              $progressBar = $fileItem.find('.progress-bar');
            }
            
            // Final fallback: use any available progress bar in the form
            if (!$progressBar || !$progressBar.length) {
              $progressBar = this.$form.find('.progress-bar').first();
            }
          }
          
          if ($progressBar && $progressBar.length) {
            $progressBar.css('width', percent + '%');
            $progressBar.parent().show();
          }
          
          // Announce progress for accessibility
          if (percent % 25 === 0) {
            Debug.debug(`Upload ${percent}% complete for file: ${data.files?.[0]?.name || 'unknown'}`);
          }
        },
        
        done: (e, data) => {
          Debug.debug('File upload complete:', data.files[0].name);
          this.handleUploadComplete(true, data);
        },
        
        fail: (e, data) => {
          Debug.debug('File upload failed:', data.files[0].name);
          this.handleUploadComplete(false, data);
        }
      });
      
      // Set up drag-and-drop visual feedback after plugin initialization
      this.setupDropZoneEvents();
      
    } else {
      Debug.warn('FileUploadExtension: jQuery fileupload plugin not available');
    }
    
    // Ensure file-select-btn works (fallback if neither method handles it)
    // Use a small delay to ensure DOM is fully ready and fileupload plugin is initialized
    setTimeout(() => {
      this.setupFileSelectButton();
    }, 100);
  }

  // Add methods for two-phase submission compatibility
  sendAllFiles(uploadId) {
    this.uploadId = uploadId;
    Debug.debug('FileUploadExtension: Starting upload for ID:', uploadId);
    
    // Count how many files we're about to submit
    const fileItems = this.$form.find('.file-item:not(.done):not(.deleted)');
    Debug.debug(`FileUploadExtension: Found ${fileItems.length} file items to upload`);
    
    if (fileItems.length === 0) {
      Debug.debug('FileUploadExtension: No files to upload, triggering completion event');
      // Trigger completion event immediately if no files
      this.$form.trigger('fileuploaddone');
      return;
    }
    
    let submittedCount = 0;
    
    // Trigger all pending uploads
    fileItems.each((index, item) => {
      const $item = $(item);
      const uploadData = $item.data('uploadData');
      
      if (uploadData && uploadData.files && uploadData.files.length > 0) {
        const fileName = uploadData.files[0]?.name || 'unknown';
        Debug.debug(`FileUploadExtension: Submitting file ${submittedCount + 1}/${fileItems.length}: ${fileName}`);
        submittedCount++;
        
        // Update the upload URL for Phase 2
        const baseUrl = this.uploadUrl;
        const hasQueryParams = baseUrl.includes('?');
        const separator = hasQueryParams ? '&' : '?';
        uploadData.url = `${baseUrl}${separator}id=${uploadId}&phase2=true`;
        
        // Ensure context points to the file item for progress tracking
        if (!uploadData.context) {
          uploadData.context = $item;
        }
        
        Debug.debug(`FileUploadExtension: Upload URL set to: ${uploadData.url}`);
        uploadData.submit();
      } else {
        Debug.warn(`FileUploadExtension: File item ${index} has no uploadData or files`);
      }
    });
    
    Debug.debug(`FileUploadExtension: Submitted ${submittedCount} files for upload`);
    
    // If no files were actually submitted, trigger completion
    if (submittedCount === 0) {
      Debug.debug('FileUploadExtension: No files submitted, triggering completion event');
      this.$form.trigger('fileuploaddone');
    }
  }
  
  getPendingCount() {
    const fileItemCount = this.$form.find('.file-item:not(.done):not(.deleted)').length;
    Debug.debug(`FileUploadExtension: getPendingCount() found ${fileItemCount} file items`);
    return fileItemCount;
  }
  
  getFileCount() {
    const pendingCount = this.getPendingCount();
    Debug.debug(`FileUploadExtension: getFileCount() returning ${pendingCount}`);
    return pendingCount;
  }
  
  resetCounts() {
    this.$form.find('.file-item').remove();
    this.updateFileCount();
  }
  
  handleFilesAdded(data) {
    // Add each file to the display queue
    const files = Array.from(data.files);
    Debug.debug('FileUploadExtension: Processing files:', files);
    
    files.forEach((file, index) => {
      Debug.debug(`FileUploadExtension: Validating file ${file.name} (${file.size} bytes)`);
      
      // Check for duplicates first
      if (this.isDuplicateFile(file)) {
        Debug.debug(`FileUploadExtension: File ${file.name} is a duplicate, skipping`);
        const message = this.getTranslation('file_upload.file_duplicate', 'File "{filename}" is already in the upload queue. Please select a different file or remove the existing one first.')
          .replace('{filename}', `<strong>${file.name}</strong>`);
        this.showError(`⚠️ ${message}`);
        return; // Skip this file
      }
      
      // Continue with validation
      if (this.validateFile(file)) {
        Debug.debug(`FileUploadExtension: File ${file.name} passed validation, adding to queue`);
        
        // Create individual data object for this specific file
        const individualData = {
          ...data,
          files: [file], // Only this specific file
          index: index   // Track the original index
        };
        
        this.addFileToQueue(file, individualData);
        this.updateFileCount();
      } else {
        Debug.debug(`FileUploadExtension: File ${file.name} failed validation`);
      }
    });
  }
  
  validateFile(file) {
    Debug.debug(`FileUploadExtension: Validating file ${file.name}`);
    Debug.debug(`FileUploadExtension: File size: ${file.size} bytes (max: ${this.options.maxFileSizeMB * 1024 * 1024})`);
    Debug.debug(`FileUploadExtension: Allowed types configured: ${JSON.stringify(this.options.allowedFileTypes)}`);
    
    // Check file size first
    if (file.size > this.options.maxFileSizeMB * 1024 * 1024) {
      const actualSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      Debug.error(`FileUploadExtension: File ${file.name} is too large`);
      const message = this.getTranslation('file_upload.file_too_large', 'File "{filename}" is too large ({actualSize}MB). Maximum allowed size is {maxSize}MB. Please choose a smaller file or compress it.')
        .replace('{filename}', `<strong>${file.name}</strong>`)
        .replace('{actualSize}', `<strong>${actualSizeMB}</strong>`)
        .replace('{maxSize}', `<strong>${this.options.maxFileSizeMB}</strong>`);
      this.showError(`❌ ${message}`);
      return false;
    }
    
    // Check if file is empty
    if (file.size === 0) {
      Debug.error(`FileUploadExtension: File ${file.name} is empty`);
      const message = this.getTranslation('file_upload.file_empty', 'File "{filename}" is empty (0 bytes). Please select a valid file with content.')
        .replace('{filename}', `<strong>${file.name}</strong>`);
      this.showError(`❌ ${message}`);
      return false;
    }
    
    // Check if file is suspiciously small (less than 10 bytes)
    if (file.size < 10) {
      Debug.warn(`FileUploadExtension: File ${file.name} is very small`);
      const message = this.getTranslation('file_upload.file_too_small', 'File "{filename}" seems unusually small ({size} bytes). Please verify this is a valid file.')
        .replace('{filename}', `<strong>${file.name}</strong>`)
        .replace('{size}', file.size);
      this.showError(`⚠️ ${message}`);
      return false;
    }
    
    // Check file type
    const fileName = file.name.toLowerCase();
    const allowedTypes = this.options.allowedFileTypes.map(type => type.toLowerCase().replace('.', ''));
    const fileExt = fileName.split('.').pop();
    
    Debug.debug(`FileUploadExtension: File name: "${fileName}"`);
    Debug.debug(`FileUploadExtension: File extension extracted: "${fileExt}"`);
    Debug.debug(`FileUploadExtension: Processed allowed extensions: ${JSON.stringify(allowedTypes)}`);
    Debug.debug(`FileUploadExtension: Extension check - "${fileExt}" in [${allowedTypes.join(', ')}]: ${allowedTypes.includes(fileExt)}`);
    
    // Check if file has an extension
    if (!fileExt || fileExt === fileName || !fileName.includes('.')) {
      Debug.error(`FileUploadExtension: File ${file.name} has no extension`);
      const message = this.getTranslation('file_upload.file_no_extension', 'File "{filename}" has no file extension. Please ensure your file has a valid extension like: {allowedTypes}')
        .replace('{filename}', `<strong>${file.name}</strong>`)
        .replace('{allowedTypes}', `<strong>${this.options.allowedFileTypes.join(', ')}</strong>`);
      this.showError(`❌ ${message}`);
      return false;
    }
    
    // Check if extension is allowed
    if (allowedTypes.length && !allowedTypes.includes(fileExt)) {
      Debug.error(`FileUploadExtension: File type .${fileExt} is not allowed`);
      const message = this.getTranslation('file_upload.file_type_not_supported', 'File type "{fileType}" is not supported for "{filename}". Please choose a file with one of these extensions: {allowedTypes}')
        .replace('{fileType}', `<strong>.${fileExt}</strong>`)
        .replace('{filename}', `<strong>${file.name}</strong>`)
        .replace('{allowedTypes}', `<strong>${this.options.allowedFileTypes.join(', ')}</strong>`);
      this.showError(`❌ ${message}`);
      return false;
    }
    
    // Additional security check for dangerous extensions
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'ps1'];
    if (dangerousExtensions.includes(fileExt)) {
      Debug.error(`FileUploadExtension: File ${file.name} has dangerous extension`);
      const message = this.getTranslation('file_upload.file_dangerous_type', 'File "{filename}" has a potentially dangerous file type ({fileType}) and cannot be uploaded for security reasons.')
        .replace('{filename}', `<strong>${file.name}</strong>`)
        .replace('{fileType}', `<strong>.${fileExt}</strong>`);
      this.showError(`🚫 ${message}`);
      return false;
    }
    
    Debug.debug(`FileUploadExtension: File ${file.name} passed validation`);
    return true;
  }
  
  isDuplicateFile(file) {
    // Check if a file with the same name and size is already in the queue
    const existingFiles = this.$form.find('.file-item');
    
    for (let i = 0; i < existingFiles.length; i++) {
      const existingItem = $(existingFiles[i]);
      const existingFileName = existingItem.find('.file-name').text().trim();
      
      // For more robust duplicate detection, we could also compare file sizes
      // by extracting the size from the .file-size element, but name comparison
      // is usually sufficient for user experience
      if (existingFileName === file.name) {
        Debug.debug(`FileUploadExtension: Duplicate file detected: ${file.name}`);
        return true;
      }
    }
    
    Debug.debug(`FileUploadExtension: File ${file.name} is not a duplicate`);
    return false;
  }
  
  addFileToQueue(file, data) {
    Debug.debug(`FileUploadExtension: Adding file ${file.name} to queue`);
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
    Debug.debug(`FileUploadExtension: Stored uploadData for ${file.name}:`, {
      hasData: !!data,
      hasFiles: !!(data && data.files),
      fileCount: data && data.files ? data.files.length : 0,
      firstFileName: data && data.files && data.files[0] ? data.files[0].name : 'N/A'
    });
    
    // Add to the files display area
    const filesContainer = this.$form.find('.presentation.files');
    Debug.debug(`FileUploadExtension: Looking for files container: ${filesContainer.length} found`);
    
    if (filesContainer.length) {
      Debug.debug('FileUploadExtension: Adding to .presentation.files container');
      filesContainer.append(fileItem);
    } else {
      // Fallback: create a simple files list
      Debug.debug('FileUploadExtension: .presentation.files not found, creating fallback list');
      let filesList = this.$form.find('.uploaded-files-list');
      if (!filesList.length) {
        Debug.debug('FileUploadExtension: Creating new .uploaded-files-list');
        filesList = $('<div class="uploaded-files-list"></div>');
        this.$form.find('#drop-area').after(filesList);
      }
      filesList.append(fileItem);
    }
    
    // Add delete handler
    fileItem.find('.delete').on('click', () => {
      // Mark as deleted before removing to ensure counting methods see the change
      fileItem.addClass('deleted');
      Debug.debug(`FileUploadExtension: Marked file ${file.name} as deleted`);
      
      // Update count first while the element still exists but is marked as deleted
      this.updateFileCount();
      
      // Notify autosave extension about file deletion to immediately update metadata
      this.notifyAutosaveFileDeleted(file);
      
      // Then remove from DOM
      fileItem.remove();
      
      // Clear file input if no files remain
      const remainingFiles = this.$form.find('.file-item:not(.deleted)').length;
      if (remainingFiles === 0) {
        const fileInput = this.$form.find('input[type="file"]');
        if (fileInput.length) {
          fileInput.val(''); // Clear the file input
          Debug.debug('FileUploadExtension: Cleared file input after deleting all files');
        }
      }
    });
    
    Debug.debug(`FileUploadExtension: File ${file.name} added to queue with ID ${fileId}`);
    
    // Notify autosave extension about file addition to immediately update metadata
    this.notifyAutosaveFileAdded(file);
  }
  
  updateFileCount() {
    const fileCount = this.$form.find('.file-item:not(.deleted)').length;
    const counter = this.$form.find('#files-count');
    if (counter.length) {
      counter.text(fileCount);
    }
    Debug.debug(`File count updated: ${fileCount}`);
  }
  
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  showError(message) {
    // Remove any existing flash errors first
    this.$form.find('.flash-error').remove();
    
    // Show flash error above the drop area only (3 seconds)
    const dropArea = this.$form.find('#drop-area');
    if (dropArea.length) {
      const flashError = $(`
        <div class="flash-error alert alert-danger" style="margin-bottom: 10px; animation: slideInDown 0.3s ease-out; border-left: 4px solid #dc3545;">
          <div style="display: flex; align-items: center;">
            <i class="fas fa-exclamation-triangle" style="color: #dc3545; margin-right: 10px; font-size: 1.2em;" aria-hidden="true"></i>
            <div style="flex: 1;">
              <strong>${this.getTranslation('file_upload.file_upload_error', 'File Upload Error')}:</strong> ${message}
            </div>
          </div>
        </div>
      `);
      
      // Insert above the drop area
      dropArea.before(flashError);
      
      // Scroll to the error message to make it visible
      flashError[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Focus the error for screen readers with a slight delay
      setTimeout(() => {
        flashError.attr('tabindex', '-1').focus();
      }, 300);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        flashError.fadeOut(300, () => flashError.remove());
      }, 5000);
    } else {
      Debug.warn('FileUploadExtension: Drop area not found for error display');
    }
    
    Debug.error('FileUploadExtension Error:', message);
    Debug.error('Error details:', {
      timestamp: new Date().toISOString(),
      formId: this.formHandler.getFormId(),
      allowedTypes: this.options.allowedFileTypes,
      maxSize: this.options.maxFileSizeMB + 'MB'
    });
  }
  
  setupFileSelectButton() {
    Debug.debug('FileUploadExtension: Setting up file select button');
    
    const fileInput = this.$form.find('input[type="file"]').first();
    const fileSelectBtn = this.$form.find('.file-select-btn, #file-select-btn');
    
    Debug.debug('FileUploadExtension: File input found:', fileInput.length);
    Debug.debug('FileUploadExtension: File select button found:', fileSelectBtn.length);
    Debug.debug('FileUploadExtension: Button element type:', fileSelectBtn.prop('tagName'));
    Debug.debug('FileUploadExtension: Button is label?', fileSelectBtn.is('label'));
    
    // Debug file input properties
    if (fileInput.length > 0) {
      const input = fileInput[0];
      Debug.debug('FileUploadExtension: File input ID:', input.id);
      Debug.debug('FileUploadExtension: File input name:', input.name);
      Debug.debug('FileUploadExtension: File input type:', input.type);
      Debug.debug('FileUploadExtension: File input disabled:', input.disabled);
      Debug.debug('FileUploadExtension: File input style.display:', input.style.display);
      Debug.debug('FileUploadExtension: File input style.visibility:', input.style.visibility);
      Debug.debug('FileUploadExtension: File input offsetWidth:', input.offsetWidth);
      Debug.debug('FileUploadExtension: File input offsetHeight:', input.offsetHeight);
    }
    
    if (fileInput.length === 0 || fileSelectBtn.length === 0) {
      Debug.warn('FileUploadExtension: File select button or file input not found');
      return;
    }
    
    // Check if the button is already a label (old template approach)
    if (fileSelectBtn.is('label')) {
      Debug.debug('FileUploadExtension: ✅ Using label approach - direct file selection enabled');
      
      // Add keyboard support for the label (Enter/Space)
      fileSelectBtn.on('keydown.fileUploadExt', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          Debug.debug('FileUploadExtension: Label activated via keyboard');
          e.preventDefault();
          // For label elements, clicking the label will automatically trigger the input
          fileSelectBtn[0].click();
        }
      });
      
    } else {
      // Button approach (recommended for accessibility - no duplicate labels)
      Debug.debug('FileUploadExtension: ✅ Using button approach (WCAG compliant)');
      
      // Remove any existing handlers first to avoid duplicates
      fileSelectBtn.off('.fileUploadExt');
      
      // Simple, direct approach - this should work in all modern browsers
      fileSelectBtn.on('click.fileUploadExt', (e) => {
        Debug.debug('FileUploadExtension: File select button clicked');
        e.preventDefault();
        e.stopPropagation();
        
        const input = fileInput[0];
        if (input) {
          Debug.debug('FileUploadExtension: Triggering file input click...');
          
          // Ensure input is enabled and not hidden by display:none
          input.disabled = false;
          input.style.display = '';
          
          // Direct click - this is the most reliable method
          input.click();
          
          Debug.debug('FileUploadExtension: ✅ File input click triggered');
        } else {
          Debug.error('FileUploadExtension: File input element not found');
        }
      });
      
      // Add keyboard handler - simply trigger the button click
      fileSelectBtn.on('keydown.fileUploadExt', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          Debug.debug('FileUploadExtension: File select button activated via keyboard:', e.key);
          e.preventDefault();
          e.stopPropagation();
          
          // Trigger the button's click event
          fileSelectBtn.trigger('click.fileUploadExt');
        }
      });
      
      // Add focus/blur handlers for better UX
      fileSelectBtn.on('focus.fileUploadExt', () => {
        Debug.debug('FileUploadExtension: File select button focused');
      });
      
      fileSelectBtn.on('blur.fileUploadExt', () => {
        Debug.debug('FileUploadExtension: File select button blurred');
      });
    }
    
    // File input change event (applies to both approaches)
    // Remove any existing handlers first to avoid duplicates
    fileInput.off('change.fileUploadExt');
    
    fileInput.on('change.fileUploadExt', (e) => {
      Debug.debug('FileUploadExtension: File input change event triggered');
      Debug.debug('FileUploadExtension: Number of files selected:', e.target.files ? e.target.files.length : 0);
      
      if (e.target.files && e.target.files.length > 0) {
        Debug.debug('FileUploadExtension: ✅ File selection successful!');
        for (let i = 0; i < e.target.files.length; i++) {
          Debug.debug(`FileUploadExtension: File ${i + 1}:`, e.target.files[i].name, `(${e.target.files[i].size} bytes)`);
        }
        
        // Trigger the jQuery fileupload add event manually if needed
        // This ensures the files are processed through our validation pipeline
        try {
          const data = {
            files: Array.from(e.target.files),
            originalEvent: e
          };
          
          // Check if jQuery fileupload is handling this automatically
          const fileuploadData = fileInput.data('blueimp-fileupload');
          if (fileuploadData) {
            Debug.debug('FileUploadExtension: jQuery fileupload plugin will handle the files automatically');
          } else {
            Debug.debug('FileUploadExtension: Manually processing files through validation');
            this.handleFilesAdded(data);
          }
        } catch (error) {
          Debug.error('FileUploadExtension: Error processing selected files:', error);
        }
      } else {
        Debug.debug('FileUploadExtension: No files selected or files array is empty');
      }
    });
    
    Debug.debug('FileUploadExtension: File select button setup complete');
  }
  
  setupDropZoneEvents() {
    const dropArea = this.$form.find('#drop-area');
    const fileInput = this.$form.find('input[type="file"]').first();
    
    if (dropArea.length === 0) {
      Debug.warn('FileUploadExtension: Drop area not found');
      return;
    }
    
    Debug.debug('FileUploadExtension: Setting up drop zone events');
    
    // Wait for the jQuery fileupload plugin to be fully initialized
    setTimeout(() => {
      const fileuploadData = fileInput.data('blueimp-fileupload');
      
      if (fileuploadData) {
        Debug.debug('FileUploadExtension: jQuery fileupload plugin detected, ensuring drop zone connection');
        
        try {
          fileInput.fileupload('option', 'dropZone', dropArea);
          Debug.debug('FileUploadExtension: Drop zone connection verified');
        } catch (error) {
          Debug.error('FileUploadExtension: Error setting drop zone option:', error);
        }
      } else {
        Debug.warn('FileUploadExtension: jQuery fileupload plugin not fully initialized yet');
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
      Debug.debug('FileUploadExtension: Dragover detected, added is-dragover class');
    });
    
    // Handle dragleave/dragend for visual feedback ONLY
    dropArea.on('dragleave.fileUploadExt dragend.fileUploadExt', (e) => {
      e.preventDefault();
      dropArea.removeClass('is-dragover');
      Debug.debug('FileUploadExtension: Dragleave detected, removed is-dragover class');
    });
    
    // For drop event, ONLY handle visual feedback - let jQuery fileupload handle the files
    dropArea.on('drop.fileUploadExt', (e) => {
      Debug.debug('FileUploadExtension: Drop event detected in drop area');
      dropArea.removeClass('is-dragover');
      // Do NOT prevent default or stop propagation - let jQuery fileupload handle the files
      Debug.debug('FileUploadExtension: Removed visual feedback, letting plugin handle files');
    });
    
    // Set up keyboard accessibility
    $(document).on('keydown.fileUploadExtDropArea', (e) => {
      // Alt+D activates drop zone focus
      if (e.altKey && e.key === 'd') {
        e.preventDefault();
        dropArea.focus();
        Debug.debug('FileUploadExtension: Drop zone activated via Alt+D');
      }
      
      // Escape exits drop zone focus
      if (e.key === 'Escape' && document.activeElement === dropArea[0]) {
        e.preventDefault();
        this.$form.find('#file-select-btn, .file-select-btn').first().focus();
        Debug.debug('FileUploadExtension: Exited drop zone via Escape');
      }
    });
    
    // Handle click and keyboard activation on drop area
    // Only add click handler if we're not using a label-based file selection
    const fileSelectBtn = this.$form.find('.file-select-btn, #file-select-btn');
    if (!fileSelectBtn.is('label')) {
      Debug.debug('FileUploadExtension: Adding drop area click handler');
      dropArea.on('click.fileUploadExt keydown.fileUploadExt', (e) => {
        // Only trigger if the click/keydown is directly on the drop area, not on child elements
        if (e.target === dropArea[0] || $(e.target).is('#upload-instructions')) {
          if (e.type === 'click' || (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' '))) {
            e.preventDefault();
            e.stopPropagation();
            Debug.debug('FileUploadExtension: Drop area activated, triggering file select');
            
            try {
              const input = fileInput[0];
              if (input && typeof input.click === 'function') {
                input.click();
                Debug.debug('FileUploadExtension: ✅ File input triggered from drop area');
              }
            } catch (error) {
              Debug.error('FileUploadExtension: Error triggering file input from drop area:', error);
            }
          }
        }
      });
    } else {
      Debug.debug('FileUploadExtension: Skipping drop area click handler (using label approach)');
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

  handleUploadComplete(success, data) {
    const fileName = data.files?.[0]?.name || 'unknown';
    Debug.debug(`FileUploadExtension: handleUploadComplete called for ${fileName}, success: ${success}`);
    
    if (success) {
      // Mark file as completed in the UI
      if (data.context) {
        data.context.addClass('done').removeClass('uploading');
        Debug.debug(`FileUploadExtension: Marked file ${fileName} as done in UI`);
      } else {
        // Fallback: find file item by name and mark as done
        const $fileItem = this.$form.find('.file-item').filter(function() {
          return $(this).find('.file-name').text().trim() === fileName;
        });
        if ($fileItem.length) {
          $fileItem.addClass('done').removeClass('uploading');
          Debug.debug(`FileUploadExtension: Found and marked file ${fileName} as done via fallback`);
        }
      }
      
      // Check if this is a two-phase upload (uploadId is set)
      if (this.uploadId) {
        Debug.debug(`FileUploadExtension: Two-phase upload detected for ${fileName}`);
        
        // Check if all files are now complete
        const remainingFiles = this.$form.find('.file-item:not(.done):not(.deleted)').length;
        Debug.debug(`FileUploadExtension: ${remainingFiles} files remaining after ${fileName} completion`);
        
        if (remainingFiles === 0) {
          Debug.debug('FileUploadExtension: All files uploaded, triggering completion event');
          this.$form.trigger('fileuploaddone');
        }
      } else {
        // Single phase upload - redirect as before
        Debug.debug(`FileUploadExtension: Single-phase upload complete for ${fileName}, redirecting`);
        window.location.href = this.formHandler.redirectUrl;
      }
    } else {
      // Handle upload failure
      Debug.error(`FileUploadExtension: Upload failed for ${fileName}`);
      
      if (data.context) {
        data.context.addClass('error').removeClass('uploading');
      } else {
        // Fallback: find file item by name and mark as error
        const $fileItem = this.$form.find('.file-item').filter(function() {
          return $(this).find('.file-name').text().trim() === fileName;
        });
        if ($fileItem.length) {
          $fileItem.addClass('error').removeClass('uploading');
        }
      }
      
      // Show error message
      this.showFileError(`File upload failed: ${fileName}`);
      
      // In two-phase mode, trigger failure event
      if (this.uploadId) {
        this.$form.trigger('fileuploadfail', data);
      }
    }
  }

  cleanup() {
    // Clean up event handlers
    this.$form.find('#drop-area').off('.fileUploadExt');
    this.$form.find('#file-select-btn, .file-select-btn').off('.fileUploadExt');
    $(document).off('keydown.fileUploadExtDropArea');
    Debug.debug('FileUploadExtension: Cleaned up event handlers');
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

  /**
   * Get a translation from the preloaded translations object
   * @param {string} key - The translation key (e.g., 'file_upload.file_too_large')
   * @param {string} fallback - Fallback text if translation is not found
   * @returns {string} The translated text or fallback
   */
  getTranslation(key, fallback) {
    try {
      // Check if translations object exists
      if (typeof window.translations === 'undefined') {
        Debug.warn('FileUploadExtension: No translations object found, using fallback');
        return fallback;
      }

      // Split the key to navigate nested object (e.g., 'file_upload.file_too_large')
      const keys = key.split('.');
      let current = window.translations;

      for (const keyPart of keys) {
        if (current && current.hasOwnProperty(keyPart)) {
          current = current[keyPart];
        } else {
          Debug.warn(`FileUploadExtension: Translation key '${key}' not found, using fallback`);
          return fallback;
        }
      }

      // Return the found translation or fallback if it's not a string
      return (typeof current === 'string' && current.trim() !== '') ? current : fallback;
    } catch (error) {
      Debug.error('FileUploadExtension: Error getting translation for key:', key, error);
      return fallback;
    }
  }
  
  notifyAutosaveFileDeleted(file) {
    try {
      // Get the autosave extension
      const autosaveExtension = this.formHandler.getExtension('autoSave');
      if (autosaveExtension && typeof autosaveExtension.removeFileFromMetadata === 'function') {
        Debug.debug(`FileUploadExtension: Notifying autosave about deleted file: ${file.name}`);
        autosaveExtension.removeFileFromMetadata(file);
      } else {
        Debug.debug('FileUploadExtension: Autosave extension not found or removeFileFromMetadata method not available');
      }
    } catch (error) {
      Debug.warn('FileUploadExtension: Error notifying autosave about file deletion:', error);
    }
  }

  notifyAutosaveFileAdded(file) {
    try {
      // Get the autosave extension
      const autosaveExtension = this.formHandler.getExtension('autoSave');
      Debug.debug(`FileUploadExtension: Autosave extension found: ${!!autosaveExtension}`);
      if (autosaveExtension) {
        Debug.debug(`FileUploadExtension: Notifying autosave about added file: ${file.name}`);
        Debug.debug(`FileUploadExtension: Autosave extension type:`, typeof autosaveExtension);
        Debug.debug(`FileUploadExtension: Autosave extension methods:`, Object.getOwnPropertyNames(autosaveExtension).filter(name => typeof autosaveExtension[name] === 'function'));
        
        // First, handle the file list reduction functionality for drag-and-drop
        if (typeof autosaveExtension.handleFileAdded === 'function') {
          Debug.debug(`FileUploadExtension: Calling autosaveExtension.handleFileAdded for: ${file.name}`);
          try {
            autosaveExtension.handleFileAdded(file);
            Debug.debug(`FileUploadExtension: Successfully called handleFileAdded for: ${file.name}`);
          } catch (error) {
            Debug.error(`FileUploadExtension: Error calling handleFileAdded:`, error);
          }
        } else {
          Debug.warn(`FileUploadExtension: handleFileAdded method not found on autosave extension`);
          Debug.warn(`FileUploadExtension: Available methods:`, Object.getOwnPropertyNames(autosaveExtension).filter(name => typeof autosaveExtension[name] === 'function'));
        }
        
        // Then trigger autosave to immediately update metadata with the new file
        if (typeof autosaveExtension.saveData === 'function') {
          autosaveExtension.saveData();
        }
      } else {
        Debug.debug('FileUploadExtension: Autosave extension not found');
      }
    } catch (error) {
      Debug.warn('FileUploadExtension: Error notifying autosave about file addition:', error);
    }
  }
  }

  // Register the extension (only if not already registered)
  if (FormHandler && typeof FormHandler.registerExtension === 'function') {
    FormHandler.registerExtension('fileUpload', FileUploadExtension);
  }

  window.FileUploadExtension = FileUploadExtension;
}
