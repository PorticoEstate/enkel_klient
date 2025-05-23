# Form Handler Conversion Guide

**Last updated:** May 23, 2025  
**Author:** GitHub Copilot

This document provides step-by-step instructions for converting existing form handlers to use the centralized `FormHandler` class. The goal is to standardize form handling across the application, reduce code duplication, and ensure consistent implementation of accessibility features.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Conversion Process](#conversion-process)
3. [Form-Specific Customizations](#form-specific-customizations)
4. [Testing](#testing)
5. [Backward Compatibility](#backward-compatibility)
6. [Common Issues](#common-issues)
7. [Example](#example)

## Prerequisites

Ensure the following files are included in your project and added to the main template:

- `src/js/form-handler.js` - The centralized FormHandler class
- `src/js/form-accessibility.js` - Accessibility enhancements
- `src/js/form-validator.js` - Form validation functions

The FormHandler class should be included in your main template file (typically `head.twig`) after the jQuery library and form-accessibility.js:

```html
<!-- Form accessibility enhancements -->
<script src="{{ base_path }}/src/js/form-accessibility.js?n={{ cache_refresh_token }}"></script>

<!-- FormHandler class for consistent form handling -->
<script src="{{ base_path }}/src/js/form-handler.js?n={{ cache_refresh_token }}"></script>

<!-- Common form validation framework -->
<script src="{{ base_path }}/src/js/form-validator.js?n={{ cache_refresh_token }}"></script>
```

## Conversion Process

Follow these steps to convert an existing form handler:

### 1. Identify the Form's Specific Requirements

Review the existing form handler file and identify:

- Form ID
- Redirect URL after submission
- File upload requirements
- Form-specific validations or behaviors
- Custom event handlers

### 2. Update the Form Handler File

Replace the initialization code in the form's JavaScript file with the FormHandler initialization:

```javascript
/**
 * Form name handler
 * 
 * Handles form validation, submission and file uploads
 * Enhanced for WCAG 2.0 compliance with improved accessibility
 * Updated [DATE] - Refactored to use FormHandler class
 */

// Global variables
var redirect_action = `${strBaseURL}/[form-name]`;
var formHandler = null;

$(document).ready(function () {
    // Initialize form handler with form-specific options
    formHandler = new FormHandler({
        formId: '[form-id]',
        redirectUrl: redirect_action,
        uploadUrl: `${strBaseURL}/[form-name]/upload`,
        fileRequired: [boolean], // true or false based on requirements
        allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'],
        maxFileSizeMB: 15,
        customHandlers: {
            // Form-specific pre-validation logic (if needed)
            preValidate: function() {
                // Form-specific validation logic
                return true; // Return true to continue with submission
            }
        }
    });

    // Add form-specific event handlers if needed
    // For example:
    $('#some-field').on('change', function() {
        // Form-specific behavior
        formHandler.setFileRequired($(this).val() === 'specific-value');
    });
});

// Add comment that these functions are no longer needed
// All functions have been moved to FormHandler class

// Add comment that form submission is now handled by the FormHandler class

// Keep legacy functions with deprecation notice if they're referenced elsewhere
/**
 * Legacy functions kept for backward compatibility
 * @deprecated These functions will be removed in a future update
 */
```

### 3. Remove Redundant Functions

Remove or comment out functions that are now handled by the FormHandler class:
- Form initialization
- Form submission handling
- File upload initialization
- Form validation
- Generic accessibility enhancements
- Spinner handling

### 4. Maintain Backward Compatibility

For functions that might be referenced elsewhere, add a deprecation notice and keep a minimal implementation that delegates to the FormHandler:

```javascript
/**
 * @deprecated Use formHandler.createAccessibleAlert() instead
 */
function createAccessibleAlert(message, type) {
    if (formHandler) {
        formHandler.createAccessibleAlert(message, type);
    } else {
        // Fallback implementation for backward compatibility
        // [original implementation]
    }
}
```

## Form-Specific Customizations

### Custom Validation

If your form requires custom validation, implement it in the `preValidate` handler:

```javascript
customHandlers: {
    preValidate: function() {
        // Example: Validate that at least one checkbox is selected
        const checkboxes = $('input[type="checkbox"][name="categories[]"]');
        let checked = false;
        
        checkboxes.each(function() {
            if ($(this).prop('checked')) {
                checked = true;
                return false; // Break the loop
            }
        });
        
        if (!checked) {
            formHandler.createAccessibleAlert('Please select at least one category', 'warning');
            return false; // Prevent form submission
        }
        
        return true; // Allow form submission
    }
}
```

### Dynamic Field Requirements

For forms where field requirements change based on user input:

```javascript
$('#field-that-changes-requirements').on('change', function() {
    const value = $(this).val();
    
    // Example: Make a field required based on selection
    if (value === 'option-that-requires-more-info') {
        $('#additional-info').attr('required', true)
            .attr('aria-required', 'true');
        formHandler.markRequiredFields(); // Refresh required field indicators
    } else {
        $('#additional-info').removeAttr('required')
            .attr('aria-required', 'false');
        formHandler.markRequiredFields(); // Refresh required field indicators
    }
});
```

## Testing

After converting a form handler, perform these tests:

1. **Form Submission**: Ensure the form submits correctly with valid data
2. **Validation**: Test all validation rules, both HTML5 and custom validations
3. **File Upload**: Test file upload if applicable, including required/optional logic
4. **Accessibility**: Verify screen reader announcements work correctly
5. **Error Handling**: Test error scenarios (invalid data, server errors)
6. **Visual Indicators**: Check that required fields are properly marked

## Backward Compatibility

Some older code might reference functions that have been moved into the FormHandler class. There are two approaches to handle this:

1. **Keep stub functions** that delegate to FormHandler methods
2. **Update all references** to use the FormHandler methods directly

The first approach is easier for a transitional period but requires cleanup later.

## Common Issues

### Form Submission Not Working

- Check that the form ID matches exactly between HTML and JS initialization
- Verify that required fields are properly marked in HTML
- Check browser console for JavaScript errors

### File Upload Issues

- Ensure `fileRequired` is correctly set based on form requirements
- Verify file input has the correct ID (typically "fileupload")
- Check that file upload URLs are correct

### Custom Validation Not Running

- Verify that `preValidate` returns true/false appropriately
- Check that custom validation is properly registered in the FormHandler initialization

## Example

Here's a complete example of converting the "helpdesk" form handler:

### Before Conversion:

```javascript
/**
 * Helpdesk form handler
 * 
 * Handles form validation, rich text editing, submission and file uploads
 */

// Global variables
var redirect_action = `${strBaseURL}/helpdesk`;
var fileUploader = null;

$(document).ready(function ()
{
    // set focus on first input field
    document.getElementById("location_name").focus();
    
    // Add asterisk to all required fields
    markRequiredFields();
    
    // Initialize file uploader
    initializeFileUploader();
    
    // Setup form validation
    setupFormValidation($('form'));
});

function markRequiredFields() {
    // Implementation...
}

// More functions...

$('form').on('submit', function (e)
{
    // Form submission handling...
});
```

### After Conversion:

```javascript
/**
 * Helpdesk form handler
 * 
 * Handles form validation, rich text editing, submission and file uploads
 * Updated May 24, 2025 - Refactored to use FormHandler class
 */

// Global variables
var redirect_action = `${strBaseURL}/helpdesk`;
var formHandler = null;

$(document).ready(function ()
{
    // Initialize form handler with form-specific options
    formHandler = new FormHandler({
        formId: 'helpdesk',
        redirectUrl: redirect_action,
        uploadUrl: `${strBaseURL}/helpdesk/upload`,
        fileRequired: false,
        customHandlers: {
            // Any helpdesk-specific handlers
        }
    });
    
    // Any form-specific initialization can go here
});

// All functions have been moved to FormHandler class

// Form submission is now handled by the FormHandler class

/**
 * Legacy functions kept for backward compatibility
 * @deprecated These functions will be removed in a future update
 */
// Only keep functions that might be referenced elsewhere
```

Remember that each form may have specific requirements, so adapt the conversion process accordingly while maintaining the core standardization benefits of the FormHandler class.
