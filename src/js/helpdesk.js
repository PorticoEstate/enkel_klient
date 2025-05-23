/**
 * Helpdesk form handler
 * 
 * Handles form validation, rich text editing, submission and file uploads for helpdesk tickets
 * Updated May 23, 2025 - Refactored to use FormHandler class
 */

// Global variables
var redirect_action = `${strBaseURL}/helpdesk`;
var formHandler = null;

$(document).ready(function ()
{
	// Initialize form handler with form-specific options
	formHandler = new FormHandler({
		formId: 'helpdesk',
		redirectUrl: redirect_action,
		uploadUrl: `${strBaseURL}/helpdesk/upload`,
		fileRequired: false, // File upload is optional for helpdesk
		customHandlers: {
			// Form-specific pre-validation logic
			preValidate: function() {
				// No special pre-validation needed for this form
				return true;
			}
		}
	});

	// Ensure real-time validation is working for phone and email fields
	setupRealTimeValidation();

	// set focus on first input field - retain this form-specific behavior
	try
	{
		document.getElementById("location_name").focus();
	}
	catch (error)
	{
		try
		{
			document.getElementById("phone").focus();
		}
		catch (error)
		{
			// If no input field can be focused, no action needed
		}
	}

	// Add keyboard accessibility to form elements - form-specific behavior
	enhanceKeyboardAccessibility();
});

function setupRealTimeValidation()
{
	// Ensure real-time validation for phone and email fields
	const $form = $('#helpdesk');
	
	// Phone field validation - validate on input and blur
	$('#phone').on('input blur', function() {
		if (typeof validateField === 'function') {
			validateField($(this));
		}
	});
	
	// Email field validation - validate on input and blur  
	$('#email').on('input blur', function() {
		if (typeof validateField === 'function') {
			validateField($(this));
		}
	});
	
	// Also validate other required fields for consistency
	$form.find('input[required], textarea[required], select[required]').on('input blur', function() {
		// Skip if already handled above
		if ($(this).attr('id') === 'phone' || $(this).attr('id') === 'email') {
			return;
		}
		
		if (typeof validateField === 'function') {
			validateField($(this));
		}
	});
	
	console.log('Real-time validation setup completed for helpdesk form');
}

function enhanceKeyboardAccessibility()
{
	// Add keyboard support for autocomplete results with WCAG compliance
	$(document).on('keydown', '.autoComplete_wrapper ul, .autoComplete_result', function (e)
	{
		var key = e.which || e.keyCode;

		// Enter or Space: select item
		if (key === 13 || key === 32)
		{
			$(document.activeElement).click();
			e.preventDefault();
		}
		
		// Escape key: dismiss dropdown
		if (key === 27)
		{
			$(this).closest('.autoComplete_wrapper').find('input').focus();
		}
	});

	// For better keyboard accessibility, ensure toolbar buttons receive focus
	$('.ql-toolbar button').attr('tabindex', '0');

	// Add ARIA labels for each button group in the toolbar
	$('.ql-toolbar .ql-formats').each(function (index)
	{
		$(this).attr('role', 'group');
		$(this).attr('aria-label', 'Formatting options group ' + (index + 1));
	});
}

// All functions below have been moved to FormHandler class

/**
 * Legacy functions kept for backward compatibility
 * @deprecated These functions will be removed in a future update
 */

/**
 * @deprecated Use formHandler.markRequiredFields() instead
 */
function markRequiredFields()
{
	if (formHandler) {
		formHandler.markRequiredFields();
	} else {
		// Fallback implementation
		$('form').find('input[required], textarea[required], select[required]').each(function ()
		{
			var id = $(this).attr('id');
			if (!$('label[for="' + id + '"]').length) return;

			if (!$('label[for="' + id + '"]').find('.required-field').length)
			{
				$('label[for="' + id + '"]').append(' <span class="required-field" aria-hidden="true">*</span>');
			}
			$(this).attr('aria-required', 'true');
		});
	}
}

/**
 * @deprecated Use formHandler.initializeFileUploader() instead
 */
function initializeFileUploader()
{
	if (formHandler) {
		formHandler.initializeFileUploader();
	} else {
		// Fallback implementation for backward compatibility
		console.warn('FormHandler not available, using legacy file uploader initialization');
	}
}

/**
 * @deprecated Use validateField() from form-validator.js and formHandler.validateForm() instead
 */
function setupFormValidation($form)
{
	if (formHandler) {
		// FormHandler handles validation setup automatically
		return;
	}
}

/**
 * @deprecated Use formHandler.submitForm() instead
 */
function ajax_submit_form()
{
	if (formHandler) {
		formHandler.submitForm();
	} else {
		// Fallback implementation for backward compatibility
		console.warn('FormHandler not available, using legacy form submission');
	}
}

/**
 * @deprecated Use formHandler.announceToScreenReader() instead
 */
function updateScreenReaderStatus(message)
{
	if (formHandler) {
		formHandler.announceToScreenReader(message);
	} else {
		// Fallback implementation
		if (!$('#file-upload-status').length)
		{
			$('<div>', {
				id: 'file-upload-status',
				'class': 'sr-only',
				'aria-live': 'polite'
			}).appendTo('body');
		}
		$('#file-upload-status').text(message);
	}
}

/**
 * @deprecated Use formHandler.createAccessibleAlert() instead
 */
function createAccessibleAlert(message, type)
{
	if (formHandler) {
		formHandler.createAccessibleAlert(message, type);
	} else {
		// Fallback implementation
		$('.alert-accessible').remove();
		var $alert = $('<div>', {
			'class': 'alert alert-' + (type || 'info') + ' alert-accessible',
			'role': 'alert',
			'aria-live': 'assertive'
		}).text(message);
		$('form').before($alert);
		$('html, body').animate({
			scrollTop: $alert.offset().top - 100
		}, 200);
	}
}