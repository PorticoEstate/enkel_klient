# Dynamic Form Configuration Loading System

This document describes the enhanced form configuration system that allows loading form configurations from multiple sources with a clear priority order.

## Overview

The new system replaces hardcoded presets with dynamic configuration loading from multiple sources, making form configurations more maintainable and flexible.

## Configuration Priority Order

1. **Data Attributes** (Highest Priority)
2. **JavaScript Configuration Files**
3. **Twig Template Configurations**
4. **Hardcoded Presets** (Fallback - Deprecated)

## 1. Data Attributes Configuration

Configure forms directly on the form element using data attributes.

### Simple Boolean Flags
```html
<form id="helpdesk" 
      data-form-summary="true"
      data-confirmation-dialog="false"
      data-auto-save="true"
      data-file-upload="true"
      data-real-time-validation="true">
```

### JSON Configuration
```html
<form id="helpdesk" 
      data-form-config='{"validation":{"realTimeValidation":true},"confirmation":{"showSummary":true}}'>
```

### Individual Extension Configuration
```html
<form id="helpdesk" 
      data-validation-config='{"realTimeValidation":true,"wcagCompliant":true}'
      data-confirmation-config='{"showSummary":true,"enableHtmlFormatting":true}'>
```

## 2. JavaScript Configuration Files

Create dedicated configuration files for complex forms.

### File Structure
```
/src/js/config/forms/
├── helpdesk.js
├── inspection_1.js
├── nokkelbestilling.js
└── invoicerequest.js
```

### Configuration File Format
```javascript
// /src/js/config/forms/helpdesk.js
function getFormConfig(formId) {
    return {
        fileUpload: {
            required: false,
            allowedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png'],
            maxFileSizeMB: 10,
            maxFiles: 5
        },
        validation: {
            realTimeValidation: true,
            wcagCompliant: true,
            customValidators: {
                phone: {
                    pattern: /^[\+]?[0-9\s\-\(\)]{8,15}$/,
                    message: 'Please enter a valid phone number'
                }
            }
        },
        autoSave: {
            enabled: true,
            interval: 30000,
            storageKey: 'helpdesk_autosave'
        },
        accessibility: {
            announceErrors: true,
            markRequired: true,
            enhancedFocus: true
        },
        confirmation: {
            showSummary: true,
            enableHtmlFormatting: true,
            customSummaryFields: {
                message: {
                    label: 'Message Details',
                    formatAsHtml: true,
                    truncateAt: 500
                }
            }
        }
    };
}
```

## 3. Twig Template Configuration

Configure forms from the backend using the existing `window.formConfigs` system.

### In Twig Templates
```twig
{% include 'components/translations.twig' with {
    'formType': 'helpdesk',
    'config': {
        'helpdesk': {
            'form_summary_on_submit': true,
            'confirmation_dialog_enabled': false,
            'auto_save_enabled': true,
            'enable_fileupload': true
        }
    }
} %}
```

### Backend Configuration
```php
$config = [
    'helpdesk' => [
        'form_summary_on_submit' => true,
        'confirmation_dialog_enabled' => false,
        'auto_save_enabled' => true,
        'enable_fileupload' => true,
        'change_tracking_enabled' => true
    ]
];
```

## Enhanced Features

### HTML Content Detection and Formatting

The system now includes enhanced HTML content detection for rich text editors:

```javascript
confirmation: {
    showSummary: true,
    enableHtmlFormatting: true, // Enable HTML formatting in summaries
    customSummaryFields: {
        message: {
            label: 'Message Details',
            formatAsHtml: true,      // Format this field as HTML
            truncateAt: 500          // Truncate long content
        }
    }
}
```

### Rich Text Editor Navigation

Enhanced edit functionality that detects Quill editors and focuses on the actual editor container:

```javascript
// Automatically detects Quill editors by pattern: quill-{fieldId}
// Focuses on editor container instead of hidden textarea
```

### Custom Field Validation

Define custom validators in JavaScript configuration:

```javascript
validation: {
    customValidators: {
        phone: {
            pattern: /^[\+]?[0-9\s\-\(\)]{8,15}$/,
            message: 'Please enter a valid phone number'
        },
        subject: {
            minLength: 5,
            maxLength: 100,
            message: 'Subject must be between 5 and 100 characters'
        }
    }
}
```

## Usage Examples

### Initialize Form with Dynamic Configuration
```javascript
// Automatic configuration loading
const formHandler = await formExtensionLoader.quickSetup('helpdesk');

// Manual configuration loading
const config = await formExtensionLoader.loadFormConfiguration('helpdesk');
const formHandler = await formExtensionLoader.createFormHandler({
    formId: 'helpdesk',
    extensions: config
});
```

### Override Configuration
```javascript
// Load base configuration and override specific settings
const formHandler = await formExtensionLoader.quickSetup('helpdesk', 'helpdesk', {
    extensions: {
        confirmation: {
            requireConfirmation: true // Override to require confirmation
        }
    }
});
```

## Migration from Hardcoded Presets

### Before (Hardcoded)
```javascript
// Old way - hardcoded in FormExtensionLoader
const formHandler = await formExtensionLoader.quickSetup('helpdesk', 'helpdesk');
```

### After (Dynamic)
```javascript
// New way - automatic dynamic loading
const formHandler = await formExtensionLoader.quickSetup('helpdesk');

// Or with fallback type
const formHandler = await formExtensionLoader.quickSetup('helpdesk', 'helpdesk');
```

## Configuration Caching

The system includes configuration caching to improve performance:

- Configurations are cached after first load
- Cache is per-session (cleared on page reload)
- Reduces file system access and parsing overhead

## Debugging

Enable configuration debugging:

```javascript
// Debug configuration loading
const loader = window.formExtensionLoader;
const config = await loader.loadFormConfiguration('helpdesk');
console.log('Loaded configuration:', config);

// Check configuration sources
console.log('Configuration cache:', loader.configurationSources);
```

## Best Practices

1. **Use Data Attributes** for simple, page-specific configurations
2. **Use JavaScript Files** for complex, reusable configurations
3. **Use Twig Templates** for backend-driven configurations
4. **Keep Hardcoded Presets** only as fallbacks for undefined forms
5. **Enable HTML Formatting** for forms with rich text editors
6. **Use Custom Validators** for form-specific validation logic
7. **Cache Configurations** in production environments

## WCAG 3.3.4 Compliance

The system maintains WCAG 3.3.4 Error Prevention compliance by:

- Automatically enabling form summaries for complex forms
- Supporting confirmation dialogs for critical forms
- Providing accessible rich text formatting
- Maintaining proper focus management for rich text editors

## Testing

Use the test file `/test-dynamic-configuration.html` to verify:

- Configuration loading from all sources
- HTML content detection and formatting
- Rich text editor integration
- Form summary functionality
- Configuration priority handling

## Invoice Request Form Configuration

The invoice request form demonstrates a complete implementation of the dynamic configuration system with all sources working together.

### Data Attributes Configuration
```html
<form id="invoicerequest" method="post" action="{{ action_url }}" enctype="multipart/form-data" role="form" novalidate
      data-form-summary="true"
      data-confirmation-dialog="true" 
      data-auto-save="true"
      data-file-upload="true"
      data-real-time-validation="true"
      data-form-config='{"confirmation": {"showSummary": true, "requireConfirmation": true, "enableFileUpload": true}, "fileUpload": {"required": true, "allowedFileTypes": [".pdf", ".doc", ".docx", ".xls", ".xlsx"], "maxFileSizeMB": 15}, "validation": {"realTimeValidation": true, "wcagCompliant": true}, "autoSave": {"interval": 30000, "storageKey": "invoicerequest_autosave"}, "accessibility": {"announceErrors": true, "markRequired": true}}'>
```

### JavaScript Configuration File
Located at `/src/js/config/invoicerequest-config.js`:

```javascript
function getFormConfig(formId) {
    if (formId !== 'invoicerequest') {
        return {};
    }

    return {
        confirmation: {
            showSummary: true,
            requireConfirmation: true,
            enableFileUpload: true,
            customMessages: {
                confirmTitle: "Confirm Invoice Request Submission",
                confirmText: "Please review your invoice request details before submitting."
            }
        },
        fileUpload: {
            required: true,
            allowedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.png'],
            maxFileSizeMB: 15,
            maxFiles: 5
        },
        validation: {
            realTimeValidation: true,
            wcagCompliant: true,
            customRules: {
                invoice_date: {
                    required: true,
                    pattern: /^[A-Za-z]+ \d{4}$/,
                    message: "Please select a valid invoice month and year"
                },
                subject: {
                    required: true,
                    minLength: 10,
                    message: "Subject must be at least 10 characters long"
                }
            }
        },
        autoSave: {
            interval: 30000,
            storageKey: 'invoicerequest_autosave',
            excludeFields: ['randcheck']
        },
        accessibility: {
            announceErrors: true,
            markRequired: true,
            trackChanges: true
        }
    };
}
```

### Twig Template Configuration
The enhanced `translations.twig` component provides default configurations:

```twig
{% set defaultConfigs = {
    'invoicerequest': {
        'form_summary_on_submit': true,
        'confirmation_dialog_enabled': true,
        'auto_save_enabled': true,
        'enable_fileupload': true
    }
} %}
```

### Initialization
The invoice request form automatically uses the dynamic configuration:

```javascript
// In invoicerequest-migrated.js
formExtensionLoader.quickSetup('invoicerequest', 'invoicerequest').then(handler => {
    formHandler = handler;
    console.log('✅ Invoice request form initialized with dynamic configuration');
    initializeForm(); // Form-specific setup (datepicker, rich text editor)
});
```

## Updated Configuration Properties for Rich Text Support

### HTML Content Detection
The confirmation extension now includes enhanced HTML detection for rich text content:

```javascript
confirmation: {
    showSummary: true,
    enableHtmlFormatting: true,     // Enable HTML formatting in summaries
    htmlDetectionPatterns: [
        /<[^>]+>/,                  // HTML tags
        /&[a-zA-Z0-9#]+;/,         // HTML entities
        /<\/?(p|div|br|strong|em|ul|ol|li)[^>]*>/i, // Common HTML elements
        /class="ql-/                // Quill editor classes
    ],
    customSummaryFields: {
        message: {
            label: 'Additional Information',
            formatAsHtml: true,
            truncateAt: 500,
            allowExpansion: true
        }
    }
}
```

### Rich Text Editor Integration
Enhanced edit field functionality for Quill editors:

```javascript
// Automatically detects Quill editors and focuses on editor container
// Pattern: quill-{fieldId} for editor containers
// Improved navigation for accessibility
```

## Updated Form Templates

### Helpdesk Template
```html
<form id="helpdesk" 
      data-form-summary="true"
      data-confirmation-dialog="true" 
      data-auto-save="true"
      data-file-upload="true"
      data-real-time-validation="true">
```

### Invoice Request Template  
```html
<form id="invoicerequest" 
      data-form-summary="true"
      data-confirmation-dialog="true" 
      data-auto-save="true"
      data-file-upload="true"
      data-real-time-validation="true">
```

### Inspection Form Template
```html
<form id="inspection_1" 
      data-form-summary="true"
      data-confirmation-dialog="true" 
      data-auto-save="true"
      data-file-upload="true"
      data-real-time-validation="true">
```

## Testing the Invoice Request Configuration

Use `/test-invoicerequest-dynamic-config.html` to test:

1. **Configuration Priority**: Verify data attributes override other sources
2. **HTML Formatting**: Test rich text content detection and formatting
3. **File Upload Integration**: Verify file upload configuration
4. **Validation Rules**: Test custom validation for invoice-specific fields
5. **Auto-save Functionality**: Verify form data persistence
6. **Accessibility Features**: Test screen reader announcements and navigation

## Performance Considerations

1. **Configuration Caching**: Configurations are cached after first load
2. **Lazy Loading**: JavaScript config files are loaded on-demand
3. **Minimal Overhead**: Data attributes are parsed only once
4. **Efficient HTML Detection**: Optimized patterns for rich text content

The dynamic configuration system provides maximum flexibility while maintaining excellent performance and WCAG 3.3.4 compliance.
