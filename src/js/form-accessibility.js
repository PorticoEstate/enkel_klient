/**
 * Form Accessibility Enhancement Script
 * Enhances all forms with consistent accessibility behavior
 * 
 * This script works with accessibility-helpers.js to provide a
 * consistent experience for screen reader users across all forms
 * 
 * Updated May 2025 - Fixed recursion issues with form-validator.js
 */

// Debug logging configuration
const FORM_A11Y_CONFIG = {
	debug: false,  // Set to true to enable debug logging
	logPrefix: '[FormA11y]'
};

// Debug logger function
function formA11yLog(...args)
{
	if (FORM_A11Y_CONFIG && FORM_A11Y_CONFIG.debug)
	{
		console.log(FORM_A11Y_CONFIG.logPrefix, ...args);
	}
}

document.addEventListener('DOMContentLoaded', function ()
{
	// Initialize all forms with validation and accessibility features
	initializeAllForms();
});

/**
 * Initialize accessibility features for all forms in the application
 */
function initializeAllForms()
{
	// Find all forms in the document
	const forms = document.querySelectorAll('form');

	forms.forEach(form =>
	{
		// Skip forms that already have been initialized
		if (form.dataset.a11yEnhanced) return;

		// Give the form an ID if it doesn't have one
		if (!form.id)
		{
			form.id = 'form-' + Math.random().toString(36).substring(2, 9);
		}

		// Create status element for this form
		createFormStatusElement(form);

		// Add form validation events - only if not using form-validator.js
		const usesFormValidator = form.hasAttribute('onsubmit') &&
			form.getAttribute('onsubmit').includes('validateForm');

		if (!usesFormValidator)
		{
			formA11yLog('Enhancing form without validateForm attribute:', form.id || 'unnamed form');
			enhanceFormValidation(form);
		} else
		{
			formA11yLog('Skipping validation for form already using form-validator.js:', form.id || 'unnamed form');
		}

		// Add submit announcement
		enhanceFormSubmission(form);

		// Initialize file uploads
		initializeAccessibleFileUpload(form.id);

		// Mark as enhanced
		form.dataset.a11yEnhanced = 'true';
	});
}

/**
 * Create a status element for screen reader announcements
 * @param {HTMLFormElement} form - The form element to enhance
 */
function createFormStatusElement(form)
{
	// Check if status element already exists
	let statusElement = document.getElementById(`${form.id}-status`);

	if (!statusElement)
	{
		statusElement = document.createElement('div');
		statusElement.id = `${form.id}-status`;
		statusElement.className = 'sr-only';
		statusElement.setAttribute('role', 'status');
		statusElement.setAttribute('aria-live', 'polite');
		form.appendChild(statusElement);
	}

	return statusElement;
}

/**
 * Enhance form validation with clear error messages
 * @param {HTMLFormElement} form - The form element to enhance
 */
function enhanceFormValidation(form)
{
	// Find all required inputs
	const requiredInputs = form.querySelectorAll('[required]');

	// Add appropriate aria attributes to required fields
	requiredInputs.forEach(input =>
	{
		if (!input.hasAttribute('aria-required'))
		{
			input.setAttribute('aria-required', 'true');
		}

		// Create description for error messages if not already present
		const inputId = input.id || `input-${Math.random().toString(36).substring(2, 9)}`;

		if (!input.id)
		{
			input.id = inputId;
		}

		// Find associated label
		const label = form.querySelector(`label[for="${input.id}"]`);

		// Set up validation events
		input.addEventListener('invalid', function (e)
		{
			// Prevent default validation bubble
			e.preventDefault();

			// Mark as invalid
			input.classList.add('is-invalid');

			// Get field name from label or input
			const fieldName = label ? label.textContent.trim() : input.name;

			// Announce the error
			if (typeof announceToScreenReader === 'function')
			{
				announceToScreenReader(`${fieldName}: ${input.validationMessage}`, 'assertive');
			} else
			{
				// Fallback to form status element
				const statusEl = document.getElementById(`${form.id}-status`);
				if (statusEl)
				{
					statusEl.textContent = `${fieldName}: ${input.validationMessage}`;
				}
			}

			// Focus the invalid input
			input.focus();
		});

		// Clear validation state on input
		input.addEventListener('input', function ()
		{
			input.classList.remove('is-invalid');
		});
	});

	// Enhance form validation on submit
	form.addEventListener('invalid', function (e)
	{
		// Only handle events that originated from the form itself, not from the fields
		if (e.target !== form)
		{
			formA11yLog('Ignoring invalid event from field:', e.target.id || 'unnamed field');
			return;
		}

		formA11yLog('Handling form-level invalid event:', form.id || 'unnamed form');

		// Prevent default validation
		e.preventDefault();

		// Find the first invalid field
		const invalidField = form.querySelector(':invalid');

		if (invalidField)
		{
			formA11yLog('Found invalid field:', invalidField.id || 'unnamed field');

			// Focus the first invalid field
			invalidField.focus();

			// We don't need to trigger another event here - that was causing the recursion
			// Instead, we'll just make sure the field's validation state is visible
			if (invalidField.classList)
			{
				invalidField.classList.add('is-invalid');
			}
		}
	}, true);
}

/**
 * Add loading state and announcements for form submission
 * @param {HTMLFormElement} form - The form element to enhance
 */
function enhanceFormSubmission(form)
{
	form.addEventListener('submit', function (e)
	{
		if (this.checkValidity())
		{
			// Find submit button
			const submitButton = form.querySelector('[type="submit"]');

			if (submitButton)
			{
				// Disable to prevent double submission
				submitButton.disabled = true;
				submitButton.setAttribute('aria-disabled', 'true');

				// Store original text
				const originalText = submitButton.innerHTML;

				// Add loading indicator
				submitButton.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                       <span>${submitButton.textContent}</span>`;

				// Restore original state if form submission takes too long
				setTimeout(() =>
				{
					if (submitButton.disabled)
					{
						submitButton.disabled = false;
						submitButton.setAttribute('aria-disabled', 'false');
						submitButton.innerHTML = originalText;
					}
				}, 30000); // 30 second timeout
			}

			// Announce form submission
			if (typeof announceToScreenReader === 'function')
			{
				announceToScreenReader('Form is being submitted, please wait...', 'assertive');
			} else
			{
				// Fallback to form status element
				const statusEl = document.getElementById(`${form.id}-status`);
				if (statusEl)
				{
					statusEl.textContent = 'Form is being submitted, please wait...';
				}
			}
		}
	});
}

/**
 * Initialize file uploads with accessibility features
 * This automatically configures any form with file upload fields
 * 
 * @param {string} formId - The ID of the form containing file uploads
 * @param {object} options - Custom options for FileUploader
 */
function initializeAccessibleFileUpload(formId, options = {}) {
    // Ensure FileUploader is available
    if (typeof FileUploader !== 'function') {
        console.error('FileUploader not found. Make sure file-uploader.js is loaded.');
        return false;
    }
    
    // Get the form - try both by ID and by attribute selector if ID fails
    let form = document.getElementById(formId);
    
    // If form not found by ID, try using a query selector to find the form
    if (!form) {
        console.warn(`Form with ID "${formId}" not found, trying alternative selector...`);
        // Try to find the first form element in case there's only one form
        form = document.querySelector('form');
        
        if (form) {
            console.log(`Found form without ID, adding ID "${formId}" to it`);
            form.id = formId; // Add the ID to the form element for future reference
        } else {
            console.error(`No form element found on the page.`);
            return false;
        }
    }
    
    // Find file inputs
    const fileInputs = form.querySelectorAll('input[type="file"]');
    if (fileInputs.length === 0) {
        console.log(`No file inputs found in form "${formId}".`);
        return false;
    }
    
    // Initialize each file input
    fileInputs.forEach((fileInput, index) => {
        // Generate IDs if not present
        const fileInputId = fileInput.id || `${formId}-fileupload-${index}`;
        
        // Use the specified drop area ID if it exists in data-droparea attribute, otherwise use default naming
        const dropAreaId = fileInput.dataset.droparea || `${formId}-drop-area-${index}`;
        console.log(`Using drop area ID: ${dropAreaId} from data-droparea=${fileInput.dataset.droparea}`);
        
        const fileSelectBtnId = fileInput.dataset.selectbtn || `${formId}-file-select-btn-${index}`;
        
        // Set IDs if they don't exist
        if (!fileInput.id) {
            fileInput.id = fileInputId;
        }
        
        // Create drop area if it doesn't exist but is specified in data attribute
        if (fileInput.dataset.droparea && !document.getElementById(dropAreaId)) {
            const dropArea = document.createElement('div');
            dropArea.id = dropAreaId;
            dropArea.className = 'file-drop-area';
            fileInput.parentNode.insertBefore(dropArea, fileInput.nextSibling);
            
            // Move the file input inside the drop area for better accessibility
            dropArea.appendChild(fileInput);
        }
        
        // Default options
        const defaultOptions = {
            formId: formId,
            fileInputId: fileInputId,
            dropAreaId: dropAreaId,
            fileSelectBtnId: fileSelectBtnId,
            uploadUrl: fileInput.dataset.uploadUrl || '',
            allowedFileTypes: fileInput.accept ? fileInput.accept.split(',') : [],
            maxFileSizeMB: parseInt(fileInput.dataset.maxsize || 10),
            required: fileInput.required,
            counterId: fileInput.dataset.counter || null,
            multiple: fileInput.multiple // Preserve multiple attribute from the input
        };
        
        // Merge with custom options
        const mergedOptions = { ...defaultOptions, ...options };
        
        // Create FileUploader instance
        const uploader = new FileUploader(mergedOptions);
        
        // Initialize (this will automatically connect to existing file select buttons)
        uploader.initialize();
        
        // Store uploader instance on the form
        if (!form.fileUploaders) {
            form.fileUploaders = [];
        }
        form.fileUploaders.push(uploader);
        
        // If this is the first uploader, return it for use in the calling script
        if (index === 0) {
            window.firstUploader = uploader; // Store first uploader for access
        }
    });
    
    // Return the first uploader instance for convenience
    return window.firstUploader || false;
}
