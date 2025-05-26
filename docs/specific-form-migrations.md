# Specific Form Migration Examples

## 🎯 Helpdesk Form Migration

### Before (Bloated - Current)
```javascript
// Current helpdesk.js - Using bloated FormHandler
formHandler = new FormHandler({
    formId: 'helpdesk',
    redirectUrl: redirect_action,
    uploadUrl: `${strBaseURL}/helpdesk/upload`,
    fileRequired: false,
    customHandlers: {
        preValidate: function() {
            return true;
        }
    }
});

// Loads 1,950+ lines even though we only need:
// - Basic form submission
// - Optional file upload
// - Simple validation
```

### After (Clean - Recommended)
```javascript
// New helpdesk.js - Using core + minimal extensions
const formHandler = new FormHandler({
    formId: 'helpdesk',
    redirectUrl: `${strBaseURL}/helpdesk`,
    extensions: {
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
        }
    }
});

// Benefits:
// ✅ ~400 lines total vs 1,950+ lines (80% reduction)
// ✅ Only loads needed features
// ✅ Easier to maintain and debug
// ✅ Better performance
```

---

## 🧾 Invoice Request Form Migration

### Before (Bloated - Current)  
```javascript
// Current invoicerequest.js - Using bloated FormHandler
formHandler = new FormHandler({
    formId: 'invoicerequest',
    redirectUrl: redirect_action,
    uploadUrl: `${strBaseURL}/invoicerequest/upload`,
    fileRequired: true,
    customHandlers: {
        preValidate: function() {
            return true;
        }
    }
});

// Problems:
// - Loads entire bloated class (1,950+ lines)
// - All features loaded whether needed or not
// - Complex validation system for simple needs
// - Hard to customize or extend
```

### After (Clean - Recommended)
```javascript
// New invoicerequest.js - Using core + required extensions
const formHandler = new FormHandler({
    formId: 'invoicerequest',
    redirectUrl: `${strBaseURL}/invoicerequest`,
    extensions: {
        fileUpload: {
            required: true,
            allowedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
            maxFileSizeMB: 15
        },
        validation: {
            realTimeValidation: true,
            wcagCompliant: true,
            rules: {
                'invoice_number': 'required',
                'amount': 'required|numeric',
                'description': 'required|min:10'
            }
        },
        autoSave: {
            interval: 30000,
            storageKey: 'invoicerequest_autosave'
        },
        accessibility: {
            announceErrors: true,
            markRequired: true
        }
    }
});

// Custom invoice-specific validation
const validation = formHandler.getExtension('validation');
if (validation) {
    // Add custom validation rules specific to invoice forms
    validation.addRule('invoice_number', (value) => {
        return /^INV-\d{4}-\d{3}$/.test(value);
    }, 'Invoice number must be in format INV-YYYY-###');
}

// Benefits:
// ✅ ~500 lines total vs 1,950+ lines (75% reduction)
// ✅ Modular - easy to add/remove features
// ✅ Custom validation rules
// ✅ Auto-save for long forms
// ✅ Better error handling
```

---

## 🔑 Nokkelbestilling Form Migration

### Before (Bloated)
```javascript
// Assuming current nokkelbestilling.js uses bloated FormHandler
formHandler = new FormHandler({
    formId: 'nokkelbestilling',
    redirectUrl: redirect_action,
    uploadUrl: `${strBaseURL}/nokkelbestilling/upload`,
    fileRequired: false
});
```

### After (Clean)
```javascript  
// New nokkelbestilling.js - Minimal setup for simple form
const formHandler = new FormHandler({
    formId: 'nokkelbestilling',
    redirectUrl: `${strBaseURL}/nokkelbestilling`,
    extensions: {
        validation: {
            realTimeValidation: true,
            wcagCompliant: true,
            rules: {
                'employee_id': 'required',
                'department': 'required',
                'key_type': 'required'
            }
        },
        accessibility: {
            announceErrors: true
        }
    }
});

// Benefits:
// ✅ ~250 lines total vs 1,950+ lines (87% reduction)  
// ✅ Only validation + accessibility (no file upload bloat)
// ✅ Perfect for simple forms
```

---

## 🔍 Inspection Form Migration

### Before (Bloated)
```javascript
// Current inspection_1.js likely uses bloated approach
formHandler = new FormHandler({
    formId: 'inspection_1',
    redirectUrl: redirect_action,
    fileRequired: true,
    allowedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf']
});
```

### After (Clean)
```javascript
// New inspection_1.js - Optimized for inspection forms
const formHandler = new FormHandler({
    formId: 'inspection_1', 
    redirectUrl: `${strBaseURL}/inspection_1`,
    extensions: {
        fileUpload: {
            required: true,
            allowedFileTypes: ['.jpg', '.jpeg', '.png', '.pdf'],
            maxFileSizeMB: 20,
            multiple: true // Inspections often need multiple photos
        },
        validation: {
            realTimeValidation: true,
            wcagCompliant: true,
            rules: {
                'inspection_date': 'required|date',
                'inspector_name': 'required',
                'findings': 'required|min:20'
            }
        },
        autoSave: {
            interval: 60000, // Save more frequently for field work
            storageKey: 'inspection_autosave'
        },
        accessibility: {
            announceErrors: true,
            markRequired: true
        }
    }
});

// Custom hooks for inspection-specific logic
formHandler.getExtension('fileUpload').beforeSubmit = () => {
    const files = formHandler.getExtension('fileUpload').getUploadedFiles();
    if (files.length === 0) {
        alert('At least one photo is required for inspection reports');
        return false;
    }
    return true;
};

// Benefits:
// ✅ ~450 lines total vs 1,950+ lines (77% reduction)
// ✅ Optimized for mobile/field use
// ✅ Multiple file upload support
// ✅ Auto-save for unreliable connections
// ✅ Custom business logic hooks
```

---

## 📋 Migration Checklist Per Form

### Step 1: Analyze Current Usage
- [ ] Find FormHandler initialization in form JS file
- [ ] Identify which features are actually used
- [ ] Note any custom validation or business logic
- [ ] Check file upload requirements

### Step 2: Create New Implementation
- [ ] Use FormHandler from form-handler-core.js
- [ ] Add only needed extensions to `extensions` config
- [ ] Move custom logic to extension hooks or separate functions
- [ ] Test all functionality

### Step 3: Update HTML Templates
- [ ] Ensure form IDs match
- [ ] Add extension-specific HTML elements (upload areas, etc.)
- [ ] Update script includes to use core + extensions

### Step 4: Test and Validate
- [ ] Test form submission
- [ ] Test validation
- [ ] Test file uploads (if used)
- [ ] Test accessibility features
- [ ] Verify no console errors

### Step 5: Performance Verification
- [ ] Measure bundle size reduction
- [ ] Check page load time improvement
- [ ] Verify functionality parity
- [ ] Document any behavior changes

---

## 🎯 Expected Results Summary

| Form | Before (Lines) | After (Lines) | Reduction | Key Benefits |
|------|----------------|---------------|-----------|--------------|
| Helpdesk | 1,950+ | ~400 | 80% | Simple, focused |
| Invoice Request | 1,950+ | ~500 | 75% | Auto-save, custom validation |
| Nokkelbestilling | 1,950+ | ~250 | 87% | Minimal, fast |
| Inspection | 1,950+ | ~450 | 77% | Multi-file, mobile-optimized |

**Overall Impact:**
- 📦 **Bundle Size**: 75-87% reduction per form
- ⚡ **Performance**: 50%+ faster loading
- 🛠️ **Maintenance**: Much easier debugging
- 🧪 **Testing**: Isolated, testable components
- 🔧 **Customization**: Easy to modify per form needs
