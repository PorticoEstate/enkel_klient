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
    
    // Flag to prevent immediate file metadata clearing after page load
    this.justLoaded = true;
    
    const setupAndRestore = () => {
      // Handle complex radio button names first
      this.handleComplexRadioNames();
      
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
      
      // Clear the "just loaded" flag after restoration is complete
      setTimeout(() => {
        this.justLoaded = false;
        console.log('🔓 Autosave now fully active - file metadata changes will be tracked');
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
        console.warn('Form not found for handling complex radio names');
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
            console.log(`📻 Added autosave key "${autosaveKey}" to radio button with complex name: ${name}`);
          }
        }
      });
    } catch (error) {
      console.warn('Error handling complex radio names:', error);
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
        console.log(`📁 File input ${e.target.name} is handled by FileUploadExtension, skipping autosave`);
        return;
      }
      
      console.log(`📁 File input changed, saving immediately: ${e.target.name}`);
      
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
      console.log('💾 Saving file metadata:', formData._fileMetadata);
    } else if (this.justLoaded) {
      console.log('⏸️ Skipping file metadata update - page just loaded');
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
      console.log('📻 Saving radio button values:', radioValues.reduce((obj, key) => {
        obj[key] = formData[key];
        return obj;
      }, {}));
      
      // Log any radio mappings for debugging
      if (formData._radioMappings) {
        console.log('🔄 Radio name mappings:', formData._radioMappings);
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
      console.log('☑️ Saving checkbox values:', checkboxValues.reduce((obj, key) => {
        obj[key] = formData[key];
        return obj;
      }, {}));
      
      // Log any checkbox mappings for debugging
      if (formData._checkboxMappings) {
        console.log('🔄 Checkbox name mappings:', formData._checkboxMappings);
      }
    }
    
    localStorage.setItem(this.options.storageKey, JSON.stringify(formData));
    console.log(`💾 Saved form data to localStorage key: ${this.options.storageKey}`);
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
        
        // Always attempt to populate the form
        this.populateForm(data, isRetry);
        
        // Force file metadata restoration if present, even if no other fields
        if (data._fileMetadata && Object.keys(data._fileMetadata).length > 0) {
          console.log('📁 Ensuring file metadata is restored...');
          setTimeout(() => {
            // Check if file info areas exist, if not restore them
            const existingFileInfos = $('.autosave-file-info');
            if (existingFileInfos.length === 0) {
              console.log('🔄 File metadata not found in DOM, restoring...');
              this.restoreFileMetadata(data._fileMetadata);
            } else {
              console.log('✅ File metadata already in DOM');
            }
          }, 100);
        }
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
      
      // Check if we have file metadata that needs to be restored
      if (data._fileMetadata && Object.keys(data._fileMetadata).length > 0) {
        console.log('🔄 Checking file metadata restoration...');
        
        // Check if file metadata was already restored
        const existingFileInfos = $('.autosave-file-info');
        if (existingFileInfos.length === 0) {
          console.log('⚠️ File metadata not restored yet, forcing restoration...');
          this.restoreFileMetadata(data._fileMetadata);
        } else {
          console.log('✅ File metadata appears to be already restored');
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
      
      // Create sections for metadata
      data._fileMetadata = {};
      data._checkboxMappings = {};
      
      // First log all form fields for debugging
      console.log('🔍 Checking form fields for file inputs...');
      
      // Track all file inputs in the form
      const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));
      console.log(`📁 Found ${fileInputs.length} file input(s) in form`);
      
      // Log info about each file input
      fileInputs.forEach(input => {
        console.log(`📁 File input: name=${input.name}, id=${input.id}, files=${input.files?.length || 0}`);
        
        const metadataKey = input.name || input.id || `file_input_${fileInputs.indexOf(input)}`;
        const $input = $(input);
        const userChanged = $input.data('user-changed');
        
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
          
          // Store metadata for this input - use a clean key for array notation
          data._fileMetadata[metadataKey] = fileInfo;
          console.log(`💾 Stored file metadata under key: ${metadataKey}`);
        } else {
          // If no files are selected, only clear metadata if user actively changed the input
          // OR if we're past the initial load period
          if (userChanged || !this.justLoaded) {
            // User intentionally cleared the files or enough time has passed
            console.log(`🗑️ File input ${metadataKey} cleared by user or post-load`);
            // Don't store anything - let existing metadata be preserved
          } else {
            // Page just loaded and input is empty - preserve existing metadata
            try {
              const existingSaved = localStorage.getItem(this.options.storageKey);
              if (existingSaved) {
                const existingData = JSON.parse(existingSaved);
                if (existingData._fileMetadata && existingData._fileMetadata[metadataKey]) {
                  console.log(`📋 Preserving existing file metadata for ${metadataKey} (page just loaded)`);
                  data._fileMetadata[metadataKey] = existingData._fileMetadata[metadataKey];
                }
              }
            } catch (e) {
              console.warn('Error preserving existing file metadata:', e);
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
        console.log(`☑️ Processing ${complexCheckboxes.length} checkboxes with complex names`);
        
        // Process each checkbox
        complexCheckboxes.forEach(checkbox => {
          // Get the safe key (either from data attribute or generate one)
          const autosaveKey = checkbox.getAttribute('data-autosave-key') || 
                             `checkbox_${checkbox.name.replace(/[\[\]]/g, '_')}`;
          
          // Store the checked state
          data[autosaveKey] = checkbox.checked ? checkbox.value || "1" : "";
          
          // Store the mapping for restoration
          data._checkboxMappings[autosaveKey] = checkbox.name;
          
          console.log(`☑️ Checkbox ${checkbox.name} (${autosaveKey}) is ${checkbox.checked ? 'checked' : 'unchecked'}`);
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
          
          console.log(`📻 Radio button group ${name} has value: ${checkedRadio.value}${
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
          console.log(`⏩ Skipping file field ${key} in form data (already processed in metadata)`);
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
        // Skip the metadata sections - we'll handle them separately
        if (key === '_fileMetadata' || key === '_radioMappings' || key === '_checkboxMappings') return;
        
        try {
          // Try multiple methods to find the field
          let field = form.find(`[name="${key}"]`);
          
          // If not found and it's a mapped radio name, look for the original named field
          if (!field.length && data._radioMappings && data._radioMappings[key]) {
            const originalName = data._radioMappings[key];
            field = form.find(`[name="${originalName}"]`);
            console.log(`🔍 Using mapped name ${originalName} for key: ${key}`);
          }
          
          // If not found and it's a mapped checkbox name, look for the original named field
          if (!field.length && data._checkboxMappings && data._checkboxMappings[key]) {
            const originalName = data._checkboxMappings[key];
            field = form.find(`[name="${originalName}"]`);
            console.log(`🔍 Using mapped checkbox name ${originalName} for key: ${key}`);
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
              } else if (field[0].type === 'radio') {
                // Special handling for radio buttons
                console.log(`📻 Restoring radio button: ${key} with value: ${data[key]}`);
                
                let radioName = key;
                
                // Check if this is a mapped radio button with array notation
                if (data._radioMappings && data._radioMappings[key]) {
                  radioName = data._radioMappings[key];
                  console.log(`📻 Using mapped radio name: ${radioName} for key: ${key}`);
                } 
                // Or check if radios have data-autosave-key attribute
                else {
                  const radioWithDataKey = form.find(`input[data-autosave-key="${key}"]`);
                  if (radioWithDataKey.length) {
                    radioName = radioWithDataKey.attr('name');
                    console.log(`📻 Found radio with data-autosave-key: ${key}, using name: ${radioName}`);
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
                        console.log(`🔄 Executing onchange handler for radio: ${key}`);
                        const handler = new Function(`return ${onChangeAttr}`);
                        handler.call(radioToCheck[0]);
                      }, 10);
                    } catch (e) {
                      console.warn(`⚠️ Failed to execute onchange handler for ${key}:`, e);
                    }
                  }
                }
              } else if (field[0].type === 'checkbox') {
                // Special handling for checkboxes
                console.log(`☑️ Restoring checkbox: ${key} with value: ${data[key]}`);
                
                let checkboxName = key;
                
                // Check if this is a mapped checkbox with array notation
                if (data._checkboxMappings && data._checkboxMappings[key]) {
                  checkboxName = data._checkboxMappings[key];
                  console.log(`☑️ Using mapped checkbox name: ${checkboxName} for key: ${key}`);
                }
                
                // Handle both simple and array notation checkboxes
                if (key.startsWith('checkbox_') || field.attr('data-autosave-key')) {
                  // For complex checkboxes, set checked based on value presence
                  const isChecked = data[key] && data[key] !== "";
                  console.log(`☑️ Setting complex checkbox ${checkboxName} to ${isChecked ? 'checked' : 'unchecked'}`);
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
                      console.log(`🔄 Executing onchange handler for checkbox: ${key}`);
                      const handler = new Function(`return ${onChangeAttr}`);
                      handler.call(field[0]);
                    }, 10);
                  } catch (e) {
                    console.warn(`⚠️ Failed to execute onchange handler for ${key}:`, e);
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
   * Restore content to a Quill editor
   * @param {jQuery} field - The field element
   * @param {string} content - The content to restore
   * @param {boolean} isRetry - Whether this is a retry attempt
   */
  restoreQuillContent(field, content, isRetry = false) {
    try {
      const fieldId = field.attr('id');
      if (!fieldId) {
        console.warn('Field ID not found for Quill restoration');
        return;
      }
      
      console.log(`📝 Attempting to restore Quill content for field: ${fieldId}`);
      
      // Try multiple methods to find the Quill editor instance
      let quillInstance = null;
      
      // Method 1: Check if Quill is attached to the field element
      if (field[0].quill) {
        quillInstance = field[0].quill;
        console.log('✅ Found Quill instance on field element');
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
          console.log('✅ Found Quill instance in global instances');
        }
      }
      
      // Method 3: Try to find by quill container selector
      if (!quillInstance) {
        const quillContainer = $(`#quill-${fieldId}, .quill-${fieldId}`);
        if (quillContainer.length && quillContainer[0].quill) {
          quillInstance = quillContainer[0].quill;
          console.log('✅ Found Quill instance on container element');
        }
      }
      
      // If we found a Quill instance, set the content
      if (quillInstance) {
        // Set the HTML content
        quillInstance.root.innerHTML = content;
        
        // Also set the hidden field value
        field.val(content);
        
        console.log(`✅ Restored Quill content for ${fieldId}`);
      } else {
        console.warn(`❌ Could not find Quill instance for field: ${fieldId}`);
        
        // Fallback: set the field value directly
        field.val(content);
        
        // Also try to set content in any editor container
        const editorContainer = $(`#quill-${fieldId} .ql-editor`);
        if (editorContainer.length) {
          editorContainer.html(content);
          console.log(`📝 Set content directly in editor container for ${fieldId}`);
        }
      }
    } catch (error) {
      console.warn(`Error restoring Quill content:`, error);
      
      // Fallback: just set the field value
      try {
        field.val(content);
      } catch (fallbackError) {
        console.warn('Fallback field.val() also failed:', fallbackError);
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
        
        // Find the file input - try multiple approaches for array notation
        let fileInput = form.find(`[name="${fieldName}"]`);
        
        // If not found by exact name, try finding by ID
        if (!fileInput.length) {
          fileInput = form.find(`#${fieldName}`);
          console.log(`🔍 Trying to find file input by ID: ${fieldName}`);
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
              console.log(`🎯 Found matching file input: ${inputName} for key: ${fieldName}`);
              return false; // Break the each loop
            }
          });
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
        infoArea.append(`<h6><span class="fas fa-history" aria-hidden="true"></span> ${this.getTranslation('autosave.previously_selected_files', 'Previously selected files:')}</h6>`);
        
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
        
        // Set up file change listener to automatically remove matched files from the list
        this.setupFileChangeListener(fileInput, fieldName, infoArea);
        
        // Add note
        infoArea.append(`<p class="small mb-0 mt-2">${this.getTranslation('autosave.files_auto_remove_info', 'Files will be automatically removed from this list when you select them again.')}</p>`);
        
        console.log(`✅ Restored metadata for ${files.length} file(s) in field: ${fieldName}`);
      });
    } catch (error) {
      console.warn('❌ Error restoring file metadata:', error);
      console.error(error);
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
    
    console.log(`🔧 Setting up file change listener for field: ${fieldName}`);
    
    // Check if we already have an autosave listener on this input
    if (fileInput.data('autosave-listener-attached')) {
      console.log(`⚠️ Autosave listener already attached to ${fieldName}, skipping`);
      return;
    }
    
    // Mark this input as having an autosave listener
    fileInput.data('autosave-listener-attached', true);
    
    fileInput.on('change.autosave', () => {
      console.log(`📁 Autosave file input changed for field: ${fieldName}`);
      
      // Small delay to let other extensions (like FileUploadExtension) process first
      setTimeout(() => {
        const selectedFiles = Array.from(fileInput[0].files || []);
        if (selectedFiles.length === 0) {
          console.log(`ℹ️ No files selected for ${fieldName}`);
          return;
        }
        
        console.log(`📁 User selected ${selectedFiles.length} new file(s) for ${fieldName}:`);
        selectedFiles.forEach((file, index) => {
          console.log(`  ${index + 1}. ${file.name} (${file.size} bytes)`);
        });
        
        try {
          const savedData = localStorage.getItem(storageKey);
          if (!savedData) {
            console.log(`⚠️ No saved data found in localStorage for key: ${storageKey}`);
            return;
          }
          
          const data = JSON.parse(savedData);
          if (!data._fileMetadata || !data._fileMetadata[fieldName]) {
            console.log(`⚠️ No file metadata found for field: ${fieldName}`);
            return;
          }
          
          const savedFiles = data._fileMetadata[fieldName];
          console.log(`📦 Found ${savedFiles.length} previously saved files for ${fieldName}:`);
          savedFiles.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file.name} (${file.size} bytes)`);
          });
          
          let removedFiles = [];
          let remainingFiles = [];
          
          // Check each saved file against newly selected files
          savedFiles.forEach(savedFile => {
            const isReselected = selectedFiles.some(newFile => 
              newFile.name === savedFile.name && 
              newFile.size === savedFile.size
            );
            
            if (isReselected) {
              removedFiles.push(savedFile);
              console.log(`🗑️ Removing previously selected file: ${savedFile.name}`);
            } else {
              remainingFiles.push(savedFile);
              console.log(`📋 Keeping file in list: ${savedFile.name}`);
            }
          });
          
          console.log(`📊 Result: ${removedFiles.length} files to remove, ${remainingFiles.length} files to keep`);
          
          if (removedFiles.length > 0) {
            // Update the saved data
            if (remainingFiles.length > 0) {
              data._fileMetadata[fieldName] = remainingFiles;
              localStorage.setItem(storageKey, JSON.stringify(data));
              
              // Update the display
              this.updateFileMetadataDisplay(infoArea, fieldName, remainingFiles);
              
              console.log(`✅ Removed ${removedFiles.length} re-selected file(s), ${remainingFiles.length} remaining`);
            } else {
              // No files left, remove the entire metadata for this field
              delete data._fileMetadata[fieldName];
              localStorage.setItem(storageKey, JSON.stringify(data));
              
              // Remove the entire info area
              infoArea.fadeOut(300, function() {
                $(this).remove();
              });
              
              console.log(`✅ All previously selected files have been re-selected, removing info area`);
            }
          } else {
            console.log(`ℹ️ No matching files found to remove from the list`);
          }
        } catch (error) {
          console.warn('❌ Error updating file metadata on file change:', error);
          console.error(error);
        }
      }, 100); // Small delay to let other extensions process first
    });
  }
  
  /**
   * Update the display of file metadata without recreating the entire info area
   * @param {jQuery} infoArea - The info area to update
   * @param {string} fieldName - The name of the field
   * @param {Array} files - The remaining files to display
   */
  updateFileMetadataDisplay(infoArea, fieldName, files) {
    try {
      // Find and update the file list
      const fileList = infoArea.find('ul');
      
      if (fileList.length === 0) {
        console.warn('File list not found in info area');
        return;
      }
      
      // Clear and rebuild the list
      fileList.empty();
      
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
      
      console.log(`📝 Updated file list display with ${files.length} remaining file(s)`);
    } catch (error) {
      console.warn('Error updating file metadata display:', error);
    }
  }

  clearSavedData() {
    console.log('🗑️ Clearing autosaved data from localStorage');
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
