/**
 * FormConfirmation Extension
 * Handles WCAG 3.3.4 confirmation features (summary and dialogs)
 */

// Prevent multiple declarations
if (typeof FormConfirmationExtension === 'undefined') {
  class FormConfirmationExtension {
  constructor(options = {}) {
    this.options = {
      showSummary: false,
      showDialog: false,
      ...options
    };
  }
  
  init(formHandler) {
    this.formHandler = formHandler;
    this.$form = formHandler.getForm();
    
    if (this.options.showSummary || this.options.showDialog) {
      this.setupConfirmationFlow();
    }
  }
  
  setupConfirmationFlow() {
    // Override default submission
    this.$form.off('submit');
    this.$form.find('[type="submit"]').on('click', (e) => {
      e.preventDefault();
      this.handleConfirmationSubmit();
    });
  }
  
  handleConfirmationSubmit() {
    // Basic validation first
    if (!this.validateForm()) {
      return false;
    }
    
    this.formData = this.collectFormData();
    
    if (this.options.showSummary) {
      this.showFormSummary();
    } else if (this.options.showDialog) {
      this.showConfirmationDialog();
    } else {
      this.formHandler.submitForm();
    }
  }
  
  validateForm() {
    if (typeof validateAllFields === 'function') {
      return validateAllFields(this.$form);
    }
    return true;
  }
  
  collectFormData() {
    const data = {};
    this.$form.find('input, select, textarea').each(function() {
      const $field = $(this);
      const name = $field.attr('name') || $field.attr('id');
      const type = $field.attr('type');
      
      if (!name || type === 'file' || type === 'submit' || type === 'button') return;
      
      if (type === 'checkbox' || type === 'radio') {
        if ($field.is(':checked')) {
          data[name] = $field.val();
        }
      } else {
        data[name] = $field.val();
      }
    });
    return data;
  }
  
  showFormSummary() {
    const summaryHtml = this.generateSummaryHtml();
    
    const $modal = $(`
      <div class="form-summary-modal" role="dialog" aria-modal="true">
        <div class="form-summary-backdrop"></div>
        <div class="form-summary-content">
          <div class="form-summary-header">
            <h2>Review Your Information</h2>
            <button type="button" class="form-summary-close">&times;</button>
          </div>
          <div class="form-summary-body">
            <p>Please review your information before submitting:</p>
            ${summaryHtml}
          </div>
          <div class="form-summary-footer">
            <button type="button" class="btn btn-secondary form-summary-edit">Edit</button>
            <button type="button" class="btn btn-primary form-summary-submit">Submit</button>
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
    const $field = this.$form.find(`[name="${fieldName}"], #${fieldName}`);
    const fieldId = $field.attr('id');
    const $label = $(`label[for="${fieldId}"]`);
    return $label.length ? $label.text().replace(/\*\s*$/, '').trim() : fieldName;
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

window.FormConfirmationExtension = FormConfirmationExtension;
}
