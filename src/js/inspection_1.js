/**
 * Inspection form handler
 * 
 * Handles form validation, submission and file uploads for inspection form
 */

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

		// Announce to screen readers
		announceChange('Required fields added as access is available');
	}
}

// Helper function to announce changes to screen readers
function announceChange(message)
{
	const liveRegion = document.getElementById('form-submission-status');
	if (!liveRegion)
	{
		return;
	}
	liveRegion.textContent = message;

	// Clear the announcement after screen readers have time to read it
	setTimeout(() =>
	{
		liveRegion.textContent = '';
	}, 3000);
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

// Global variables
var redirect_action = `${strBaseURL}/inspection_1`;
var fileUploader = null;

$(document).ready(function ()
{
	// Make form accessible when JavaScript is loaded
	$('#details').attr('aria-hidden', 'true');

	// Add asterisk to all labels of required fields and set required class
	$('form :required').each(function ()
	{
		var id = $(this).attr('id');
		$(this).attr('aria-required', 'true');
		$('label[for="' + id + '"]').addClass('required');
	});

	// Make drop area keyboard accessible
	const dropArea = document.getElementById('drop-area');
	if (dropArea)
	{
		const dropRegion = dropArea.querySelector('div[tabindex="0"]');
		if (dropRegion)
		{
			dropRegion.addEventListener('keydown', function (e)
			{
				// If Enter or Space is pressed, trigger click on the file input
				if (e.key === 'Enter' || e.key === ' ')
				{
					e.preventDefault();
					const fileInput = document.getElementById('fileupload');
					if (fileInput)
					{
						fileInput.click();
					}
				}
			});
		}
	}

	// Initialize FileUploader component
	fileUploader = new FileUploader({
		formId: 'inspection_1',
		uploadUrl: `${strBaseURL}/inspection_1/upload`,
		onComplete: function (success)
		{
			if (success)
			{
				console.log("All uploads completed successfully");
				announceChange("All files uploaded successfully. Redirecting to main page.");
				window.location.href = redirect_action;
			}
			else
			{
				console.error("There were errors during file upload");

				// Show an alert to the user and update screen reader announcement
				announceChange("Error during file upload. Redirecting to main page in 5 seconds.");
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
});

$('#inspection_1').on('submit', function (e)
{
	e.preventDefault();

	// Check form validity
	var form = this;
	if (form.checkValidity() === false)
	{
		// Create or update error summary for screen readers
		let errorSummary = document.getElementById('error-summary');
		if (!errorSummary)
		{
			errorSummary = document.createElement('div');
			errorSummary.id = 'error-summary';
			errorSummary.className = 'alert alert-danger';
			errorSummary.setAttribute('role', 'alert');
			errorSummary.setAttribute('aria-live', 'assertive');
			$(form).prepend(errorSummary);
		}

		// Find all invalid fields
		var allInvalidFields = $(form).find(':invalid');

		// Create error message list
		var errorList = document.createElement('ul');
		allInvalidFields.each(function ()
		{
			var label = $('label[for="' + this.id + '"]').text().trim();
			var errorItem = document.createElement('li');
			errorItem.textContent = label + ': ' + this.validationMessage;
			errorList.appendChild(errorItem);
		});

		// Clear and update summary
		errorSummary.innerHTML = '<h2>Please fix the following errors:</h2>';
		errorSummary.appendChild(errorList);

		// Find the first visible invalid field and focus it
		var invalidFields = $(form).find(':invalid').filter(':visible');

		if (invalidFields.length > 0)
		{
			// Focus on first visible invalid field
			invalidFields[0].focus();
			// Scroll element into view if needed
			invalidFields[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
		else
		{
			// If no visible invalid fields, check if there are any hidden invalid fields
			var hiddenInvalidFields = $(form).find(':invalid:not(:visible)');
			if (hiddenInvalidFields.length > 0)
			{
				// Try to find and show the container of the hidden field
				var container = $(hiddenInvalidFields[0]).closest('.collapse, .d-none, [style*="display: none"]');
				if (container.length > 0)
				{
					container.show();
					// After showing container, try to focus the field
					setTimeout(function ()
					{
						hiddenInvalidFields[0].focus();
					}, 100);
				}
			}
		}
		return false;
	}

	confirm_session('save');
});

this.confirm_session = function (action)
{
	if (action === 'cancel')
	{
		window.location.href = redirect_action;
		return;
	}

	/**
	 * Block doubleclick
	 */
	$('#submit').prop('disabled', true);
	$('#fileupload').prop('disabled', true);

	var form = document.getElementById('inspection_1');
	$('<div id="spinner" class="d-flex align-items-center">')
		.append($('<strong>').text('Lagrer...'))
		.append($('<div class="spinner-border ml-auto" role="status" aria-hidden="true"></div>')).insertAfter(form);
	window.scrollBy(0, 100);

	// Announce submission to screen readers
	document.getElementById('form-submission-status').textContent = 'Form is being submitted. Please wait...';


	try
	{
		ajax_submit_form(action);
	} catch (e)
	{
		console.error('Error during AJAX submission:', e);
		$('#submit').prop('disabled', false);
		$('#fileupload').prop('disabled', false);

		var element = document.getElementById('spinner');
		if (element)
		{
			element.parentNode.removeChild(element);
		}

		alert('Det oppstod en feil ved sending av skjemaet: ' + e.message);
	}
};

ajax_submit_form = function (action)
{
	var thisForm = $('#inspection_1');
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

					var element = document.getElementById('spinner');
					if (element)
					{
						element.parentNode.removeChild(element);
					} var error_message = '';
					$.each(data.message, function (index, error)
					{
						error_message += error + "\n";
					});

					// Create an accessible error message
					let errorDiv = document.createElement('div');
					errorDiv.className = 'alert alert-danger';
					errorDiv.setAttribute('role', 'alert');
					errorDiv.setAttribute('aria-live', 'assertive');

					let errorHeading = document.createElement('h2');
					errorHeading.textContent = 'Form submission error';
					errorHeading.className = 'h5';

					let errorPara = document.createElement('p');
					errorPara.textContent = error_message;

					errorDiv.appendChild(errorHeading);
					errorDiv.appendChild(errorPara);

					// Insert error message at top of form
					const form = document.getElementById('inspection_1');
					form.prepend(errorDiv);

					// Also use alert for compatibility
					alert(error_message);

					// Update screen reader status
					document.getElementById('form-submission-status').textContent = 'Form submission failed: ' + error_message;
				}
			}
		},
		error: function (jqXHR, textStatus, errorThrown)
		{
			console.error('Ajax error:', textStatus, errorThrown);
			$('#submit').prop('disabled', false);
			$('#fileupload').prop('disabled', false);

			var element = document.getElementById('spinner');
			if (element)
			{
				element.parentNode.removeChild(element);
			}

			alert('Det oppstod en feil ved sending av skjemaet');
		}
	});
};