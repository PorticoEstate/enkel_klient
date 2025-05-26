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
    // Wait for DOM to be ready before setting up autosave
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          this.setupAutoSave();
          this.restoreData();
        }, 100); // Small delay to ensure form is fully initialized
      });
    } else {
      // DOM is ready, but give a small delay for form initialization
      setTimeout(() => {
        this.setupAutoSave();
        this.restoreData();
      }, 100);
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

  restoreData() {
    try {
      const saved = localStorage.getItem(this.options.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.populateForm(data);
      }
    } catch (error) {
      console.warn('Error restoring autosave data:', error);
      // Clear corrupted data
      localStorage.removeItem(this.options.storageKey);
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
        data[key] = value;
      }
      return data;
    } catch (error) {
      console.error('Error serializing form:', error);
      return {};
    }
  }

  populateForm(data) {
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
              
              field.val(data[key]);
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
