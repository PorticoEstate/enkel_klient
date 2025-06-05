/**
 * FormConfirmation Uploads Module
 * Handles file upload functionality for both direct and FileUploadExtension-based uploads
 */

const FormConfirmationUploads = {
  
  /**
   * Phase 2: Upload files
   * Handles file uploads using either FileUploadExtension or direct method
   */
  async uploadFiles($modal) {
    return new Promise((resolve, reject) => {
      // Check if we have a FileUploadExtension that can handle the uploads properly
      const fileUploadExt = this.formHandler.getExtension('fileUpload');
      
      if (fileUploadExt && typeof fileUploadExt.sendAllFiles === 'function') {
        Debug.debug('Using FileUploadExtension for Phase 2 upload');
        
        // Get the current file count to ensure we have files to upload
        // Use multiple methods to detect files, prioritizing UI-based detection
        let fileCount = 0;
        
        // Method 1: Check FileUploadExtension's count
        try {
          fileCount = fileUploadExt.getFileCount();
          Debug.debug(`FileUploadExtension.getFileCount() returned: ${fileCount}`);
        } catch (e) {
          Debug.warn('Error calling FileUploadExtension.getFileCount():', e);
        }
        
        // Method 2: If FileUploadExtension returns 0, check UI directly
        if (fileCount === 0) {
          const fileItems = this.$form.find('.file-item:not(.deleted)');
          fileCount = fileItems.length;
          Debug.debug(`Direct UI check found ${fileCount} file items`);
        }
        
        // Method 3: If still 0, check file inputs directly
        if (fileCount === 0) {
          this.$form.find('input[type="file"]').each(function() {
            if (this.files && this.files.length > 0) {
              fileCount += this.files.length;
            }
          });
          Debug.debug(`File input check found ${fileCount} files`);
        }
        
        Debug.debug(`Total files detected for upload: ${fileCount}`);
        
        if (fileCount === 0) {
          Debug.debug('No files to upload, completing Phase 2');
          resolve();
          return;
        }
        
        // Set up event listeners for upload completion and failure
        const totalFiles = fileCount;
        let completedFiles = 0;
        
        this.$form.off('fileuploaddone.phase2');
        this.$form.off('fileuploadfail.phase2');
        this.$form.off('fileuploadprogress.phase2');
        
        // Listen for individual file upload progress and completion
        this.$form.on('fileuploadprogress.phase2', (event, data) => {
          // Update progress bar for individual file progress if available
          if (data.loaded && data.total) {
            const fileProgress = Math.round((data.loaded / data.total) * 100);
            Debug.debug(`File upload progress: ${fileProgress}%`);
          }
        });
        
        // Listen for individual file completion to track overall progress
        this.$form.on('fileuploadcompleted.phase2', (event, data) => {
          completedFiles++;
          const overallProgress = Math.round((completedFiles / totalFiles) * 100);
          Debug.debug(`File ${completedFiles}/${totalFiles} completed. Overall progress: ${overallProgress}%`);
          
          // Update the progress bar in the modal
          if (this.$currentModal) {
            this.$currentModal.find('.progress-bar').css('width', `${overallProgress}%`);
            this.$currentModal.find('.progress-text').text(`${overallProgress}% complete (${completedFiles}/${totalFiles} files)`);
          }
        });
        
        // Listen for the actual event that FileUploadExtension triggers
        this.$form.one('fileuploaddone', () => {
          Debug.debug('All files uploaded successfully via FileUploadExtension');
          clearTimeout(uploadTimeout);
          this.$form.off('fileuploadfail.phase2');
          this.$form.off('fileuploadprogress.phase2'); 
          this.$form.off('fileuploadcompleted.phase2');
          
          // Ensure progress bar shows 100%
          if (this.$currentModal) {
            this.$currentModal.find('.progress-bar').css('width', '100%');
            this.$currentModal.find('.progress-text').text('100% complete - All files uploaded!');
          }
          
          resolve();
        });
        
        this.$form.one('fileuploadfail.phase2', (event, data) => {
          Debug.error('File upload failed via FileUploadExtension:', data);
          clearTimeout(uploadTimeout);
          this.$form.off('fileuploaddone');
          this.$form.off('fileuploadprogress.phase2');
          this.$form.off('fileuploadcompleted.phase2');
          // Don't reject - just resolve to allow form completion with error message
          resolve();
        });
        
        // Set a timeout to prevent hanging (generous timeout based on file count)
        const uploadTimeout = setTimeout(() => {
          Debug.warn('File upload timeout reached, completing anyway');
          this.$form.off('fileuploaddone');
          this.$form.off('fileuploadfail.phase2');
          this.$form.off('fileuploadprogress.phase2');
          this.$form.off('fileuploadcompleted.phase2');
          resolve(); // Resolve instead of reject to allow form completion
        }, (totalFiles * 30 + 10) * 1000);
        
        // Start the uploads using the FileUploadExtension's method
        fileUploadExt.sendAllFiles(this.recordId);
        
      } else {
        // Fallback to the old method for cases where FileUploadExtension is not available
        Debug.debug('FileUploadExtension not available, falling back to direct file input method');
        
        // Locate file inputs with files
        let $fileInputs = this.$form.find('input[type="file"]');
        let fileInput = null;
        
        // Find the first input with files
        $fileInputs.each(function() {
          if (this.files && this.files.length > 0) {
            fileInput = this;
            return false; // break the loop
          }
        });
        
        if (fileInput && fileInput.files.length > 0) {
          const $fileInput = $(fileInput);
          const uploadUrl = $fileInput.data('upload-url') || this.formHandler.getUploadUrl();
          
          Debug.debug(`Using direct upload method for ${fileInput.files.length} files to ${uploadUrl}`);
          
          this.directUploadFiles($fileInput, uploadUrl)
            .then(() => {
              Debug.debug('Direct file upload completed successfully');
              resolve();
            })
            .catch((error) => {
              Debug.error('Direct file upload failed:', error);
              // Don't reject - just resolve to allow form completion
              resolve();
            });
        } else {
          Debug.debug('No files found to upload');
          resolve();
        }
      }
    });
  },

  /**
   * Direct file upload implementation
   * Used as fallback when FileUploadExtension is not available
   */
  directUploadFiles($fileInput, uploadUrl) {
    return new Promise((resolve, reject) => {
      if (!$fileInput || !$fileInput.length || !$fileInput[0].files || !$fileInput[0].files.length) {
        Debug.debug('No files to upload in directUploadFiles');
        resolve();
        return;
      }
      
      const files = Array.from($fileInput[0].files);
      Debug.debug(`Uploading ${files.length} files to ${uploadUrl}`);
      
      let completed = 0;
      const errors = [];
      
      // Update UI progress if available
      const updateProgress = (percent) => {
        if (this.$currentModal) {
          this.$currentModal.find('.progress-bar').css('width', percent + '%');
          this.$currentModal.find('.progress-text').text(`${percent}% complete`);
        }
      };
      
      files.forEach((file) => {
        // Create minimal FormData with only necessary fields
        const formData = new FormData();
        formData.append('files[]', file);
        
        // Add security token if available
        const randcheck = this.$form.find('input[name="randcheck"]').val();
        if (randcheck) {
          formData.append('randcheck', randcheck);
        }
        
        // Add record ID for phase 2
        if (this.recordId) {
          formData.append('id', this.recordId);
          formData.append('phase2', 'true');
        }
        
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
                Debug.debug(`Upload progress: ${percentComplete}%`);
                // Update individual file progress if we had UI for it
              }
            }, false);
            return xhr;
          },
          success: (response) => {
            // Check if the response indicates an error (even though HTTP status is 200)
            if (typeof response === 'object' && response.status === 'error') {
              Debug.error(`Server returned error for file ${file.name}:`, response.message);
              errors.push(`${file.name} (${response.message || 'Server error'})`);
            } else {
              Debug.debug(`File ${file.name} uploaded successfully`);
            }
            
            completed++;
            const percent = Math.round((completed / files.length) * 100);
            updateProgress(percent);
            
            if (completed === files.length) {
              if (errors.length === 0) {
                resolve();
              } else {
                reject(new Error(`Failed to upload ${errors.length} files: ${errors.join(', ')}`));
              }
            }
          },
          error: (xhr, status, error) => {
            Debug.error(`Failed to upload file ${file.name}:`, error);
            
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
              // If we can't parse the response, use the original error
            }
            
            errors.push(`${file.name} (${errorMessage})`);
            
            completed++;
            const percent = Math.round((completed / files.length) * 100);
            updateProgress(percent);
            
            if (completed === files.length) {
              reject(new Error(`Failed to upload ${errors.length} files: ${errors.join(', ')}`));
            }
          }
        });
      });
    });
  },

  /**
   * Count files in various ways for confirmation display
   */
  countFiles() {
    let fileCount = 0;
    
    // Method 1: Check FileUploadExtension if available
    const fileUploadExt = this.formHandler.getExtension('fileUpload');
    if (fileUploadExt && typeof fileUploadExt.getFileCount === 'function') {
      try {
        const extCount = fileUploadExt.getFileCount();
        Debug.debug(`FileUploadExtension reports ${extCount} files`);
        if (extCount > 0) {
          fileCount = extCount;
        }
      } catch (e) {
        Debug.warn('Error getting file count from FileUploadExtension:', e);
      }
    }
    
    // Method 2: Check UI elements (file items in the upload queue)
    if (fileCount === 0) {
      const fileItems = this.$form.find('.file-item:not(.deleted)');
      if (fileItems.length > 0) {
        fileCount = fileItems.length;
        Debug.debug(`Found ${fileCount} file items in UI`);
      }
    }
    
    // Method 3: Check file inputs directly
    if (fileCount === 0) {
      this.$form.find('input[type="file"]').each(function() {
        if (this.files && this.files.length > 0) {
          fileCount += this.files.length;
        }
      });
      if (fileCount > 0) {
        Debug.debug(`Found ${fileCount} files in file inputs`);
      }
    }
    
    // Method 4: Check for uploaded files display
    if (fileCount === 0) {
      const uploadedFiles = this.$form.find('.uploaded-files .file-item, .files .file-item').not('.deleted');
      if (uploadedFiles.length > 0) {
        fileCount = uploadedFiles.length;
        Debug.debug(`Found ${fileCount} uploaded file items`);
      }
    }
    
    Debug.debug(`Total file count: ${fileCount}`);
    return fileCount;
  }
};

// Export for modular use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormConfirmationUploads;
} else if (typeof window !== 'undefined') {
  window.FormConfirmationUploads = FormConfirmationUploads;
}
