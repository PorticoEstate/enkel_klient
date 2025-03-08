/**
 * Inspection form handler
 * 
 * Handles form validation, submission and file uploads for inspection form
 */

// Form-specific utility functions
function showDiv(divId, element) {
	document.getElementById(divId).style.display = element.checked == true ? 'block' : 'none';
}

function handleChangeTilgang(src) {
	console.log(src.checked);
	const type_br_slokking_1 = document.getElementById('type_br_slokking_1');
	const type_br_slokking_2 = document.getElementById('type_br_slokking_2');
	const type_br_slokking_3 = document.getElementById('type_br_slokking_3');
	const type_br_slokking_4 = document.getElementById('type_br_slokking_4');
	const rokvarsler_1 = document.getElementById('rokvarsler_1');
	const rokvarsler_2 = document.getElementById('rokvarsler_2');
	const rokvarsler_3 = document.getElementById('rokvarsler_3');
	const rokvarsler_4 = document.getElementById('rokvarsler_4');

	if (src.checked === true) {
		type_br_slokking_1.removeAttribute('required');
		type_br_slokking_2.removeAttribute('required');
		type_br_slokking_3.removeAttribute('required');
		type_br_slokking_4.removeAttribute('required');
		rokvarsler_1.removeAttribute('required');
		rokvarsler_2.removeAttribute('required');
		rokvarsler_3.removeAttribute('required');
		rokvarsler_4.removeAttribute('required');
		document.getElementById('inner_details').style.display = 'none';
	} else {
		type_br_slokking_1.setAttribute('required', '');
		type_br_slokking_2.setAttribute('required', '');
		type_br_slokking_3.setAttribute('required', '');
		type_br_slokking_4.setAttribute('required', '');
		rokvarsler_1.setAttribute('required', '');
		rokvarsler_2.setAttribute('required', '');
		rokvarsler_3.setAttribute('required', '');
		rokvarsler_4.setAttribute('required', '');
		document.getElementById('inner_details').style.display = 'block';
	}
}

function handleChangeSlukkeutstyr(src) {
	//datestamp
	const input = document.getElementById('datestamp');

	if (src.value == 2) {
		input.removeAttribute('required');
		document.getElementById('dateblock').style.display = 'none';
	} else {
		input.setAttribute('required', '');
		document.getElementById('dateblock').style.display = 'block';
	}
}

// Global variables
var redirect_action = `${strBaseURL}/inspection_1`;
var fileUploader = null;

$(document).ready(function() {
	// Add asterisk to all labels of required fields
	$('form :required').each(function() {
		var id = $(this).attr('id');
		$('label[for="' + id + '"]').append(' <span class="text-danger">*</span>');
	});
	
	// Initialize FileUploader component
	fileUploader = new FileUploader({
		formId: 'inspection_1',
		uploadUrl: `${strBaseURL}/inspection_1/upload`,
		onComplete: function(success) {
			if (success) {
				console.log("All uploads completed successfully");
				window.location.href = redirect_action;
			} else {
				console.error("There were errors during file upload");
				
				// Show an alert to the user
				alert('Det oppstod en feil under filopplastingen. Vi omdirigerer deg til hovedsiden om 5 sekunder.');
				
				// Wait longer before redirecting to allow user to see errors
				window.setTimeout(function() {
					window.location.href = redirect_action;
				}, 5000);
			}
		}
	});
	fileUploader.initialize();
});

$('#inspection_1').on('submit', function(e) {
	e.preventDefault();

	// Check form validity
	var form = this;
	if (form.checkValidity() === false) {
		// Find the first visible invalid field and focus it
		var invalidFields = $(form).find(':invalid').filter(':visible');
		
		if (invalidFields.length > 0) {
			// Focus on first visible invalid field
			invalidFields[0].focus();
			// Scroll element into view if needed
			invalidFields[0].scrollIntoView({behavior: 'smooth', block: 'center'});
		} else {
			// If no visible invalid fields, check if there are any hidden invalid fields
			var hiddenInvalidFields = $(form).find(':invalid:not(:visible)');
			if (hiddenInvalidFields.length > 0) {
				// Try to find and show the container of the hidden field
				var container = $(hiddenInvalidFields[0]).closest('.collapse, .d-none, [style*="display: none"]');
				if (container.length > 0) {
					container.show();
					// After showing container, try to focus the field
					setTimeout(function() {
						hiddenInvalidFields[0].focus();
					}, 100);
				}
			}
		}
		return false;
	}

	confirm_session('save');
});

this.confirm_session = function(action) {
	if (action === 'cancel') {
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

	try {
		ajax_submit_form(action);
	} catch (e) {
		console.error('Error during AJAX submission:', e);
		$('#submit').prop('disabled', false);
		$('#fileupload').prop('disabled', false);
		
		var element = document.getElementById('spinner');
		if (element) {
			element.parentNode.removeChild(element);
		}
		
		alert('Det oppstod en feil ved sending av skjemaet: ' + e.message);
	}
};

ajax_submit_form = function(action) {
	var thisForm = $('#inspection_1');
	var requestUrl = $(thisForm).attr("action");
	var formdata = false;
	if (window.FormData) {
		try {
			formdata = new FormData(thisForm[0]);
		} catch (e) {
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
		success: function(data, textStatus, jqXHR) {
			if (data) {
				if (data.status == "saved") {
					var id = data.id;
					
					if (fileUploader.getPendingCount() === 0) {
						window.location.href = redirect_action;
					} else {
						fileUploader.sendAllFiles(id);
					}
				} else {
					$('#submit').prop('disabled', false);
					$('#fileupload').prop('disabled', false);

					var element = document.getElementById('spinner');
					if (element) {
						element.parentNode.removeChild(element);
					}

					var error_message = '';
					$.each(data.message, function(index, error) {
						error_message += error + "\n";
					});

					alert(error_message);
				}
			}
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.error('Ajax error:', textStatus, errorThrown);
			$('#submit').prop('disabled', false);
			$('#fileupload').prop('disabled', false);
			
			var element = document.getElementById('spinner');
			if (element) {
				element.parentNode.removeChild(element);
			}
			
			alert('Det oppstod en feil ved sending av skjemaet');
		}
	});
};