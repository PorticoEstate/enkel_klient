/**
 * Dynamic Form Configuration for Invoice Request Form
 * This file demonstrates how to create form-specific configurations
 * that will be automatically loaded by the FormExtensionLoader
 */

function getFormConfig(formId) {
    // Ensure this configuration only applies to the invoicerequest form
    if (formId !== 'invoicerequest') {
        return {};
    }

    return {
        // Form confirmation extension configuration
        confirmation: {
            showSummary: true,
            requireConfirmation: true,
            enableFileUpload: true,
            customMessages: {
                confirmTitle: "Confirm Invoice Request Submission",
                confirmText: "Please review your invoice request details before submitting. This will help prevent errors in processing your request.",
                submitButton: "Submit Invoice Request"
            }
        },

        // File upload configuration for invoices
        fileUpload: {
            required: true, // Invoice documents are typically required
            allowedFileTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.png'],
            maxFileSizeMB: 15,
            maxFiles: 5,
            customMessages: {
                dragDropText: "Drop invoice documents here or click to browse",
                allowedTypesText: "Accepted formats: PDF, Word, Excel, Images"
            }
        },

        // Validation configuration
        validation: {
            realTimeValidation: true,
            wcagCompliant: true,
            customRules: {
                invoice_date: {
                    required: true,
                    pattern: /^[A-Za-z]+ \d{4}$/, // Format: "Month Year"
                    message: "Please select a valid invoice month and year"
                },
                subject: {
                    required: true,
                    minLength: 10,
                    message: "Subject must be at least 10 characters long"
                },
                message: {
                    required: true,
                    minLength: 20,
                    message: "Please provide detailed information about your invoice request (minimum 20 characters)"
                }
            }
        },

        // Auto-save configuration
        autoSave: {
            interval: 30000, // Save every 30 seconds
            storageKey: 'invoicerequest_autosave',
            excludeFields: ['randcheck'], // Don't save CSRF tokens
            showNotifications: true
        },

        // Accessibility configuration
        accessibility: {
            announceErrors: true,
            markRequired: true,
            trackChanges: true,
            customAnnouncements: {
                formLoaded: "Invoice request form loaded. Please fill in all required fields marked with an asterisk.",
                formSaved: "Your invoice request draft has been automatically saved.",
                formSubmitted: "Your invoice request has been submitted successfully."
            }
        }
    };
}

// Export configuration for Node.js environments if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getFormConfig };
}
