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
		showButtonPanel: true,
		yearRange: "-5:+5", // Allow 5 years in past and 5 years in future

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

			// Validate field
			validateField($(this));
		},

		// Open datepicker in month view
		beforeShow: function (input, inst)
		{
			if ((datestr = $(this).val()).length > 0)
			{
				year = datestr.substring(datestr.length - 4, datestr.length);
				month = $.inArray(datestr.substring(0, datestr.length - 5),
					$(this).datepicker('option', 'monthNames'));
				$(this).datepicker('option', 'defaultDate', new Date(year, month, 1));
				$(this).datepicker('setDate', new Date(year, month, 1));
			}

			// Enhance datepicker accessibility when opened
			setTimeout(function ()
			{
				// Add instructions for screen reader users
				if (!$('#ui-datepicker-instructions').length)
				{
					$('#ui-datepicker-div').prepend(
						'<div id="ui-datepicker-instructions" class="sr-only">Use arrow keys to navigate the calendar, space or enter to select a date.</div>'
					);
				}

				// Add proper roles and labels
				$('#ui-datepicker-div').attr('role', 'dialog').attr('aria-label', 'Choose invoice date');
				$('.ui-datepicker-prev').attr('role', 'button').attr('aria-label', 'Previous month');
				$('.ui-datepicker-next').attr('role', 'button').attr('aria-label', 'Next month');
			}, 100);
		}
	});

	// Connect the existing button to open the datepicker
	$("#open-datepicker").click(function ()
	{
		$("#invoice_date").datepicker("show");
		// Add focus handling for improved keyboard navigation
		setTimeout(function ()
		{
			$('.ui-datepicker-calendar .ui-state-active').focus();
		}, 100);
	});

	// Don't allow typing directly in the field
	$("#invoice_date").on('keydown paste', function (e)
	{
		e.preventDefault();
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
	// Add keyboard support for autocomplete results
	$('.autoComplete_wrapper ul').on('keydown', function (e)
	{
		var key = e.which || e.keyCode;

		// Enter or Space: select item
		if (key === 13 || key === 32)
		{
			$(document.activeElement).click();
			e.preventDefault();
		}
	});

	// We rely on the natural tab order of elements for keyboard navigation
	// No need to add tabindex attributes as it can disrupt natural flow

	// Add input validation on blur
	$('input, textarea, select').on('blur', function ()
	{
		if ($(this).attr('required'))
		{
			validateField($(this));
		}
	});
}

function validateField($field)
{
	var isValid = $field[0].checkValidity();
	var fieldId = $field.attr('id');
	var errorId = fieldId + '-error';

	if (!isValid)
	{
		$field.addClass('is-invalid');
		$('#' + errorId).show();
	} else
	{
		$field.removeClass('is-invalid');
		$('#' + errorId).hide();
	}

	return isValid;
}

function validateAllFields()
{
	var allValid = true;
	$('form input[required], form select[required], form textarea[required]').each(function ()
	{
		var fieldValid = validateField($(this));
		if (!fieldValid)
		{
			allValid = false;
		}
	});

	return allValid;
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
	var formValid = validateAllFields();

	if (!formValid)
	{
		// Find first invalid field
		var invalidFields = $(this).find('.is-invalid');

		if (invalidFields.length > 0)
		{
			// Focus on first invalid field
			invalidFields.first().focus();

			// Announce error for screen readers
			createAccessibleAlert('There are errors in the form. Please correct them and try again.', 'danger');

			return false;
		}
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