/**
 * Invoice Request form handler
 * 
 * Handles form validation, rich text editing, submission and file uploads for invoice requests
 * Includes month/year datepicker functionality
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

		}
	}

	// Add asterisk to all required fields
	markRequiredFields();

	// Initialize datepicker for month/year selection
	initializeDatepicker();

	// Initialize file uploader if enabled
	initializeFileUploader();

	// Setup rich text editor for the message field
	setupRichTextEditor();
});

function markRequiredFields()
{
	$('form').find('input[required], textarea[required], select[required]').each(function ()
	{
		var label = $('label[for="' + $(this).attr('id') + '"]');
		if (label.length > 0)
		{
			label.append(' <span class="text-danger">*</span>');
		}
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
		}
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
			// Initialize FileUploader component
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

						// Show an alert to the user
						alert('Det oppstod en feil under filopplastingen. Vi omdirigerer deg til hovedsiden om 5 sekunder.');

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

function setupRichTextEditor()
{
	try
	{
		// Initialize Quill rich text editor if needed
		if ($("#message").length > 0)
		{
			var quill = new Quill('#message', {
				modules: {
					toolbar: [
						['bold', 'italic', 'underline'],
						[{ 'list': 'ordered' }, { 'list': 'bullet' }],
						['clean']
					]
				},
				theme: 'snow'
			});

			// Set up form to collect rich text content before submission
			$('form').on('submit', function ()
			{
				var messageContent = quill.root.innerHTML;
				$("#message").val(messageContent);
				return true;
			});
		}
	}
	catch (error)
	{
		console.error("Error setting up rich text editor:", error);
	}
}

$('form').on('submit', function (e)
{
	e.preventDefault();

	// Check form validity
	var form = this;
	var formValid = form.checkValidity();

	if (!formValid)
	{
		// Find invalid fields
		var invalidFields = $(form).find(':invalid').filter(':visible');

		if (invalidFields.length > 0)
		{
			// Show error message
			var firstInvalid = invalidFields.first();
			firstInvalid.focus();

			return false;
		}
	}

	// Disable submit button to prevent multiple submissions
	$('button[type="submit"]').prop('disabled', true);

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

	$.ajax({
		cache: false,
		contentType: false,
		processData: false,
		type: 'POST',
		url: `${requestUrl}?phpgw_return_as=json`,
		data: formdata ? formdata : thisForm.serialize(),
		success: function (data, textStatus, jqXHR)
		{
			if (data)
			{
				if (data.status == "saved")
				{
					var id = data.id;

					if (!fileUploader || fileUploader.getPendingCount() === 0)
					{
						window.location.href = redirect_action;
					} else
					{
						fileUploader.sendAllFiles(id);
					}
				} else
				{
					$('button[type="submit"]').prop('disabled', false);

					var errorContainer = $('.alert-danger');
					if (errorContainer.length === 0)
					{
						$('form').before('<div class="alert alert-danger alert-dismissible"></div>');
						errorContainer = $('.alert-danger');
					}

					errorContainer.html('');

					if (Array.isArray(data.message))
					{
						data.message.forEach(function (msg)
						{
							errorContainer.append('<p>' + msg + '</p>');
						});
					} else
					{
						errorContainer.append('<p>Det oppstod en feil ved innsending. Vennligst prøv igjen.</p>');
					}

					// Scroll to error message
					$('html, body').animate({
						scrollTop: errorContainer.offset().top - 100
					}, 200);
				}
			}
		},
		error: function (jqXHR, textStatus, errorThrown)
		{
			$('button[type="submit"]').prop('disabled', false);
			console.error("AJAX Error:", textStatus, errorThrown);

			var errorContainer = $('.alert-danger');
			if (errorContainer.length === 0)
			{
				$('form').before('<div class="alert alert-danger alert-dismissible"></div>');
				errorContainer = $('.alert-danger');
			}

			errorContainer.html('<p>Det oppstod en teknisk feil ved innsending. Vennligst prøv igjen senere.</p>');

			// Scroll to error message
			$('html, body').animate({
				scrollTop: errorContainer.offset().top - 100
			}, 200);
		}
	});
}