function showDiv(divId, element)
{
	document.getElementById(divId).style.display = element.checked == true ? 'block' : 'none';
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
		document.getElementById('inner_details').style.display = 'none';
	}
	else
	{
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

function handleChangeSlukkeutstyr(src)
{
	//datestamp
	const input = document.getElementById('datestamp');

	if (src.value == 2)
	{
		input.removeAttribute('required');
		document.getElementById('dateblock').style.display = 'none';
	}
	else
	{
		input.setAttribute('required', '');
		document.getElementById('dateblock').style.display = 'block';
	}
}

var pendingList = 0;
var redirect_action;
var file_count = 0;

$('#inspection_1').on('submit', function (e)
{
	e.preventDefault();

	if ($('#inspection_1').get(0).checkValidity() === false)
	{
		return false;
	}

	confirm_session('save');
});

this.confirm_session = function (action)
{
	if (action === 'cancel')
	{
		window.location.href = phpGWLink('index.php', {menuaction: 'enkel_klient.inspection_1.display_form'});
		return;
	}

	/**
	 * Block doubleclick
	 */
	$('#submit').prop('disabled', true);

	var form = document.getElementById('inspection_1');
	$('<div id="spinner" class="d-flex align-items-center">')
		.append($('<strong>').text('Lagrer...'))
		.append($('<div class="spinner-border ml-auto" role="status" aria-hidden="true"></div>')).insertAfter(form);
	window.scrollBy(0, 100); //

//	document.getElementById(action).value = 1;
	try
	{
		validate_submit();
	}
	catch (e)
	{
		ajax_submit_form(action);
//						document.form.submit();
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

					redirect_action = phpGWLink('index.php', {menuaction: 'enkel_klient.inspection_1.display_form'});
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
			phpGWLink('index.php', {menuaction: 'enkel_klient.inspection_1.handle_multi_upload_file', id: id})
			);

		$.each($('.start_file_upload'), function (index, file_start)
		{
			file_start.click();
		});
	};

	$('#fileupload').fileupload({
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
						.click(function ()
						{
							data.submit();
						}));

				pendingList++;

				$("#files-count").html(pendingList);

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

			if(typeof (result.files) !== 'undefined')
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
			}
			else
			{
				data.context
					.addClass("done");
			}

			if (!error && file_count === pendingList)
			{
				window.location.href = redirect_action;
			}
			else
			{
				window.setTimeout(function ()
				{
					window.location.href = redirect_action;
				}, 1000);
			}

		},
		limitConcurrentUploads: 1,
		maxChunkSize: 8388000
	});

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
