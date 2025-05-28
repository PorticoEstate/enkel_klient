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
    
    // Wait for DOM to be ready before setting up autosave
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        // Setup autosave immediately but wait longer for restore (to allow Quill to initialize)
        setTimeout(() => {
          this.setupAutoSave();
        }, 100);
        
        // First quick attempt at restoration
        setTimeout(() => {
          console.log('⚡ Initial attempt at restoring autosaved data');
          this.restoreData();
        }, 500); 
        
        // Try again with longer delay to ensure all editors are initialized
        setTimeout(() => {
          console.log('🔄 Second attempt at restoring autosaved data with delayed timing');
          this.restoreData(true); // Force second attempt
        }, 2000);
        
        // Final attempt with even longer delay
        setTimeout(() => {
          console.log('🔍 Final attempt at restoring autosaved data');
          this.checkRestorationSuccess();
        }, 4000);
      });
    } else {
      // DOM is ready, set up autosave immediately
      setTimeout(() => {
        this.setupAutoSave();
      }, 100);
      
      // First quick attempt at restoration
      setTimeout(() => {
        console.log('⚡ Initial attempt at restoring autosaved data');
        this.restoreData();
      }, 500); 
      
      // Try again with longer delay to ensure all editors are initialized
      setTimeout(() => {
        console.log('🔄 Second attempt at restoring autosaved data with delayed timing');
        this.restoreData(true); // Force second attempt
      }, 2000);
      
      // Final attempt with even longer delay
      setTimeout(() => {
        console.log('🔍 Final attempt at restoring autosaved data');
        this.checkRestorationSuccess();
      }, 4000);
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

  // Check if restoration was successful for Quill fields
  checkRestorationSuccess() {
    if (!this.restoredFields) return;
    
    try {
      // For each field we tried to restore, verify if content is visible
      this.restoredFields.forEach(fieldId => {
        const field = this.formHandler.getForm().find(`#${fieldId}`);
        if (!field.length) return;
        
        // Check if this was a Quill field
        const isQuillField = field.closest('.quill-container, .quill-editor-container').length > 0 || 
                            field.hasClass('quill-content') ||
                            field.attr('data-quill') === 'true' ||
                            fieldId.includes('quill');
        
        if (isQuillField) {
          // Look for the editor element
          const editorSelector = `#quill-${fieldId} .ql-editor`;
          const editor = $(editorSelector);
          
          if (editor.length) {
            const content = editor.html();
            const isEmpty = !content || content.trim() === '<p><br></p>' || content.trim() === '';
            
            console.log(`🔍 Field ${fieldId} is ${isEmpty ? 'empty' : 'populated'} (content length: ${content ? content.length : 0})`);
            
            // If empty, try one more direct restoration
            if (isEmpty) {
              const savedData = localStorage.getItem(this.options.storageKey);
              if (savedData) {
                try {
                  const data = JSON.parse(savedData);
                  if (data[fieldId]) {
                    console.log(`🔄 Emergency restoration for ${fieldId} with direct content injection`);
                    this.restoreQuillContent(field, data[fieldId], true);
                  }
                } catch (e) {
                  console.warn('❌ Error in emergency restoration:', e);
                }
              }
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
  restoreQuillContent(field, content, isRetry = false) {
    try {
      if (!content) {
        console.log('No content to restore to Quill editor');
        return;
      }
      
      const fieldId = field.attr('id');
      console.log(`🔄 Restoring Quill content for field: ${fieldId}, content length: ${content.length}, retry: ${isRetry}`);
      
      // First set the value on the hidden input/textarea (always do this)
      field.val(content);
      
      // Define a function to apply content that we can use both immediately and as a fallback
      const applyQuillContent = (retryCount = 0) => {
        // Find the visible Quill editor element using multiple strategies
        console.log(`📋 Attempt #${retryCount + 1} to find Quill editor for ${fieldId}`);
        
        // Look for editor container with various strategies
        let editorContainer = null;
        
        // Strategy 1: Look for containers with the predictable ID patterns
        editorContainer = $(`#quill-${fieldId} .ql-editor`);
        if (editorContainer.length) {
          console.log(`✅ Found via standard ID pattern: #quill-${fieldId}`);
        }
        
        // Strategy 2: Look for nearby editor containers
        if (!editorContainer.length) {
          editorContainer = field.siblings('.ql-container').find('.ql-editor');
          if (editorContainer.length) {
            console.log('✅ Found as direct sibling container');
          }
        }
        
        // Strategy 3: Look in the same form group or container
        if (!editorContainer.length) {
          editorContainer = field.closest('.form-group, .quill-container').find('.ql-editor');
          if (editorContainer.length) {
            console.log('✅ Found within the same form group or container');
          }
        }
        
        // Strategy 4: Look in the entire form for any data-field attribute that matches
        if (!editorContainer.length) {
          editorContainer = field.closest('form').find(`.ql-editor[data-field="${fieldId}"]`);
          if (editorContainer.length) {
            console.log('✅ Found by data-field attribute');
          }
        }
        
        // Strategy 5: Look for any editor after our field in DOM order
        if (!editorContainer.length) {
          const nextEditor = field.parent().nextAll().find('.ql-editor').first();
          if (nextEditor.length) {
            console.log('✅ Found next editor in DOM order');
            editorContainer = nextEditor;
          }
        }
        
        // Strategy 6: Look for editor with data-quill-id attribute
        if (!editorContainer.length) {
          editorContainer = $(`.ql-container[data-quill-id="${fieldId}"] .ql-editor`);
          if (editorContainer.length) {
            console.log('✅ Found via data-quill-id attribute');
          }
        }
        
        // Strategy 7: Look for any Quill editor in the form
        if (!editorContainer.length && isRetry) {
          const allEditors = field.closest('form').find('.ql-editor');
          if (allEditors.length > 0) {
            console.log('⚠️ Last resort: Using the first Quill editor found in the form');
            editorContainer = $(allEditors[0]);
          }
        }
        
        // If we found an editor container, try to update its content
        if (editorContainer && editorContainer.length) {
          console.log(`📝 Found Quill editor container for ${fieldId}, now setting content`);
          
          // First try using the Quill API if available
          let contentAppliedViaAPI = false;
          
          // Method 1: Check if we have quillInstances
          if (window.quillInstances && window.quillInstances[fieldId]) {
            console.log(`🔍 Using quillInstances registry for ${fieldId}`);
            try {
              window.quillInstances[fieldId].clipboard.dangerouslyPasteHTML(content);
              
              // The line above might succeed but not actually show content, try setting root innerHTML directly
              if (window.quillInstances[fieldId].root) {
                window.quillInstances[fieldId].root.innerHTML = content;
              }
              
              contentAppliedViaAPI = true;
            } catch (e) {
              console.warn(`API error with quillInstances: ${e.message}`);
            }
          }
          
          // Method 2: Using global quill object (legacy)
          if (!contentAppliedViaAPI && window.quill && window.quill[fieldId]) {
            console.log(`🔍 Using legacy global quill object for ${fieldId}`);
            try {
              window.quill[fieldId].clipboard.dangerouslyPasteHTML(content);
              
              // Also set directly to ensure content appears
              if (window.quill[fieldId].root) {
                window.quill[fieldId].root.innerHTML = content;
              }
              
              contentAppliedViaAPI = true;
            } catch (e) {
              console.warn(`API error with global quill: ${e.message}`);
            }
          }
          
          // Method 3: Find Quill instance from DOM
          if (!contentAppliedViaAPI) {
            // Try to find the Quill instance from the DOM element
            try {
              const editorElement = editorContainer.closest('.ql-container').parent()[0];
              if (editorElement && editorElement.__quill) {
                console.log('🔍 Found Quill instance via DOM element');
                editorElement.__quill.clipboard.dangerouslyPasteHTML(content);
                editorElement.__quill.root.innerHTML = content;
                contentAppliedViaAPI = true;
              }
            } catch (e) {
              console.warn(`Error getting Quill instance from DOM: ${e.message}`);
            }
          }
          
          // Fallback: Set HTML directly in the editor div if API methods failed
          if (!contentAppliedViaAPI) {
            console.log(`🔨 Setting HTML content directly in editor container`);
            editorContainer.html(content);
            
            // Force a repaint
            editorContainer.hide().show(0);
          }
          
          // Verify content was set by checking the editor content
          const currentContent = editorContainer.html() || '';
          const hasContent = currentContent.length > 20; // Basic check if content was set
          
          console.log(`✅ Content verification: ${hasContent ? 'Content applied successfully' : 'Content may not have been applied'}`);
          
          // Force a refresh of the editor display
          if (!hasContent && retryCount < 3) {
            console.log(`⏱️ Content verification failed, trying direct approach`);
            editorContainer.html(content);
            editorContainer.hide().show(0);
          }
          
          // Trigger change event for validation and other listeners
          field.trigger('change');
          console.log(`✅ Quill content restoration completed for ${fieldId}`);
          
          return true;
        } else {
          console.warn(`❌ Could not find any Quill editor container for ${fieldId}`);
          
          // If we haven't tried too many times, do a delayed retry
          if (retryCount < 5) {
            console.log(`⏱️ Editor not found. Scheduling retry #${retryCount + 2} after ${500 * (retryCount + 1)}ms`);
            setTimeout(() => applyQuillContent(retryCount + 1), 500 * (retryCount + 1));
            return false;
          } else {
            console.warn(`❌ Giving up after ${retryCount + 1} attempts to find Quill editor`);
            return false;
          }
        }
      };
      
      // Try immediately, in case editors are already initialized
      const immediate = applyQuillContent();
      
      // If immediate application failed and this isn't already a retry, schedule a delayed attempt
      if (!immediate && !isRetry) {
        // Also schedule a delayed attempt in case Quill is initialized later
        setTimeout(() => {
          console.log(`🔄 Performing delayed Quill content restoration for ${fieldId}`);
          applyQuillContent(1);
        }, 1000);
      }
      
      // For emergency cases, try one more time after a longer delay
      if (isRetry) {
        setTimeout(() => {
          // Force a direct update on any found Quill editor for this field
          const quillDiv = $(`#quill-${fieldId}`);
          if (quillDiv.length) {
            const editorDiv = quillDiv.find('.ql-editor');
            if (editorDiv.length) {
              console.log(`🚨 Emergency direct update for ${fieldId}`);
              editorDiv.html(content);
              editorDiv.hide().show(0);
            }
          }
        }, 2000);
      }
      
    } catch (error) {
      console.error('❌ Error restoring Quill editor content:', error);
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
