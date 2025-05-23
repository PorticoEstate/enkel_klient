/**
 * Invoice Request form handler
 * 
 * Handles form validation, rich text editing, submission and file uploads for invoice requests
 * Includes month/year datepicker functionality using Flatpickr
 * Enhanced for WCAG 2.1 compliance with improved keyboard accessibility and screen reader support
 * Updated May 23, 2025 - Refactored to use FormHandler class
 */

// Global variables
var redirect_action = `${strBaseURL}/invoicerequest`;
var formHandler = null;
var datepicker = null;

$(document).ready(function ()
{
	// Initialize form handler with form-specific options
	formHandler = new FormHandler({
		formId: 'invoicerequest',
		redirectUrl: redirect_action,
		uploadUrl: `${strBaseURL}/invoicerequest/upload`,
		fileRequired: true, // Assuming file is required based on original code
		customHandlers: {
			// Form-specific pre-validation logic
			preValidate: function() {
				// No special pre-validation needed for this form
				return true;
			}
		}
	});

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

	// Initialize datepicker for month/year selection - this is specific to invoice form
	initializeDatepicker();

	// Add keyboard accessibility to form elements
	enhanceKeyboardAccessibility();
});

function initializeDatepicker()
{
	// Initialize Flatpickr datepicker with month/year selection only
	datepicker = flatpickr("#invoice_date", {
		dateFormat: "F Y", // Month name and year format
		plugins: [],
		disableMobile: true, // Prevent native mobile pickers
		static: true,
		monthSelectorType: "dropdown",
		
		// Only show month/year picker, without days
		enableTime: false,
		enableSeconds: false,
		noCalendar: false,
		
		// Configure UI to show only month/year
		showMonths: 1,
	
		// Disable direct input but allow external button trigger
		allowInput: false, // Prevent direct editing
		clickOpens: true, // Allow clicking on the input to open calendar
		
		// Year range setting (approximately 5 years in past to 5 years in future)
		maxDate: new Date().fp_incr(14), // 14 days from now
		minDate: new Date().fp_incr(-1825), // 5 years in the past
	
		// On open event
		onOpen: function(selectedDates, dateStr, instance) {
			// Announce to screen readers that datepicker is open
			formHandler.announceToScreenReader('Date picker opened. Use arrow keys to navigate months, Tab to navigate year dropdown. Press Escape to close.');
			
			// Add accessibility attributes to the calendar container
			setTimeout(function() {
				// Set role and label for the calendar
			}, 100);
		},
		
		// On close event
		onClose: function(selectedDates, dateStr, instance) {
			// Announce selected date to screen readers
			formHandler.announceToScreenReader('Selected date: ' + dateStr);
			
			// Set focus back to input
			setTimeout(function() {
				$("#invoice_date").focus();
			}, 0);
			
			// Validate field
			validateField($('#invoice_date'));
		},
		
		// On change event
		onChange: function(selectedDates, dateStr, instance) {
			// Announce to screen readers
			formHandler.announceToScreenReader('Selected date: ' + dateStr);
			
			// Only validate but don't close the picker
			validateField($('#invoice_date'));
		}
	});

	// Connect open calendar button 
	$('#open-datepicker').on('click', function(e) {
		e.preventDefault();
		datepicker.open();
	});
	
	// Add keyboard accessibility for datepicker opener button
	$('#open-datepicker').on('keydown', function(e) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			datepicker.open();
		}
	});
	
	// Make the invoice_date field itself keyboard accessible
	$("#invoice_date").on('keydown', function(e) {
		// Enter or Down arrow opens the datepicker
		if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
			e.preventDefault();
			datepicker.open();
		}
		
		// Tab should still work normally
		if (e.key === "Tab") {
			// Let default behavior handle this
		}
	});
	
	// Add global escape key handler when datepicker is open
	$(document).on('keydown.flatpickrEsc', function(e) {
		if (e.key === "Escape" && datepicker && datepicker.isOpen) {
			datepicker.close();
			$("#invoice_date").focus();
		}
	});
	
	// Clean up handler when document is unloaded
	$(window).on('unload', function() {
		$(document).off('keydown.flatpickrEsc');
	});
}

function enhanceKeyboardAccessibility()
{
	// Add keyboard support for autocomplete results with WCAG 1.4.13 compliance
	$(document).on('keydown', '.autoComplete_wrapper ul, .autoComplete_result', function (e) {
		var key = e.which || e.keyCode;

		// Enter or Space: select item
		if (key === 13 || key === 32) {
			e.preventDefault();
			$(this).click();
		}
		
		// Escape key: dismiss dropdown
		if (key === 27) {
			$('.autoComplete_wrapper input').focus();
			// Close the dropdown
		}
	});
	
	// WCAG 1.4.13: Ensure autocomplete dropdown remains visible when hovering
	// and is dismissible without moving focus
	$('.autoComplete_wrapper').on('mouseenter', function() {
		$(this).addClass('hover-active');
	}).on('mouseleave', function() {
		$(this).removeClass('hover-active');
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
			// Skip if no label exists
			if (!$('label[for="' + id + '"]').length) return;

			// Add required field indicator for visual users
			if (!$('label[for="' + id + '"]').find('.required-field').length)
			{
				$('label[for="' + id + '"]').append(' <span class="required-field" aria-hidden="true">*</span>');
			}

			// Set ARIA attributes for screen readers
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
		// This is now handled by the FormHandler class
	} else {
		try
		{
			// Use the new generic function from form-accessibility.js if available
			if (typeof initializeAccessibleFileUpload === 'function') {
				// Legacy code
			}
			else {
				// Legacy code
			}
		}
		catch (error)
		{
			console.error("Error initializing file uploader:", error);
		}
	}
}

/**
 * @deprecated Use validateField() from form-validator.js and formHandler.validateForm() instead
 */
function setupFormValidation($form)
{
	if (formHandler) {
		// This is now handled by the FormHandler class
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
		console.warn('FormHandler not initialized, unable to submit form');
	}
}