	var pendingList = 0;
	var redirect_action;
	var file_count = 0;
	var filesRequired = !$('#location_code').val();

	$('#nokkelbestilling').on('submit', function (e) {
		e.preventDefault();

		// Check form validity including file requirement
		var form = this;
		if (form.checkValidity() === false || (filesRequired && pendingList === 0)) {
			// Find the first invalid field and focus it
			var invalidFields = $(form).find(':invalid');
			if (invalidFields.length > 0) {
				invalidFields[0].focus();
			}
			if (filesRequired && pendingList === 0) {
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
			window.location.href = phpGWLink('index.php', {menuaction: 'enkel_klient.nokkelbestilling.display_form'});
			return;
		}

		/**
		 * Block doubleclick
		 */
		$('#submit').prop('disabled', true);
		$('#fileupload').prop('disabled', true);

		var form = document.getElementById('nokkelbestilling');
		$('<div id="spinner" class="d-flex align-items-center">')
			.append($('<strong>').text('Lagrer...'))
			.append($('<div class="spinner-border ml-auto" role="status" aria-hidden="true"></div>')).insertAfter(form);
		window.scrollBy(0, 100); //

		try
		{
			ajax_submit_form(action);
		}
		catch (e)
		{
			console.error('Error during AJAX submission:', e);
			// Optionally alert the user or handle the error further
		}

	};

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
			}
			catch (e)
			{

			}
		}

		$.ajax({
			cache: false,
			contentType: false,
			processData: false,
			type: 'POST',
			url: requestUrl + '&phpgw_return_as=json',
			data: formdata ? formdata : thisForm.serialize(),
			success: function (data, textStatus, jqXHR)
			{
				if (data)
				{
					if (data.status == "saved")
					{
						var id = data.id;

						redirect_action = phpGWLink('index.php', {menuaction: 'enkel_klient.nokkelbestilling.display_form'});
						if (pendingList === 0)
						{
							window.location.href = redirect_action;
						}
						else
						{
							sendAllFiles(id);
						}
					}
					else
					{
						$('#submit').prop('disabled', false);
						$('#fileupload').prop('disabled', false);

						var element = document.getElementById('spinner');
						if (element)
						{
							element.parentNode.removeChild(element);
						}

						var error_message = '';
						$.each(data.message, function (index, error)
						{
							error_message += error + "\n";
						});

						alert(error_message);
					}
				}
			}
		});
	};


	$(document).ready(function ()
	{
		formatFileSize = function (bytes)
		{
			if (typeof bytes !== 'number')
			{
				return '';
			}
			if (bytes >= 1000000000)
			{
				return (bytes / 1000000000).toFixed(2) + ' GB';
			}
			if (bytes >= 1000000)
			{
				return (bytes / 1000000).toFixed(2) + ' MB';
			}
			return (bytes / 1000).toFixed(2) + ' KB';
		};

		sendAllFiles = function (id)
		{
			$('#fileupload').fileupload(
				'option',
				'url',
				phpGWLink('index.php',{
					menuaction: 'enkel_klient.nokkelbestilling.handle_multi_upload_file',
					id: id
				})
			);

			$.each($('.start_file_upload'), function (index, file_start)
			{
				file_start.click();
			});
		};

		$('#fileupload').fileupload(
		{
			dropZone: $('#drop-area'),
			uploadTemplateId: null,
			downloadTemplateId: null,
			autoUpload: false,
			add: function (e, data)
			{
				$.each(data.files, function (index, file)
				{
					var file_size = formatFileSize(file.size);

					data.context = $('<p class="file">')
						.append($('<span>').text(data.files[0].name + ' ' + file_size))
						.appendTo($(".content_upload_download"))
						.append($('<button type="button" class="start_file_upload" style="display:none">start</button>')
							.click(function () {
								data.submit();
							}));

					pendingList++;
					$("#files-count").html(pendingList);

					// Remove required validation when files are added
					if (filesRequired && pendingList > 0) {
						$('#fileupload').removeAttr('required');
					}
				});
			},
			progress: function (e, data)
			{
				var progress = parseInt((data.loaded / data.total) * 100, 10);
				data.context.css("background-position-x", 100 - progress + "%");
			},
			done: function (e, data)
			{
				file_count++;

				var result = data.result;
				var error = false;
				var error_message = '';

				if (typeof (result.files) !== 'undefined')
				{
					error_message = result.files[0].error;
				}
				else
				{
					error_message = 'Noe gikk galt med filopplastingen';
				}

				if (error_message)
				{
					data.context
						.removeClass("file")
						.addClass("error")
						.append($('<span>').text(' Error: ' + error_message));
					error = true;
					
					// Re-add required validation if upload fails
					pendingList--;
					if (filesRequired && pendingList === 0)
					{
						$('#fileupload').attr('required', 'required');
					}
				}
				else
				{
					data.context.addClass("done");
				}

				if (!error && file_count === pendingList) 
				{
					window.location.href = redirect_action;
				} 
				else if (file_count === pendingList) 
				{
					window.setTimeout(function () {
						window.location.href = redirect_action;
					}, 1000);
				}
			},
			fail: function (e, data)
			{
				pendingList--;
				if (filesRequired && pendingList === 0) 
				{
					$('#fileupload').attr('required', 'required');
				}
			},
			limitConcurrentUploads: 1,
			maxChunkSize: 8388000
		});

		// Drag and drop handling
		$(document).bind('dragover', function (e)
		{
			var dropZone = $('#drop-area'),
				timeout = window.dropZoneTimeout;
			if (timeout)
			{
				clearTimeout(timeout);
			}
			else
			{
				dropZone.addClass('in');
			}
			var hoveredDropZone = $(e.target).closest(dropZone);
			dropZone.toggleClass('hover', hoveredDropZone.length);
			window.dropZoneTimeout = setTimeout(function ()
			{
				window.dropZoneTimeout = null;
				dropZone.removeClass('in hover');
			}, 100);
		});

		$(document).bind('drop dragover', function (e)
		{
			e.preventDefault();
		});
	});