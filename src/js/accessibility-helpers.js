/**
 * Accessibility helper functions for forms and interactive elements
 */

// Function to announce messages to screen readers using aria-live region
function announceToScreenReader(message, priority = 'polite')
{
	// Create or find an aria-live region
	let liveRegion = document.getElementById('screen-reader-announcer');

	if (!liveRegion)
	{
		liveRegion = document.createElement('div');
		liveRegion.id = 'screen-reader-announcer';
		liveRegion.className = 'sr-only';
		liveRegion.setAttribute('aria-live', priority);
		liveRegion.setAttribute('aria-relevant', 'additions');
		document.body.appendChild(liveRegion);
	}

	// Set the message content
	liveRegion.textContent = message;

	// Clear the announcement after screen readers have time to read it
	setTimeout(() =>
	{
		liveRegion.textContent = '';
	}, 3000);
}

// Function to make file dropzone accessible
function makeDropzoneAccessible(dropzoneId, fileInputId)
{
	const dropzone = document.getElementById(dropzoneId);
	const fileInput = document.getElementById(fileInputId);

	if (!dropzone || !fileInput) return;

	// Make the dropzone focusable
	dropzone.setAttribute('tabindex', '0');

	// Add keyboard event listeners
	dropzone.addEventListener('keydown', function (e)
	{
		// Activate on Enter or Space
		if (e.key === 'Enter' || e.key === ' ')
		{
			e.preventDefault();
			fileInput.click();
		}
	});

	// Add focus styling
	dropzone.addEventListener('focus', function ()
	{
		this.style.outline = '2px solid #4a90e2';
	});

	dropzone.addEventListener('blur', function ()
	{
		this.style.outline = '';
	});

	// Add role and ARIA attributes
	dropzone.setAttribute('role', 'button');
	dropzone.setAttribute('aria-controls', fileInputId);
}

// Function to enhance form validation with accessible messages
function setupAccessibleValidation(formId)
{
	const form = document.getElementById(formId);
	if (!form) return;

	// Create container for validation messages if it doesn't exist
	let validationContainer = document.getElementById('validation-messages');
	if (!validationContainer)
	{
		validationContainer = document.createElement('div');
		validationContainer.id = 'validation-messages';
		validationContainer.setAttribute('aria-live', 'assertive');
		validationContainer.classList.add('sr-only');
		form.appendChild(validationContainer);
	}

	// Add invalid event listeners to form elements
	const formElements = form.querySelectorAll('input, select, textarea');
	formElements.forEach(element =>
	{
		element.addEventListener('invalid', function (event)
		{
			// Get field label
			const id = this.id;
			const labelElement = document.querySelector(`label[for="${id}"]`);
			const labelText = labelElement ? labelElement.textContent.trim() : id;

			// Announce the error
			const errorMessage = `${labelText}: ${this.validationMessage}`;
			validationContainer.textContent = errorMessage;

			// Set styling on the invalid field
			this.classList.add('is-invalid');
		});

		// Clear error state on input
		element.addEventListener('input', function ()
		{
			this.classList.remove('is-invalid');
		});
	});
}

// Export functions if module exports is defined
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
{
	module.exports = {
		announceToScreenReader,
		makeDropzoneAccessible,
		setupAccessibleValidation
	};
}
