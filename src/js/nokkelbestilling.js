/**
 * Nøkkelbestilling form handler
 * 
 * Handles form validation, submission and file uploads for key ordering
 * Enhanced for WCAG 2.0 compliance with improved accessibility
 * Updated May 23, 2025 - Refactored to use FormHandler class
 */

// Global variables
var redirect_action = `${strBaseURL}/nokkelbestilling`;
var formHandler = null;

$(document).ready(function ()
{
	// Initialize form handler with form-specific options
	formHandler = new FormHandler({
		formId: 'nokkelbestilling',
		redirectUrl: redirect_action,
		uploadUrl: `${strBaseURL}/nokkelbestilling/upload`,
		fileRequired: false, // Initial value, updated based on location code
		customHandlers: {
			// Form-specific pre-validation logic
			preValidate: function() {
				// No special pre-validation needed for this form
				return true;
			}
		}
	});

	// Handle location code changes
	$('#location_code').on('change', function ()
	{
		const fileRequired = !$(this).val();
		formHandler.setFileRequired(fileRequired);
	});

	// Ensure real-time validation is working for phone and email fields
	setupRealTimeValidation();
});

function setupRealTimeValidation()
{
	// Ensure real-time validation for phone and email fields
	const $form = $('#nokkelbestilling');
	
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
	
	console.log('Real-time validation setup completed for nokkelbestilling form');
}

// All functions have been moved to FormHandler class

// Form submission is now handled by the FormHandler class

/**
 * Initialize accessibility features
 * Enhances the form with WCAG 2.0 compliant keyboard navigation and screen reader support
 * 
 * Note: These functions are kept for backward compatibility during transition.
 * In the future, they will be deprecated as FormHandler provides these features.
 */
function initAccessibility()
{
	// Enhanced error handling for all form fields
	$('input, select, textarea').on('invalid', function ()
	{
		const id = $(this).attr('id');
		const $label = $('label[for="' + id + '"]');
		const fieldName = $label.text().trim();

		// Set aria-invalid
		$(this).attr('aria-invalid', 'true');

		// Update screen reader status
		updateScreenReaderStatus('{{ __("validation_error") }}: ' + fieldName);
	});

	// Reset aria-invalid on input
	$('input, select, textarea').on('input change', function ()
	{
		if (this.validity.valid)
		{
			$(this).attr('aria-invalid', 'false');
		}
	});

	// Make the location selection accessible
	enhanceLocationAccessibility();

	// Make file upload more accessible
	enhanceFileUploadAccessibility();

	// Add keyboard navigation for all interactive elements
	enhanceKeyboardNavigation();
}

/**
 * Enhance location search autocomplete accessibility
 */
function enhanceLocationAccessibility()
{
	// Handle location search autocomplete for screen readers
	$('#location_name').on('focus', function ()
	{
		$(this).attr('aria-expanded', 'false');
	});

	// When results appear
	$('.selection').on('DOMNodeInserted', function ()
	{
		if ($(this).children().length > 0)
		{
			$('#location_name').attr('aria-expanded', 'true');
			updateScreenReaderStatus('{{ __("location_results_available") }}');
		}
	});

	// When results are cleared
	$('.selection').on('DOMNodeRemoved', function ()
	{
		if ($(this).children().length === 0)
		{
			$('#location_name').attr('aria-expanded', 'false');
		}
	});
}

/**
 * Enhance file upload accessibility
 */
function enhanceFileUploadAccessibility()
{
	// Make the file upload area keyboard accessible without using tabindex
	// Instead, make it focusable using role="button"
	$('#drop-area').attr('role', 'button')
		.on('keydown', function (e)
		{
			// Trigger file input dialog on Enter or Space
			if (e.key === 'Enter' || e.key === ' ')
			{
				e.preventDefault();
				$('#fileupload').click();
			}
		});

	// Announce file count changes
	const observer = new MutationObserver(function (mutations)
	{
		mutations.forEach(function (mutation)
		{
			if (mutation.target.id === 'files-count')
			{
				updateScreenReaderStatus('{{ __("file_count") }}: ' + mutation.target.textContent);
			}
		});
	});

	// Start observing
	observer.observe(document.getElementById('files-count'), {
		childList: true,
		characterData: true,
		subtree: true
	});
}

/**
 * Enhance keyboard navigation
 */
function enhanceKeyboardNavigation()
{
	// Add skip to form handling
	$('.skip-link').on('click', function (e)
	{
		e.preventDefault();
		const target = $($(this).attr('href'));

		// Focus without setting tabindex
		target.focus();
	});

	// We no longer set tabindex values programmatically
	// Let the browser manage tab order naturally for better accessibility
}

/**
 * Update screen reader status
 * @param {string} message - The message to announce to screen readers
 */
function updateScreenReaderStatus(message)
{
	const statusEl = document.getElementById('form-status');
	if (statusEl)
	{
		statusEl.textContent = message;
	}
}

/**
 * Creates an accessible alert message
 * @param {string} message - The message to display
 * @param {string} type - The type of alert (info, success, warning, danger)
 */
function createAccessibleAlert(message, type)
{
	// Remove existing alerts
	$('.alert-accessible').remove();

	// Create alert with proper ARIA role
	var $alert = $('<div>', {
		'class': 'alert alert-' + (type || 'info') + ' alert-accessible',
		'role': 'alert',
		'aria-live': 'assertive'
	}).text(message);

	// Add to page
	$('form').before($alert);

	// Scroll to alert
	$('html, body').animate({
		scrollTop: $alert.offset().top - 100
	}, 200);
}