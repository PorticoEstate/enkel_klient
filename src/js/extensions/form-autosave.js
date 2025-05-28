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
      for (let [key, value] of formData.entries()) {
        // Skip file inputs - they cannot be restored for security reasons
        const field = form.querySelector(`[name="${key}"]`);
        if (field && (field.type === 'file' || key.includes('files[') || key.startsWith('files'))) {
          continue;
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
      
      Object.keys(data).forEach(key => {
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
    } catch (error) {
      console.error('Error populating form from autosave:', error);
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
