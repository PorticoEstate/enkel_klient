/**
 * FileUploader - Reusable file upload component for forms
 */
function FileUploader(config) {
	// Private variables
	const settings = {
		formId: '',
		uploadUrl: '',
		fileInputId: 'fileupload',
		dropAreaId: 'drop-area',
		counterId: 'files-count',
		uploadContainerId: 'content_upload_download',
		required: false,
		onComplete: null,
		...config
	};

	let pendingList = 0;
	let file_count = 0;
	let initialized = false;
	let currentUrl = settings.uploadUrl;
	const $fileInput = $(`#${settings.fileInputId}`);

	// Private methods
	const formatFileSize = function(bytes) {
		if (typeof bytes !== 'number') {
			return '';
		}
		if (bytes >= 1000000000) {
			return (bytes / 1000000000).toFixed(2) + ' GB';
		}
		if (bytes >= 1000000) {
			return (bytes / 1000000).toFixed(2) + ' MB';
		}
		return (bytes / 1000).toFixed(2) + ' KB';
	};

	const sendAllFiles = function(id) {
		// Store the target URL
		currentUrl = `${settings.uploadUrl}?id=${id}`;
		console.log("Setting upload URL to:", currentUrl);
		
		// Make sure the plugin is initialized
		if (!initialized || !$fileInput.data('blueimp-fileupload')) {
			console.warn("File upload plugin not initialized, initializing now");
			if (!initialize()) {
				console.error("Failed to initialize file uploader");
				if (typeof settings.onComplete === 'function') {
					settings.onComplete(false);
				}
				return;
			}
		}
		
		// Set the URL directly on the element too
		$fileInput.attr('data-url', currentUrl);
		
		// Set URL option on the fileupload widget
		try {
			$fileInput.fileupload('option', 'url', currentUrl);
		} catch (e) {
			console.error("Error setting fileupload URL:", e);
		}
		
		// Trigger uploads
		triggerUploads();
	};
	
	const triggerUploads = function() {
		console.log("Triggering file uploads to:", currentUrl);
		$('.start_file_upload').each(function(index) {
			$(this).click();
		});
	};

	const setupDragAndDrop = function() {
		$(document).bind('dragover', function(e) {
			const dropZone = $(`#${settings.dropAreaId}`);
			if (!dropZone.length) return;
			
			const timeout = window.dropZoneTimeout;
			if (timeout) {
				clearTimeout(timeout);
			} else {
				dropZone.addClass('in');
			}
			const hoveredDropZone = $(e.target).closest(dropZone);
			dropZone.toggleClass('hover', hoveredDropZone.length);
			window.dropZoneTimeout = setTimeout(function() {
				window.dropZoneTimeout = null;
				dropZone.removeClass('in hover');
			}, 100);
		});

		$(document).bind('drop dragover', function(e) {
			e.preventDefault();
		});
	};

	// Initialize the file uploader
	const initialize = function() {
		// Check if fileupload plugin is available
		if (!$.fn.fileupload) {
			console.error("jQuery File Upload plugin is not loaded");
			return false;
		}
		
		// Check if element exists
		if (!$fileInput.length) {
			console.error(`File input element with ID "${settings.fileInputId}" not found`);
			return false;
		}
		
		// Set the initial URL on the element
		$fileInput.attr('data-url', settings.uploadUrl);
		
		// Destroy existing instance if any
		try {
			if ($fileInput.data('blueimp-fileupload')) {
				$fileInput.fileupload('destroy');
			}
		} catch (e) {
			console.log("No previous fileupload instance to destroy");
		}
		
		try {
			$fileInput.fileupload({
				url: settings.uploadUrl, // Set initial URL
				dropZone: $(`#${settings.dropAreaId}`),
				uploadTemplateId: null,
				downloadTemplateId: null,
				autoUpload: false,
				add: function(e, data) {
					console.log("File added, will upload to:", currentUrl || settings.uploadUrl);
					// Override URL for each upload to ensure it's correct
					data.url = currentUrl || settings.uploadUrl;
					
					$.each(data.files, function(index, file) {
						const file_size = formatFileSize(file.size);

						data.context = $('<p class="file">')
							.append($('<span>').text(file.name + ' ' + file_size))
							.appendTo($(`.${settings.uploadContainerId}`))
							.append($('<button type="button" class="start_file_upload" style="display:none">start</button>')
								.click(function() {
									// Set URL again right before submit to be safe
									data.url = currentUrl || settings.uploadUrl;
									console.log("Uploading to:", data.url);
									data.submit();
								}));

						pendingList++;
						$(`#${settings.counterId}`).html(pendingList);

						// Remove required validation when files are added
						if (settings.required && pendingList > 0) {
							$fileInput.removeAttr('required');
						}
					});
				},
				submit: function(e, data) {
					// Final check of URL before upload starts
					data.url = currentUrl || settings.uploadUrl;
					console.log("File upload submitting to:", data.url);
					return true;
				},
				progress: function(e, data) {
					const progress = parseInt((data.loaded / data.total) * 100, 10);
					data.context.css("background-position-x", 100 - progress + "%");
				},
				done: function(e, data) {
					file_count++;
					console.log("Upload completed, response:", data.result);

					const result = data.result;
					let error = false;
					let error_message = '';

					// More comprehensive error detection
					if (typeof(result) === 'undefined' || !result) {
						error_message = 'Ingen respons fra server';
						error = true;
					} else if (typeof(result) === 'string' && result.indexOf('error') !== -1) {
						// Handle string response containing error
						error_message = result;
						error = true;
					} else if (result.error) {
						// Direct error property
						error_message = typeof result.error === 'string' ? result.error : 'Server error';
						error = true;
					} else if (result.status && result.status === 'error') {
						// Status-based error
						error_message = result.message || 'Server error';
						error = true;
					} else if (result.files && Array.isArray(result.files)) {
						// Check if any file in the files array has an error
						for (let i = 0; i < result.files.length; i++) {
							if (result.files[i].error) {
								error_message = result.files[i].error;
								error = true;
								break;
							}
						}
					}

					// Additional check for other response formats
					if (!error && typeof result === 'object') {
						// Look for any property that might indicate an error
						for (let key in result) {
							if (key.toLowerCase().includes('error') && result[key]) {
								error_message = typeof result[key] === 'string' ? result[key] : 'Error detected in response';
								error = true;
								break;
							}
						}
					}

					if (error) {
						console.error("Upload error detected:", error_message, result);
						data.context
							.removeClass("file")
							.addClass("error")
							.append($('<span>').text(' Error: ' + error_message));

						// Re-add required validation if upload fails
						pendingList--;
						if (settings.required && pendingList === 0) {
							$fileInput.attr('required', 'required');
						}
					} else {
						data.context.addClass("done");
					}

					// Check if all files are processed and call completion callback
					if (file_count >= pendingList && typeof settings.onComplete === 'function') {
						console.log("All files processed, calling onComplete with success =", !error);
						settings.onComplete(!error);
					}
				},
				fail: function(e, data) {
					console.error("Upload failed:", data.url, data.errorThrown);
					pendingList--;
					data.context
						.removeClass("file")
						.addClass("error")
						.append($('<span>').text(' Error: Upload failed - ' + (data.errorThrown || 'Unknown error')));
					
					if (settings.required && pendingList === 0) {
						$fileInput.attr('required', 'required');
					}
				},
				limitConcurrentUploads: 1,
				maxChunkSize: 8388000
			});

			setupDragAndDrop();
			initialized = true;
			return true;
		} catch (e) {
			console.error("Error initializing file upload:", e);
			return false;
		}
	};

	// Public methods
	return {
		initialize: initialize,
		sendAllFiles: sendAllFiles,
		getPendingCount: function() {
			return pendingList;
		},
		getFileCount: function() {
			return file_count;
		},
		resetCounts: function() {
			pendingList = 0;
			file_count = 0;
			$(`#${settings.counterId}`).html(pendingList);
		},
		isInitialized: function() {
			return initialized;
		}
	};
}