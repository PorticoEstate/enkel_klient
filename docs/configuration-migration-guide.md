# Migration Guide: From Hardcoded to Dynamic Configuration

This guide shows how to migrate existing forms from hardcoded presets to dynamic configuration.

## Example: Helpdesk Form Migration

### Before: Hardcoded Configuration

**In FormExtensionLoader (old way):**
```javascript
helpdesk: {
  fileUpload: {
    required: false,
    allowedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png'],
    maxFileSizeMB: 10
  },
  validation: {
    realTimeValidation: true,
    wcagCompliant: true
  },
  accessibility: {
    announceErrors: true,
    markRequired: true
  },
  confirmation: {
    showSummary: true,
    enableFileUpload: true
  }
}
```

**In Template:**
```html
<form id="helpdesk" method="post" action="{{ action_url }}">
```

**In JavaScript:**
```javascript
const formHandler = await formExtensionLoader.quickSetup('helpdesk', 'helpdesk');
```

### After: Dynamic Configuration

#### Option 1: Data Attributes (Recommended for simple forms)

**Update Template:**
```html
<form id="helpdesk" method="post" action="{{ action_url }}"
      data-form-summary="true"
      data-file-upload="true"
      data-real-time-validation="true"
      data-auto-save="true">
```

**JavaScript (simplified):**
```javascript
const formHandler = await formExtensionLoader.quickSetup('helpdesk');
```

#### Option 2: JavaScript Configuration File (Recommended for complex forms)

**Create `/src/js/config/forms/helpdesk.js`:**
```javascript
function getFormConfig(formId) {
    return {
        fileUpload: {
            required: false,
            allowedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png'],
            maxFileSizeMB: 10,
            dragDropEnabled: true,
            previewEnabled: true
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
            enableFileUpload: true,
            enableHtmlFormatting: true, // NEW: Support rich text
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

**JavaScript (same):**
```javascript
const formHandler = await formExtensionLoader.quickSetup('helpdesk');
```

#### Option 3: Twig Template Configuration (Backend-driven)

**Update Twig Include:**
```twig
{% include 'components/translations.twig' with {
    'formType': 'helpdesk',
    'config': {
        'helpdesk': {
            'form_summary_on_submit': true,
            'confirmation_dialog_enabled': false,
            'auto_save_enabled': true,
            'enable_fileupload': true,
            'change_tracking_enabled': true
        }
    }
} %}
```

**JavaScript (same):**
```javascript
const formHandler = await formExtensionLoader.quickSetup('helpdesk');
```

## Rich Text Editor Enhancement

### Before: Basic textarea handling
```javascript
// Old confirmation extension would show raw HTML
"<p>This is <strong>bold</strong> text</p>"
```

### After: Enhanced HTML formatting
```javascript
// New confirmation extension formats HTML properly
// Shows: "This is bold text" with proper styling
// Detects Quill editors automatically
// Provides "Edit" button that focuses on rich text editor
```

### Configuration for Rich Text Support
```javascript
confirmation: {
    showSummary: true,
    enableHtmlFormatting: true,  // Enable HTML content formatting
    customSummaryFields: {
        message: {
            label: 'Message Details',
            formatAsHtml: true,      // This field contains HTML
            truncateAt: 500          // Truncate long content
        },
        description: {
            label: 'Description',
            formatAsHtml: true,
            showFullContentButton: true // Show "Show full content" for long text
        }
    }
}
```

## Step-by-Step Migration Process

### 1. Identify Current Configuration
- Find the form's hardcoded preset in `FormExtensionLoader.getRecommendedExtensions()`
- Note all extension configurations

### 2. Choose Configuration Method
- **Data Attributes**: Simple forms with basic configuration
- **JavaScript Files**: Complex forms with custom logic
- **Twig Templates**: Backend-driven configuration needs

### 3. Create Configuration
- Remove from hardcoded presets (optional - they remain as fallback)
- Create new configuration using chosen method
- Test the configuration

### 4. Update Form Initialization
- Change from `quickSetup('formId', 'preset')` to `quickSetup('formId')`
- The system will automatically detect and load the configuration

### 5. Test Enhanced Features
- Test HTML content detection with rich text editors
- Verify "Edit" button navigation to Quill editors
- Check form summary with HTML formatting
- Validate configuration priority order

## Benefits of Migration

1. **Maintainability**: Configurations are closer to their usage
2. **Flexibility**: Multiple configuration sources
3. **Performance**: Configurations only loaded when needed
4. **Rich Text Support**: Enhanced HTML content handling
5. **WCAG Compliance**: Better accessibility with rich text editors
6. **Debugging**: Clear configuration source identification

## Backward Compatibility

The system maintains backward compatibility:
- Existing hardcoded presets still work as fallbacks
- Old initialization code continues to function
- Gradual migration is possible

## Testing Your Migration

Use the test file to verify:
```bash
# Open the test page
open test-dynamic-configuration.html

# Check browser console for configuration loading messages
# Verify form summary shows HTML content properly
# Test "Edit" button navigation to rich text editors
```

## Common Migration Patterns

### Pattern 1: Simple Form (Data Attributes)
```html
<!-- Before -->
<form id="contact">

<!-- After -->
<form id="contact" 
      data-form-summary="true" 
      data-real-time-validation="true">
```

### Pattern 2: Complex Form (JavaScript File)
```javascript
// Before: Configuration scattered in FormExtensionLoader

// After: Dedicated config file
// /src/js/config/forms/contact.js
function getFormConfig(formId) {
    return { /* detailed configuration */ };
}
```

### Pattern 3: Backend-Driven (Twig Template)
```php
// Backend controller
$formConfig = [
    'contact' => [
        'form_summary_on_submit' => $userPreferences->showSummary,
        'auto_save_enabled' => $userRole === 'admin'
    ]
];
```

This approach provides maximum flexibility while maintaining clean, maintainable code.
