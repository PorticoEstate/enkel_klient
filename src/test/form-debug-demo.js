/**
 * Form Validation Debugging Example
 * This script demonstrates how to use the form-debug.js utility
 * to diagnose validation issues in forms.
 */

// Wait for page to load
document.addEventListener('DOMContentLoaded', function ()
{
	if (typeof toggleFormDebug !== 'function')
	{
		console.error('form-debug.js is not loaded. Make sure to include it in your page.');
		return;
	}

	// Log initial status
	console.log('Form Validation Debug Demo');
	console.log('Initial debug status:', getFormDebugStatus());

	// Create a simple form for testing
	const form = document.createElement('form');
	form.id = 'debug-test-form';
	form.innerHTML = `
        <div>
            <label for="test-email">Email:</label>
            <input type="email" id="test-email" required>
            <div id="test-email-error" class="invalid-feedback">Please enter a valid email</div>
        </div>
        <div>
            <label for="test-phone">Phone:</label>
            <input type="tel" id="test-phone" required>
            <div id="test-phone-error" class="invalid-feedback">Please enter a valid phone number</div>
        </div>
        <button type="submit">Submit</button>
    `;

	// Add validation
	form.onsubmit = function (e)
	{
		e.preventDefault();
		console.log('Form submitted, validating...');

		// Enable debug mode
		toggleFormDebug(true, { console: true });

		// Validate form
		const isValid = validateForm(this);

		console.log('Validation result:', isValid);

		return false;
	};

	// Add to document if running in browser
	if (typeof document.body !== 'undefined')
	{
		document.body.appendChild(form);
		console.log('Test form added to document');
	}

	// Example of enabling debug mode
	console.log('Enabling validation debug mode...');
	toggleFormDebug(true);

	// Example validation call
	if (typeof validateField === 'function')
	{
		const emailField = document.getElementById('test-email');
		if (emailField)
		{
			emailField.value = 'invalid-email';
			console.log('Testing email validation with invalid value');
			validateField(emailField);

			emailField.value = 'valid@example.com';
			console.log('Testing email validation with valid value');
			validateField(emailField);
		}
	}

	// Disable debug mode when done
	console.log('Disabling validation debug mode...');
	toggleFormDebug(false);
	console.log('Final debug status:', getFormDebugStatus());
});

// Export functions for Node.js environment
if (typeof module !== 'undefined' && module.exports)
{
	module.exports = {
		runDebugDemo: function ()
		{
			console.log('Running form validation debug demo in Node.js');
			if (typeof toggleFormDebug === 'function')
			{
				toggleFormDebug(true);
				console.log('Debug mode enabled');
			} else
			{
				console.log('form-debug.js not loaded');
			}
		}
	};
}
