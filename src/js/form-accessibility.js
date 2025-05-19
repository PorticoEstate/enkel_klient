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
