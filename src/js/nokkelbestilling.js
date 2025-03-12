/**
 * Nøkkelbestilling form handler
 * 
 * Handles form validation, submission and file uploads for key ordering
 */

// Global variables
var redirect_action = `${strBaseURL}/nokkelbestilling`;
var filesRequired = false; //!$('#location_code').val();
var fileUploader = null;

$(document).ready(function ()
{
	// Add asterisk to all required fields
	markRequiredFields();

	// Initialize file uploader
	initializeFileUploader();

	// Handle location code changes
	$('#location_code').on('change', function ()
	{
		filesRequired = !$(this).val();
		updateFileUploadRequirements();
	});
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
		formId: 'nokkelbestilling',
		uploadUrl: `${strBaseURL}/nokkelbestilling/upload`,
		required: filesRequired,
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

function updateFileUploadRequirements()
{
	// Update the file uploader's required state based on location_code
	if (filesRequired && fileUploader.getPendingCount() === 0)
	{
		$('#fileupload').attr('required', 'required');
	} else
	{
		$('#fileupload').removeAttr('required');
	}
}

$('#nokkelbestilling').on('submit', function (e)
{
	e.preventDefault();

	// Check form validity excluding the file input
	var form = this;
	var fileInputValid = !filesRequired || fileUploader.getPendingCount() > 0;

	// Temporarily remove required attribute for validation check
	var fileInputRequired = $('#fileupload').attr('required');
	$('#fileupload').removeAttr('required');

	// Now check validity of other fields
	var formValid = form.checkValidity();

	// Restore required attribute if it was set
	if (fileInputRequired)
	{
		$('#fileupload').attr('required', 'required');
	}

	if (!formValid || !fileInputValid)
	{
		// Find invalid fields (excluding file input)
		var invalidFields = $(form).find(':invalid').not('#fileupload').filter(':visible');

		if (invalidFields.length > 0)
		{
			// Focus on first visible invalid field
			invalidFields[0].focus();
			invalidFields[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
		} else
		{
			// Check for hidden invalid fields
			var hiddenInvalidFields = $(form).find(':invalid').not('#fileupload').filter(':not(:visible)');
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

		// Show file upload error separately
		if (!fileInputValid)
		{
			alert('Du må laste opp fullmakt eller vergefullmakt');
		}

		return false;
	}

	confirm_session('save');
});


this.confirm_session = function (action)
{
	if (action === 'cancel')
	{
		window.location.href = `${strBaseURL}/nokkelbestilling`;
		return;
	}

	// Block doubleclick
	$('#submit').prop('disabled', true);
	$('#fileupload').prop('disabled', true);

	// Show spinner
	showSubmissionSpinner();

	try
	{
		ajax_submit_form(action);
	} catch (e)
	{
		console.error('Error during AJAX submission:', e);
		removeSubmissionSpinner();

		$('#submit').prop('disabled', false);
		$('#fileupload').prop('disabled', false);

		alert('Det oppstod en feil ved sending av skjemaet: ' + e.message);
	}
};

function showSubmissionSpinner()
{
	var form = document.getElementById('nokkelbestilling');
	$('<div id="spinner" class="d-flex align-items-center">')
		.append($('<strong>').text('Lagrer...'))
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

ajax_submit_form = function (action)
{
	var thisForm = $('#nokkelbestilling');
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
					$('#submit').prop('disabled', false);
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
			$('#submit').prop('disabled', false);
			$('#fileupload').prop('disabled', false);
			removeSubmissionSpinner();

			alert('Det oppstod en feil ved sending av skjemaet');
		}
	});
};