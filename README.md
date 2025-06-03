# EnkelKlient - Modern Web Forms Platform

EnkelKlient is a clean, accessible web forms platform built with modern architecture principles. The system features a comprehensive internationalization framework, robust debugging capabilities, and WCAG 3.3.4 compliant forms for municipal services.

## 🚀 Key Features

- **🌐 Multilingual Support**: Complete Norwegian/English translation system
- **🐛 Advanced Debug System**: Persistent debugging with source file identification
- **♿ Accessibility First**: WCAG 3.3.4 compliant with screen reader support
- **⌨️ Keyboard Shortcuts**: Alt+N/E for language switching, Alt+T/R for text spacing
- **🔧 Extension Architecture**: Modular form system with clean separation of concerns
- **💾 Auto-Save**: Persistent form drafts with localStorage integration
- **📱 Responsive Design**: Mobile-first approach with modern UI components

## 📋 Table of Contents

1. [🚀 Quick Start](#-quick-start)
2. [🌐 Translation System](#-translation-system)
3. [⌨️ Keyboard Shortcuts](#️-keyboard-shortcuts)
4. [🐛 Debug System](#-debug-system)
5. [🏗️ Form Architecture](#️-form-architecture)
6. [💻 Development Guide](#-development-guide)
7. [📚 API Reference](#-api-reference)

---

## 🚀 Quick Start

### Prerequisites

- PHP 8.0+
- Composer
- Docker & Docker Compose (recommended)

### Installation

```bash
# Clone and setup
git clone <repository-url> enkel_klient
cd enkel_klient
composer install

# Start development environment
docker-compose up --build

# Or run locally
php -S localhost:8080 -t public
```

### Project Structure

```text
enkel_klient/
├── src/
│   ├── js/
│   │   ├── base.js              # Core system & debug
│   │   ├── extensions/          # Modular form components
│   │   │   ├── form-validation.js
│   │   │   ├── form-autosave.js
│   │   │   ├── form-confirmation.js
│   │   │   └── file-upload.js
│   │   └── accessibility-helpers.js
│   ├── translations/
│   │   ├── en.php              # English translations
│   │   └── no.php              # Norwegian translations
│   └── templates/
│       └── components/
│           └── translations.twig  # Translation bridge
└── public/
```

---

## 🌐 Translation System

EnkelKlient includes a comprehensive translation system supporting Norwegian (no) and English (en) with automatic language detection and persistence.

### Features

- **Automatic Language Detection**: Based on browser settings and user preferences
- **Real-time Language Switching**: Alt+N (Norwegian) / Alt+E (English) keyboard shortcuts
- **Screen Reader Support**: Language-specific announcements for accessibility
- **Persistent Preferences**: Language choice saved across sessions
- **Nested Translation Keys**: Organized by form type and component

### Translation Structure

#### Backend (PHP)

```php
// src/translations/en.php
return [
    'common' => [
        'field_required' => 'is required',
        'invalid_email' => 'Please enter a valid email address',
        'invalid_phone' => 'Please enter a valid phone number',
    ],
    'helpdesk' => [
        'form_header' => 'Form for reporting errors and deficiencies',
        'title' => 'Errors and deficiencies',
        'description' => 'Report errors and deficiencies for property or tenancy.',
    ],
    'form_confirmation' => [
        'review_title' => 'Review your information',
        'submit_button' => 'Submit form',
    ]
];
```

#### Frontend (JavaScript)

```javascript
// Translations automatically available in JavaScript
window.translations = {
    field_required: "is required",
    form_confirmation: {
        review_title: "Review your information",
        submit_button: "Submit form"
    },
    file_upload: {
        file_too_large: "File is too large. Maximum size is {maxSize}MB",
        allowed_types: "Allowed file types: {types}"
    }
};

// Using translations in JavaScript
const message = translations.form_confirmation.review_title;
const errorMsg = translations.file_upload.file_too_large
    .replace('{maxSize}', '10');
```

### Adding New Translations

1. **Add to PHP files**:

   ```php
   // src/translations/en.php & no.php
   'new_form' => [
       'title' => 'New Form Title',
       'description' => 'Form description text'
   ]
   ```

2. **Use in templates**:

   ```twig
   {{ __('title', 'new_form') }}
   {{ __('description', 'new_form') }}
   ```

3. **Access in JavaScript**:

   ```javascript
   const title = translations.new_form?.title || 'Fallback title';
   ```

### Language Switching

#### Manual Control

```javascript
// Switch language programmatically
document.documentElement.lang = 'en'; // or 'no'

// Announce change to screen readers
announceLangChange('en');
```

#### Keyboard Shortcuts

- **Alt+N**: Switch to Norwegian
- **Alt+E**: Switch to English

#### URL Parameters

```text
# Set language via URL
/?lang=en
/?lang=no
```

---

## ⌨️ Keyboard Shortcuts

EnkelKlient provides comprehensive keyboard shortcuts for improved accessibility and productivity, with full screen reader support.

### Available Shortcuts

#### Language Switching
- **Alt+N**: Switch to Norwegian (Norsk)
- **Alt+E**: Switch to English

#### Text Accessibility
- **Alt+T**: Toggle enhanced text spacing (WCAG 2.1 Success Criterion 1.4.12)
- **Alt+R**: Reset text spacing to default

#### Standard Navigation
- **Tab**: Navigate through interactive elements
- **Shift+Tab**: Navigate backwards through interactive elements
- **Enter**: Activate buttons and submit forms
- **Space**: Activate buttons and checkboxes
- **Arrow Keys**: Navigate within menus, tabs, and radio button groups

### Features

#### Automatic Announcement
- **Available shortcuts announced on page load** (2 seconds after initialization)
- **Language-specific announcements**: Shortcuts are announced in the current page language
- **Screen reader feedback**: Each shortcut action provides audio feedback

#### Language Switching Behavior
```javascript
// Alt+N for Norwegian
if (e.altKey && e.key === 'n') {
    // Announces: "Switching to Norwegian..." or "Bytter til norsk..."
    // Triggers language change with proper screen reader feedback
}

// Alt+E for English  
if (e.altKey && e.key === 'e') {
    // Announces: "Switching to English..." or "Bytter til engelsk..."
    // Triggers language change with proper screen reader feedback
}
```

#### Text Spacing Features
```javascript
// Alt+T for toggle
if (e.altKey && e.key === 't') {
    // Toggles enhanced text spacing
    // Announces: "Text spacing enabled" or "Tekstmellomrom aktivert"
    // Implements WCAG 2.1 requirements:
    // - Line height: 1.5
    // - Letter spacing: 0.12em
    // - Word spacing: 0.16em
}

// Alt+R for reset
if (e.altKey && e.key === 'r') {
    // Resets to default spacing
    // Announces: "Text spacing reset to default" or "Tekstmellomrom tilbakestilt"
}
```

### Implementation Details

#### Screen Reader Announcements
```javascript
// Shortcuts announced on page load
setTimeout(() => {
    const currentLang = document.documentElement.lang || 'no';
    let shortcutMessage;
    
    if (currentLang === 'en') {
        shortcutMessage = 'Keyboard shortcuts available: Alt+N for Norwegian, Alt+E for English, Alt+T to toggle text spacing, Alt+R to reset text spacing';
    } else {
        shortcutMessage = 'Tastatursnarveier tilgjengelig: Alt+N for norsk, Alt+E for engelsk, Alt+T for å slå på/av tekstmellomrom, Alt+R for å tilbakestille tekstmellomrom';
    }
    
    announceToScreenReader(shortcutMessage, 'polite', 3000);
}, 2000);
```

#### Persistent Preferences
- **Language choice**: Saved across sessions
- **Text spacing**: Remembered using localStorage
- **Auto-restoration**: Settings applied automatically on page load

#### WCAG Compliance
- **Success Criterion 2.1.1**: Keyboard accessible
- **Success Criterion 2.1.2**: No keyboard trap
- **Success Criterion 1.4.12**: Text spacing (enhanced mode)
- **Success Criterion 3.3.4**: Error prevention (language switching confirmations)

### Accessibility Benefits

#### For Screen Reader Users
- **Clear announcements** for all shortcut actions
- **Language-specific feedback** in appropriate language
- **Progress indicators** during language switching
- **Immediate confirmation** of setting changes

#### For Motor Impaired Users
- **Single-key combinations** (Alt + letter)
- **No complex key sequences** required
- **Consistent shortcut patterns**
- **Alternative to mouse-based controls**

#### For Cognitive Accessibility
- **Predictable shortcuts** across all pages
- **Audio confirmation** of actions
- **Visual feedback** for text spacing changes
- **Consistent behavior** throughout the application

### Testing Shortcuts

```javascript
// Test keyboard shortcuts programmatically
document.dispatchEvent(new KeyboardEvent('keydown', {
    altKey: true,
    key: 'n'  // Test Norwegian switch
}));

document.dispatchEvent(new KeyboardEvent('keydown', {
    altKey: true, 
    key: 't'  // Test text spacing toggle
}));
```

---

## 🐛 Debug System

The debug system provides comprehensive logging with source file identification and persistent settings across page reloads.

### Debug Features

- **5 Debug Levels**: error, warn, info, debug, trace
- **Source File Tracking**: Shows actual caller file instead of `base.js`
- **Persistent Settings**: Debug level saved to localStorage
- **URL Parameter Control**: Enable/disable via URL
- **Stack Trace Analysis**: Advanced caller identification

### Usage

#### URL Parameter Control

```text
# Enable debug with specific level
/?debug=trace
/?debug=info
/?debug=debug

# Clear debug settings
/?debug=clear

# Enable with default level
/?debug=1
/?debug=true
```

#### JavaScript API

```javascript
// Set debug level
Debug.setLevel('debug');

// Log at different levels
Debug.error('Critical error occurred');
Debug.warn('Warning: deprecated function');
Debug.info('Form initialized successfully');
Debug.debug('Processing user input', formData);
Debug.trace('Detailed execution flow', callStack);

// Get current settings
Debug.getLevel();        // Returns current level
Debug.isEnabled();       // Returns boolean

// Persistence management
Debug.saveToLocalStorage();    // Manual save
Debug.clearFromLocalStorage(); // Manual clear
```

#### Debug Output

Debug messages include source file and line number:

```text
[EnkelKlient] [DEBUG] 2025-01-03T15:52:58.557Z 📁 Form validation started [from: form-validation.js:156]
[EnkelKlient] [INFO] 2025-01-03T15:52:58.612Z ✅ Auto-save enabled [from: form-autosave.js:89]
[EnkelKlient] [TRACE] 2025-01-03T15:52:58.734Z 🔍 File upload initialized [from: file-upload.js:234]
```

#### Implementation Details

The debug system uses advanced stack trace parsing:

```javascript
function getCallerInfo() {
    const stack = new Error().stack;
    const lines = stack.split('\n');
    
    // Skip base.js frames to find actual caller
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.includes('base.js') && line.includes('.js')) {
            return parseStackLine(line);
        }
    }
}
```

### Debug Levels

1. **error** (0): Critical errors only
2. **warn** (1): Warnings and errors
3. **info** (2): General information, warnings, and errors
4. **debug** (3): Debug messages and above
5. **trace** (4): All messages including detailed execution traces

---

## 🏗️ Form Architecture

EnkelKlient uses a modular extension system where each form component is a self-contained module.

### Extension System

#### Core Extensions

1. **FormValidationExtension**: Real-time form validation
2. **FormAutoSaveExtension**: Automatic draft saving
3. **FormConfirmationExtension**: WCAG 3.3.4 error prevention
4. **FileUploadExtension**: Multi-file upload with progress
5. **AccessibilityHelpers**: Screen reader support

#### Extension Registration

```javascript
// Register an extension
ExtensionManager.register('MyFormExtension', {
    init() {
        Debug.info('MyFormExtension initialized');
        this.bindEvents();
    },
    
    bindEvents() {
        // Event handling logic
    },
    
    getTranslation(key, fallback) {
        // Translation helper
        return window.translations[key] || fallback;
    }
});

// Initialize all extensions
ExtensionManager.initializeAll();
```

### Form Implementation Pattern

```javascript
const HelpdeskFormHandler = {
    init() {
        Debug.info('Helpdesk form initializing');
        this.bindEvents();
        this.setupValidation();
        this.enableAutoSave();
    },
    
    bindEvents() {
        $('#helpdesk-form').on('submit', this.handleSubmit.bind(this));
    },
    
    handleSubmit(e) {
        e.preventDefault();
        if (this.validateForm()) {
            this.submitForm();
        }
    },
    
    validateForm() {
        const validation = ExtensionManager.get('FormValidationExtension');
        return validation ? validation.validateForm() : true;
    },
    
    enableAutoSave() {
        const autoSave = ExtensionManager.get('FormAutoSaveExtension');
        if (autoSave) {
            autoSave.enable();
        }
    }
};

// Register with extension system
ExtensionManager.register('HelpdeskFormHandler', HelpdeskFormHandler);
```

### WCAG 3.3.4 Compliance

All forms implement error prevention through:

- **Form Summary**: Review before submission
- **Confirmation Dialogs**: Explicit submit confirmation
- **Auto-Save**: Prevent data loss
- **Real-time Validation**: Immediate feedback
- **Screen Reader Support**: Comprehensive ARIA labels

---

## 💻 Development Guide

### Adding a New Form

1. **Create form JavaScript file**:

   ```javascript
   // src/js/my-new-form.js
   const MyNewFormHandler = {
       init() {
           Debug.info('MyNewForm initialized');
           this.setupTranslations();
           this.bindEvents();
       },
       
       setupTranslations() {
           this.translations = window.translations.my_new_form || {};
       },
       
       bindEvents() {
           // Form-specific event handling
       }
   };
   
   ExtensionManager.register('MyNewFormHandler', MyNewFormHandler);
   ```

2. **Add translations**:

   ```php
   // src/translations/en.php & no.php
   'my_new_form' => [
       'title' => 'My New Form',
       'submit_button' => 'Submit Form'
   ]
   ```

3. **Create template with translation bridge**:

   ```twig
   {% include 'components/translations.twig' with {'formType': 'my_new_form'} %}
   <script src="js/my-new-form.js"></script>
   ```

### Translation Best Practices

- **Use nested keys** for organization: `form_name.field_name`
- **Include context** in key names: `error_required_field` vs `required`
- **Provide fallbacks** in JavaScript: `translations.key || 'Default text'`
- **Test both languages** thoroughly
- **Use placeholders** for dynamic content: `'Hello {name}'`

### Debug Integration

```javascript
// Add debug statements for troubleshooting
Debug.debug('Form field updated', { field: fieldName, value: fieldValue });
Debug.trace('Validation result', validationResults);

// Error handling with debug output
try {
    this.processFormData();
} catch (error) {
    Debug.error('Form processing failed', error);
    throw error;
}
```

### Accessibility Guidelines

- **Always provide** `aria-label` or `aria-describedby`
- **Test with screen readers** (NVDA, JAWS, VoiceOver)
- **Use semantic HTML** elements
- **Provide keyboard navigation**
- **Include language attributes** for mixed-language content

---

## 📚 API Reference

### Debug API

```javascript
// Core debug methods
Debug.setLevel(level)           // Set debug level
Debug.getLevel()                // Get current level
Debug.isEnabled()               // Check if debug is enabled
Debug.saveToLocalStorage()      // Persist settings
Debug.clearFromLocalStorage()   // Clear settings

// Logging methods
Debug.error(message, ...args)   // Log error level
Debug.warn(message, ...args)    // Log warning level
Debug.info(message, ...args)    // Log info level
Debug.debug(message, ...args)   // Log debug level
Debug.trace(message, ...args)   // Log trace level
```

### Extension Manager API

```javascript
// Extension management
ExtensionManager.register(name, extension)  // Register extension
ExtensionManager.get(name)                  // Get extension instance
ExtensionManager.initializeAll()           // Initialize all extensions
ExtensionManager.getRegistered()           // List all registered extensions
```

### Translation API

```javascript
// Access translations
window.translations.key                     // Direct access
window.translations.form_name.field_name    // Nested access

// Extension translation helper
extension.getTranslation(key, fallback)     // With fallback
```

### Accessibility API

```javascript
// Screen reader announcements
announceToScreenReader(message, priority, timeout, lang)

// Language switching
announceLangChange(lang)                    // Announce language change
setupLanguageChangeObserver()              // Setup language observer
addLanguageKeyboardShortcuts()             // Enable Alt+N/Alt+E shortcuts
```

---

## 🔧 Configuration

### Form Configuration

```javascript
// Per-form configuration
window.formConfigs = {
    'helpdesk': {
        form_summary_on_submit: true,
        confirmation_dialog_enabled: true,
        auto_save_enabled: true,
        enable_fileupload: true
    },
    'inspection': {
        form_summary_on_submit: true,
        confirmation_dialog_enabled: true,
        auto_save_enabled: true,
        enable_fileupload: true
    }
};
```

### Debug Configuration

```javascript
// Debug persistence settings
localStorage.setItem('enkel_debug', 'true');
localStorage.setItem('enkel_debug_level', 'debug');
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Test both Norwegian and English languages
- [ ] Verify debug output shows correct source files
- [ ] Test keyboard navigation (Tab, Enter, Arrow keys)
- [ ] Test keyboard shortcuts (Alt+N, Alt+E, Alt+T, Alt+R)
- [ ] Verify screen reader announcements
- [ ] Test auto-save functionality
- [ ] Validate form submission flow
- [ ] Check accessibility compliance (WCAG 3.3.4)

### Debug Testing

```javascript
// Enable comprehensive debugging
Debug.setLevel('trace');

// Test debug persistence
localStorage.clear();
window.location.href = '/?debug=info';
// Verify debug level persists after page reload
```

---

## 🏆 Project Statistics

- **🌐 Languages**: 2 (Norwegian, English)
- **📝 Forms**: 4 main forms (helpdesk, inspection, key ordering, invoice)
- **🧩 Extensions**: 5 core extensions
- **⌨️ Keyboard Shortcuts**: 4 main shortcuts (Alt+N, Alt+E, Alt+T, Alt+R)
- **♿ WCAG Level**: AA compliant (3.3.4 Error Prevention)
- **📊 Translation Keys**: 300+ organized keys
- **🐛 Debug Levels**: 5 comprehensive levels

---

*EnkelKlient - Modern, accessible, multilingual web forms for municipal services.*
