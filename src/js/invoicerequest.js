/**
 * Invoice Request form handler
 * 
 * Handles form validation, rich text editing, submission and file uploads for invoice requests
 * Includes month/year datepicker functionality using Flatpickr
 * Enhanced for WCAG 2.1 compliance with improved keyboard accessibility and screen reader support
 */

// Global variables
var redirect_action = `${strBaseURL}/invoicerequest`;
var fileUploader = null;
var datepicker = null;

$(document).ready(function ()
{
	// set focus on first input field
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

	// Add aria attributes and visual indicators to all required fields
	markRequiredFields();

	// Initialize datepicker for month/year selection
	initializeDatepicker();

	// Initialize file uploader if enabled
	initializeFileUploader();

	// Add keyboard accessibility to form elements
	enhanceKeyboardAccessibility();
});

function markRequiredFields()
{
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
			$('#date-selection-announcement').remove();
			$('<div>', {
				id: 'date-selection-announcement',
				'class': 'sr-only',
				'aria-live': 'assertive'
			})
			.text('Date picker opened. Use arrow keys to navigate months, Tab to navigate year dropdown. Press Escape to close.')
			.appendTo('body');
			
			// Add accessibility attributes to the calendar container
			setTimeout(function() {
				// Set role and label for the calendar
				instance.calendarContainer.setAttribute('role', 'dialog');
				instance.calendarContainer.setAttribute('aria-label', 'Choose invoice date');
				
				// Make navigation controls explicitly focusable and labeled
				const prevMonthButton = instance.calendarContainer.querySelector('.flatpickr-prev-month');
				const nextMonthButton = instance.calendarContainer.querySelector('.flatpickr-next-month');
				
				if (prevMonthButton) {
					prevMonthButton.setAttribute('tabindex', '0');
					prevMonthButton.setAttribute('role', 'button');
					prevMonthButton.setAttribute('aria-label', 'Previous month');
				}
				
				if (nextMonthButton) {
					nextMonthButton.setAttribute('tabindex', '0');
					nextMonthButton.setAttribute('role', 'button');
					nextMonthButton.setAttribute('aria-label', 'Next month');
				}
				
				// Ensure month/year dropdowns are keyboard accessible
				const monthDropdown = instance.calendarContainer.querySelector('.flatpickr-monthDropdown-months');
				if (monthDropdown) {
					monthDropdown.setAttribute('aria-label', 'Select month');
				}
				
				const yearInput = instance.calendarContainer.querySelector('.numInput.cur-year');
				if (yearInput) {
					yearInput.setAttribute('aria-label', 'Select year');
				}
				
				// Set focus to the month dropdown for better keyboard navigation
				if (monthDropdown) {
					setTimeout(function() {
						monthDropdown.focus();
					}, 50);
				}
			}, 100);
		},
		
		// On close event
		onClose: function(selectedDates, dateStr, instance) {
			// Announce selected date to screen readers
			$('#date-selection-announcement').remove();
			$('<div>', {
				id: 'date-selection-announcement',
				'class': 'sr-only',
				'aria-live': 'polite'
			})
			.text('Selected date: ' + dateStr)
			.appendTo('body');
			
			// Set focus back to input
			setTimeout(function() {
				$('#invoice_date').focus();
			}, 0);
			
			// Validate field
			validateField($('#invoice_date'));
		},
		
		// On change event
		onChange: function(selectedDates, dateStr, instance) {
			// Announce to screen readers
			$('#date-selection-announcement').remove();
			$('<div>', {
				id: 'date-selection-announcement',
				'class': 'sr-only', 
				'aria-live': 'polite'
			})
			.text('Selected date: ' + dateStr)
			.appendTo('body');
			
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
			return true;
		}
	});
	
	// Add global escape key handler when datepicker is open
	$(document).on('keydown.flatpickrEsc', function(e) {
		if (e.key === "Escape" && datepicker && datepicker.isOpen) {
			e.preventDefault();
			datepicker.close();
			$('#invoice_date').focus();
		}
	});
	
	// Clean up handler when document is unloaded
	$(window).on('unload', function() {
		$(document).off('keydown.flatpickrEsc');
	});
}

function initializeFileUploader()
{
	try
	{
		// Use the new generic function from form-accessibility.js if available
		if (typeof initializeAccessibleFileUpload === 'function')
		{
			// Initialize with custom options for invoicerequest form
			fileUploader = initializeAccessibleFileUpload('invoicerequest', {
				uploadUrl: `${strBaseURL}/invoicerequest/upload`,
				allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'],
				maxFileSizeMB: 15,
				onComplete: function (success)
				{
					if (success)
					{
						console.log("All uploads completed successfully");
						window.location.href = redirect_action;
					}
					else
					{
						console.error("There were errors during file upload");

						// Use the accessible alert method
						if (this.createAccessibleAlert) {
							this.createAccessibleAlert('There was a problem with your file upload. We will redirect you to the main page in 5 seconds.', 'error');
						}

						// Wait longer before redirecting to allow user to see errors
						window.setTimeout(function ()
						{
							window.location.href = redirect_action;
						}, 5000);
					}
				}
			});
		}
		// Fallback to direct initialization if generic function is not available
		else if ($("#fileupload").length > 0 && typeof FileUploader === 'function')
		{
			// Initialize FileUploader component with accessibility enhancements
			fileUploader = new FileUploader({
				formId: 'invoicerequest',
				uploadUrl: `${strBaseURL}/invoicerequest/upload`,
				fileSelectBtnId: 'file-select-btn',
				dropAreaId: 'drop-area',
				allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'],
				maxFileSizeMB: 15,
				onComplete: function (success)
				{
					if (success)
					{
						console.log("All uploads completed successfully");
						window.location.href = redirect_action;
					}
					else
					{
						console.error("There were errors during file upload");
						
						// Show an accessible error message
						this.createAccessibleAlert('There was a problem with your file upload. We will redirect you to the main page in 5 seconds.', 'error');
						
						// Wait longer before redirecting to allow user to see errors
						window.setTimeout(function ()
						{
							window.location.href = redirect_action;
						}, 5000);
					}
				}
			});
			
			fileUploader.initialize();
		}
	}
	catch (error)
	{
		console.error("Error initializing file uploader:", error);
	}
}

function enhanceKeyboardAccessibility()
{
	// Add keyboard support for autocomplete results with WCAG 1.4.13 compliance
	$(document).on('keydown', '.autoComplete_wrapper ul, .autoComplete_result', function (e) {
		var key = e.which || e.keyCode;

		// Enter or Space: select item
		if (key === 13 || key === 32) {
			$(document.activeElement).click();
			e.preventDefault();
		}
		
		// Escape key: dismiss dropdown
		if (key === 27) {
			// Close the autocomplete dropdown
			$('.autoComplete_wrapper').removeClass('active');
			// Return focus to input
			$('#location_name').focus();
			e.preventDefault();
		}
	});
	
	// WCAG 1.4.13: Ensure autocomplete dropdown remains visible when hovering
	// and is dismissible without moving focus
	$('.autoComplete_wrapper').on('mouseenter', function() {
		$(this).addClass('hover-active');
	}).on('mouseleave', function() {
		$(this).removeClass('hover-active');
	});
	
    // File handling accessibility features are now managed by FileUploader
    
	setupFormValidation($('form'));
}

// These functions are now provided by FileUploader component
// Using fileUploader.announceToScreenReader() and fileUploader.createAccessibleAlert() instead

$('form').on('submit', function (e)
{
	e.preventDefault();

	// Check form validity using our custom validation
	var formValid = validateAllFields($(this));

	if (!formValid)
	{
		return false;
	}

	// Disable submit button to prevent multiple submissions
	$('button[type="submit"]').prop('disabled', true)
		.attr('aria-disabled', 'true')
		.append('<span class="sr-only">Submitting form, please wait...</span>');

	// Submit form via AJAX
	ajax_submit_form();
});

function ajax_submit_form()
{
	var thisForm = $('form');
	var requestUrl = $(thisForm).attr("action");
	var formdata = false;

	if (window.FormData)
	{
		try
		{
			formdata = new FormData(thisForm[0]);
		} catch (e)
		{
			console.error('FormData error:', e);
		}
	}

	// Add loading indicator for screen readers
	$('<div>', {
		id: 'submission-status',
		'class': 'sr-only',
		'aria-live': 'assertive'
	})
		.text('Form is being submitted, please wait...')
		.appendTo('body');

	$.ajax({
		cache: false,
		contentType: false,
		processData: false,
		type: 'POST',
		url: `${requestUrl}?phpgw_return_as=json`,
		data: formdata ? formdata : thisForm.serialize(),
		success: function (data, textStatus, jqXHR)
		{
			// Update status for screen readers
			$('#submission-status').text('Form submission complete');

			if (data)
			{
				if (data.status == "saved")
				{
					var id = data.id;

					let pendingFiles = 0;
					try {
						pendingFiles = fileUploader && typeof fileUploader.getPendingCount === 'function' ? 
							fileUploader.getPendingCount() : 0;
					} catch (e) {
						console.warn("Error checking pending files count:", e);
					}
					
					if (!fileUploader || pendingFiles === 0)
					{
						$('#submission-status').text('Form submitted successfully. Redirecting to confirmation page.');
						window.location.href = redirect_action;
					} else
					{
						$('#submission-status').text('Form submitted successfully. Uploading files...');
						fileUploader.sendAllFiles(id);
					}
				} else
				{
					$('button[type="submit"]').prop('disabled', false)
						.attr('aria-disabled', 'false')
						.find('.sr-only').remove();

					var errorContainer = $('.alert-danger');
					if (errorContainer.length === 0)
					{
						$('form').before('<div class="alert alert-danger alert-dismissible" role="alert" aria-live="assertive"></div>');
						errorContainer = $('.alert-danger');
					}

					errorContainer.html('<h2 class="h6">There were errors with your submission:</h2><ul></ul>');
					var errorList = errorContainer.find('ul');

					if (Array.isArray(data.message))
					{
						data.message.forEach(function (msg)
						{
							errorList.append('<li>' + msg + '</li>');
						});
					} else
					{
						errorList.append('<li>An error occurred during submission. Please try again.</li>');
					}

					// Scroll to error message
					$('html, body').animate({
						scrollTop: errorContainer.offset().top - 100
					}, 200);

					// Set focus to the error container for screen readers
					setTimeout(function ()
					{
						errorContainer.attr('tabindex', '-1').focus();
					}, 300);
				}
			}
		},
		error: function (jqXHR, textStatus, errorThrown)
		{
			$('button[type="submit"]').prop('disabled', false)
				.attr('aria-disabled', 'false')
				.find('.sr-only').remove();

			$('#submission-status').text('Form submission failed. Please try again.');
			console.error("AJAX Error:", textStatus, errorThrown);

			var errorContainer = $('.alert-danger');
			if (errorContainer.length === 0)
			{
				$('form').before('<div class="alert alert-danger alert-dismissible" role="alert" aria-live="assertive"><h2 class="h6">Error</h2></div>');
				errorContainer = $('.alert-danger');
			}

			errorContainer.html('<h2 class="h6">Technical Error</h2><p>A technical error occurred during form submission. Please try again later.</p>');

			// Scroll to error message
			$('html, body').animate({
				scrollTop: errorContainer.offset().top - 100
			}, 200);

			// Set focus to the error container for screen readers
			setTimeout(function ()
			{
				errorContainer.attr('tabindex', '-1').focus();
			}, 300);
		}
	});
}