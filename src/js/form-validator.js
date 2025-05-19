/**
 * Form Validator Library
 * Provides reusable validation functions for all forms in the application
 * To be used alongside form-accessibility.js and accessibility-helpers.js
 * 
 * Updated May 2025 - Added recursion prevention and performance improvements
 */

// Configuration options
const FORM_VALIDATOR_CONFIG = {
	debug: false, // Set to true to enable debug logging
	version: '1.2.0', // Current version
	logPrefix: '[FormValidator]'
};

// Debug logger function
function formValidatorLog(...args)
{
	if (FORM_VALIDATOR_CONFIG.debug)
	{
		console.log(FORM_VALIDATOR_CONFIG.logPrefix, ...args);
	}
}

// Default translations (will be overridden by page-specific translations if available)
if (typeof translations === 'undefined')
{
	var translations = {
		form_validation_errors: 'Please fix the following errors:',
		invalid_email: 'Please enter a valid email address',
		invalid_phone: 'Please enter a valid phone number (minimum 8 digits)',
		invalid_postal: 'Please enter a valid postal code',
		invalid_date: 'Please enter a valid date',
		invalid_input: 'Please enter valid information',
		field_required: 'This field is required'
	};
}

// Auto-initialize when document is ready
document.addEventListener('DOMContentLoaded', function ()
{
	// Make sure jQuery is available
	if (typeof $ === 'undefined')
	{
		console.error('jQuery not loaded. Form validation requires jQuery.');
		return;
	}

	// Find all forms with the onsubmit="return validateForm();" attribute
	const forms = document.querySelectorAll('form[onsubmit*="validateForm"]');

	if (forms.length === 0)
	{
		// If no forms with the attribute are found, try to get all forms
		const allForms = document.querySelectorAll('form');
		if (allForms.length > 0)
		{
			console.log('No forms with validateForm found, initializing all forms.');
			allForms.forEach(form => setupFormValidation($(form)));
		} else
		{
			console.warn('No forms found to initialize validation.');
		}
		return;
	}

	// Initialize validation for each form
	forms.forEach(function (form)
	{
		setupFormValidation($(form));
	});
});

/**
 * Main validation function for form fields
 * @param {jQuery|HTMLElement} field - The field to validate (jQuery object or DOM element)
 * @param {Object} options - Optional validation rules
 * @returns {boolean} - True if field is valid, false if invalid
 */
function validateField(field)
{
	// Normalize to jQuery object if it's a DOM element
	const $field = field.jquery ? field : $(field);
	const fieldId = $field.attr('id');
	const errorId = fieldId + '-error';
	let isValid = true;

	// First check if field has a value if it's required
	if ($field.prop('required') && !$field.val().trim())
	{
		isValid = false;
		updateFieldValidationStatus($field, false, errorId);
		return false;
	}

	// Skip validation if field is empty and not required
	if (!$field.prop('required') && !$field.val().trim())
	{
		updateFieldValidationStatus($field, true, errorId);
		return true;
	}

	// Special validation based on field ID
	switch (fieldId)
	{
		case 'phone':
		case 'mobile':
		case 'telephone':
		case 'telefon':
			isValid = validatePhone($field);
			break;
		case 'location_name':
			isValid = validateLocation($field);
			break;
		case 'postal_code':
		case 'zip':
		case 'postnummer':
			isValid = validatePostalCode($field);
			break;
		case 'personal_id':
		case 'personnummer':
		case 'ssn':
			isValid = validatePersonalId($field);
			break;
		default:
			// Special validation based on field type
			const fieldType = $field.attr('type');
			if (fieldType === 'email' || $field.attr('data-validator') === 'email')
			{
				isValid = validateEmail($field);
			} else if (fieldType === 'date' || $field.hasClass('date-field') || $field.attr('data-validator') === 'date')
			{
				isValid = validateDate($field);
			} else
			{
				// Default HTML5 validation for other fields
				isValid = $field[0].checkValidity();
			}
	}

	// Apply validation styling
	updateFieldValidationStatus($field, isValid, errorId);

	return isValid;
}

/**
 * Validate a phone number field
 * @param {jQuery} $field - The phone field to validate
 * @returns {boolean} - True if phone is valid, false if invalid
 */
function validatePhone($field)
{
	const phone = $field.val();
	// Remove all non-digits and check length
	const digitCount = phone.replace(/\D/g, '').length;

	console.log('Phone validation - digit count:', digitCount);
	return digitCount >= 8; // Require at least 8 digits
}

/**
 * Validate a location field that requires a corresponding location code
 * @param {jQuery} $field - The location field to validate
 * @returns {boolean} - True if location is valid, false if invalid
 */
function validateLocation($field)
{
	const locationName = $field.val();
	const locationCode = $('#location_code').val();

	console.log('Location validation - name:', locationName, 'code:', locationCode);
	return locationName && locationName.trim() !== '' &&
		locationCode && locationCode.trim() !== '';
}

/**
 * Validate an email field
 * @param {jQuery} $field - The email field to validate
 * @returns {boolean} - True if email is valid, false if invalid
 */
function validateEmail($field)
{
	const email = $field.val();
	const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

	return emailRegex.test(email);
}

/**
 * Validate a postal code (Norwegian format or specified by pattern)
 * @param {jQuery} $field - The postal code field to validate
 * @returns {boolean} - True if postal code is valid, false if invalid
 */
function validatePostalCode($field)
{
	const postalCode = $field.val();

	// Get pattern from field attribute or use default Norwegian pattern (4 digits)
	const pattern = $field.attr('data-postal-pattern') || '^\\d{4}$';
	const regex = new RegExp(pattern);

	return regex.test(postalCode);
}

/**
 * Validate a date field
 * @param {jQuery} $field - The date field to validate
 * @returns {boolean} - True if date is valid, false if invalid
 */
function validateDate($field)
{
	const dateValue = $field.val();
	if (!dateValue) return false;

	// Check if it's a date input or a text field with date
	if ($field.attr('type') === 'date')
	{
		// HTML5 date input - already validates
		return $field[0].checkValidity();
	}

	// For text inputs, try to parse the date
	const date = new Date(dateValue);
	return !isNaN(date.getTime());
}

/**
 * Validate a personal ID number field (personnummer)
 * @param {jQuery} $field - The personal ID field to validate
 * @returns {boolean} - True if personal ID is valid, false if invalid
 */
function validatePersonalId($field)
{
	const personalId = $field.val().replace(/\D/g, ''); // Remove non-digits

	// Basic validation - Norwegian personal ID is 11 digits
	return personalId.length === 11;
}

/**
 * Update the visual status of a field based on validation result
 * @param {jQuery} $field - The field to update
 * @param {boolean} isValid - Whether the field is valid
 * @param {string} errorId - ID of the error message element
 */
function updateFieldValidationStatus($field, isValid, errorId)
{
	// Find or create the error message element
	let $errorElement = $('#' + errorId);
	if ($errorElement.length === 0)
	{
		// Create error element if it doesn't exist
		$errorElement = $('<div id="' + errorId + '" class="invalid-feedback"></div>');
		$field.after($errorElement);
	}

	if (!isValid)
	{
		$field.addClass('is-invalid').removeClass('is-valid');

		// Set error message if empty
		if (!$errorElement.text())
		{
			let errorMessage = '';
			const fieldId = $field.attr('id');
			const fieldType = $field.attr('type');

			// Get custom error message
			const customMessage = $field.attr('data-error-message');
			if (customMessage)
			{
				errorMessage = customMessage;
			}
			// Generate appropriate error message based on field type if no custom message
			else if (fieldType === 'email' || $field.attr('data-validator') === 'email')
			{
				errorMessage = translations?.invalid_email || 'Please enter a valid email address';
			} else if (fieldId === 'phone' || fieldId === 'mobile' || fieldId === 'telephone' || fieldId === 'telefon')
			{
				errorMessage = translations?.invalid_phone || 'Please enter a valid phone number (minimum 8 digits)';
			} else if (fieldId === 'postal_code' || fieldId === 'zip' || fieldId === 'postnummer')
			{
				errorMessage = translations?.invalid_postal || 'Please enter a valid postal code';
			} else if ($field.prop('required'))
			{
				errorMessage = translations?.field_required || 'This field is required';
			} else
			{
				errorMessage = translations?.invalid_input || 'Please enter valid information';
			}

			$errorElement.text(errorMessage);
		}

		// Show the error
		$errorElement.show();

		// Set proper ARIA attributes
		$field.attr('aria-invalid', 'true');
		$field.attr('aria-describedby', errorId);

	} else
	{
		$field.removeClass('is-invalid').addClass('is-valid');
		$errorElement.hide();

		// Update ARIA attributes
		$field.attr('aria-invalid', 'false');
		$field.removeAttr('aria-describedby');
	}
}

/**
 * Validate all required fields in a form
 * @param {jQuery|HTMLElement} [form] - The form to validate (jQuery object or DOM element), defaults to first form
 * @returns {boolean} - True if all fields are valid, false if any are invalid
 */
function validateAllFields(form)
{
	// Default to the first form if none provided
	if (!form)
	{
		form = $('form').first();
		if (form.length === 0)
		{
			console.error('No form found for validation');
			return false;
		}
	}

	const $form = form.jquery ? form : $(form);
	const formId = $form.attr('id') || 'unnamed_form';

	formValidatorLog('Validating form:', formId);

	// Prevent recursive validation calls
	if ($form.data('validating') === true)
	{
		console.warn('Preventing recursive validation call on form', formId);
		return false;
	}

	// Set validating flag
	$form.data('validating', true);

	let allValid = true;
	let errors = [];

	$form.find('input[required], select[required], textarea[required]').each(function ()
	{
		const $field = $(this);
		const fieldValid = validateField($field);

		if (!fieldValid)
		{
			allValid = false;

			// Collect error information
			const fieldId = $field.attr('id');
			const fieldName = $('label[for="' + fieldId + '"]').text().trim() || $field.attr('name') || fieldId;
			const errorMessage = $('#' + fieldId + '-error').text() || 'This field is required';

			errors.push({
				field: $field,
				fieldId: fieldId,
				fieldName: fieldName,
				message: errorMessage
			});
		}
	});

	// Display error summary if there are errors
	if (!allValid)
	{
		displayErrorSummary($form, errors);
		formValidatorLog(`Form validation failed with ${errors.length} errors`, errors.map(e => e.fieldId));
	} else
	{
		// Clear any existing error summary
		clearErrorSummary($form);
		formValidatorLog('Form validation successful');
	}

	// Clear the validating flag
	$form.data('validating', false);

	return allValid;
}

/**
 * Form validation function to be called on submit
 * @param {jQuery|HTMLElement} [formElement] - Optional form to validate, defaults to first form
 * @returns {boolean} - True if form is valid, false if invalid
 */
function validateForm(formElement)
{
	// Handle different ways this function might be called:
	// 1. From onsubmit="return validateForm(this)" - formElement will be the form
	// 2. From a JavaScript call without arguments - use first form or this context
	// 3. From another context where this might be the form

	formValidatorLog('validateForm called', formElement ? formElement.id || 'with element' : 'without element');

	// First, check if formElement is a form
	if (formElement && (formElement.tagName === 'FORM' || (formElement.jquery && formElement[0].tagName === 'FORM')))
	{
		formValidatorLog('Using provided form element', formElement.id || 'unnamed');
		return validateAllFields(formElement);
	}

	// Next, check if 'this' is a form (common when called from onsubmit)
	if (this && this.tagName === 'FORM')
	{
		formValidatorLog('Using "this" as form context', this.id || 'unnamed');
		return validateAllFields(this);
	}

	// Finally, fall back to the first form
	const firstForm = $('form').first();
	if (firstForm.length === 0)
	{
		console.error('validateForm: No form found to validate');
		return false;
	}

	formValidatorLog('Falling back to first form in document', firstForm.attr('id') || 'unnamed');
	return validateAllFields(firstForm);
}

/**
 * Setup validation for all fields in a form
 * @param {jQuery|HTMLElement} form - The form to set up (jQuery object or DOM element)
 */
function setupFormValidation(form)
{
	const $form = form.jquery ? form : $(form);

	// Add input validation on blur and input for required fields
	$form.find('input[required], textarea[required], select[required]').on('blur input', function ()
	{
		validateField($(this));
	});

	// Email validation with instant feedback
	$form.find('input[type="email"]').on('input', function ()
	{
		validateField($(this));
	});

	// Setup location code observer if the field exists
	setupLocationObserver();
}

/**
 * Setup observer for location code field to validate location name field
 */
function setupLocationObserver()
{
	try
	{
		const locationCodeInput = document.getElementById('location_code');
		const locationNameField = document.getElementById('location_name');

		if (locationCodeInput && locationNameField)
		{
			// Use MutationObserver to detect changes to the location_code hidden field
			const observer = new MutationObserver(function ()
			{
				validateField($(locationNameField));
			});

			// Observe the value attribute
			observer.observe(locationCodeInput, {
				attributes: true,
				attributeFilter: ['value']
			});

			// Also monitor the input event
			locationCodeInput.addEventListener('input', function ()
			{
				validateField($(locationNameField));
			});
		}
	} catch (error)
	{
		console.error('Location code observer error:', error);
	}
}

// Expose validation functions for testing (if in Node.js environment)
if (typeof module !== 'undefined' && module.exports)
{
	module.exports = {
		validateEmail,
		validatePhone,
		validateLocation,
		validatePostalCode,
		validateDate,
		validatePersonalId,
		validateField,
		validateAllFields,
		validateForm
	};
}

/**
 * Display an error summary at the top of the form
 * @param {jQuery} $form - The form jQuery object
 * @param {Array} errors - Array of error objects with field, fieldId, fieldName, and message
 */
function displayErrorSummary($form, errors)
{
	if (!errors || errors.length === 0) return;

	// Create or get error summary container
	let $errorSummary = $form.find('.error-summary');
	if ($errorSummary.length === 0)
	{
		$errorSummary = $('<div class="error-summary alert alert-danger" role="alert" aria-labelledby="error-summary-title"></div>');
		$errorSummary.prependTo($form);
	}

	// Create error summary content
	let html = '<h2 id="error-summary-title" class="h5">' + (translations?.form_validation_errors || 'Please fix the following errors:') + '</h2>';
	html += '<ul>';

	errors.forEach(error =>
	{
		html += '<li><a href="#' + error.fieldId + '">' + error.fieldName + ': ' + error.message + '</a></li>';
	});

	html += '</ul>';
	$errorSummary.html(html);

	// Announce to screen readers
	if (typeof announceToScreenReader === 'function')
	{
		const errorCount = errors.length;
		const message = errorCount === 1
			? '1 form error found. Please correct the highlighted field.'
			: errorCount + ' form errors found. Please correct the highlighted fields.';
		announceToScreenReader(message, 'assertive');
	}

	// Focus the error summary
	$errorSummary.attr('tabindex', '-1').focus();

	// Set up click handling for error links
	$errorSummary.find('a').on('click', function (e)
	{
		e.preventDefault();
		const targetId = $(this).attr('href');
		$(targetId).focus();
	});
}

/**
 * Clear the error summary from a form
 * @param {jQuery} $form - The form jQuery object
 */
function clearErrorSummary($form)
{
	const $errorSummary = $form.find('.error-summary');
	if ($errorSummary.length > 0)
	{
		$errorSummary.remove();
	}
}
