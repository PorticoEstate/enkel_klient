/**
 * Invoice Request form handler
 * 
 * Handles form validation, rich text editing, submission and file uploads for invoice requests
 * Includes month/year datepicker functionality
 * Enhanced for WCAG 2.0 compliance with improved keyboard accessibility and screen reader support
 */

// Global variables
var redirect_action = `${strBaseURL}/invoicerequest`;
var fileUploader = null;

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
	// Initialize jQuery UI datepicker with month/year selection only
	$("#invoice_date").datepicker({
		dateFormat: 'MM yy',
		changeMonth: true,
		changeYear: true,
		showButtonPanel: true, // Enable the OK button
		yearRange: "-5:+5", // Allow 5 years in past and 5 years in future
		
		// Merge both beforeShow handlers
		beforeShow: function(input, inst) {
			// Month/year logic
			if ((datestr = $(this).val()).length > 0)
			{
				var year = datestr.substring(datestr.length - 4, datestr.length);
				var month = $.inArray(datestr.substring(0, datestr.length - 5),
					$(this).datepicker('option', 'monthNames'));
				$(this).datepicker('option', 'defaultDate', new Date(year, month, 1));
				$(this).datepicker('setDate', new Date(year, month, 1));
			}

			// Accessibility enhancements
			setTimeout(function() {
				// Add instruction for dismissal
				if (!$('#datepicker-instructions').length) {
					$('<div>', {
						id: 'datepicker-instructions',
						'class': 'sr-only',
						'aria-live': 'polite'
					})
					.text('Press Escape to close the date picker without making a selection.')
					.appendTo('#ui-datepicker-div');
				}
				// Add instructions for screen reader users
				if (!$('#ui-datepicker-instructions').length)
				{
					$('#ui-datepicker-div').prepend(
						'<div id="ui-datepicker-instructions" class="sr-only">Use arrow keys to navigate the calendar, space or enter to select a date.</div>'
					);
				}
				
				// Add proper roles and labels
				$('#ui-datepicker-div').attr('role', 'dialog').attr('aria-label', 'Choose invoice date');
				
				// Make navigation controls keyboard accessible
				$('.ui-datepicker-prev').attr({
					'role': 'button',
					'aria-label': 'Previous month',
					'tabindex': '0'
				});
				
				$('.ui-datepicker-next').attr({
					'role': 'button',
					'aria-label': 'Next month',
					'tabindex': '0'
				});
				
				// Make month and year dropdowns accessible
				$('.ui-datepicker-month, .ui-datepicker-year').attr('tabindex', '0');
				
				// Make sure OK button is keyboard accessible
				$('.ui-datepicker-close, .ui-datepicker-current').attr('tabindex', '0');
				
				// Make datepicker dismissible with Escape key
				$(document).on('keydown.datepicker', function(e) {
					if (e.key === "Escape") {
						$("#invoice_date").datepicker('hide');
						$("#invoice_date").focus();
						e.preventDefault();
					}
				});
				
				// Add keyboard support for previous/next buttons
				$('.ui-datepicker-prev, .ui-datepicker-next').on('keydown', function(e) {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						$(this).click();
					}
				});
				
				// Set initial focus to the month dropdown for better keyboard navigation
				setTimeout(function() {
					$('.ui-datepicker-month').focus();
				}, 50);
				
			}, 100);
		},

		// Format the datepicker to show month and year only
		onClose: function (dateText, inst)
		{
			var month = $("#ui-datepicker-div .ui-datepicker-month :selected").val();
			var year = $("#ui-datepicker-div .ui-datepicker-year :selected").val();
			$(this).datepicker('setDate', new Date(year, month, 1));

			// Update ARIA live region to announce selected date
			$("#date-selection-announcement").remove();
			$('<div>', {
				id: 'date-selection-announcement',
				'class': 'sr-only',
				'aria-live': 'polite'
			})
				.text('Selected date: ' + $(this).val())
				.appendTo('body');
				
			// Remove the event handler when datepicker is closed
			$(document).off('keydown.datepicker');
			
			// Remove custom event handlers
			$('.ui-datepicker-prev, .ui-datepicker-next').off('keydown');

			// Validate field
			validateField($(this));
		},

		// Immediately close the datepicker when a date is selected
		onSelect: function(dateText, inst) {
			var month = $("#ui-datepicker-div .ui-datepicker-month :selected").val();
			var year = $("#ui-datepicker-div .ui-datepicker-year :selected").val();
			$(this).datepicker('setDate', new Date(year, month, 1));
			$("#invoice_date").datepicker('hide');
			$("#date-selection-announcement").remove();
			$('<div>', {
				id: 'date-selection-announcement',
				'class': 'sr-only',
				'aria-live': 'polite'
			})
				.text('Selected date: ' + $(this).val())
				.appendTo('body');
			validateField($(this));
			setTimeout(() => { $(this).focus(); }, 0);
		},
	});

	// Don't allow typing directly in the field
	$("#invoice_date").on('keydown paste', function (e)
	{
		// Allow TAB key to navigate away from the field
		if (e.key === "Tab") {
			return true;
		}
		
		// Allow spacebar to open the datepicker
		if (e.key === " ") {
			e.preventDefault();
			$(this).datepicker('show');
			return;
		}
		
		// Prevent other keys from typing in the field
		e.preventDefault();
	});

	// Make the invoice_date field itself keyboard accessible
	$("#invoice_date").on('keydown', function(e) {
		// Enter or Down arrow opens the datepicker
		if (e.key === "Enter" || e.key === "ArrowDown") {
			e.preventDefault();
			$(this).datepicker('show');
		}
	});

	$(document).on('datepickeropen', function ()
	{
		setTimeout(function() {
			$('.ui-datepicker-close').attr('tabindex', '0');
		}, 0);
	});

	// Fix: Close datepicker when OK button is clicked (month/year selection)
	$(document).on('click', '.ui-datepicker-close', function() {
		$('#invoice_date').datepicker('hide');
		setTimeout(function() {
			$('#invoice_date').focus();
		}, 0);
	});
	
	// Add keyboard support for the OK button
	$(document).on('keydown', '.ui-datepicker-close', function(e) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			$(this).click();
		}
	});
}

function initializeFileUploader()
{
	try
	{
		// Only initialize if the element exists
		if ($("#fileupload").length > 0)
		{
			// Initialize FileUploader component with accessibility enhancements
			fileUploader = new FileUploader({
				formId: 'invoicerequest',
				uploadUrl: `${strBaseURL}/invoicerequest/upload`,
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
						var alertMessage = 'There was a problem with your file upload. We will redirect you to the main page in 5 seconds.';

						// Create accessible alert
						createAccessibleAlert(alertMessage, 'error');

						// Wait longer before redirecting to allow user to see errors
						window.setTimeout(function ()
						{
							window.location.href = redirect_action;
						}, 5000);
					}
				},
				// Add file validation messages
				onAdd: function (file)
				{
					// Update screen reader status
					updateScreenReaderStatus('File added: ' + file.name);
				},
				onProgress: function (progress)
				{
					// Update ARIA attributes on progress bar
					$('#progress').attr('aria-valuenow', progress);
				}
			});

			fileUploader.initialize();

			// Add screen reader status region
			if (!$('#file-upload-status').length)
			{
				$('<div>', {
					id: 'file-upload-status',
					'class': 'sr-only',
					'aria-live': 'polite'
				}).appendTo('#drop-area');
			}
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
	
	// Add keyboard accessibility for datepicker button
	$('#open-datepicker').on('keydown', function(e) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			$('#invoice_date').datepicker('show');
		}
	});

	// We rely on the natural tab order of elements for keyboard navigation
	// No need to add tabindex attributes as it can disrupt natural flow

	// Use shared form validation
	setupFormValidation($('form'));
}

function updateScreenReaderStatus(message)
{
	$('#file-upload-status').text(message);
}

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

					if (!fileUploader || fileUploader.getPendingCount() === 0)
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