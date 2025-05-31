/**
 * Helpdesk Form Configuration
 * This file demonstrates dynamic form configuration loading
 * 
 * Usage: This file is automatically loaded by FormExtensionLoader
 * when creating a form with ID "helpdesk"
 */

function getFormConfig(formId) {
    console.log(`🔧 Loading dynamic configuration for ${formId}`);
    
    return {
        // File upload configuration
        fileUpload: {
            required: false,
            allowedFileTypes: ['.pdf', '.doc', '.docx', '.jpg', '.png', '.txt'],
            maxFileSizeMB: 10,
            maxFiles: 5,
            dragDropEnabled: true,
            previewEnabled: true
        },
        
        // Validation configuration
        validation: {
            realTimeValidation: true,
            wcagCompliant: true,
            validateOnBlur: true,
            showInlineErrors: true,
            blockInvalidSubmission: true, // CRITICAL: Block form submission if validation fails
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
        },
        
        // Auto-save configuration
        autoSave: {
            enabled: true,
            interval: 30000, // 30 seconds
            storageKey: 'helpdesk_autosave',
            excludeFields: ['randcheck'], // Don't save security tokens
            showSaveIndicator: true
        },
        
        // Accessibility configuration
        accessibility: {
            announceErrors: true,
            markRequired: true,
            enhancedFocus: true,
            trackChanges: true,
            screenReaderOptimized: true
        },
        
        // Form confirmation (WCAG 3.3.4 Error Prevention)
        confirmation: {
            showSummary: true,
            requireConfirmation: false, // Optional for helpdesk
            enableFileUpload: true,
            enableHtmlFormatting: true, // Support rich text content
            customSummaryFields: {
                message: {
                    label: 'Message Details',
                    formatAsHtml: true,
                    truncateAt: 500
                },
                subject: {
                    label: 'Request Subject',
                    required: true
                }
            }
        }
    };
}

// Optional: Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getFormConfig };
}
