/**
 * Nokkelbestilling (Key Order) Form Configuration
 * This file demonstrates configuration for key ordering forms with specific validation requirements
 */

function getFormConfig(formId) {
    Debug.debug(`🔧 Loading dynamic configuration for ${formId}`);
    
    // Ensure this configuration only applies to the nokkelbestilling form
    if (formId !== 'nokkelbestilling') {
        return {};
    }
    
    return {
        // Form confirmation extension configuration
        confirmation: {
            showSummary: true,
            requireConfirmation: true,
            enableFileUpload: true,
            customMessages: {
                confirmTitle: "Confirm Key Order Submission",
                confirmText: "Please review your key order details before submitting. This will help prevent errors in your key request.",
                submitButton: "Submit Key Order"
            }
        },

        // File upload configuration for key orders (optional)
        fileUpload: {
            required: false, // Key orders typically don't require files
            allowedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.png'],
            maxFileSizeMB: 10,
            maxFiles: 3,
            customMessages: {
                dragDropText: "Drop supporting documents here or click to browse (optional)",
                allowedTypesText: "Accepted formats: PDF, Word, Excel, Images"
            }
        },

        // Validation configuration with key-specific rules
        validation: {
            realTimeValidation: true,
            wcagCompliant: true,
            customRules: {
                key_number: {
                    required: true,
                    pattern: /^[A-Za-z0-9\-]+$/, // Alphanumeric with hyphens
                    minLength: 3,
                    message: "Please enter a valid key number (letters, numbers, and hyphens only)"
                },
                number_of_keys: {
                    required: true,
                    min: 1,
                    max: 50, // Reasonable limit for key orders
                    message: "Please enter a valid number of keys (1-50)"
                },
                phone: {
                    required: true,
                    pattern: /^[\+]?[0-9\s\-\(\)]{8,}$/, // International phone format
                    message: "Please enter a valid phone number"
                },
                email: {
                    required: true,
                    pattern: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
                    message: "Please enter a valid email address"
                }
            }
        },

        // Auto-save configuration
        autoSave: {
            interval: 30000, // Save every 30 seconds
            storageKey: 'nokkelbestilling_autosave',
            excludeFields: ['randcheck'], // Don't save CSRF tokens
            showNotifications: true
        },

        // Accessibility configuration
        accessibility: {
            announceErrors: true,
            markRequired: true,
            trackChanges: true,
            customAnnouncements: {
                formLoaded: "Key order form loaded. Please fill in all required fields marked with an asterisk.",
                formSaved: "Your key order draft has been automatically saved.",
                formSubmitted: "Your key order has been submitted successfully."
            }
        }
    };
}

// Optional: Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getFormConfig };
}
