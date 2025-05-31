/**
 * Inspection Form Configuration
 * This file demonstrates configuration for forms with complex validation requirements
 */

function getFormConfig(formId) {
    console.log(`🔧 Loading dynamic configuration for ${formId}`);
    
    return {
        // File upload configuration - stricter for inspections
        fileUpload: {
            required: true,
            allowedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.png'],
            maxFileSizeMB: 15,
            maxFiles: 10,
            dragDropEnabled: true,
            previewEnabled: true,
            requireDescription: true // Each file needs a description
        },
        
        // Enhanced validation for inspection forms
        validation: {
            realTimeValidation: true,
            wcagCompliant: true,
            validateOnBlur: true,
            showInlineErrors: true,
            strictMode: true, // More stringent validation
            customValidators: {
                location_name: {
                    required: true,
                    minLength: 3,
                    message: 'Please select a valid location from the dropdown'
                }
            }
        },
        
        // Auto-save with shorter intervals for important data
        autoSave: {
            enabled: true,
            interval: 15000, // 15 seconds for critical forms
            storageKey: 'inspection_1_autosave',
            excludeFields: ['randcheck'],
            showSaveIndicator: true,
            persistAcrossSessions: true
        },
        
        // Enhanced accessibility for complex forms
        accessibility: {
            announceErrors: true,
            markRequired: true,
            enhancedFocus: true,
            trackChanges: true,
            screenReaderOptimized: true,
            complexFormMode: true // Additional announcements for complex forms
        },
        
        // Mandatory confirmation for inspection forms
        confirmation: {
            showSummary: true,
            requireConfirmation: true, // Always require confirmation for inspections
            enableFileUpload: true,
            enableHtmlFormatting: true,
            confirmationMessage: 'This inspection report will be submitted. Please review all details carefully.',
            customSummaryFields: {
                location_name: {
                    label: 'Inspection Location',
                    required: true,
                    emphasize: true
                },
                tilgang: {
                    label: 'Access Status',
                    formatAsBoolean: true,
                    trueText: 'Missing Access',
                    falseText: 'Access Available'
                }
            }
        }
    };
}

// Optional: Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getFormConfig };
}
