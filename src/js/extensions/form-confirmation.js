/**
 * FormConfirmation Extension
 * Handles WCAG 3.3.4 confirmation features (summary and dialogs)
 */

// Prevent multiple declarations
if (typeof FormConfirmationExtension === 'undefined') {
  class FormConfirmationExtension {
  constructor(formHandler, options = {}) {
    this.formHandler = formHandler;
    this.$form = formHandler.getForm();
    this.options = {
      showSummary: false,
      showDialog: false,
      ...options
    };
    
    // Initialize immediately since we have formHandler
    this.init();
  }
  
  init() {
    
    if (this.options.showSummary || this.options.showDialog) {
      this.setupConfirmationFlow();
    }
  }
  
  setupConfirmationFlow() {
    // Use beforeSubmit hook instead of intercepting click
    // This allows validation to run first
    this.formHandler.addHook('beforeSubmit', (formData) => {
      return this.handleConfirmationBeforeSubmit(formData);
    });
  }
  
  handleConfirmationBeforeSubmit(formData) {
    // This is called AFTER validation passes
    this.formData = this.collectFormData();
    
    // Check if we should use two-phase submission (for file uploads)
    if (this.options.showSummary && this.shouldUseTwoPhaseSubmission()) {
      console.log('🔄 Delegating to two-phase submission extension');
      // Delegate to two-phase submission extension
      const twoPhaseExtension = this.formHandler.getExtension('twoPhaseSubmit');
      if (twoPhaseExtension) {
        return twoPhaseExtension.handleConfirmationBeforeSubmit(formData);
      } else {
        console.warn('⚠️ Two-phase submission extension not found, falling back to standard summary');
      }
    }
    
    if (this.options.showSummary) {
      this.showFormSummary();
      return false; // Prevent normal submission, we'll handle it in the modal
    } else if (this.options.showDialog) {
      this.showConfirmationDialog();
      return false; // Prevent normal submission, we'll handle it in the dialog
    }
    
    // If no confirmation needed, allow normal submission
    return true;
  }
  
  shouldUseTwoPhaseSubmission() {
    // Check if form has file uploads that need two-phase processing
    const hasFileInputs = this.$form.find('input[type="file"]').length > 0;
    const hasFileUploader = window.FileUploader && this.$form.find('#fileupload, .fileupload').length > 0;
    
    // Check if there are actually files to upload
    let hasFilesToUpload = false;
    if (hasFileInputs) {
      this.$form.find('input[type="file"]').each(function() {
        if (this.files && this.files.length > 0) {
          hasFilesToUpload = true;
          return false; // break
        }
      });
    }
    
    // Check if FileUploader has pending files
    if (hasFileUploader && window.fileUploaderInstance) {
      try {
        if (typeof window.fileUploaderInstance.getPendingCount === 'function') {
          hasFilesToUpload = hasFilesToUpload || window.fileUploaderInstance.getPendingCount() > 0;
        }
      } catch (e) {
        console.log('Could not check FileUploader pending count:', e);
      }
    }
    
    return (hasFileInputs || hasFileUploader) && hasFilesToUpload;
  }
  
  collectFormData() {
    const data = {};
    
    // Fields to exclude from summary (system/hidden fields)
    const excludeFields = [
      'randcheck',           // CSRF token
      'csrf_token',          // Alternative CSRF token name
      '_token',              // Common token name
      'authenticity_token',  // Rails-style token
      'form_id',             // Form identifier
      'action',              // Form action override
      'redirect_url'         // Redirect URL override
    ];
    
    this.$form.find('input, select, textarea').each(function() {
      const $field = $(this);
      const name = $field.attr('name') || $field.attr('id');
      const type = $field.attr('type');
      
      // Skip fields without names or system field types
      if (!name || type === 'file' || type === 'submit' || type === 'button') return;
      
      // Skip hidden fields and excluded system fields
      if (type === 'hidden' || excludeFields.includes(name)) return;
      
      // Skip empty values
      const value = $field.val();
      if (!value || (typeof value === 'string' && value.trim() === '')) return;
      
      if (type === 'checkbox' || type === 'radio') {
        if ($field.is(':checked')) {
          data[name] = value;
        }
      } else {
        data[name] = value;
      }
    });
    return data;
  }
  
  showFormSummary() {
    const summaryHtml = this.generateSummaryHtml();
    
    // Get translations with fallbacks
    const reviewTitle = this.getTranslation('form_confirmation.review_title', 'Review Your Information');
    const reviewIntro = this.getTranslation('form_confirmation.review_intro', 'Please review your information before submitting:');
    const editButton = this.getTranslation('form_confirmation.edit_all_button', 'Edit');
    const submitButton = this.getTranslation('form_confirmation.submit_button', 'Submit');
    
    const $modal = $(`
      <div class="form-summary-modal" role="dialog" aria-modal="true">
        <div class="form-summary-backdrop"></div>
        <div class="form-summary-content">
          <div class="form-summary-header">
            <h2>${reviewTitle}</h2>
            <button type="button" class="form-summary-close">&times;</button>
          </div>
          <div class="form-summary-body">
            <p>${reviewIntro}</p>
            ${summaryHtml}
          </div>
          <div class="form-summary-footer">
            <button type="button" class="btn btn-secondary form-summary-edit">${editButton}</button>
            <button type="button" class="btn btn-primary form-summary-submit">${submitButton}</button>
          </div>
        </div>
      </div>
    `);
    
    $('body').append($modal);
    this.addSummaryStyles();
    this.setupSummaryEvents($modal);
  }
  
  generateSummaryHtml() {
    let html = '<dl class="form-summary-list">';
    
    Object.keys(this.formData).forEach(name => {
      const value = this.formData[name];
      if (value && value.trim()) {
        const label = this.getFieldLabel(name);
        html += `
          <div class="form-summary-item">
            <dt>${label}:</dt>
            <dd>${this.escapeHtml(value)}</dd>
          </div>
        `;
      }
    });
    
    html += '</dl>';
    return html;
  }
  
  getFieldLabel(fieldName) {
    // Escape special characters in fieldName for CSS selector
    const escapedFieldName = fieldName.replace(/([[\]().])/g, '\\$1');
    const escapedFieldId = fieldName.replace(/([[\]().])/g, '\\$1');
    
    // Try to find the field by name attribute (escaped)
    let $field = this.$form.find(`[name="${escapedFieldName}"]`);
    
    // If not found by name, try by ID (escaped)
    if (!$field.length) {
      $field = this.$form.find(`#${escapedFieldId}`);
    }
    
    if ($field.length) {
      const fieldId = $field.attr('id');
      if (fieldId) {
        // Escape the field ID for the label selector
        const escapedId = fieldId.replace(/([[\]().])/g, '\\$1');
        const $label = this.$form.find(`label[for="${escapedId}"]`);
        if ($label.length) {
          return $label.text().replace(/\*\s*$/, '').trim();
        }
      }
      
      // Try to find a parent label or nearby label
      const $parentLabel = $field.closest('label');
      if ($parentLabel.length) {
        return $parentLabel.text().replace(/\*\s*$/, '').trim();
      }
      
      // Look for a label that contains this field
      const $containingLabel = this.$form.find('label').filter(function() {
        return $(this).find($field).length > 0;
      });
      if ($containingLabel.length) {
        return $containingLabel.text().replace(/\*\s*$/, '').trim();
      }
    }
    
    // Fallback: return a cleaned version of the field name
    return fieldName.replace(/([[\]()._])/g, ' ').replace(/\s+/g, ' ').trim();
  }
  
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
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  setupSummaryEvents($modal) {
    $modal.find('.form-summary-close, .form-summary-backdrop, .form-summary-edit').on('click', () => {
      $modal.remove();
    });
    
    $modal.find('.form-summary-submit').on('click', () => {
      $modal.remove();
      this.formHandler.submitForm();
    });
  }
  
  addSummaryStyles() {
    if ($('#form-summary-styles').length === 0) {
      $('head').append(`
        <style id="form-summary-styles">
          .form-summary-modal {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 9999; display: flex; align-items: center; justify-content: center;
          }
          .form-summary-backdrop {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.5); cursor: pointer;
          }
          .form-summary-content {
            position: relative; background: white; border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2); max-width: 90vw; width: 600px;
          }
          .form-summary-header, .form-summary-footer {
            padding: 20px; border-bottom: 1px solid #e1e1e1;
            display: flex; justify-content: space-between; align-items: center;
          }
          .form-summary-footer { border-top: 1px solid #e1e1e1; border-bottom: none; }
          .form-summary-body { padding: 20px; }
          .form-summary-close { background: none; border: none; font-size: 24px; cursor: pointer; }
          .form-summary-list { margin: 0; }
          .form-summary-item { display: flex; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
          .form-summary-item dt { font-weight: 600; width: 150px; margin: 0; }
          .form-summary-item dd { margin: 0 0 0 16px; flex: 1; }
          .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
          .btn-secondary { background: #6c757d; color: white; }
          .btn-primary { background: #007bff; color: white; }
        </style>
      `);
    }
  }
  
  showConfirmationDialog() {
    const message = this.getConfirmationMessage();
    
    const confirmed = confirm(message);
    if (confirmed) {
      this.formHandler.submitForm();
    }
  }
  
  getConfirmationMessage() {
    const formName = this.formHandler.getFormId();
    const messages = {
      'helpdesk': 'Are you sure you want to submit this support request?',
      'nokkelbestilling': 'Are you sure you want to submit this key order?',
      'inspection': 'Are you sure you want to submit this inspection report?',
          'invoicerequest': 'Are you sure you want to submit this invoice request?'
    };
    
    return messages[formName] || 'Are you sure you want to submit this form?';
  }
}

// Register extension with FormHandler
if (typeof FormHandler !== 'undefined') {
  FormHandler.extensions = FormHandler.extensions || {};
  FormHandler.extensions.confirmation = FormConfirmationExtension;
}

window.FormConfirmationExtension = FormConfirmationExtension;
}
