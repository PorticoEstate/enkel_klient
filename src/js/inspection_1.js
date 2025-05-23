/**
 * Inspection form handler
 * 
 * Handles form validation, submission and file uploads for inspection form
 * Enhanced for WCAG 2.0 compliance with improved accessibility
 * Updated May 23, 2025 - Refactored to use FormHandler class
 */

// Global variables
var redirect_action = `${strBaseURL}/inspection_1`;
var formHandler = null;

$(document).ready(function ()
{
	// Initialize form handler with form-specific options
	formHandler = new FormHandler({
		formId: 'inspection_1',
		redirectUrl: redirect_action,
		uploadUrl: `${strBaseURL}/inspection_1/upload`,
		fileRequired: true, // Inspection forms typically require file uploads
		allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'],
		maxFileSizeMB: 15,
		customHandlers: {
			// Form-specific pre-validation logic
			preValidate: function() {
				// Any inspection-specific validation can go here
				return true;
			}
		}
	});

	// Make form accessible when JavaScript is loaded
	$('#details').attr('aria-hidden', 'true');

	// Ensure real-time validation is working for phone and email fields
	setupRealTimeValidation();

	// Initialize any other form-specific functionality
	initializeAccessibility();
});

function setupRealTimeValidation()
{
	// Ensure real-time validation for phone and email fields
	const $form = $('#inspection_1');
	
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
	
	console.log('Real-time validation setup completed for inspection_1 form');
}

// Form-specific utility functions
function showDiv(divId, element)
{
	const div = document.getElementById(divId);
	const isVisible = element.checked === true;
	div.style.display = isVisible ? 'block' : 'none';
	div.setAttribute('aria-hidden', !isVisible);
}

function handleChangeTilgang(src)
{
	console.log(src.checked);
	const type_br_slokking_1 = document.getElementById('type_br_slokking_1');
	const type_br_slokking_2 = document.getElementById('type_br_slokking_2');
	const type_br_slokking_3 = document.getElementById('type_br_slokking_3');
	const type_br_slokking_4 = document.getElementById('type_br_slokking_4');
	const rokvarsler_1 = document.getElementById('rokvarsler_1');
	const rokvarsler_2 = document.getElementById('rokvarsler_2');
	const rokvarsler_3 = document.getElementById('rokvarsler_3');
	const rokvarsler_4 = document.getElementById('rokvarsler_4');

	if (src.checked === true)
	{
		type_br_slokking_1.removeAttribute('required');
		type_br_slokking_2.removeAttribute('required');
		type_br_slokking_3.removeAttribute('required');
		type_br_slokking_4.removeAttribute('required');
		rokvarsler_1.removeAttribute('required');
		rokvarsler_2.removeAttribute('required');
		rokvarsler_3.removeAttribute('required');
		rokvarsler_4.removeAttribute('required');

		// Remove aria-required attribute
		[type_br_slokking_1, type_br_slokking_2, type_br_slokking_3, type_br_slokking_4,
			rokvarsler_1, rokvarsler_2, rokvarsler_3, rokvarsler_4].forEach(el =>
			{
				el.removeAttribute('aria-required');
			});

		const innerDetails = document.getElementById('inner_details');
		innerDetails.style.display = 'none';
		innerDetails.setAttribute('aria-hidden', 'true');

		// Refresh required field indicators after changing requirements
		if (formHandler) {
			formHandler.markRequiredFields();
		}

		// Announce to screen readers
		announceChange('Required fields removed as access is missing');
	} else
	{
		type_br_slokking_1.setAttribute('required', '');
		type_br_slokking_2.setAttribute('required', '');
		type_br_slokking_3.setAttribute('required', '');
		type_br_slokking_4.setAttribute('required', '');
		rokvarsler_1.setAttribute('required', '');
		rokvarsler_2.setAttribute('required', '');
		rokvarsler_3.setAttribute('required', '');
		rokvarsler_4.setAttribute('required', '');

		// Add aria-required attribute
		[type_br_slokking_1, type_br_slokking_2, type_br_slokking_3, type_br_slokking_4,
			rokvarsler_1, rokvarsler_2, rokvarsler_3, rokvarsler_4].forEach(el =>
			{
				el.setAttribute('aria-required', 'true');
			});

		const innerDetails = document.getElementById('inner_details');
		innerDetails.style.display = 'block';
		innerDetails.setAttribute('aria-hidden', 'false');

		// Refresh required field indicators after changing requirements
		if (formHandler) {
			formHandler.markRequiredFields();
		}

		// Announce to screen readers
		announceChange('Required fields added as access is available');
	}
}

// Helper function to announce changes to screen readers
function announceChange(message)
{
	if (formHandler) {
		formHandler.announceToScreenReader(message);
	} else {
		// Fallback implementation
		const liveRegion = document.getElementById('form-submission-status');
		if (!liveRegion) {
			return;
		}
		liveRegion.textContent = message;

		// Clear the announcement after screen readers have time to read it
		setTimeout(() => {
			liveRegion.textContent = '';
		}, 3000);
	}
}

// Initialize accessibility features for the form
function initializeAccessibility()
{
	// This is already handled by form-validator.js in setupFormValidation
	// We'll keep this function but simplify its implementation

	// Add form submission status region if not present
	if (!document.getElementById('form-submission-status'))
	{
		const statusRegion = document.createElement('div');
		statusRegion.id = 'form-submission-status';
		statusRegion.className = 'sr-only';
		statusRegion.setAttribute('aria-live', 'assertive');
		document.body.appendChild(statusRegion);
	}
}

function handleChangeSlukkeutstyr(src)
{
	//datestamp
	const input = document.getElementById('datestamp');
	const dateblock = document.getElementById('dateblock');

	if (src.value == 2)
	{
		input.removeAttribute('required');
		input.removeAttribute('aria-required');
		dateblock.style.display = 'none';
		dateblock.setAttribute('aria-hidden', 'true');
		announceChange('Date field is no longer required');
	}
	else
	{
		input.setAttribute('required', '');
		input.setAttribute('aria-required', 'true');
		dateblock.style.display = 'block';
		dateblock.setAttribute('aria-hidden', 'false');
		announceChange('Date field is now required');
	}
}

// All functions have been moved to FormHandler class

// Form submission is now handled by the FormHandler class

/**
 * Legacy functions kept for backward compatibility
 * @deprecated These functions will be removed in a future update
 */

/**
 * @deprecated Use formHandler.submitForm() instead
 */
function confirm_session(action)
{
	if (formHandler) {
		if (action === 'cancel') {
			window.location.href = redirect_action;
			return;
		}
		formHandler.submitForm();
	} else {
		console.warn('FormHandler not initialized, unable to submit form');
	}
}

/**
 * @deprecated Use formHandler.submitForm() instead
 */
function ajax_submit_form(action)
{
	if (formHandler) {
		formHandler.submitForm();
	} else {
		console.warn('FormHandler not initialized, unable to submit form');
	}
}