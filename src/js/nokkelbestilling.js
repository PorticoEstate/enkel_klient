/**
 * Nøkkelbestilling form handler
 * 
 * Handles form validation, submission and file uploads for key ordering
 * Enhanced for WCAG 2.0 compliance with improved accessibility
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

	// Add accessibility enhancements
	initAccessibility();

	// Setup form validation using common validator
	setupFormValidation($('form'));
});

function markRequiredFields()
{
	$('form :required').each(function ()
	{
		var id = $(this).attr('id');
		var $label = $('label[for="' + id + '"]');

		// Add required class to label
		$label.addClass('required');

		// Add aria-required attribute
		$(this).attr('aria-required', 'true');

		// Ensure field has aria-invalid attribute initialized as false
		if (!$(this).attr('aria-invalid'))
		{
			$(this).attr('aria-invalid', 'false');
		}
	});
}

function initializeFileUploader()
{
	try
	{
		// Use the generic function from form-accessibility.js if available
		if (typeof initializeAccessibleFileUpload === 'function')
		{
			// Initialize with custom options for nokkelbestilling form
			fileUploader = initializeAccessibleFileUpload('nokkelbestilling', {
				uploadUrl: `${strBaseURL}/nokkelbestilling/upload`,
				required: filesRequired,
				allowedFileTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'],
				maxFileSizeMB: 15,
				onComplete: function (success)
				{
					if (success)
					{
						// Update screen reader status before navigation
						updateScreenReaderStatus('{{ __("form_submitted_successfully") }}');

						// Allow time for screen reader announcement
						window.setTimeout(function ()
						{
							window.location.href = redirect_action;
						}, 500);
					} else
					{
						// Update screen reader status with error
						updateScreenReaderStatus('{{ __("upload_error") }}');

						// Small delay to allow user to see error messages
						window.setTimeout(function ()
						{
							window.location.href = redirect_action;
						}, 1000);
					}
				},
				// Add callback functions for accessibility announcements
				onAdd: function (fileName)
				{
					updateScreenReaderStatus('{{ __("file_added") }}: ' + fileName);
				},
				onProgress: function (progress)
				{
					// Update ARIA value on progress bar
					$('#progress').attr('aria-valuenow', progress).attr('aria-valuetext', progress + '%');
				}
			});
		}
		// Fallback to direct initialization if generic function is not available
		else if (typeof FileUploader === 'function')
		{
			fileUploader = new FileUploader({
				formId: 'nokkelbestilling',
				uploadUrl: `${strBaseURL}/nokkelbestilling/upload`,
				required: filesRequired,
				onComplete: function (success)
				{
					if (success)
					{
						// Update screen reader status before navigation
						updateScreenReaderStatus('{{ __("form_submitted_successfully") }}');

						// Allow time for screen reader announcement
						window.setTimeout(function ()
						{
							window.location.href = redirect_action;
						}, 500);
					} else
					{
						// Update screen reader status with error
						updateScreenReaderStatus('{{ __("upload_error") }}');

						// Small delay to allow user to see error messages
						window.setTimeout(function ()
						{
							window.location.href = redirect_action;
						}, 1000);
					}
				},
				// Add callback functions for accessibility announcements
				onFileAdded: function (fileName)
				{
					updateScreenReaderStatus('{{ __("file_added") }}: ' + fileName);
				},
				onUploadProgress: function (progress)
				{
					// Update ARIA value on progress bar
					$('#progress').attr('aria-valuenow', progress).attr('aria-valuetext', progress + '%');
				},
				onFileUploadSuccess: function (fileName)
				{
					updateScreenReaderStatus('{{ __("file_uploaded") }}: ' + fileName);
				},
				onFileUploadError: function (fileName, error)
				{
					updateScreenReaderStatus('{{ __("file_error") }}: ' + fileName + ' - ' + error);
				}
			});

			fileUploader.initialize();
		}
	}
	catch (e)
	{
		console.error('Error initializing file uploader:', e);
	}
}

function updateFileUploadRequirements()
{
	// Safely check for pending files
	let pendingFiles = 0;
	try {
		pendingFiles = fileUploader && typeof fileUploader.getPendingCount === 'function' ? 
			fileUploader.getPendingCount() : 0;
	} catch (e) {
		console.warn("Error checking pending files count:", e);
	}

	// Update the file uploader's required state based on location_code
	if (filesRequired && pendingFiles === 0)
	{
		$('#fileupload').attr('required', 'required')
			.attr('aria-required', 'true');

		// Update label to indicate required
		$('#fileupload-label').addClass('required');

		// Announce to screen readers
		updateScreenReaderStatus('{{ __("file_upload_required") }}');
	} else
	{
		$('#fileupload').removeAttr('required')
			.attr('aria-required', 'false');

		// Update label to remove required indication
		$('#fileupload-label').removeClass('required');
	}
}

$('#nokkelbestilling').on('submit', function (e)
{
	e.preventDefault();

	// Check form validity excluding the file input
	var form = this;
	
	// Safely check for pending files
	let pendingFiles = 0;
	try {
		pendingFiles = fileUploader && typeof fileUploader.getPendingCount === 'function' ? 
			fileUploader.getPendingCount() : 0;
	} catch (e) {
		console.warn("Error checking pending files count:", e);
	}
	
	var fileInputValid = !filesRequired || pendingFiles > 0;

	// Temporarily remove required attribute for validation check
	var fileInputRequired = $('#fileupload').attr('required');
	$('#fileupload').removeAttr('required');

	// Use the common form validator to validate all fields
	var formValid = validateAllFields($(form));

	// Restore required attribute if it was set
	if (fileInputRequired)
	{
		$('#fileupload').attr('required', 'required');
	}

	// Handle file upload validation separately since it's not a standard form field
	if (!fileInputValid)
	{
		var errorMsg = 'Du må laste opp fullmakt eller vergefullmakt';
		$('#file-upload-status').text(errorMsg);

		// Add file upload error to error summary if it exists
		var $errorSummary = $(form).find('.error-summary ul');
		if ($errorSummary.length > 0)
		{
			$errorSummary.append('<li>' + errorMsg + '</li>');
		} else
		{
			// Create accessible alert if no error summary exists
			createAccessibleAlert(errorMsg, 'danger');
		}
	}

	// If either validation fails, stop submission
	if (!formValid || !fileInputValid)
	{
		return false;
	}

	// Update form status
	updateScreenReaderStatus('{{ __("form_submitting") }}');

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

	// Announce to screen readers that form is processing
	updateScreenReaderStatus('{{ __("form_processing") }}');

	// Disable form elements for accessibility
	$('#nokkelbestilling input, #nokkelbestilling select, #nokkelbestilling textarea, #nokkelbestilling button').attr('aria-busy', 'true');
}

function removeSubmissionSpinner()
{
	var element = document.getElementById('spinner');
	if (element)
	{
		element.parentNode.removeChild(element);
	}

	// Re-enable form elements
	$('#nokkelbestilling input, #nokkelbestilling select, #nokkelbestilling textarea, #nokkelbestilling button').attr('aria-busy', 'false');
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
			updateScreenReaderStatus('{{ __("form_data_error") }}');
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

					// Announce success to screen readers
					updateScreenReaderStatus('{{ __("form_saved_successfully") }}');

					// Safely check for pending files
					let pendingFiles = 0;
					try {
						pendingFiles = fileUploader && typeof fileUploader.getPendingCount === 'function' ? 
							fileUploader.getPendingCount() : 0;
					} catch (e) {
						console.warn("Error checking pending files count:", e);
					}

					if (pendingFiles === 0)
					{
						// Wait a moment to ensure screen readers announce the success message
						setTimeout(function ()
						{
							window.location.href = redirect_action;
						}, 500);
					} else
					{
						updateScreenReaderStatus('{{ __("uploading_files") }}');
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

					// Update screen reader status with errors
					updateScreenReaderStatus('{{ __("form_submission_error") }}: ' + error_message);

					// Create accessible error alert
					var alertElement = $('<div role="alert" class="alert alert-danger"></div>');
					$.each(data.message, function (index, error)
					{
						alertElement.append($('<p></p>').text(error));
					});

					// Insert at the top of the form
					thisForm.prepend(alertElement);

					// Also show alert for non-screen reader users
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

			const errorMsg = 'Det oppstod en feil ved sending av skjemaet';
			updateScreenReaderStatus('{{ __("form_submission_error") }}: ' + errorMsg);

			// Create accessible error alert
			var alertElement = $('<div role="alert" class="alert alert-danger"></div>')
				.append($('<p></p>').text(errorMsg));

			// Insert at the top of the form
			thisForm.prepend(alertElement);

			// Also show alert for non-screen reader users
			alert(errorMsg);
		}
	});
};

/**
 * Initialize accessibility features
 * Enhances the form with WCAG 2.0 compliant keyboard navigation and screen reader support
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