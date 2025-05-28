/**
 * Auto-Save Extension
 * Handles automatic saving of form data
 */

// Prevent multiple declarations
if (typeof FormAutoSaveExtension === 'undefined') {
  class FormAutoSaveExtension {
  constructor(formHandler, options = {}) {
    this.formHandler = formHandler;
    this.options = {
      interval: options.interval || 30000, // 30 seconds
      storageKey: options.storageKey || `autosave_${formHandler.getFormId()}`,
      ...options
    };
    this.init();
  }

  init() {
    // Save the load time to calculate elapsed time for debugging
    this.loadTime = new Date();
    
    const setupAndRestore = () => {
      // Setup autosave immediately
      this.setupAutoSave();
      
      // First attempt - quick initial restoration (for standard fields)
      setTimeout(() => {
        console.log('⚡ Initial attempt at restoring autosaved data');
        this.restoreData();
      }, 300); 
      
      // Second attempt - optimal timing for most Quill editors
      setTimeout(() => {
        console.log('🔄 Second attempt for Quill editors');
        this.restoreData(true); // Force second attempt
      }, 1000);
      
      // Final verification to ensure content is visible
      setTimeout(() => {
        console.log('✅ Verifying restoration success');
        this.checkRestorationSuccess();
      }, 2000);

      // Setup form submission handler to clear localStorage on successful submit
      this.setupSubmitHandler();
    };
    
    // Wait for DOM to be ready before setting up autosave
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupAndRestore);
    } else {
      // DOM is already ready, set up immediately
      setupAndRestore();
    }
  }
  
  /**
   * Setup handler to clear autosave data after successful form submission
   */
  setupSubmitHandler() {
    // Register a hook in the form handler to execute after successful submission
    if (this.formHandler.addHook) {
      console.log('🔄 Registering afterSuccess hook to clear autosaved data on form submission');
      this.formHandler.addHook('afterSuccess', (data) => {
        // Check if submission was successful
        if (data && data.status === "saved") {
          console.log('✅ Form submitted successfully, clearing autosaved data');
          this.clearSavedData();
          return true; // Continue with other hooks
        }
        return true;
      });
    }
  }

  setupAutoSave() {
    const form = this.formHandler.getForm();
    
    // Save on form changes
    form.on('input change', this.debounce(() => {
      this.saveData();
    }, 1000));

    // Periodic save
    this.saveInterval = setInterval(() => {
      this.saveData();
    }, this.options.interval);
  }

  saveData() {
    const formData = this.serializeForm();
    localStorage.setItem(this.options.storageKey, JSON.stringify(formData));
  }

  restoreData(isRetry = false) {
    // Calculate elapsed time since page load for better debugging
    const elapsedTime = new Date() - this.loadTime;
    console.log(`⏱️ Starting data restoration process (${elapsedTime}ms after load, retry: ${isRetry})`);
    
    try {
      const saved = localStorage.getItem(this.options.storageKey);
      console.log('📋 Found saved data:', saved ? `Yes (length: ${saved.length})` : 'No');
      
      if (saved) {
        // Keep track of restored fields for verification later
        if (!this.restoredFields) {
          this.restoredFields = new Set();
        }
        
        const data = JSON.parse(saved);
        console.log('📦 Data structure:', Object.keys(data));
        this.populateForm(data, isRetry);
      }
    } catch (error) {
      console.warn('❌ Error restoring autosave data:', error);
      // Clear corrupted data
      localStorage.removeItem(this.options.storageKey);
    }
  }

  /**
   * Final verification pass to ensure Quill content was restored
   * Performs an emergency direct HTML update if needed
   */
  checkRestorationSuccess() {
    if (!this.restoredFields) return;
    
    try {
      const savedData = localStorage.getItem(this.options.storageKey);
      if (!savedData) return;
      
      const data = JSON.parse(savedData);
      
      // For each field we tried to restore, verify if content is visible
      this.restoredFields.forEach(fieldId => {
        const field = this.formHandler.getForm().find(`#${fieldId}`);
        if (!field.length) return;
        
        // Only check Quill editors since regular fields don't have visibility issues
        const isQuillField = 
          field.attr('data-quill') === 'true' || 
          field.closest('.quill-container, .quill-editor-container').length > 0 || 
          $(`#quill-${fieldId}`).length > 0;
        
        if (isQuillField && data[fieldId]) {
          // Get the editor content
          const editorSelector = `#quill-${fieldId} .ql-editor`;
          const editor = $(editorSelector);
          
          if (editor.length) {
            const content = editor.html();
            // Check if editor is empty or has minimal placeholder content
            const isEmpty = !content || 
                           content.trim() === '<p><br></p>' || 
                           content.trim() === '' || 
                           content.trim() === '<p></p>';
            
            if (isEmpty && data[fieldId]) {
              console.log(`🛠️ Emergency fix: Field ${fieldId} is empty but should have content`);
              
              // Direct content injection - most reliable emergency fix
              editor.html(data[fieldId]);
              
              // Force a visual refresh
              setTimeout(() => {
                editor.hide().show(0);
                console.log(`✨ Applied emergency content refresh for ${fieldId}`);
              }, 50);
            }
          }
        }
      });
    } catch (e) {
      console.warn('❌ Error in restoration check:', e);
    }
  }

  serializeForm() {
    try {
      const form = this.formHandler.getFormElement();
      if (!form) {
        console.warn('Form element not found for serialization');
        return {};
      }
      
      const formData = new FormData(form);
      const data = {};
      
      // Create section for file metadata (can't store file contents)
      data._fileMetadata = {};
      
      // First log all form fields for debugging
      console.log('🔍 Checking form fields for file inputs...');
      
      // Track all file inputs in the form
      const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));
      console.log(`📁 Found ${fileInputs.length} file input(s) in form`);
      
      // Log info about each file input
      fileInputs.forEach(input => {
        console.log(`📁 File input: name=${input.name}, id=${input.id}, files=${input.files?.length || 0}`);
        
        // Check if this input has files selected
        if (input.files && input.files.length > 0) {
          console.log(`✅ Input ${input.name} has ${input.files.length} file(s) selected`);
          
          const fileInfo = [];
          for (let i = 0; i < input.files.length; i++) {
            const file = input.files[i];
            fileInfo.push({
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified
            });
            console.log(`📄 File: ${file.name}, size: ${file.size} bytes`);
          }
          
          // Store metadata for this input
          data._fileMetadata[input.name] = fileInfo;
        }
      });
      
      // Now process all form fields normally
      for (let [key, value] of formData.entries()) {
        // Handle file inputs - we already processed them above
        const field = form.querySelector(`[name="${key}"]`);
        if (field && (field.type === 'file' || key.includes('files[') || key.startsWith('files'))) {
          console.log(`⏩ Skipping file field ${key} in form data`);
          continue; // Skip storing file in data object
        }
        
        // Skip CSRF tokens - they should not be restored as they become stale
        if (key === 'randcheck' || key.includes('csrf') || key.includes('token')) {
          continue;
        }
        
        data[key] = value;
      }
      return data;
    } catch (error) {
      console.error('Error serializing form:', error);
      return {};
    }
  }

  populateForm(data, isRetry = false) {
    try {
      const form = this.formHandler.getForm();
      if (!form || !form.length) {
        console.warn('Form not found for autosave population');
        return;
      }
      
      // First restore normal field values
      Object.keys(data).forEach(key => {
        // Skip the file metadata section - we'll handle it separately
        if (key === '_fileMetadata') return;
        
        try {
          const field = form.find(`[name="${key}"]`);
          if (field.length && field[0]) {
            // Check if the field is still in the DOM
            if (document.contains(field[0])) {
              // Skip file inputs - they cannot be programmatically set for security reasons
              if (field[0].type === 'file' || field.attr('type') === 'file') {
                console.log(`Skipping file input field: ${key}`);
                return;
              }
              
              // Skip file arrays (like files[])
              if (key.includes('files[') || key.startsWith('files')) {
                console.log(`Skipping file array field: ${key}`);
                return;
              }

              // Get field ID for tracking restoration
              const fieldId = field.attr('id');
              if (fieldId) {
                this.restoredFields.add(fieldId);
              }
              
              // Check if this is a Quill editor field with multiple detection methods
              const isQuillField = 
                field.closest('.quill-container, .quill-editor-container').length > 0 || 
                field.hasClass('quill-content') ||
                field.attr('data-quill') === 'true' ||
                field.siblings('.quill-editor-container').length > 0 ||
                $(`#quill-${field.attr('id')}`).length > 0;
              
              if (isQuillField) {
                console.log(`🔍 Detected Quill field: ${key} with ID: ${field.attr('id')}`);
                this.restoreQuillContent(field, data[key], isRetry);
              } else {
                // Standard fields
                field.val(data[key]);
                
                // Trigger change event for any listeners
                field.trigger('change');
              }
            }
          }
        } catch (error) {
          console.warn(`Error populating field ${key}:`, error);
        }
      });
      
      // Then handle file metadata if present - show indicators of previously selected files
      if (data._fileMetadata) {
        this.restoreFileMetadata(data._fileMetadata);
      }
    } catch (error) {
      console.error('Error populating form from autosave:', error);
    }
  }
  
  /**
   * Create visual indicators for previously selected files
   * File inputs can't be programmatically set, but we can show what was selected
   * @param {Object} fileMetadata - Metadata about previously selected files
   */
  restoreFileMetadata(fileMetadata) {
    try {
      const form = this.formHandler.getForm();
      
      console.log('📦 File metadata to restore:', fileMetadata);
      
      // Check if metadata is empty
      if (!fileMetadata || Object.keys(fileMetadata).length === 0) {
        console.log('ℹ️ No file metadata found to restore');
        return;
      }
      
      // Find all file inputs in the form
      const fileInputs = form.find('input[type="file"]');
      console.log(`📁 Found ${fileInputs.length} file input(s) in form for potential metadata restoration`);
      
      // Process each saved metadata entry
      Object.keys(fileMetadata).forEach(fieldName => {
        const files = fileMetadata[fieldName];
        if (!files || !files.length) {
          console.log(`⚠️ No files in metadata for field: ${fieldName}`);
          return;
        }
        
        console.log(`🔄 Restoring metadata for field: ${fieldName}, ${files.length} file(s)`);
        
        // Find the file input - try both by name and by ID
        let fileInput = form.find(`[name="${fieldName}"]`);
        if (!fileInput.length) {
          fileInput = form.find(`#${fieldName}`);
          console.log(`🔍 Trying to find file input by ID: ${fieldName}`);
        }
        
        if (!fileInput.length) {
          console.warn(`❌ Could not find file input for: ${fieldName}`);
          return;
        }
        
        // Get field container - try multiple possible parent containers
        let fieldContainer = fileInput.closest('.form-group, .custom-file, .file-upload-container, .file-input-container');
        
        // If no container found, try the parent element
        if (!fieldContainer.length) {
          fieldContainer = fileInput.parent();
          console.log(`ℹ️ Using parent element as container for: ${fieldName}`);
        }
        
        if (!fieldContainer.length) {
          console.warn(`❌ Could not find container for file input: ${fieldName}`);
          return;
        }
        
        // Create or find an area to show previous file selections
        let infoArea = fieldContainer.find('.autosave-file-info');
        if (!infoArea.length) {
          infoArea = $('<div class="autosave-file-info alert alert-info mt-2" role="alert" style="margin-top:10px;"></div>');
          fieldContainer.append(infoArea);
        }
        
        // Clear any existing content
        infoArea.empty();
        
        // Add header with icon (fallback to text if FontAwesome not available)
        infoArea.append('<h6><span class="fas fa-history" aria-hidden="true"></span> Previously selected files:</h6>');
        
        // Add file list
        const fileList = $('<ul class="mb-1"></ul>');
        files.forEach(file => {
          // Format file size with proper units
          let sizeStr;
          if (file.size < 1024) {
            sizeStr = `${file.size} bytes`;
          } else if (file.size < 1024 * 1024) {
            sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
          } else {
            sizeStr = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
          }
            
          // Add file with icon based on type if possible
          let icon = 'fas fa-file';
          if (file.type.includes('image')) icon = 'fas fa-file-image';
          else if (file.type.includes('pdf')) icon = 'fas fa-file-pdf';
          else if (file.type.includes('word')) icon = 'fas fa-file-word';
          else if (file.type.includes('excel') || file.type.includes('sheet')) icon = 'fas fa-file-excel';
          
          fileList.append(`<li><span class="${icon}" aria-hidden="true"></span> ${file.name} <span class="text-muted">(${sizeStr})</span></li>`);
        });
        
        infoArea.append(fileList);
        
        // Create a button to clear the saved file data if needed
        const clearButton = $('<button type="button" class="btn btn-sm btn-outline-secondary mt-2">Clear saved file info</button>');
        
        // Store reference to FormAutoSaveExtension instance and storageKey
        const storageKey = this.options.storageKey;
        
        clearButton.on('click', function() {
          // Show button is processing
          const originalText = clearButton.text();
          clearButton.prop('disabled', true).text('Clearing...');
          console.log(`🔄 Clear button clicked for field: ${fieldName}`);
          
          // Ensure we complete the operation regardless of errors
          // Using setTimeout to ensure the UI updates first
          setTimeout(() => {
            // Get current data and remove just this field's file metadata
            try {
              console.log(`🔍 Looking for data in localStorage with key: ${storageKey}`);
              const savedData = localStorage.getItem(storageKey);
              console.log(`📦 Found data: ${savedData ? 'yes' : 'no'}`);
              
              let cleared = false;
              
              if (savedData) {
                try {
                  const data = JSON.parse(savedData);
                  console.log(`🔍 Data structure:`, Object.keys(data));
                  
                  // Check if metadata exists for this field
                  const hasMetadata = data._fileMetadata && data._fileMetadata[fieldName];
                  console.log(`📁 Metadata for ${fieldName} exists: ${hasMetadata ? 'yes' : 'no'}`);
                  
                  if (hasMetadata) {
                    // Remove this field's metadata
                    delete data._fileMetadata[fieldName];
                    
                    // Save updated data back to localStorage
                    localStorage.setItem(storageKey, JSON.stringify(data));
                    console.log(`🗑️ Cleared saved file metadata for: ${fieldName}`);
                    cleared = true;
                  }
                } catch (parseError) {
                  console.warn('Error parsing saved data:', parseError);
                }
              }
              
              if (cleared) {
                console.log(`✅ Successfully cleared metadata for: ${fieldName}`);
                // Show success briefly before removing
                clearButton.removeClass('btn-outline-secondary').addClass('btn-success').text('Cleared!');
                
                // Remove the info area after a short delay
                setTimeout(() => {
                  infoArea.fadeOut(300, function() {
                    $(this).remove();
                  });
                }, 800);
              } else {
                // No metadata found for this field, but not an error
                console.log(`ℹ️ No saved file metadata found for: ${fieldName}`);
                clearButton.removeClass('btn-outline-secondary').addClass('btn-warning').text('Nothing to clear');
                
                // Reset button after a delay
                setTimeout(() => {
                  console.log(`🔄 Resetting button for: ${fieldName}`);
                  clearButton.removeClass('btn-warning').addClass('btn-outline-secondary').text(originalText).prop('disabled', false);
                }, 1500);
              }
            } catch (e) {
              // Show error and restore button
              console.warn('Error clearing file metadata:', e);
              clearButton.removeClass('btn-outline-secondary').addClass('btn-danger').text('Error!');
              setTimeout(() => {
                clearButton.removeClass('btn-danger').addClass('btn-outline-secondary').text(originalText).prop('disabled', false);
              }, 1500);
            }
          }, 10); // Small delay to ensure UI updates
        });
        infoArea.append(clearButton);
        
        // Add note
        infoArea.append('<p class="small mb-0 mt-2">Please select these files again if needed.</p>');
        
        console.log(`✅ Restored metadata for ${files.length} file(s) in field: ${fieldName}`);
      });
    } catch (error) {
      console.warn('❌ Error restoring file metadata:', error);
      console.error(error);
    }
  }
  
  /**
   * Restore content to a Quill editor
   * @param {jQuery} field - The hidden textarea or input field associated with the Quill editor
   * @param {string} content - The HTML content to restore
   * @param {boolean} isRetry - Whether this is a retry attempt
   */
  /**
   * Optimized method to restore content to Quill editors
   * Focus on what's proven to work based on testing
   * @param {jQuery} field - The hidden textarea or input field associated with the Quill editor
   * @param {string} content - The HTML content to restore
   * @param {boolean} isRetry - Whether this is a retry attempt
   */
  restoreQuillContent(field, content, isRetry = false) {
    try {
      if (!content) {
        console.log('No content to restore to Quill editor');
        return;
      }
      
      const fieldId = field.attr('id');
      console.log(`🔄 Restoring Quill content for field: ${fieldId}, content length: ${content.length}`);
      
      // Always set the value on the hidden input/textarea
      field.val(content);
      
      // Find the editor container - focus on fastest and most reliable method first
      let editorContainer = $(`#quill-${fieldId} .ql-editor`);
      
      if (!editorContainer.length) {
        // Try the next most reliable method
        editorContainer = field.closest('.form-group, .quill-container').find('.ql-editor');
      }
      
      if (editorContainer.length) {
        console.log(`📝 Found Quill editor container for ${fieldId}`);
        
        // The key optimizations that make content visible:
        
        // 1. First try the quillInstances registry (most reliable method)
        if (window.quillInstances && window.quillInstances[fieldId]) {
          console.log(`🔍 Setting content via quillInstances registry`);
          try {
            // Use dangerouslyPasteHTML for proper formatting
            window.quillInstances[fieldId].clipboard.dangerouslyPasteHTML(content);
            
            // CRITICAL: Also set root.innerHTML directly - this is the key to making content visible
            window.quillInstances[fieldId].root.innerHTML = content;
          } catch (e) {
            console.warn(`API error: ${e.message}`);
          }
        } 
        // 2. Fallback to legacy quill object
        else if (window.quill && window.quill[fieldId]) {
          console.log(`🔍 Setting content via legacy quill object`);
          try {
            window.quill[fieldId].clipboard.dangerouslyPasteHTML(content);
            window.quill[fieldId].root.innerHTML = content; 
          } catch (e) {
            console.warn(`API error: ${e.message}`);
          }
        }
        
        // 3. As a final fallback, set HTML directly
        // Even if the API methods worked, we'll do this to ensure content appears
        editorContainer.html(content);
        
        // 4. Force a visual refresh by hiding and showing
        setTimeout(() => {
          editorContainer.hide().show(0);
        }, 10);
        
        // 5. Trigger validation events
        field.trigger('change');
        
        console.log(`✅ Quill content restoration completed for ${fieldId}`);
        return true;
      } else {
        console.log(`⚠️ Editor container not found immediately for ${fieldId}`);
        
        // If this is the first attempt, schedule a retry
        if (!isRetry) {
          console.log(`⏱️ Scheduling retry after delay`);
          setTimeout(() => {
            this.restoreQuillContent(field, content, true);
          }, 1000);
        } 
        // Final emergency update for retry attempts
        else {
          setTimeout(() => {
            const quillDiv = $(`#quill-${fieldId}`);
            if (quillDiv.length) {
              const editorDiv = quillDiv.find('.ql-editor');
              if (editorDiv.length) {
                console.log(`🚨 Emergency direct update for ${fieldId}`);
                editorDiv.html(content);
                editorDiv.hide().show(0);
              }
            }
          }, 500);
        }
        return false;
      }
    } catch (error) {
      console.error('❌ Error restoring Quill editor content:', error);
      return false;
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Clear saved form data from localStorage
   */
  clearSavedData() {
    try {
      localStorage.removeItem(this.options.storageKey);
      console.log(`🧹 Cleared autosaved data for ${this.options.storageKey}`);
    } catch (error) {
      console.warn('Error clearing autosaved data:', error);
    }
  }

  // Cleanup
  destroy() {
    if (this.saveInterval) {
          clearInterval(this.saveInterval);
    }
    localStorage.removeItem(this.options.storageKey);
  }
}

// Register the extension (only if not already registered)
if (FormHandler && typeof FormHandler.registerExtension === 'function') {
  FormHandler.registerExtension('autoSave', FormAutoSaveExtension);
}
}
