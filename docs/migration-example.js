/**
 * Example: Migrating from bloated FormHandler to core + extensions
 * 
 * BEFORE (bloated version):
 * const formHandler = new FormHandler({
 *   formId: 'helpdesk-form',
 *   realTimeValidation: true,
 *   autoSave: true,
 *   fileUpload: true,
 *   wcagCompliant: true,
 *   modalHandling: true
 * });
 * 
 * AFTER (clean core + extensions):
 */

// Load core handler with only essential options
const formHandler = new FormHandler({
  formId: 'helpdesk-form',
  redirectUrl: '/helpdesk/success',
  uploadUrl: '/helpdesk/upload',
  
  // Extensions configuration
  extensions: {
    validation: {
      realTimeValidation: true,
      wcagCompliant: true,
      rules: {
        'email': 'email',
        'subject': 'required|min:5',
        'message': 'required|min:10'
      }
    },
    autoSave: {
      interval: 30000,
      storageKey: 'helpdesk_autosave'
    },
    fileUpload: {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'],
      multiple: true
    }
  }
});

// Access extensions when needed
const validation = formHandler.getExtension('validation');
const autoSave = formHandler.getExtension('autoSave');

// Custom form-specific logic (previously in bloated class)
formHandler.form.addEventListener('submit', () => {
  // Custom helpdesk logic here
  if (validation && !validation.isValid()) {
    return false;
  }
  
  // Add helpdesk-specific fields
  const priority = document.querySelector('#priority').value;
  const category = document.querySelector('#category').value;
  
  // These would be handled by the core submission
});

/**
 * Benefits of this approach:
 * 
 * 1. SEPARATION OF CONCERNS
 *    - Core: Only form submission
 *    - Extensions: Specific features
 *    - Form logic: Business-specific code
 * 
 * 2. REUSABILITY
 *    - Extensions work with any form
 *    - Core is lightweight and fast
 *    - Mix and match features as needed
 * 
 * 3. MAINTAINABILITY
 *    - Each extension is ~50-100 lines
 *    - Clear APIs and responsibilities
 *    - Easy to test and debug
 * 
 * 4. PERFORMANCE
 *    - Only load needed features
 *    - No unused code bloat
 *    - Faster initialization
 */
