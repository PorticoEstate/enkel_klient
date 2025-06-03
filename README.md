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
4. [♿ WCAG Accessibility Compliance](#-wcag-accessibility-compliance)
5. [🐛 Debug System](#-debug-system)
6. [🏗️ Form Architecture](#️-form-architecture)
7. [💻 Development Guide](#-development-guide)
8. [📚 API Reference](#-api-reference)
9. [🧑‍💻 Quickstart Guide for New Developers](#-quickstart-guide-for-new-developers)

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

## ♿ WCAG Accessibility Compliance

EnkelKlient is designed with accessibility as a core principle, implementing comprehensive WCAG 2.1 AA compliance across all components. The platform provides extensive accessibility features for users with diverse needs.

### 📋 WCAG Success Criteria Implementation

#### Level A Compliance

##### 1.1 Text Alternatives
- **1.1.1 Non-text Content**: All images, icons, and non-text elements have appropriate alternative text
  - Implemented in: `accessibility-helpers.js`, `form-accessibility.js`
  - Screen reader descriptions for all interactive elements
  - Alt text for decorative and informative images

##### 1.3 Adaptable
- **1.3.1 Info and Relationships**: Semantic structure preserved programmatically
  - Proper heading hierarchy (h1-h6)
  - ARIA landmarks and roles
  - Form labels explicitly associated with controls
  - Table headers properly marked with scope attributes

##### 1.4 Distinguishable  
- **1.4.1 Use of Color**: Information not conveyed by color alone
  - Error states use both color and text/icons
  - Required fields marked with asterisk and aria-required
- **1.4.2 Audio Control**: No auto-playing audio elements

##### 2.1 Keyboard Accessible
- **2.1.1 Keyboard**: All functionality available via keyboard
  - Tab navigation through all interactive elements
  - Keyboard shortcuts: Alt+N/E (language), Alt+T/R (text spacing)
  - Enter/Space activation for buttons and controls
- **2.1.2 No Keyboard Trap**: No keyboard focus traps in any component
- **2.1.4 Character Key Shortcuts**: Keyboard shortcuts can be disabled or remapped

##### 2.4 Navigable
- **2.4.1 Bypass Blocks**: Skip navigation links provided
- **2.4.2 Page Titled**: Descriptive page titles in both languages
- **2.4.3 Focus Order**: Logical tab order throughout forms
- **2.4.4 Link Purpose**: Link purposes clear from context

##### 3.1 Readable
- **3.1.1 Language of Page**: Page language properly declared (`<html lang="no">` or `<html lang="en">`)
- **3.1.2 Language of Parts**: Language changes announced to screen readers

##### 3.2 Predictable
- **3.2.1 On Focus**: No unexpected context changes on focus
- **3.2.2 On Input**: No unexpected context changes on input

##### 3.3 Input Assistance
- **3.3.1 Error Identification**: Errors clearly identified with descriptive text
- **3.3.2 Labels or Instructions**: All form fields have clear labels and instructions

##### 4.1 Compatible
- **4.1.1 Parsing**: Valid, semantic HTML markup
- **4.1.2 Name, Role, Value**: All UI components have accessible names and roles

#### Level AA Compliance

##### 1.4 Distinguishable
- **1.4.3 Contrast (Minimum)**: 4.5:1 contrast ratio for normal text, 3:1 for large text
  - Implemented in: `common.css`, high-contrast themes
- **1.4.4 Resize Text**: Text resizable up to 200% without loss of functionality
- **1.4.5 Images of Text**: Minimal use of text images, CSS text preferred
- **1.4.11 Non-text Contrast**: 3:1 contrast for UI components and graphics
- **1.4.12 Text Spacing**: Enhanced text spacing mode (Alt+T)
  - Line height: 1.5x
  - Letter spacing: 0.12em
  - Word spacing: 0.16em
  - Paragraph spacing: 2x font size
- **1.4.13 Content on Hover or Focus**: Dismissible, hoverable, persistent

##### 2.4 Navigable
- **2.4.5 Multiple Ways**: Multiple navigation methods provided
- **2.4.6 Headings and Labels**: Descriptive headings and labels
- **2.4.7 Focus Visible**: Clear focus indicators on all interactive elements

##### 3.1 Readable
- **3.1.2 Language of Parts**: Mixed language content properly marked

##### 3.2 Predictable
- **3.2.3 Consistent Navigation**: Navigation consistent across pages
- **3.2.4 Consistent Identification**: Components identified consistently

##### 3.3 Input Assistance
- **3.3.3 Error Suggestion**: Specific error correction suggestions provided
- **3.3.4 Error Prevention (Legal, Financial, Data)**: Comprehensive error prevention
  - Form review before submission
  - Confirmation dialogs for critical actions
  - Auto-save to prevent data loss
  - Detailed implementation in: `WCAG_334_IMPLEMENTATION_COMPLETE.md`

##### 4.1 Compatible
- **4.1.3 Status Messages**: Status changes announced to assistive technology

### 🔧 Implementation Features

#### Screen Reader Support
- **ARIA Labels and Descriptions**: Comprehensive ARIA attributes
- **Live Regions**: Dynamic content changes announced
- **Screen Reader Testing**: Tested with NVDA, JAWS, and VoiceOver
- **Language-Specific Announcements**: Messages in current page language

#### Keyboard Navigation
- **Tab Order**: Logical navigation flow
- **Focus Management**: Focus moved appropriately after actions
- **Keyboard Shortcuts**: 
  - `Alt+N`: Switch to Norwegian
  - `Alt+E`: Switch to English  
  - `Alt+T`: Toggle enhanced text spacing
  - `Alt+R`: Reset text spacing
- **Bypass Navigation**: Skip links for main content

#### Form Accessibility
- **Label Association**: All form controls properly labeled
- **Required Field Indication**: Visual and programmatic indication
- **Error Handling**: Clear error identification and suggestions
- **Field Validation**: Real-time validation with accessible feedback
- **Auto-Save**: Prevents data loss, announced to screen readers

#### Visual Accessibility
- **High Contrast**: Sufficient color contrast ratios
- **Text Spacing**: Customizable text spacing (WCAG 1.4.12)
- **Focus Indicators**: Clear visual focus indicators
- **Responsive Design**: Works across different screen sizes and zoom levels

#### Language Accessibility
- **Multilingual Support**: Complete Norwegian/English interface
- **Language Detection**: Automatic language detection and switching
- **Translation Quality**: Professional translations maintaining meaning
- **RTL Support**: Ready for right-to-left languages

### 📊 Accessibility Testing

#### Automated Testing
- **axe-core Integration**: Automated accessibility scanning
- **HTML Validation**: W3C markup validation
- **Color Contrast**: Automated contrast ratio checking

#### Manual Testing
- **Screen Reader Testing**: NVDA, JAWS, VoiceOver
- **Keyboard Navigation**: Tab, arrow keys, shortcuts
- **Zoom Testing**: Up to 200% zoom
- **Color Blindness**: Tested with color vision simulators

#### User Testing
- **Disability Community**: Feedback from users with disabilities
- **Assistive Technology**: Testing with various AT devices
- **Cognitive Load**: Usability testing for cognitive accessibility

### 📁 Implementation Files

#### Core Accessibility Files
- `src/js/accessibility-helpers.js` - Main accessibility functions
- `src/js/extensions/form-accessibility.js` - Form-specific accessibility
- `src/css/common.css` - WCAG-compliant styling
- `docs/language-accessibility.md` - Language accessibility documentation
- `WCAG_334_IMPLEMENTATION_COMPLETE.md` - WCAG 3.3.4 detailed implementation

#### Testing and Documentation
- `docs/wcag-implementation.md` - General WCAG implementation guide
- `docs/wcag-334-implementation.md` - Technical WCAG 3.3.4 guide
- Multiple test files ensuring accessibility compliance

### 🎯 Accessibility Goals

#### Current Status: WCAG 2.1 AA Compliant
- ✅ All Level A criteria implemented
- ✅ All Level AA criteria implemented
- ✅ Comprehensive testing completed
- ✅ User feedback incorporated

#### Ongoing Improvements
- 🔄 WCAG 2.2 compliance assessment
- 🔄 Additional assistive technology testing
- 🔄 Performance optimization for AT
- 🔄 Advanced voice control support

### 💡 Accessibility Best Practices

#### For Developers
```javascript
// Always provide accessible names
<button aria-label="Close dialog">×</button>

// Use semantic HTML
<main role="main">
<nav role="navigation">
<section aria-labelledby="section-heading">

// Announce dynamic changes
announceToScreenReader('Form saved successfully', 'polite');

// Handle focus management
focusFirstError();
returnFocusToTrigger();
```

#### For Content Creators
- Use descriptive headings
- Provide alternative text for images
- Write clear, simple language
- Test with keyboard navigation
- Verify color contrast

### 🏆 Accessibility Recognition

EnkelKlient's accessibility implementation serves as a reference for:
- Municipal web accessibility compliance
- WCAG 2.1 AA implementation patterns
- Multilingual accessibility solutions
- Progressive enhancement techniques

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

1. **Create a form configuration:**
   - Add a new config file in `src/configs/` (e.g., `myform.php`).
   - Define your form fields, validation rules, and settings in this file.
2. **Create a template:**
   - Add a new Twig template in `src/templates/` or `src/templates/components/`.
   - Reference your form fields using the configuration keys.
3. **Register the form route:**
   - Add a new route in `src/routes/` to serve your form.
4. **(Optional) Add a controller:**
   - If your form needs custom logic, add a controller in `src/Controller/`.

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

---

## 🔗 Relationship to PorticoEstate-v2

This project (EnkelKlient) serves as a modern frontend for selected modules and workflows of the [PorticoEstate-v2](https://github.com/PorticoEstate/PorticoEstate-v2) property management system. It provides a user-friendly, accessible, and mobile-ready interface for forms and processes that are powered by the PorticoEstate-v2 backend. Data submitted through EnkelKlient forms is processed and stored by PorticoEstate-v2 APIs and services.

---

## 📤 Two-Phase Form Submission (with File Attachments)

EnkelKlient supports a robust two-phase form submission process for forms that include file uploads:

1. **Phase 1: Submit Form Data**
   - The user reviews and submits all non-file form fields.
   - The form data is sent to the backend and a record is created (with a unique ID).
   - After successful submission, the form fields are locked to prevent further editing.

2. **Phase 2: Upload Files**
   - The user uploads any required files, which are attached to the previously created record.
   - File uploads are tracked with progress indicators and error handling.
   - Only after all files are uploaded is the submission process considered complete.

**Why two phases?**
- This approach ensures that form data is never lost due to file upload errors or interruptions.
- It allows for better error handling, user feedback, and compliance with accessibility standards.
- Users can retry file uploads without re-entering all form data.

**User Experience:**
- The UI guides users through both phases, showing clear progress and locking fields after Phase 1.
- If no files are attached, the form is submitted in a single step.

For technical details, see `src/js/extensions/form-confirmation.js` and the [docs/](docs/) folder.

---

## 🧑‍💻 Quickstart Guide for New Developers

Welcome to EnkelKlient! This guide will help you get started quickly and explains how to add new forms, translations, and features.

### 1. Project Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url> enkel_klient
   cd enkel_klient
   ```
2. **Install dependencies:**
   ```bash
   composer install
   ```
3. **Start the development environment:**
   ```bash
   docker-compose up --build
   # Or run locally
   php -S localhost:8080 -t public
   ```

### 2. Adding a New Form

1. **Create a form configuration:**
   - Add a new config file in `src/configs/` (e.g., `myform.php`).
   - Define your form fields, validation rules, and settings in this file.
2. **Create a template:**
   - Add a new Twig template in `src/templates/` or `src/templates/components/`.
   - Reference your form fields using the configuration keys.
3. **Register the form route:**
   - Add a new route in `src/routes/` to serve your form.
4. **(Optional) Add a controller:**
   - If your form needs custom logic, add a controller in `src/Controller/`.

### 3. Adding a New Translation

1. **Edit translation files:**
   - Open `src/translations/en.php` and `src/translations/no.php`.
   - Add your new keys under the appropriate section (e.g., `'myform' => ['title' => 'My Form Title']`).
2. **Use translations in templates:**
   - In Twig: `{{ __('title', 'myform') }}`
   - In PHP: `__('title', 'myform')`
   - In JavaScript: `translations.myform.title`
3. **Validate translations:**
   - Run:
     ```bash
     php scripts/validate-translation-keys.php
     ```
   - Fix any missing or unused keys as reported.

### 4. Adding a New Feature or Extension

1. **Create a new extension module:**
   - Add a JS file in `src/js/extensions/` (e.g., `my-feature.js`).
   - Export your feature as a module or function.
2. **Integrate with the form system:**
   - Import and register your extension in the main form handler or relevant entry point.
3. **Document your feature:**
   - Add usage instructions and configuration options to the documentation.
4. **Test your feature:**
   - Add or update tests in `tests/` as needed.

### 5. Useful Scripts

- **Extract translation keys:**
  ```bash
  php scripts/extract-translation-keys.php
  ```
- **Validate translation keys:**
  ```bash
  php scripts/validate-translation-keys.php
  ```
- **Cleanup unused translation keys:**
  ```bash
  php scripts/cleanup-unused-translation-keys.php
  ```
- **Add missing translation keys:**
  ```bash
  php scripts/add-missing-translation-keys.php
  ```

---

For more details, see the [docs/](docs/) folder and inline comments in the codebase.
