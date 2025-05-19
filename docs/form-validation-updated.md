# Form Validation Framework

This document describes the common form validation approach implemented across all application forms.

## Overview

The form validation framework provides a consistent, reusable validation system for all forms in the application. This ensures:

1. Consistent validation behavior across all forms
2. Improved accessibility for all form interactions
3. Real-time validation feedback to users
4. Reduced code duplication
5. Centralized validation logic that's easier to maintain

## Key Files

- `src/js/form-validator.js` - Main validation library with reusable functions
- `src/js/form-accessibility.js` - General accessibility enhancements for forms
- `src/js/accessibility-helpers.js` - Screen reader and accessibility utilities
- `src/js/form-debug.js` - Debugging utilities for form validation
- `src/Controller/BaseFormController.php` - Automatically includes validation in all forms

## Reusable Validation Functions

### Core Validation Functions

- `validateField(field)` - Validates a single form field
- `validateAllFields(form)` - Validates all required fields in a form
- `validateForm(formElement)` - Form submission validation (called by onsubmit handlers)
- `setupFormValidation(form)` - Sets up validation events for a form

### Field-Specific Validation

These specialized validation functions handle specific field types:

- `validatePhone($field)` - Validates phone numbers (requires 8+ digits)
- `validateEmail($field)` - Validates email addresses using regex
- `validateLocation($field)` - Validates location fields that require a location code
- `validatePostalCode($field)` - Validates postal codes (configurable pattern)
- `validateDate($field)` - Validates date fields (both date inputs and text)
- `validatePersonalId($field)` - Validates Norwegian personal ID numbers (11 digits)

## How to Use

The validation framework is now automatically included in all form pages through the `BaseFormController`. This means you don't need to manually include the script in most cases.

### Method 1: Using the Automatic Framework (Recommended)

1. In your Twig template, add the validation call to your form's onsubmit and pass the form element using `this`:

```html
<form method="post" action="{{ action_url }}" onsubmit="return validateForm(this);">
    <!-- Form fields -->
</form>
```

The framework will automatically find and initialize forms with this onsubmit attribute. Always pass `this` to ensure the correct form is validated, especially when there are multiple forms on the page.

### Method 2: Manual Initialization

If you need to initialize the validation framework manually (for dynamically created forms or other special cases):

```javascript
$(document).ready(function() {
    // Other initialization code...
    
    // Set up validation for the form
    setupFormValidation($('form'));
});
```

### Error Display Elements

For each field that requires validation, create an error element with ID pattern `{field-id}-error`:

```html
<div class="form-group">
    <label for="email">Email <span class="required-field">*</span></label>
    <input type="email" id="email" name="email" class="form-control" required>
    <div id="email-error" class="invalid-feedback">Invalid email format</div>
</div>
```

## Form Validation Features

- Real-time validation on blur and input events
- Accessible error messages for screen readers
- Visual indicators for valid/invalid fields
- Consistent styling for validation states
- Support for HTML5 validation attributes
- Special validation for common field types (phone, email, location, postal code, date, personal ID)
- Error summary at the top of forms with links to invalid fields
- Automatic ARIA attribute management for accessibility

## Extending the Framework

To add custom validation for new field types:

1. Add a new validation function in `form-validator.js`
2. Add special case handling in the main `validateField` function
3. Ensure your form has the proper error message elements

Example for a new custom field type:

```javascript
function validateCustomField($field) {
    // Custom validation logic
    return isValid;
}

// Then modify validateField function to include:
if (fieldId === 'custom_field') {
    isValid = validateCustomField($field);
}
```

## Implementation in Current Forms

The validation framework has been integrated into all forms in the application:

1. **invoicerequest.twig** - Full validation for contact information, dates, and file uploads
2. **helpdesk.twig** - Complete form validation with specialized fields
3. **nokkelbestilling.twig** - Key ordering form with email and phone validation
4. **inspection_1.twig** - Inspection form with conditional validation

All forms now benefit from:

- Consistent validation behavior
- Better accessibility
- Improved user experience with real-time feedback
- Centralized maintenance for validation logic

## Technical Implementation

The framework is integrated at multiple levels:

1. **Controller Level** - `BaseFormController.php` automatically includes the validation framework
2. **Template Level** - The `head.twig` conditionally loads the validator when needed
3. **JavaScript Level** - Auto-initialization finds and enhances forms with the validation attribute
4. **Form Level** - Individual forms have specific validation for their unique fields

## Best Practices

When working with the form validation framework:

1. Always add `onsubmit="return validateForm(this);"` to your forms, passing the form element explicitly
2. Create error message elements with ID pattern `{field-id}-error`
3. Add `required` and `aria-required="true"` attributes to required fields
4. Use HTML5 validation attributes (`pattern`, `min`, `max`, etc.) when appropriate
5. For custom fields, add specialized validation in `form-validator.js`

## Error Summary Feature

The validation framework now provides an automatic error summary at the top of forms when validation fails. This improves accessibility by:

1. Providing a consolidated list of all errors in one place
2. Creating focusable links that jump directly to invalid fields
3. Announcing the number of errors to screen readers

The error summary is automatically generated when form validation fails and includes:

- A heading with the number of errors found
- A list of clickable links to each invalid field
- ARIA attributes for proper screen reader announcement
- Automatic focus management to help users correct errors

### Customizing Error Messages

You can customize error messages for specific fields:

```html
<input type="email" id="email" required data-error-message="Please enter a valid corporate email address">
```

Using the `data-error-message` attribute allows you to provide field-specific error messages.

### Field Type Detection

The framework automatically detects common field types by:

1. Field ID (email, phone, postal_code, etc.)
2. Field type attribute (email, date, etc.)
3. CSS classes (date-field, etc.)
4. Data attributes (data-validator="email")

## Troubleshooting Common Issues

### Form doesn't validate on submit

- Check if the form has `onsubmit="return validateForm(this);"` attribute
- Make sure all required fields have proper error message elements
- Look for JavaScript console errors that might indicate problems

### Fields are not showing validation state

- Confirm field IDs match their error element IDs (e.g., field "email" should have "email-error" element)
- Check that the field has required attribute if it should be validated
- Ensure CSS classes for .is-valid and .is-invalid are properly defined

### Multiple forms conflict with each other

- Always pass the form element explicitly: `validateForm(this)`
- Use unique IDs for all form fields and error elements
- Check browser console for any JavaScript errors

### Preventing validation recursion

The form validation framework includes safeguards to prevent infinite recursion loops that can happen when:

1. Both form-accessibility.js and form-validator.js try to validate the same form
2. Custom event handlers trigger additional validation calls
3. Field-specific validation triggers form-level validation

The framework uses these mechanisms to prevent recursion:

- Form-level validation flag (`$form.data('validating')`)
- Detection of forms using validateForm to prevent duplicate event handlers
- Careful event management to prevent bubbling issues

### Error summary not appearing

- Make sure form validation is properly initialized
- Check that form submission passes through the validateForm function
- Verify that the form has at least one invalid required field

## Debugging Form Validation

To help troubleshoot form validation issues, we've added debugging utilities:

### Using form-debug.js

The `form-debug.js` file provides utilities to enable or disable debugging at runtime:

```javascript
// Enable debugging for both validation libraries
toggleFormDebug(true);

// Enable debugging for just the validation library
toggleFormDebug(true, { validator: true, a11y: false });

// Check current debug status
const debugStatus = getFormDebugStatus();
console.log('Debugging enabled:', debugStatus.enabled);
```

### Debug Configuration

Both validation libraries have configuration objects you can modify:

```javascript
// Configure form-validator.js debugging
FORM_VALIDATOR_CONFIG.debug = true;
FORM_VALIDATOR_CONFIG.logPrefix = '[CustomValidator]';

// Configure form-accessibility.js debugging
FORM_A11Y_CONFIG.debug = true;
FORM_A11Y_CONFIG.logPrefix = '[CustomA11y]';
```

### Testing the Recursion Fix

A test page is available at `/src/test/recursion-fix-test.html` that verifies the recursion issue has been resolved. This page loads both validation libraries and runs tests to ensure they work properly together.
