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
    this.autosaveInProgress = false; // Flag to prevent file change listener during autosave
    this.restoredFiles = new Set(); // Track files that were restored from autosave (field names + file identifiers)
    this.init();
  }

  init() {
    // Save the load time to calculate elapsed time for debugging
    this.loadTime = new Date();
    
    // Flag to prevent immediate file metadata clearing after page load
    this.justLoaded = true;
    
    const setupAndRestore = () => {
      // Handle complex radio button names first
      this.handleComplexRadioNames();
      
      // Setup autosave immediately
      this.setupAutoSave();
      
      // First attempt - quick initial restoration (for standard fields)
      setTimeout(() => {
        Debug.debug('⚡ Initial attempt at restoring autosaved data');
        this.restoreData();
      }, 300); 
      
      // Second attempt - optimal timing for most Quill editors
      setTimeout(() => {
        Debug.debug('🔄 Second attempt for Quill editors');
        this.restoreData(true); // Force second attempt
      }, 1000);
      
      // Final verification to ensure content is visible
      setTimeout(() => {
        Debug.debug('✅ Verifying restoration success');
        this.checkRestorationSuccess();
      }, 2000);
      
      // Clear the "just loaded" flag after restoration is complete
      setTimeout(() => {
        this.justLoaded = false;
        Debug.debug('🔓 Autosave now fully active - file metadata changes will be tracked');
      }, 3000);
      
      // Setup form submission handler to clear localStorage on successful submit
      this.setupSubmitHandler();
    };
    
    // Setup autosave functionality immediately if form is ready
    if (this.formHandler.getForm && this.formHandler.getForm().length) {
      setupAndRestore();
    } else {
      // Wait a bit if form isn't ready yet
      setTimeout(setupAndRestore, 100);
    }
  }
  
  /**
   * Handle complex radio button names (with array notation) by adding data attributes
   * This ensures radio buttons with names like "values_attribute[3][value][]" can be properly autosaved
   */
  handleComplexRadioNames() {
    try {
      const form = this.formHandler.getForm();
      if (!form || !form.length) {
        Debug.warn('Form not found for handling complex radio names');
        return;
      }

      // Find all radio buttons with complex array notation names
      const radioButtons = form.find('input[type="radio"]');
      radioButtons.each((index, radio) => {
        const $radio = $(radio);
        const name = $radio.attr('name');
        
        // Check if this radio button has a complex array notation name
        if (name && (name.includes('[') || name.includes(']'))) {
          // Check if it already has a data-autosave-key attribute
          if (!$radio.attr('data-autosave-key')) {
            // Generate a safe key for autosave purposes
            const autosaveKey = `radio_${name.replace(/[\[\]]/g, '_')}`;
            $radio.attr('data-autosave-key', autosaveKey);
            Debug.debug(`📻 Added autosave key "${autosaveKey}" to radio button with complex name: ${name}`);
          }
        }
      });
    } catch (error) {
      Debug.warn('Error handling complex radio names:', error);
    }
  }
  
  /**
   * Setup handler to clear autosave data after successful form submission
   */
  setupSubmitHandler() {
    // Register a hook in the form handler to execute after successful submission
    if (this.formHandler.addHook) {
      Debug.debug('🔄 Registering afterSuccess hook to clear autosaved data on form submission');
      this.formHandler.addHook('afterSuccess', (data) => {
        // Check if submission was successful
        if (data && data.status === "saved") {
          Debug.debug('✅ Form submitted successfully, clearing autosaved data');
          this.clearSavedData();
          return true; // Continue with other hooks
        }
        return true;
      });
    }
  }

  /**
   * Debounce utility function to limit how often a function can be called
   * @param {Function} func - The function to debounce
   * @param {number} wait - The number of milliseconds to delay
   * @returns {Function} - The debounced function
   */
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

  setupAutoSave() {
    const form = this.formHandler.getForm();
    
    // Save on form changes (general)
    form.on('input change', this.debounce(() => {
      this.saveData();
    }, 1000));

    // Immediate save for file inputs (no debounce needed)
    // But exclude file inputs that have the FileUploadExtension handling them
    form.on('change', 'input[type="file"]', (e) => {
      const $target = $(e.target);
      
      // Check if this file input is being handled by FileUploadExtension
      if ($target.data('file-upload-extension')) {
        Debug.debug(`📁 File input ${e.target.name} is handled by FileUploadExtension, skipping autosave`);
        return;
      }
      
      Debug.debug(`📁 File input changed, saving immediately: ${e.target.name}`);
      
      // Mark that this file input was actively changed by user
      $target.data('user-changed', true);
      
      this.saveData();
    });

    // Periodic save
    this.saveInterval = setInterval(() => {
      this.saveData();
    }, this.options.interval);
  }

  saveData() {
    const formData = this.serializeForm();
    
    // Log file metadata being saved
    if (formData._fileMetadata && Object.keys(formData._fileMetadata).length > 0) {
      Debug.debug('💾 Saving file metadata:', formData._fileMetadata);
    } else if (this.justLoaded) {
      Debug.debug('⏸️ Skipping file metadata update - page just loaded');
    }
    
    // Debug radio buttons specifically since they can be problematic
    const radioValues = Object.keys(formData).filter(key => {
      // Include both standard radio buttons and our custom-mapped ones
      const isRegularRadio = this.formHandler.getForm().find(`[name="${key}"]`).filter(function() {
        return this.type === 'radio';
      }).length > 0;
      
      const isComplexRadio = key.startsWith('radio_') || 
                            this.formHandler.getForm().find(`[data-autosave-key="${key}"][type="radio"]`).length > 0;
      
      return isRegularRadio || isComplexRadio;
    });
    
    if (radioValues.length > 0) {
      Debug.debug('📻 Saving radio button values:', radioValues.reduce((obj, key) => {
        obj[key] = formData[key];
        return obj;
      }, {}));
      
      // Log any radio mappings for debugging
      if (formData._radioMappings) {
        Debug.debug('🔄 Radio name mappings:', formData._radioMappings);
      }
    }
    
    // Debug checkboxes with complex names
    const checkboxValues = Object.keys(formData).filter(key => {
      // Include both standard checkboxes and our custom-mapped ones
      const isRegularCheckbox = this.formHandler.getForm().find(`[name="${key}"]`).filter(function() {
        return this.type === 'checkbox';
      }).length > 0;
      
      const isComplexCheckbox = key.startsWith('checkbox_') || 
                               this.formHandler.getForm().find(`[data-autosave-key="${key}"][type="checkbox"]`).length > 0;
      
      return isRegularCheckbox || isComplexCheckbox;
    });
    
    if (checkboxValues.length > 0) {
      Debug.debug('☑️ Saving checkbox values:', checkboxValues.reduce((obj, key) => {
        obj[key] = formData[key];
        return obj;
      }, {}));
      
      // Log any checkbox mappings for debugging
      if (formData._checkboxMappings) {
        Debug.debug('🔄 Checkbox name mappings:', formData._checkboxMappings);
      }
    }
    
    localStorage.setItem(this.options.storageKey, JSON.stringify(formData));
    Debug.debug(`💾 Saved form data to localStorage key: ${this.options.storageKey}`);
  }

  restoreData(isRetry = false) {
    // Calculate elapsed time since page load for better debugging
    const elapsedTime = new Date() - this.loadTime;
    Debug.debug(`⏱️ Starting data restoration process (${elapsedTime}ms after load, retry: ${isRetry})`);
    
    try {
      const saved = localStorage.getItem(this.options.storageKey);
      Debug.debug('📋 Found saved data:', saved ? `Yes (length: ${saved.length})` : 'No');
      
      if (saved) {
        // Keep track of restored fields for verification later
        if (!this.restoredFields) {
          this.restoredFields = new Set();
        }
        
        const data = JSON.parse(saved);
        Debug.debug('📦 Data structure:', Object.keys(data));
        
        // Always attempt to populate the form
        this.populateForm(data, isRetry);
        
        // Force file metadata restoration if present, even if no other fields
        if (data._fileMetadata && Object.keys(data._fileMetadata).length > 0) {
          Debug.debug('📁 Ensuring file metadata is restored...');
          setTimeout(() => {
            // Check if file info areas exist, if not restore them
            const existingFileInfos = $('.autosave-file-info');
            if (existingFileInfos.length === 0) {
              Debug.debug('🔄 File metadata not found in DOM, restoring...');
              this.restoreFileMetadata(data._fileMetadata);
            } else {
              Debug.debug('✅ File metadata already in DOM');
            }
          }, 100);
        }
      }
    } catch (error) {
      Debug.warn('❌ Error restoring autosave data:', error);
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
      
      // Check if we have file metadata that needs to be restored
      if (data._fileMetadata && Object.keys(data._fileMetadata).length > 0) {
        Debug.debug('🔄 Checking file metadata restoration...');
        
        // Check if file metadata was already restored
        const existingFileInfos = $('.autosave-file-info');
        if (existingFileInfos.length === 0) {
          Debug.debug('⚠️ File metadata not restored yet, forcing restoration...');
          this.restoreFileMetadata(data._fileMetadata);
        } else {
          Debug.debug('✅ File metadata appears to be already restored');
        }
      }
      
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
              Debug.debug(`🛠️ Emergency fix: Field ${fieldId} is empty but should have content`);
              
              // Direct content injection - most reliable emergency fix
              editor.html(data[fieldId]);
              
              // Force a visual refresh
              setTimeout(() => {
                editor.hide().show(0);
                Debug.debug(`✨ Applied emergency content refresh for ${fieldId}`);
              }, 50);
            }
          }
        }
      });
    } catch (e) {
      Debug.warn('❌ Error in restoration check:', e);
    }
  }

  /**
   * Get files from the FileUploadExtension's upload queue for a specific field
   * This captures files that were added via drag-and-drop but are stored in the extension's queue
   * @param {Object} fileUploadExtension - The FileUploadExtension instance
   * @param {string} metadataKey - The metadata key for the field
   * @returns {Array} Array of File objects from the upload queue
   */
  getFilesFromUploadQueue(fileUploadExtension, metadataKey) {
    try {
      if (!fileUploadExtension || !this.formHandler.getForm) {
        Debug.debug(`⚠️ FileUploadExtension not available for ${metadataKey}`);
        return [];
      }

      const form = this.formHandler.getForm();
      const queueFiles = [];

      // Find all file items in the upload queue that are not deleted or already done
      const fileItems = form.find('.file-item:not(.deleted)');
      Debug.debug(`📁 Found ${fileItems.length} file item(s) in upload queue for ${metadataKey}`);

      fileItems.each((index, item) => {
        const $item = $(item);
        const uploadData = $item.data('uploadData');

        if (uploadData && uploadData.files && uploadData.files.length > 0) {
          // Extract File objects from the uploadData
          Array.from(uploadData.files).forEach(file => {
            // Validate the file using the same logic as native file inputs
            let isValid = true;
            
            if (fileUploadExtension && typeof fileUploadExtension.validateFile === 'function') {
              isValid = fileUploadExtension.validateFile(file);
              Debug.debug(`🔍 Queue file ${file.name} validation result: ${isValid ? 'PASSED' : 'FAILED'}`);
            } else {
              // Fallback: basic validation if FileUploadExtension validation is not available
              isValid = this.basicFileValidation(file, null);
              Debug.debug(`🔍 Queue file ${file.name} basic validation result: ${isValid ? 'PASSED' : 'FAILED'}`);
            }

            if (isValid) {
              queueFiles.push(file);
              Debug.debug(`✅ Added queue file to metadata: ${file.name} (${file.size} bytes)`);
            } else {
              Debug.debug(`❌ Excluded invalid queue file: ${file.name} (${file.size} bytes)`);
            }
          });
        }
      });

      Debug.debug(`📋 Extracted ${queueFiles.length} valid file(s) from upload queue for ${metadataKey}`);
      return queueFiles;

    } catch (error) {
      Debug.warn(`❌ Error extracting files from upload queue for ${metadataKey}:`, error);
      return [];
    }
  }

  serializeForm() {
    // Set flag to prevent file change listeners from triggering during autosave
    this.autosaveInProgress = true;
    
    try {
      const form = this.formHandler.getFormElement();
      if (!form) {
        Debug.warn('Form element not found for serialization');
        return {};
      }
      
      const formData = new FormData(form);
      const data = {};
      
      // Create sections for metadata
      data._fileMetadata = {};
      data._checkboxMappings = {};
      
      // First log all form fields for debugging
      Debug.debug('🔍 Checking form fields for file inputs...');
      
      // Track all file inputs in the form
      const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));
      Debug.debug(`📁 Found ${fileInputs.length} file input(s) in form`);
      
      // Get the FileUploadExtension to use its validation logic and upload queue
      const fileUploadExtension = this.formHandler.getExtension ? this.formHandler.getExtension('fileUpload') : null;
      
      // Log info about each file input
      fileInputs.forEach(input => {
        Debug.debug(`📁 File input: name=${input.name}, id=${input.id}, files=${input.files?.length || 0}`);

        const metadataKey = input.name || input.id || `file_input_${fileInputs.indexOf(input)}`;
        const $input = $(input);
        const userChanged = $input.data('user-changed');

        // Collect files from both native file input AND upload queue
        const allFiles = [];
        const seenFiles = new Set(); // Track files by name+size to avoid duplicates

        // First, add files from native file input
        if (input.files && input.files.length > 0) {
          Debug.debug(`✅ Input ${input.name} has ${input.files.length} file(s) selected from native input`);
          Array.from(input.files).forEach(file => {
            const fileKey = `${file.name}:${file.size}`;
            if (!seenFiles.has(fileKey)) {
              allFiles.push(file);
              seenFiles.add(fileKey);
            } else {
              Debug.debug(`⚠️ Skipping duplicate native file: ${file.name} (${file.size} bytes)`);
            }
          });
        }

        // Then, add files from the FileUploadExtension's upload queue (avoiding duplicates)
        if (fileUploadExtension) {
          const queueFiles = this.getFilesFromUploadQueue(fileUploadExtension, metadataKey);
          if (queueFiles.length > 0) {
            Debug.debug(`✅ Found ${queueFiles.length} additional file(s) in upload queue for ${input.name}`);
            queueFiles.forEach(file => {
              const fileKey = `${file.name}:${file.size}`;
              if (!seenFiles.has(fileKey)) {
                allFiles.push(file);
                seenFiles.add(fileKey);
              } else {
                Debug.debug(`⚠️ Skipping duplicate queue file: ${file.name} (${file.size} bytes)`);
              }
            });
          }
        }

        // Merge with original autosave files if info area exists and not all original files have been reselected/validated
        let originalFiles = [];
        let originalFilesMap = new Map();
        const formJQ = this.formHandler.getForm ? this.formHandler.getForm() : null;
        if (formJQ && formJQ.length) {
          const escapedKey = metadataKey.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
          const fileInputJQ = formJQ.find(`[name="${escapedKey}"]`);
          const fieldContainer = fileInputJQ.closest('.form-group, .custom-file, .file-upload-container, .file-input-container');
          const infoArea = fieldContainer.find('.autosave-file-info');
          if (infoArea.length) {
            const originalFilesData = infoArea.data('original-files');
            if (originalFilesData) {
              try {
                originalFiles = JSON.parse(originalFilesData);
                originalFiles.forEach(f => originalFilesMap.set(`${f.name}:${f.size}`, f));
              } catch (e) {
                Debug.warn('Could not parse original files from info area data attribute:', e);
              }
            }
          }
        }

        // Track which original files have been reselected and validated
        const reselectedKeys = new Set();
        const newFiles = [];

        allFiles.forEach(file => {
          const key = `${file.name}:${file.size}`;
          if (originalFilesMap.has(key)) {
            // This is a reselected file
            reselectedKeys.add(key);
          } else {
            // This is a new file
            newFiles.push(file);
          }
        });

        // Build the new metadata: keep all original files except those reselected, and add new files
        let mergedFiles = [];
        originalFiles.forEach(f => {
          const key = `${f.name}:${f.size}`;
          if (!reselectedKeys.has(key)) {
            mergedFiles.push(f);
            Debug.debug(`🔄 Preserving original autosave file in metadata: ${f.name} (${f.size} bytes)`);
          } else {
            Debug.debug(`🗑️ Removing reselected original file from metadata: ${f.name} (${f.size} bytes)`);
          }
        });
        mergedFiles = mergedFiles.concat(newFiles);

        if (mergedFiles.length > 0) {
          Debug.debug(`📋 Processing ${mergedFiles.length} unique file(s) for ${metadataKey} (originals not yet reselected + new)`);
          const fileInfo = [];
          for (let i = 0; i < mergedFiles.length; i++) {
            const file = mergedFiles[i];
            let isValid = true;
            if (fileUploadExtension && typeof fileUploadExtension.validateFile === 'function') {
              isValid = fileUploadExtension.validateFile(file);
              Debug.debug(`🔍 Queue file ${file.name} validation result: ${isValid ? 'PASSED' : 'FAILED'}`);
            } else {
              isValid = this.basicFileValidation(file, input);
              Debug.debug(`🔍 File ${file.name} basic validation result: ${isValid ? 'PASSED' : 'FAILED'}`);
            }
            if (isValid) {
              fileInfo.push({ name: file.name, size: file.size, type: file.type });
              Debug.debug(`✅ File: ${file.name}, size: ${file.size} bytes - VALID, added to metadata`);
            } else {
              Debug.debug(`❌ File: ${file.name}, size: ${file.size} bytes - INVALID, not added to metadata`);
            }
          }
          if (fileInfo.length > 0) {
            data._fileMetadata[metadataKey] = fileInfo;
            Debug.debug(`💾 Stored file metadata under key: ${metadataKey} (${fileInfo.length} valid files out of ${mergedFiles.length} unique files)`);
          } else {
            Debug.debug(`⚠️ No valid files found for ${metadataKey}, not storing metadata`);
          }
        } else {
          // If no files are selected, only clear metadata if user actively changed the input
          // OR if we're past the initial load period
          if (userChanged || !this.justLoaded) {
            Debug.debug(`🗑️ File input ${metadataKey} cleared by user or post-load`);
            // Don't store anything - let existing metadata be preserved
          } else {
            // Page just loaded and input is empty - preserve existing metadata
            try {
              const existingSaved = localStorage.getItem(this.options.storageKey);
              if (existingSaved) {
                const existingData = JSON.parse(existingSaved);
                if (existingData._fileMetadata && existingData._fileMetadata[metadataKey]) {
                  Debug.debug(`📋 Preserving existing file metadata for ${metadataKey} (page just loaded)`);
                  data._fileMetadata[metadataKey] = existingData._fileMetadata[metadataKey];
                }
              }
            } catch (e) {
              Debug.warn('Error preserving existing file metadata:', e);
            }
          }
        }
      });
      
      // Special handling for checkboxes with complex names
      const checkboxes = Array.from(form.querySelectorAll('input[type="checkbox"]'));
      const complexCheckboxes = checkboxes.filter(checkbox => 
        checkbox.name.includes('[') || checkbox.hasAttribute('data-autosave-key')
      );
      
      if (complexCheckboxes.length > 0) {
        Debug.debug(`☑️ Processing ${complexCheckboxes.length} checkboxes with complex names`);
        
        // Process each checkbox
        complexCheckboxes.forEach(checkbox => {
          // Get the safe key (either from data attribute or generate one)
          const autosaveKey = checkbox.getAttribute('data-autosave-key') || 
                             `checkbox_${checkbox.name.replace(/[\[\]]/g, '_')}`;
          
          // Store the checked state
          data[autosaveKey] = checkbox.checked ? checkbox.value || "1" : "";
          
          // Store the mapping for restoration
          data._checkboxMappings[autosaveKey] = checkbox.name;
          
          Debug.debug(`☑️ Checkbox ${checkbox.name} (${autosaveKey}) is ${checkbox.checked ? 'checked' : 'unchecked'}`);
        });
      }
      
      // Special handling for radio buttons
      // First collect all radio buttons by name
      const radioButtons = Array.from(form.querySelectorAll('input[type="radio"]'));
      const radioGroups = {};
      
      // Group radio buttons by name
      radioButtons.forEach(radio => {
        const name = radio.name;
        if (!radioGroups[name]) {
          radioGroups[name] = [];
        }
        radioGroups[name].push(radio);
      });
      
      // For each radio group, find the checked button and store its value
      Object.keys(radioGroups).forEach(name => {
        const checkedRadio = radioGroups[name].find(radio => radio.checked);
        if (checkedRadio) {
          // Check if this has a data-autosave-key (for complex array names)
          const autosaveKey = checkedRadio.getAttribute('data-autosave-key');
          const keyToUse = autosaveKey || name;
          
          Debug.debug(`📻 Radio button group ${name} has value: ${checkedRadio.value}${
            autosaveKey ? ` (using autosave key: ${autosaveKey})` : ''}`);
          
          data[keyToUse] = checkedRadio.value;
          
          // For array notation radio buttons, store both the original name and the safe key
          if (autosaveKey && autosaveKey !== name) {
            data._radioMappings = data._radioMappings || {};
            data._radioMappings[autosaveKey] = name;
          }
        }
      });
      
      // Now process all other form fields normally
      for (let [key, value] of formData.entries()) {
        // Skip radio buttons - we already processed them above
        if (radioGroups[key]) {
          continue;
        }
        
        // Skip complex checkboxes - we already processed them above
        const isComplexCheckbox = Array.from(complexCheckboxes).some(cb => cb.name === key);
        if (isComplexCheckbox) {
          continue;
        }
        
        // Handle file inputs - we already processed them above
        const field = form.querySelector(`[name="${key}"]`);
        if (field && (field.type === 'file' || key.includes('files[') || key.startsWith('files'))) {
          Debug.debug(`⏩ Skipping file field ${key} in form data (already processed in metadata)`);
          continue; // Skip storing file in data object
        }
        
        // Skip CSRF tokens - they should not be restored as they become stale
        if (key === 'randcheck' || key.includes('csrf') || key.includes('token')) {
          continue;
        }
        
        data[key] = value;
      }
      
      // Clear the autosave flag before returning
      this.autosaveInProgress = false;
      return data;
    } catch (error) {
      Debug.error('Error serializing form:', error);
      // Clear the autosave flag on error too
      this.autosaveInProgress = false;
      return {};
    }
  }

  populateForm(data, isRetry = false) {
    try {
      const form = this.formHandler.getForm();
      if (!form || !form.length) {
        Debug.warn('Form not found for autosave population');
        return;
      }
      
      // First restore normal field values
      Object.keys(data).forEach(key => {
        // Skip the metadata sections - we'll handle them separately
        if (key === '_fileMetadata' || key === '_radioMappings' || key === '_checkboxMappings') return;
        
        try {
          // Try multiple methods to find the field
          let field = form.find(`[name="${key}"]`);
          
          // If not found and it's a mapped radio name, look for the original named field
          if (!field.length && data._radioMappings && data._radioMappings[key]) {
            const originalName = data._radioMappings[key];
            field = form.find(`[name="${originalName}"]`);
            Debug.debug(`🔍 Using mapped name ${originalName} for key: ${key}`);
          }
          
          // If not found and it's a mapped checkbox name, look for the original named field
          if (!field.length && data._checkboxMappings && data._checkboxMappings[key]) {
            const originalName = data._checkboxMappings[key];
            field = form.find(`[name="${originalName}"]`);
            Debug.debug(`🔍 Using mapped checkbox name ${originalName} for key: ${key}`);
          }
          
          // Try finding by data attribute
          if (!field.length) {
            field = form.find(`[data-autosave-key="${key}"]`);
          }
          
          // Try finding by ID as last resort
          if (!field.length) {
            field = form.find(`#${key}`);
          }
          
          if (field.length && field[0]) {
            // Check if the field is still in the DOM
            if (document.contains(field[0])) {
              // Skip file inputs - they cannot be programmatically set for security reasons
              if (field[0].type === 'file' || field.attr('type') === 'file') {
                Debug.debug(`Skipping file input field: ${key}`);
                return;
              }
              
              // Skip file arrays (like files[])
              if (key.includes('files[') || key.startsWith('files')) {
                Debug.debug(`Skipping file array field: ${key}`);
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
                Debug.debug(`🔍 Detected Quill field: ${key} with ID: ${field.attr('id')}`);
                this.restoreQuillContent(field, data[key], isRetry);
              } else if (field[0].type === 'radio') {
                // Special handling for radio buttons
                Debug.debug(`📻 Restoring radio button: ${key} with value: ${data[key]}`);
                
                let radioName = key;
                
                // Check if this is a mapped radio button with array notation
                if (data._radioMappings && data._radioMappings[key]) {
                  radioName = data._radioMappings[key];
                  Debug.debug(`📻 Using mapped radio name: ${radioName} for key: ${key}`);
                } 
                // Or check if radios have data-autosave-key attribute
                else {
                  const radioWithDataKey = form.find(`input[data-autosave-key="${key}"]`);
                  if (radioWithDataKey.length) {
                    radioName = radioWithDataKey.attr('name');
                    Debug.debug(`📻 Found radio with data-autosave-key: ${key}, using name: ${radioName}`);
                  }
                }
                
                // Find the radio button with matching value
                const radioToCheck = form.find(`input[name="${radioName}"][value="${data[key]}"]`);
                if (radioToCheck.length) {
                  radioToCheck.prop('checked', true);
                  // Trigger change event for any listeners including custom handlers
                  radioToCheck.trigger('change');
                  
                  // If field has an onchange attribute, execute that function
                  const onChangeAttr = radioToCheck.attr('onchange');
                  if (onChangeAttr) {
                    try {
                      // Use setTimeout to ensure the radio is checked before calling handler
                      setTimeout(() => {
                        Debug.debug(`🔄 Executing onchange handler for radio: ${key}`);
                        const handler = new Function(`return ${onChangeAttr}`);
                        handler.call(radioToCheck[0]);
                      }, 10);
                    } catch (e) {
                      Debug.warn(`⚠️ Failed to execute onchange handler for ${key}:`, e);
                    }
                  }
                }
              } else if (field[0].type === 'checkbox') {
                // Special handling for checkboxes
                Debug.debug(`☑️ Restoring checkbox: ${key} with value: ${data[key]}`);
                
                let checkboxName = key;
                
                // Check if this is a mapped checkbox with array notation
                if (data._checkboxMappings && data._checkboxMappings[key]) {
                  checkboxName = data._checkboxMappings[key];
                  Debug.debug(`☑️ Using mapped checkbox name: ${checkboxName} for key: ${key}`);
                }
                
                // Handle both simple and array notation checkboxes
                if (key.startsWith('checkbox_') || field.attr('data-autosave-key')) {
                  // For complex checkboxes, set checked based on value presence
                  const isChecked = data[key] && data[key] !== "";
                  Debug.debug(`☑️ Setting complex checkbox ${checkboxName} to ${isChecked ? 'checked' : 'unchecked'}`);
                  field.prop('checked', isChecked);
                } else {
                  // Regular checkbox handling
                  const isChecked = data[key] === field.val() || 
                                    data[key] === "1" || 
                                    data[key] === "true" || 
                                    data[key] === true;
                  field.prop('checked', isChecked);
                }
                
                // Trigger change event for any listeners
                field.trigger('change');
                
                // If field has an onchange attribute, execute that function
                const onChangeAttr = field.attr('onchange');
                if (onChangeAttr) {
                  try {
                    // Use setTimeout to ensure the checkbox is set before calling handler
                    setTimeout(() => {
                      Debug.debug(`🔄 Executing onchange handler for checkbox: ${key}`);
                      const handler = new Function(`return ${onChangeAttr}`);
                      handler.call(field[0]);
                    }, 10);
                  } catch (e) {
                    Debug.warn(`⚠️ Failed to execute onchange handler for ${key}:`, e);
                  }
                }
              } else {
                // Standard fields
                field.val(data[key]);
                
                // Trigger change event for any listeners
                field.trigger('change');
              }
            }
          }
        } catch (error) {
          Debug.warn(`Error populating field ${key}:`, error);
        }
      });
      
      // Then handle file metadata if present - show indicators of previously selected files
      if (data._fileMetadata) {
        this.restoreFileMetadata(data._fileMetadata);
      }
    } catch (error) {
      Debug.error('Error populating form from autosave:', error);
    }
  }
  
  /**
   * Restore content to a Quill editor
   * @param {jQuery} field - The field element
   * @param {string} content - The content to restore
   * @param {boolean} isRetry - Whether this is a retry attempt
   */
  restoreQuillContent(field, content, isRetry = false) {
    try {
      const fieldId = field.attr('id');
      if (!fieldId) {
        Debug.warn('Field ID not found for Quill restoration');
        return;
      }
      
      Debug.debug(`📝 Attempting to restore Quill content for field: ${fieldId}`);
      
      // Try multiple methods to find the Quill editor instance
      let quillInstance = null;
      
      // Method 1: Check if Quill is attached to the field element
      if (field[0].quill) {
        quillInstance = field[0].quill;
        Debug.debug('✅ Found Quill instance on field element');
      }
      
      // Method 2: Look for global Quill instances
      if (!quillInstance && window.Quill && window.Quill.instances) {
        quillInstance = window.Quill.instances.find(q => 
          q.container && (
            q.container.id === `quill-${fieldId}` ||
            q.container.parentElement === field[0]
          )
        );
        if (quillInstance) {
          Debug.debug('✅ Found Quill instance in global instances');
        }
      }
      
      // Method 3: Try to find by quill container selector
      if (!quillInstance) {
        const quillContainer = $(`#quill-${fieldId}, .quill-${fieldId}`);
        if (quillContainer.length && quillContainer[0].quill) {
          quillInstance = quillContainer[0].quill;
          Debug.debug('✅ Found Quill instance on container element');
        }
      }
      
      // If we found a Quill instance, set the content
      if (quillInstance) {
        // Set the HTML content
        quillInstance.root.innerHTML = content;
        
        // Also set the hidden field value
        field.val(content);
        
        Debug.debug(`✅ Restored Quill content for ${fieldId}`);
      } else {
        Debug.warn(`❌ Could not find Quill instance for field: ${fieldId}`);
        
        // Fallback: set the field value directly
        field.val(content);
        
        // Also try to set content in any editor container
        const editorContainer = $(`#quill-${fieldId} .ql-editor`);
        if (editorContainer.length) {
          editorContainer.html(content);
          Debug.debug(`📝 Set content directly in editor container for ${fieldId}`);
        }
      }
    } catch (error) {
      Debug.warn(`Error restoring Quill content:`, error);
      
      // Fallback: just set the field value
      try {
        field.val(content);
      } catch (fallbackError) {
        Debug.warn('Fallback field.val() also failed:', fallbackError);
      }
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
      
      Debug.debug('📦 File metadata to restore:', fileMetadata);
      
      // Check if metadata is empty
      if (!fileMetadata || Object.keys(fileMetadata).length === 0) {
        Debug.debug('ℹ️ No file metadata found to restore');
        return;
      }
      
      // Find all file inputs in the form
      const fileInputs = form.find('input[type="file"]');
      Debug.debug(`📁 Found ${fileInputs.length} file input(s) in form for potential metadata restoration`);
      
      // Process each saved metadata entry
      Object.keys(fileMetadata).forEach(fieldName => {
        const files = fileMetadata[fieldName];
        if (!files || !files.length) {
          Debug.debug(`⚠️ No files in metadata for field: ${fieldName}`);
          return;
        }
        
        Debug.debug(`🔄 Restoring metadata for field: ${fieldName}, ${files.length} file(s)`);
        
        // Find the file input - try multiple approaches for array notation
        // Escape square brackets in field names for CSS selectors
        const escapedFieldName = fieldName.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
        let fileInput = form.find(`[name="${escapedFieldName}"]`);
        
        // If not found by exact name, try finding by ID
        if (!fileInput.length) {
          fileInput = form.find(`#${escapedFieldName}`);
          Debug.debug(`🔍 Trying to find file input by ID: ${fieldName}`);
        }
        
        // If still not found, try to match against all file inputs
        if (!fileInput.length) {
          const allFileInputs = form.find('input[type="file"]');
          allFileInputs.each(function() {
            const input = $(this);
            const inputName = input.attr('name') || input.attr('id') || '';
            
            // Check if this could be the matching input
            if (inputName === fieldName || 
                inputName.replace(/\[\]/g, '') === fieldName.replace(/\[\]/g, '') ||
                input.attr('id') === fieldName) {
              fileInput = input;
              Debug.debug(`🎯 Found matching file input: ${inputName} for key: ${fieldName}`);
              return false; // Break the each loop
            }
          });
        }
        
        if (!fileInput.length) {
          Debug.warn(`❌ Could not find file input for: ${fieldName}`);
          return;
        }
        
        // Get field container - try multiple possible parent containers
        let fieldContainer = fileInput.closest('.form-group, .custom-file, .file-upload-container, .file-input-container');
        
        // If no container found, try the parent element
        if (!fieldContainer.length) {
          fieldContainer = fileInput.parent();
          Debug.debug(`ℹ️ Using parent element as container for: ${fieldName}`);
        }
        
        if (!fieldContainer.length) {
          Debug.warn(`❌ Could not find container for file input: ${fieldName}`);
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
        infoArea.append(`<h6><span class="fas fa-history" aria-hidden="true"></span> ${this.getTranslation('autosave.previously_selected_files', 'Previously selected files:')}</h6>`);
        
        // Add file list
        const fileList = $('<ul class="mb-1"></ul>');
        files.forEach(file => {
          // Track this file as being restored from autosave
          const fileId = `${fieldName}:${file.name}:${file.size}`;
          this.restoredFiles.add(fileId);
          Debug.debug(`📋 Tracking restored file: ${fileId}`);
          
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

        // Store the original list of files as a data attribute on the info area
        infoArea.data('original-files', JSON.stringify(files));

        infoArea.append(fileList);
        
        // Set up file change listener to automatically remove matched files from the list
        this.setupFileChangeListener(fileInput, fieldName, infoArea);
        
        // Add note
        infoArea.append(`<p class="small mb-0 mt-2">${this.getTranslation('autosave.files_auto_remove_info', 'Files will be automatically removed from this list when you select them again.')}</p>`);
        
        Debug.debug(`✅ Restored metadata for ${files.length} file(s) in field: ${fieldName}`);
      });
    } catch (error) {
      Debug.warn('❌ Error restoring file metadata:', error);
      Debug.error(error);
    }
  }
  
  /**
   * Set up file change listener to automatically remove matched files from the previously selected list
   * @param {jQuery} fileInput - The file input element
   * @param {string} fieldName - The name of the field
   * @param {jQuery} infoArea - The info area containing the previously selected files list
   */
  setupFileChangeListener(fileInput, fieldName, infoArea) {
    const storageKey = this.options.storageKey;
    Debug.debug(`🔧 Setting up file change listener for field: ${fieldName}`);
    if (fileInput.data('autosave-listener-attached')) {
      Debug.debug(`⚠️ Autosave listener already attached to ${fieldName}, skipping`);
      return;
    }
    fileInput.data('autosave-listener-attached', true);
    fileInput.on('change.autosave', () => {
      Debug.debug(`📁 Autosave file input changed for field: ${fieldName}`);
      if (this.autosaveInProgress) {
        Debug.debug(`⏸️ Autosave in progress, skipping file change processing for ${fieldName}`);
        return;
      }
      // Always use the original list of previously saved files from the info area data attribute
      let originalFiles = [];
      try {
        const originalFilesData = infoArea.data('original-files');
        if (originalFilesData) {
          originalFiles = JSON.parse(originalFilesData);
        }
      } catch (e) {
        Debug.warn('Could not parse original files from info area data attribute:', e);
      }
      setTimeout(() => {
        const selectedFiles = Array.from(fileInput[0].files || []);
        if (selectedFiles.length === 0) {
          Debug.debug(`ℹ️ No files selected for ${fieldName}, not modifying previously selected list`);
          return;
        }
        Debug.debug(`📁 User selected ${selectedFiles.length} new file(s) for ${fieldName}:`);
        selectedFiles.forEach((file, index) => {
          Debug.debug(`  ${index + 1}. ${file.name} (${file.size} bytes)`);
        });
        try {
          if (originalFiles.length === 0) {
            Debug.debug(`ℹ️ No original previously saved file metadata found for field: ${fieldName}`);
            return;
          }
          const savedFiles = originalFiles;
          Debug.debug(`📦 Found ${savedFiles.length} original previously saved files for ${fieldName}:`);
          savedFiles.forEach((file, index) => {
            Debug.debug(`  ${index + 1}. ${file.name} (${file.size} bytes)`);
          });
          let removedFiles = [];
          let remainingFiles = [];
          let matchedFilesCount = 0;
          const fileUploadExtension = this.formHandler.getExtension ? this.formHandler.getExtension('fileUpload') : null;
          // Only remove files that are present in both the original list and the current selection
          savedFiles.forEach(savedFile => {
            const matchingNewFile = selectedFiles.find(newFile =>
              newFile.name === savedFile.name &&
              newFile.size === savedFile.size
            );
            if (matchingNewFile) {
              let isValid = true;
              if (fileUploadExtension && typeof fileUploadExtension.validateFile === 'function') {
                isValid = fileUploadExtension.validateFile(matchingNewFile);
                Debug.debug(`🔍 Reselected file ${matchingNewFile.name} validation result: ${isValid ? 'PASSED' : 'FAILED'}`);
              } else {
                isValid = this.basicFileValidation(matchingNewFile, fileInput[0]);
                Debug.debug(`🔍 Reselected file ${matchingNewFile.name} basic validation result: ${isValid ? 'PASSED' : 'FAILED'}`);
              }
              if (isValid) {
                removedFiles.push(savedFile);
                matchedFilesCount++;
                const fileId = `${fieldName}:${savedFile.name}:${savedFile.size}`;
                this.restoredFiles.delete(fileId);
                Debug.debug(`🗑️ Removing previously selected file (valid reselection): ${savedFile.name}`);
                Debug.debug(`📋 Removed from restored files tracking: ${fileId}`);
              } else {
                remainingFiles.push(savedFile);
                Debug.debug(`📋 Keeping file in list (reselected but failed validation): ${savedFile.name}`);
              }
            } else {
              // File was not reselected, keep in the previously selected list
              remainingFiles.push(savedFile);
              Debug.debug(`📋 Keeping file in list (not reselected in current file input): ${savedFile.name}`);
            }
          });
          Debug.debug(`📊 Result: ${removedFiles.length} files to remove, ${remainingFiles.length} files to keep`);
          // Only remove the info area if ALL files have been removed (remainingFiles.length === 0)
          if (removedFiles.length > 0) {
            // Do not update localStorage here, only update the info area
            if (remainingFiles.length > 0) {
              // Some files remain, update the display to show only remaining files
              // Check if info area still exists before updating
              if (infoArea.length && infoArea.is(':visible')) {
                this.updateFileMetadataDisplay(infoArea, fieldName, remainingFiles);
                Debug.debug(`✅ Removed ${removedFiles.length} re-selected file(s), ${remainingFiles.length} remaining`);
              } else {
                Debug.debug(`⚠️ Info area no longer exists or is not visible, skipping update`);
              }
            } else {
              // No files remain, remove the entire info area
              if (infoArea.length && infoArea.is(':visible')) {
                infoArea.fadeOut(300, function() {
                  $(this).remove();
                });
                Debug.debug(`✅ All previously selected files have been re-selected and validated, removing info area`);
              } else {
                Debug.debug(`ℹ️ Info area already removed or not visible`);
              }
            }
          } else {
            // No valid matching files found to remove from the list (no reselected files passed validation)
            // Do not update the info area, just leave it as is
            Debug.debug(`ℹ️ No valid matching files found to remove from the list (no reselected files passed validation)`);
          }
        } catch (error) {
          Debug.warn('❌ Error updating file metadata on file change:', error);
          Debug.error(error);
        }
      }, 100); // Small delay to let other extensions process first
    });
  }
  
  /**
   * Update the display of file metadata by only removing <li> elements for files that have been reselected and validated
   * @param {jQuery} infoArea - The info area to update
   * @param {string} fieldName - The name of the field
   * @param {Array} remainingFiles - The files that should remain in the list
   */
  updateFileMetadataDisplay(infoArea, fieldName, remainingFiles) {
    try {
      Debug.debug(`📝 updateFileMetadataDisplay called with ${remainingFiles.length} remaining files for field: ${fieldName}`);
      remainingFiles.forEach((file, index) => {
        Debug.debug(`  ${index + 1}. Remaining: ${file.name} (${file.size} bytes)`);
      });
      
      const fileList = infoArea.find('ul');
      if (fileList.length === 0) {
        Debug.warn('File list not found in info area');
        return;
      }
      
      const initialLiCount = fileList.find('li').length;
      Debug.debug(`📋 Found ${initialLiCount} <li> elements in the list before update`);
      
      // For each <li>, check if its file is still in the remaining files. If not, remove it.
      fileList.find('li').each((_, li) => {
        const $li = $(li);
        // Extract file name and size from the <li> text
        const text = $li.text();
        const match = text.match(/([^\(]+)\s*\((\d+(?:\.\d+)?\s*(?:bytes|KB|MB))\)/i);
        if (!match) {
          Debug.debug(`⚠️ Could not parse file info from <li> text: "${text}"`);
          return;
        }
        const fileName = match[1].trim();
        let fileSize = null;
        const sizeText = match[2].toLowerCase();
        
        if (sizeText.includes('bytes')) {
          fileSize = parseInt(parseFloat(sizeText));
        } else if (sizeText.includes('kb')) {
          fileSize = Math.round(parseFloat(sizeText) * 1024);
        } else if (sizeText.includes('mb')) {
          fileSize = Math.round(parseFloat(sizeText) * 1024 * 1024);
        }
        
        Debug.debug(`📋 Parsed from <li>: "${fileName}" → ${fileSize} bytes (from "${sizeText}")`);
        
        // If this file is NOT in the remaining files, remove the <li>
        const stillPresent = remainingFiles.some(f => {
          const sizeMatch = Math.abs(f.size - fileSize) < 100; // Increased tolerance for rounding differences
          const nameMatch = f.name === fileName;
          Debug.debug(`🔍 Comparing with remaining file "${f.name}" (${f.size} bytes): name=${nameMatch}, size=${sizeMatch} (diff=${Math.abs(f.size - fileSize)})`);
          return nameMatch && sizeMatch;
        });
        Debug.debug(`🔍 Checking <li>: "${fileName}" (${fileSize} bytes) - Still present: ${stillPresent}`);
        if (!stillPresent) {
          Debug.debug(`🗑️ Removing <li> for: ${fileName}`);
          $li.fadeOut(200, function() { $(this).remove(); });
        }
      });
      // If no <li> remain, remove the info area (but only if we expected all to be removed)
      setTimeout(() => {
        const remainingLiCount = fileList.find('li').length;
        Debug.debug(`📊 After update: ${remainingLiCount} <li> elements remain, expected ${remainingFiles.length} files`);
        // Only remove if there are truly no remaining files AND no remaining <li> elements
        // AND the info area still exists (hasn't been removed by other logic)
        if (remainingLiCount === 0 && remainingFiles.length === 0 && infoArea.is(':visible')) {
          Debug.debug(`🗑️ No files remain in list and info area is still visible, removing info area`);
          infoArea.fadeOut(300, function() { $(this).remove(); });
        } else if (remainingLiCount > 0 || remainingFiles.length > 0) {
          Debug.debug(`📋 Keeping info area: ${remainingLiCount} <li> elements, ${remainingFiles.length} expected files`);
        }
      }, 250);
      Debug.debug(`📝 Updated file list display with ${remainingFiles.length} remaining file(s)`);
    } catch (error) {
      Debug.warn('Error updating file metadata display:', error);
    }
  }

  clearSavedData() {
    Debug.debug('🗑️ Clearing autosaved data from localStorage');
    localStorage.removeItem(this.options.storageKey);
  }

  /**
   * Get a translation from the preloaded translations object
   * @param {string} key - The translation key (e.g., 'autosave.previously_selected_files')
   * @param {string} fallback - Fallback text if translation is not found
   * @returns {string} The translated text or fallback
   */
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

  /**
   * Handle file addition via drag-and-drop or other non-input means
   * This triggers the same file list reduction logic as the file input change event
   * @param {File} file - The file that was added
   * @param {string} fieldName - The name of the field (optional, will try to detect)
   */
  handleFileAdded(file, fieldName = null) {
    Debug.debug(`🎯 FormAutoSaveExtension.handleFileAdded called with file: ${file ? file.name : 'null'} (${file ? file.size : 'null'} bytes)`);
    Debug.debug(`📋 Field name provided: ${fieldName || 'null'}`);
    
    try {
      if (!file) {
        Debug.warn('❌ No file provided to handleFileAdded');
        return;
      }

      Debug.debug(`📁 FormAutoSaveExtension: Processing added file: ${file.name} (${file.size} bytes)`);
      
      // If no field name provided, try to find the appropriate file input
      if (!fieldName) {
        const form = this.formHandler.getForm();
        const fileInputs = form.find('input[type="file"]');
        
        Debug.debug(`🔍 Found ${fileInputs.length} file input(s) in form`);
        
        if (fileInputs.length === 1) {
          // If there's only one file input, use its name
          fieldName = fileInputs.first().attr('name') || fileInputs.first().attr('id') || 'fileupload';
          Debug.debug(`🎯 Auto-detected field name: ${fieldName}`);
        } else if (fileInputs.length > 1) {
          // Try to find file input with files or most recently used
          let foundInput = null;
          fileInputs.each(function() {
            const input = $(this);
            const inputName = input.attr('name') || input.attr('id');
            Debug.debug(`📋 Checking file input: ${inputName}, files: ${input[0].files?.length || 0}`);
            
            // Prefer inputs that have files or were recently changed
            if (input[0].files && input[0].files.length > 0) {
              foundInput = inputName;
              Debug.debug(`🎯 Found file input with files: ${inputName}`);
              return false; // Break the loop
            }
          });
          
          if (foundInput) {
            fieldName = foundInput;
          } else {
            // Use the first file input as default
            fieldName = fileInputs.first().attr('name') || fileInputs.first().attr('id') || 'fileupload';
            Debug.debug(`🔄 Using first file input as default: ${fieldName}`);
          }
        } else {
          // Default fallback
          fieldName = 'fileupload';
          Debug.debug(`🔄 Using default field name: ${fieldName}`);
        }
      }
      
      Debug.debug(`📝 Final field name to use: ${fieldName}`);
      
      // Find the file input and info area for this field
      const form = this.formHandler.getForm();
      const escapedFieldName = fieldName.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
      let fileInput = form.find(`[name="${escapedFieldName}"], #${escapedFieldName}`);
      
      Debug.debug(`🔍 Looking for file input with name/id: ${fieldName} (escaped: ${escapedFieldName})`);
      Debug.debug(`📋 Found file input by name/id: ${fileInput.length > 0 ? 'YES' : 'NO'}`);
      
      if (!fileInput.length) {
        Debug.debug(`🔍 File input not found by name, searching all file inputs...`);
        const allFileInputs = form.find('input[type="file"]');
        allFileInputs.each(function() {
          const input = $(this);
          const inputName = input.attr('name') || input.attr('id');
          Debug.debug(`📋 Checking input: ${inputName} against fieldName: ${fieldName}`);
          if (inputName && (inputName === fieldName || input.attr('id') === fieldName)) {
            fileInput = input;
            Debug.debug(`🎯 Found matching file input: ${inputName} for key: ${fieldName}`);
            return false; // Break the each loop
          }
        });
      }
      
      Debug.debug(`📋 Final check - file input found: ${fileInput.length > 0 ? 'YES' : 'NO'}`);
      if (!fileInput.length) {
        Debug.warn(`❌ Could not find file input for field: ${fieldName}`);
        return;
      }
      
      // Get field container
      let fieldContainer = fileInput.closest('.form-group, .custom-file, .file-upload-container, .file-input-container');
      if (!fieldContainer.length) {
        fieldContainer = fileInput.parent();
      }
      
      Debug.debug(`📦 Field container found: ${fieldContainer.length > 0 ? 'YES' : 'NO'}`);
      if (!fieldContainer.length) {
        Debug.warn(`❌ Could not find container for file input: ${fieldName}`);
        return;
      }
      
      // Find the info area
      const infoArea = fieldContainer.find('.autosave-file-info');
      Debug.debug(`📋 Info area (.autosave-file-info) found: ${infoArea.length > 0 ? 'YES' : 'NO'}`);
      if (!infoArea.length) {
        Debug.debug(`ℹ️ No info area found for field: ${fieldName} - no previously selected files to process`);
        return;
      }
      
      Debug.debug(`✅ All prerequisites met, calling processFilesAgainstPreviouslySelected for drag-and-drop`);
      // Use the unified processing method
      this.processFilesAgainstPreviouslySelected(file, fieldName, infoArea, 'drag-and-drop');
      
    } catch (error) {
      Debug.warn('❌ Error handling added file for autosave:', error);
      Debug.error(error);
    }
  }

  /**
   * Process file(s) against the previously selected files list to remove matches
   * This is the unified method used by both file-select and drag-and-drop scenarios
   * @param {Array|File} files - Array of files or single file to process
   * @param {string} fieldName - The name of the field
   * @param {jQuery} infoArea - The info area containing the previously selected files list
   * @param {string} source - Source of the operation ('file-select' or 'drag-and-drop')
   */
  processFilesAgainstPreviouslySelected(files, fieldName, infoArea, source = 'unknown') {
    try {
      Debug.debug(`🔄 Processing files against previously selected list for ${fieldName} (source: ${source})`);
      
      // Normalize files to array
      const filesToProcess = Array.isArray(files) ? files : [files];
      
      if (filesToProcess.length === 0) {
        Debug.debug(`ℹ️ No files to process for ${fieldName}`);
        return;
      }
      
      // Get original files from the info area
      let originalFiles = [];
      try {
        const originalFilesData = infoArea.data('original-files');
        if (originalFilesData) {
          originalFiles = JSON.parse(originalFilesData);
        }
      } catch (e) {
        Debug.warn('Could not parse original files from info area data attribute:', e);
        return;
      }
      
      if (originalFiles.length === 0) {
        Debug.debug(`ℹ️ No original previously saved files found for field: ${fieldName}`);
        return;
      }
      
      Debug.debug(`📦 Found ${originalFiles.length} original previously saved files for ${fieldName}`);
      Debug.debug(`📁 Processing ${filesToProcess.length} file(s):`);
      filesToProcess.forEach((file, index) => {
        Debug.debug(`  ${index + 1}. ${file.name} (${file.size} bytes)`);
      });
      
      const fileUploadExtension = this.formHandler.getExtension ? this.formHandler.getExtension('fileUpload') : null;
      const form = this.formHandler.getForm();
      const escapedFieldName = fieldName.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
      const fileInput = form.find(`[name="${escapedFieldName}"], #${escapedFieldName}`).first();
      
      let removedFiles = [];
      let remainingFiles = [];
      
      // Process each file in the previously selected list
      originalFiles.forEach(savedFile => {
        const matchingNewFile = filesToProcess.find(newFile =>
          newFile.name === savedFile.name &&
          newFile.size === savedFile.size
        );
        
        if (matchingNewFile) {
          // File was re-selected/re-added - validate it
          let isValid = true;
          if (fileUploadExtension && typeof fileUploadExtension.validateFile === 'function') {
            isValid = fileUploadExtension.validateFile(matchingNewFile);
            Debug.debug(`🔍 File ${matchingNewFile.name} validation result: ${isValid ? 'PASSED' : 'FAILED'}`);
          } else {
            isValid = this.basicFileValidation(matchingNewFile, fileInput[0]);
            Debug.debug(`🔍 File ${matchingNewFile.name} basic validation result: ${isValid ? 'PASSED' : 'FAILED'}`);
          }
          
          if (isValid) {
            // Valid file - remove from previously selected list
            removedFiles.push(savedFile);
            const fileId = `${fieldName}:${savedFile.name}:${savedFile.size}`;
            this.restoredFiles.delete(fileId);
            Debug.debug(`🗑️ Removing previously selected file (valid re-addition): ${savedFile.name}`);
            Debug.debug(`📋 Removed from restored files tracking: ${fileId}`);
          } else {
            // Invalid file - keep in previously selected list
            remainingFiles.push(savedFile);
            Debug.debug(`📋 Keeping file in list (re-added but failed validation): ${savedFile.name}`);
          }
        } else {
          // File was not re-selected/re-added - keep in previously selected list
          remainingFiles.push(savedFile);
          Debug.debug(`📋 Keeping file in list (not re-added): ${savedFile.name}`);
        }
      });
      
      Debug.debug(`📊 Result: ${removedFiles.length} files to remove, ${remainingFiles.length} files to keep`);
      
      // Update the display if any files were removed
      if (removedFiles.length > 0) {
        if (remainingFiles.length > 0) {
          // Some files remain - update the display
          if (infoArea.length && infoArea.is(':visible')) {
            this.updateFileMetadataDisplay(infoArea, fieldName, remainingFiles);
            // Update the data attribute with remaining files
            infoArea.data('original-files', JSON.stringify(remainingFiles));
            Debug.debug(`✅ Removed ${removedFiles.length} file(s) via ${source}, ${remainingFiles.length} remaining`);
          } else {
            Debug.debug(`⚠️ Info area no longer exists or is not visible, skipping update`);
          }
        } else {
          // No files remain - remove the entire info area
          if (infoArea.length && infoArea.is(':visible')) {
            infoArea.fadeOut(300, function() {
              $(this).remove();
            });
            Debug.debug(`✅ All previously selected files have been re-added via ${source}, removing info area`);
          } else {
            Debug.debug(`ℹ️ Info area already removed or not visible`);
          }
        }
      } else {
        Debug.debug(`ℹ️ No matching files found to remove from the list (no valid re-additions)`);
      }
      
    } catch (error) {
      Debug.warn(`❌ Error processing files against previously selected list (${source}):`, error);
      Debug.error(error);
    }
  }

  /**
   * Basic file validation fallback when FileUploadExtension is not available
   * @param {File} file - The file to validate
   * @param {HTMLInputElement} input - The file input element
   * @returns {boolean} - Whether the file is valid
   */
  basicFileValidation(file, input) {
    // Check if file is empty
    if (file.size === 0) {
      Debug.warn(`FormAutoSaveExtension: File ${file.name} is empty (0 bytes)`);
      return false;
    }
    
    // Check if file is suspiciously small (less than 10 bytes)
    if (file.size < 10) {
      Debug.warn(`FormAutoSaveExtension: File ${file.name} is very small (${file.size} bytes)`);
      return false;
    }
    
    // Check for basic file size limit (default 15MB if not specified)
    const maxSizeMB = 15;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      Debug.warn(`FormAutoSaveExtension: File ${file.name} is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB > ${maxSizeMB}MB)`);
      return false;
    }
    
    // Check if file has an extension
    const fileName = file.name.toLowerCase();
    const hasExtension = fileName.includes('.') && fileName.split('.').pop() !== fileName;
    if (!hasExtension) {
      Debug.warn(`FormAutoSaveExtension: File ${file.name} has no file extension`);
      return false;
    }
    
    // Check for dangerous extensions
    const fileExt = fileName.split('.').pop();
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'ps1'];
    if (dangerousExtensions.includes(fileExt)) {
      Debug.warn(`FormAutoSaveExtension: File ${file.name} has dangerous extension (.${fileExt})`);
      return false;
    }
    
    // If we get here, the file passes basic validation
    Debug.debug(`FormAutoSaveExtension: File ${file.name} passed basic validation`);
    return true;
  }

  // Cleanup
  destroy() {
    if (this.saveInterval) {
          clearInterval(this.saveInterval);
    }
    localStorage.removeItem(this.options.storageKey);
  }
  
  /**
   * Remove a specific file from the autosave metadata immediately
   * Called by FileUploadExtension when a file is deleted via the UI
   * @param {Object} deletedFile - The file object that was deleted
   */
  removeFileFromMetadata(deletedFile) {
    try {
      Debug.debug(`🗑️ FormAutoSaveExtension: Removing file from metadata: ${deletedFile.name} (${deletedFile.size} bytes)`);
      
      const savedData = localStorage.getItem(this.options.storageKey);
      if (!savedData) {
        Debug.debug('⚠️ No autosave data found in localStorage');
        return;
      }
      
      const data = JSON.parse(savedData);
      if (!data._fileMetadata) {
        Debug.debug('⚠️ No file metadata found in autosave data');
        return;
      }
      
      let filesRemoved = 0;
      let fieldsUpdated = [];
      
      Debug.debug(`🔍 Checking ${Object.keys(data._fileMetadata).length} metadata field(s) for file to remove`);
      
      // Check all file metadata fields for this file
      Object.keys(data._fileMetadata).forEach(fieldName => {
        const files = data._fileMetadata[fieldName];
        if (!Array.isArray(files)) return;
        
        Debug.debug(`📁 Field ${fieldName} has ${files.length} file(s) before removal:`);
        files.forEach((file, index) => {
          Debug.debug(`  ${index + 1}. ${file.name} (${file.size} bytes)`);
        });
        
        // Find and remove the deleted file from this field's metadata
        const originalLength = files.length;
        data._fileMetadata[fieldName] = files.filter(file => {
          // Match by name and size for accuracy
          const isMatch = file.name === deletedFile.name && file.size === deletedFile.size;
          if (isMatch) {
            // Check if this file was originally restored from autosave
            const fileId = `${fieldName}:${file.name}:${file.size}`;
            const wasRestored = this.restoredFiles.has(fileId);
            
            Debug.debug(`🎯 Found matching file in field ${fieldName}: ${file.name} (${file.size} bytes)`);
            Debug.debug(`📋 File was restored from autosave: ${wasRestored}`);
            
            if (wasRestored) {
              // This file was from the "Previously selected files" list, so remove it
              Debug.debug(`✅ Removing restored file from metadata: ${file.name}`);
              this.restoredFiles.delete(fileId); // Also clean up tracking
              filesRemoved++;
              return false; // Remove from metadata
            } else {
              // This file was newly selected in current session, don't remove from metadata
              Debug.debug(`⚠️ File was newly selected (not restored), keeping in metadata: ${file.name}`);
              return true; // Keep in metadata
            }
          }
          return true; // Keep other files
        });
        
        Debug.debug(`📁 Field ${fieldName} has ${data._fileMetadata[fieldName].length} file(s) after removal`);
        
        // Check if this field was affected
        if (data._fileMetadata[fieldName].length !== originalLength) {
          fieldsUpdated.push(fieldName);
          
          // If no files remain in this field, remove the field entirely
          if (data._fileMetadata[fieldName].length === 0) {
            delete data._fileMetadata[fieldName];
            Debug.debug(`🧹 Removed empty metadata field: ${fieldName}`);
            
            // Also remove the visual display
            this.removeFileMetadataDisplay(fieldName);
          } else {
            Debug.debug(`✅ ${data._fileMetadata[fieldName].length} file(s) remain in field ${fieldName}, updating display`);
            // Update the visual display with remaining files
            this.updateExistingFileMetadataDisplay(fieldName, data._fileMetadata[fieldName]);
          }
        } else {
          Debug.debug(`ℹ️ Field ${fieldName} was not affected by removal`);
        }
      });
      
      // Save the updated data back to localStorage
      localStorage.setItem(this.options.storageKey, JSON.stringify(data));
      
      Debug.debug(`✅ Removed ${filesRemoved} instance(s) of file "${deletedFile.name}" from ${fieldsUpdated.length} field(s): ${fieldsUpdated.join(', ')}`);
      
    } catch (error) {
      Debug.error('❌ Error removing file from autosave metadata:', error);
    }
  }

  /**
   * Remove the file metadata display for a specific field
   * @param {string} fieldName - The name of the field
   */
  removeFileMetadataDisplay(fieldName) {
    try {
      const form = this.formHandler.getForm();
      // Escape square brackets in field names for CSS selectors
      const escapedFieldName = fieldName.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
      const fileInput = form.find(`[name="${escapedFieldName}"], #${escapedFieldName}`);
      
      if (fileInput.length) {
        const fieldContainer = fileInput.closest('.form-group, .custom-file, .file-upload-container, .file-input-container');
        const infoArea = fieldContainer.find('.autosave-file-info');
        
        if (infoArea.length) {
          infoArea.fadeOut(300, function() {
            $(this).remove();
            Debug.debug(`🗑️ Removed file metadata display for field: ${fieldName}`);
          });
        }
      }
    } catch (error) {
      Debug.warn('Error removing file metadata display:', error);
    }
  }

  /**
   * Update the existing file metadata display with remaining files
   * @param {string} fieldName - The name of the field
   * @param {Array} remainingFiles - The remaining files to display
   */
  updateExistingFileMetadataDisplay(fieldName, remainingFiles) {
    try {
      const form = this.formHandler.getForm();
      // Escape square brackets in field names for CSS selectors
      const escapedFieldName = fieldName.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
      const fileInput = form.find(`[name="${escapedFieldName}"], #${escapedFieldName}`);
      
      if (fileInput.length) {
        const fieldContainer = fileInput.closest('.form-group, .custom-file, .file-upload-container, .file-input-container');
        const infoArea = fieldContainer.find('.autosave-file-info');
        
        if (infoArea.length && remainingFiles.length > 0) {
          this.updateFileMetadataDisplay(infoArea, fieldName, remainingFiles);
          Debug.debug(`🔄 Updated file metadata display for field: ${fieldName} with ${remainingFiles.length} remaining file(s)`);
        } else if (infoArea.length && remainingFiles.length === 0) {
          // If no files remain, remove the display and clean up tracking
          remainingFiles.forEach(file => {
            const fileId = `${fieldName}:${file.name}:${file.size}`;
            this.restoredFiles.delete(fileId);
          });
          infoArea.fadeOut(300, function() {
            $(this).remove();
          });
          Debug.debug(`🗑️ Removed empty file metadata display for field: ${fieldName}`);
        }
      }
    } catch (error) {
      Debug.warn('Error updating existing file metadata display:', error);
    }
  }

  /**
   * Basic file validation fallback when FileUploadExtension is not available
   * @param {File} file - The file to validate
   * @param {HTMLInputElement} input - The file input element
   * @returns {boolean} - Whether the file is valid
   */
  basicFileValidation(file, input) {
    // Check if file is empty
    if (file.size === 0) {
      Debug.warn(`FormAutoSaveExtension: File ${file.name} is empty (0 bytes)`);
      return false;
    }
    
    // Check if file is suspiciously small (less than 10 bytes)
    if (file.size < 10) {
      Debug.warn(`FormAutoSaveExtension: File ${file.name} is very small (${file.size} bytes)`);
      return false;
    }
    
    // Check for basic file size limit (default 15MB if not specified)
    const maxSizeMB = 15;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      Debug.warn(`FormAutoSaveExtension: File ${file.name} is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB > ${maxSizeMB}MB)`);
      return false;
    }
    
    // Check if file has an extension
    const fileName = file.name.toLowerCase();
    const hasExtension = fileName.includes('.') && fileName.split('.').pop() !== fileName;
    if (!hasExtension) {
      Debug.warn(`FormAutoSaveExtension: File ${file.name} has no file extension`);
      return false;
    }
    
    // Check for dangerous extensions
    const fileExt = fileName.split('.').pop();
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar', 'ps1'];
    if (dangerousExtensions.includes(fileExt)) {
      Debug.warn(`FormAutoSaveExtension: File ${file.name} has dangerous extension (.${fileExt})`);
      return false;
    }
    
    // If we get here, the file passes basic validation
    Debug.debug(`FormAutoSaveExtension: File ${file.name} passed basic validation`);
    return true;
  }

  // ...existing code...
}

// Register the extension (only if not already registered)
if (FormHandler && typeof FormHandler.registerExtension === 'function') {
  FormHandler.registerExtension('autoSave', FormAutoSaveExtension);
}
}
