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
- `src/Controller/BaseFormController.php` - Automatically includes validation in all forms

## Reusable Validation Functions

### Core Validation Functions

- `validateField(field)` - Validates a single form field
- `validateAllFields(form)` - Validates all required fields in a form
- `validateForm()` - Form submission validation (called by onsubmit handlers)
- `setupFormValidation(form)` - Sets up validation events for a form

### Field-Specific Validation

These specialized validation functions handle specific field types:

- `validatePhone($field)` - Validates phone numbers (requires 8+ digits)
- `validateEmail($field)` - Validates email addresses using regex
- `validateLocation($field)` - Validates location fields that require a location code

## How to Use

The validation framework is now automatically included in all form pages through the `BaseFormController`. This means you don't need to manually include the script in most cases.

### Method 1: Using the Automatic Framework (Recommended)

1. In your Twig template, add the validation call to your form's onsubmit:

```html
<form method="post" action="{{ action_url }}" onsubmit="return validateForm();">
    <!-- Form fields -->
</form>
```

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
- Special validation for common field types (phone, email, location)

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

1. Always add `onsubmit="return validateForm();"` to your forms
2. Create error message elements with ID pattern `{field-id}-error`
3. Add `required` and `aria-required="true"` attributes to required fields
4. Use HTML5 validation attributes (`pattern`, `min`, `max`, etc.) when appropriate
5. For custom fields, add specialized validation in `form-validator.js`
