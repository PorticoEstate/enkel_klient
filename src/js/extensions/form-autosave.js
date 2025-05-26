/**
 * Auto-Save Extension
 * Handles automatic saving of form data
 */
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
    this.setupAutoSave();
    this.restoreData();
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
    const saved = localStorage.getItem(this.options.storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      this.populateForm(data);
    }
  }

  serializeForm() {
    const form = this.formHandler.getFormElement();
    const formData = new FormData(form);
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    return data;
  }

  populateForm(data) {
    const form = this.formHandler.getForm();
    Object.keys(data).forEach(key => {
      const field = form.find(`[name="${key}"]`);
      if (field.length) {
        field.val(data[key]);
      }
    });
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

FormHandler.registerExtension('autoSave', FormAutoSaveExtension);
