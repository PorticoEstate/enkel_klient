/**
 * Helpdesk form handler
 * 
 * Handles form validation, rich text editing, submission and file uploads for helpdesk tickets
 */

// Global variables
var redirect_action = `${strBaseURL}/helpdesk`;
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

	// Initialize file uploader
	initializeFileUploader();
});

function markRequiredFields()
{
	$('form :required').each(function ()
	{
		var id = $(this).attr('id');
		$('label[for="' + id + '"]').append(' <span class="text-danger">*</span>');
	});
}


function initializeFileUploader()
{
	fileUploader = new FileUploader({
		formId: 'helpdesk',
		uploadUrl: `${strBaseURL}/helpdesk/upload`,
		required: false,
		onComplete: function (success)
		{
			if (success)
			{
				window.location.href = redirect_action;
			} else
			{
				// Small delay to allow user to see error messages
				window.setTimeout(function ()
				{
					window.location.href = redirect_action;
				}, 1000);
			}
		}
	});

	fileUploader.initialize();
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
			// Focus on first visible invalid field
			invalidFields[0].focus();
			invalidFields[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
		} else
		{
			// Check for hidden invalid fields
			var hiddenInvalidFields = $(form).find(':invalid').filter(':not(:visible)');
			if (hiddenInvalidFields.length > 0)
			{
				// Handle hidden fields as before
				var container = $(hiddenInvalidFields[0]).closest('.collapse, .d-none, [style*="display: none"]');
				if (container.length > 0)
				{
					container.show();
					setTimeout(function ()
					{
						hiddenInvalidFields[0].focus();
					}, 100);
				}
			}
		}

		return false;
	}

	// Form is valid, proceed with submission
	submit_form();
});

function submit_form()
{
	// Block doubleclick
	$('button[type="submit"]').prop('disabled', true);
	$('#fileupload').prop('disabled', true);

	// Show spinner
	showSubmissionSpinner();

	try
	{
		ajax_submit_form();
	} catch (e)
	{
		console.error('Error during AJAX submission:', e);
		removeSubmissionSpinner();

		$('button[type="submit"]').prop('disabled', false);
		$('#fileupload').prop('disabled', false);

		alert('Det oppstod en feil ved sending av skjemaet: ' + e.message);
	}
}

function showSubmissionSpinner()
{
	var form = document.querySelector('form');
	$('<div id="spinner" class="d-flex align-items-center">')
		.append($('<strong>').text('Sender...'))
		.append($('<div class="spinner-border ml-auto" role="status" aria-hidden="true"></div>'))
		.insertAfter(form);
	window.scrollBy(0, 100);
}

function removeSubmissionSpinner()
{
	var element = document.getElementById('spinner');
	if (element)
	{
		element.parentNode.removeChild(element);
	}
}

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

					if (fileUploader.getPendingCount() === 0)
					{
						window.location.href = redirect_action;
					} else
					{
						fileUploader.sendAllFiles(id);
					}
				} else
				{
					$('button[type="submit"]').prop('disabled', false);
					$('#fileupload').prop('disabled', false);
					removeSubmissionSpinner();

					var error_message = '';
					$.each(data.message, function (index, error)
					{
						error_message += error + "\n";
					});

					alert(error_message);
				}
			}
		},
		error: function (jqXHR, textStatus, errorThrown)
		{
			console.error('Ajax error:', textStatus, errorThrown);
			$('button[type="submit"]').prop('disabled', false);
			$('#fileupload').prop('disabled', false);
			removeSubmissionSpinner();

			alert('Det oppstod en feil ved sending av skjemaet');
		}
	});
}