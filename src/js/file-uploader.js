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
	let uploaded_count = 0; // Track actual upload completions
	let initialized = false;
	let currentUrl = settings.uploadUrl;
	const $fileInput = $(`#${settings.fileInputId}`);
	
	// Track uploads for sequential processing
	let isProcessingUploads = false;
	let uploadQueue = [];
	let hasUploadErrors = false;

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
		
		// Reset tracking variables
		file_count = 0;
		uploaded_count = 0;
		hasUploadErrors = false;
		
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
		
		// Build the upload queue - important to capture all files
		uploadQueue = [];
		$('.start_file_upload').each(function() {
			uploadQueue.push($(this));
		});
		
		console.log(`Starting sequential upload of ${uploadQueue.length} files to ${currentUrl}`);
		
		if (uploadQueue.length === 0) {
			// No files to upload
			console.log("No files to upload");
			if (typeof settings.onComplete === 'function') {
				settings.onComplete(true);
			}
			return;
		}
		
		// Start sequential processing
		isProcessingUploads = true;
		processNextUpload();
	};
	
	const processNextUpload = function() {
		if (uploadQueue.length === 0) {
			console.log(`All ${pendingList} files have been queued for upload.`);
			return;
		}
		
		// Get and remove the first button from the queue
		const $button = uploadQueue.shift();
		
		// Start the upload by clicking the button
		try {
			console.log(`Starting upload ${file_count + 1} of ${pendingList}`);
			$button.click();
			file_count++;
		} catch (e) {
			console.error("Error starting upload:", e);
			// Try next file
			if (uploadQueue.length > 0) {
				setTimeout(processNextUpload, 100);
			} else {
				checkAllUploadsComplete();
			}
		}
	};
	
	const checkAllUploadsComplete = function() {
		console.log(`Checking completion: uploaded ${uploaded_count}/${pendingList}, queued: ${file_count}`);
		
		// Only call onComplete when all files are truly done uploading
		if (uploaded_count >= pendingList && typeof settings.onComplete === 'function') {
			console.log(`All files processed: ${uploaded_count}/${pendingList}, success = ${!hasUploadErrors}`);
			isProcessingUploads = false;
			
			// Use setTimeout to ensure this runs after all other pending operations
			setTimeout(function() {
				settings.onComplete(!hasUploadErrors);
			}, 100);
		}
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
				sequentialUploads: true, // Ensure sequential processing
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
					uploaded_count++; // Track actual completed uploads
					console.log(`Upload ${uploaded_count}/${pendingList} completed, response:`, data.result);

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

						// Track errors for final callback
						hasUploadErrors = true;
						
						// Re-add required validation if upload fails
						pendingList--;
						if (settings.required && pendingList === 0) {
							$fileInput.attr('required', 'required');
						}
					} else {
						data.context.addClass("done");
					}
					
					// Process the next file in the queue if sequential uploads are in progress
					if (isProcessingUploads && uploadQueue.length > 0) {
						// Process next file with a small delay to prevent UI locking
						setTimeout(processNextUpload, 100);
					} else {
						// Check if all uploads are done
						checkAllUploadsComplete();
					}
				},
				fail: function(e, data) {
					console.error("Upload failed:", data.url, data.errorThrown);
					uploaded_count++; // Count failed uploads in completion tracking
					pendingList--;
					hasUploadErrors = true;
					
					data.context
						.removeClass("file")
						.addClass("error")
						.append($('<span>').text(' Error: Upload failed - ' + (data.errorThrown || 'Unknown error')));
					
					if (settings.required && pendingList === 0) {
						$fileInput.attr('required', 'required');
					}
					
					// Continue with next file despite error
					if (isProcessingUploads && uploadQueue.length > 0) {
						setTimeout(processNextUpload, 100);
					} else {
						checkAllUploadsComplete();
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
		getPendingCount: function ()
		{
			return pendingList;
		},
		getFileCount: function ()
		{
			return file_count;
		},
		resetCounts: function ()
		{
			pendingList = 0;
			file_count = 0;
			uploaded_count = 0;
			$(`#${settings.counterId}`).html(pendingList);
		},
		isInitialized: function ()
		{
			return initialized;
		}
	};
}