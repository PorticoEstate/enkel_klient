/**
 * FileUploader - Reusable file upload component for forms
 * Enhanced with WCAG 2.1 accessibility features for keyboard navigation and screen reader support
 */
function FileUploader(config)
{
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
		onAdd: null,          // Callback when a file is added
		onDelete: null,       // Callback when a file is deleted
		onProgress: null,     // Callback for upload progress
		fileSelectBtnId: 'file-select-btn', // ID for the file select button
		allowedFileTypes: [],  // Array of allowed file types/extensions
		maxFileSizeMB: 10,     // Maximum file size in MB
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
	const formatFileSize = function (bytes)
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

	const sendAllFiles = function (id)
	{
		// Store the target URL
		currentUrl = `${settings.uploadUrl}?id=${id}`;
		console.log("Setting upload URL to:", currentUrl);

		// Reset tracking variables
		file_count = 0;
		uploaded_count = 0;
		hasUploadErrors = false;

		// Make sure the plugin is initialized
		if (!initialized || !$fileInput.data('blueimp-fileupload'))
		{
			console.warn("File upload plugin not initialized, initializing now");
			if (!initialize())
			{
				console.error("Failed to initialize file uploader");
				if (typeof settings.onComplete === 'function')
				{
					settings.onComplete(false);
				}
				return;
			}
		}

		// Set the URL directly on the element too
		$fileInput.attr('data-url', currentUrl);

		// Set URL option on the fileupload widget
		try
		{
			$fileInput.fileupload('option', 'url', currentUrl);
		} catch (e)
		{
			console.error("Error setting fileupload URL:", e);
		}

		// Build the upload queue - important to capture all files
		uploadQueue = [];
		$('.start_file_upload').each(function ()
		{
			uploadQueue.push($(this));
		});

		console.log(`Starting sequential upload of ${uploadQueue.length} files to ${currentUrl}`);

		if (uploadQueue.length === 0)
		{
			// No files to upload
			console.log("No files to upload");
			if (typeof settings.onComplete === 'function')
			{
				settings.onComplete(true);
			}
			return;
		}

		// Start sequential processing
		isProcessingUploads = true;
		processNextUpload();
	};

	const processNextUpload = function ()
	{
		if (uploadQueue.length === 0)
		{
			console.log(`All ${pendingList} files have been queued for upload.`);
			return;
		}

		// Get and remove the first button from the queue
		const $button = uploadQueue.shift();

		// Start the upload by clicking the button
		try
		{
			console.log(`Starting upload ${file_count + 1} of ${pendingList}`);
			$button.click();
			file_count++;
		} catch (e)
		{
			console.error("Error starting upload:", e);
			// Try next file
			if (uploadQueue.length > 0)
			{
				setTimeout(processNextUpload, 100);
			} else
			{
				checkAllUploadsComplete();
			}
		}
	};

	const checkAllUploadsComplete = function ()
	{
		console.log(`Checking completion: uploaded ${uploaded_count}/${pendingList}, queued: ${file_count}`);

		// Only call onComplete when all files are truly done uploading
		if (uploaded_count >= pendingList && typeof settings.onComplete === 'function')
		{
			console.log(`All files processed: ${uploaded_count}/${pendingList}, success = ${!hasUploadErrors}`);
			isProcessingUploads = false;

			// Use setTimeout to ensure this runs after all other pending operations
			setTimeout(function ()
			{
				settings.onComplete(!hasUploadErrors);
			}, 100);
		}
	};

	const setupDragAndDrop = function ()
	{
		$(document).bind('dragover', function (e)
		{
			const dropZone = $(`#${settings.dropAreaId}`);
			if (!dropZone.length) return;

			const timeout = window.dropZoneTimeout;
			if (timeout)
			{
				clearTimeout(timeout);
			} else
			{
				dropZone.addClass('in');
			}
			const hoveredDropZone = $(e.target).closest(dropZone);
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
	};

	// Initialize the file uploader
	const initialize = function ()
	{
		// Check if fileupload plugin is available
		if (!$.fn.fileupload)
		{
			console.error("jQuery File Upload plugin is not loaded");
			return false;
		}

		// Check if element exists
		if (!$fileInput.length)
		{
			console.error(`File input element with ID "${settings.fileInputId}" not found`);
			return false;
		}

		// Set the initial URL on the element
		$fileInput.attr('data-url', settings.uploadUrl);
        
        // Add keyboard accessibility enhancements
        enhanceKeyboardAccessibility();
        
        // Setup file deletion handlers
        setupFileDeletion();
        
        // Setup file type validation if allowed types are specified
        if (settings.allowedFileTypes && settings.allowedFileTypes.length > 0) {
            setupFileValidation(settings.allowedFileTypes, settings.maxFileSizeMB);
        }

		// Destroy existing instance if any
		try
		{
			if ($fileInput.data('blueimp-fileupload'))
			{
				$fileInput.fileupload('destroy');
			}
		} catch (e)
		{
			console.log("No previous fileupload instance to destroy");
		}

		try
		{
			$fileInput.fileupload({
				url: settings.uploadUrl, // Set initial URL
				dropZone: $(`#${settings.dropAreaId}`),
				uploadTemplateId: null,
				downloadTemplateId: null,
				autoUpload: false,
				sequentialUploads: true, // Ensure sequential processing
				add: function (e, data)
				{
					console.log("File added, will upload to:", currentUrl || settings.uploadUrl);
					// Override URL for each upload to ensure it's correct
					data.url = currentUrl || settings.uploadUrl;

					$.each(data.files, function (index, file)
					{
						const file_size = formatFileSize(file.size);

						data.context = $('<p class="file file-item" tabindex="0" role="listitem">')
							.append($('<span>').text(file.name + ' ' + file_size))
							.appendTo($(`.${settings.uploadContainerId}`))
							.append($('<button type="button" class="start_file_upload" style="display:none">start</button>')
								.click(function ()
								{
									// Set URL again right before submit to be safe
									data.url = currentUrl || settings.uploadUrl;
									console.log("Uploading to:", data.url);
									data.submit();
								}));

						pendingList++;
						$(`#${settings.counterId}`).html(pendingList);

						// Remove required validation when files are added
						if (settings.required && pendingList > 0)
						{
							$fileInput.removeAttr('required');
						}
						
						// Announce the added file to screen readers
						announceToScreenReader(`File added: ${file.name}, size: ${file_size}`);
						
						// Call onAdd callback if provided
						if (typeof settings.onAdd === 'function') {
							settings.onAdd(file);
						}
					});
				},
				submit: function (e, data)
				{
					// Final check of URL before upload starts
					data.url = currentUrl || settings.uploadUrl;
					console.log("File upload submitting to:", data.url);
					return true;
				},
				progress: function (e, data)
				{
					const progress = parseInt((data.loaded / data.total) * 100, 10);
					data.context.css("background-position-x", 100 - progress + "%");
					
					// Add ARIA attributes to indicate progress
					data.context.attr({
						'aria-valuemin': '0',
						'aria-valuemax': '100',
						'aria-valuenow': progress,
						'aria-valuetext': `${progress}% complete`
					});
					
					// Announce progress at meaningful intervals
					if (progress % 25 === 0) {
						announceToScreenReader(`Upload ${progress}% complete`);
					}
					
					// Call progress callback if provided
					if (typeof settings.onProgress === 'function') {
						settings.onProgress(progress);
					}
				},
				done: function (e, data)
				{
					uploaded_count++; // Track actual completed uploads
					console.log(`Upload ${uploaded_count}/${pendingList} completed, response:`, data.result);

					const result = data.result;
					let error = false;
					let error_message = '';
					const filename = data.files && data.files[0] ? data.files[0].name : 'File';

					// More comprehensive error detection
					if (typeof (result) === 'undefined' || !result)
					{
						error_message = 'Ingen respons fra server';
						error = true;
					} else if (typeof (result) === 'string' && result.indexOf('error') !== -1)
					{
						// Handle string response containing error
						error_message = result;
						error = true;
					} else if (result.error)
					{
						// Direct error property
						error_message = typeof result.error === 'string' ? result.error : 'Server error';
						error = true;
					} else if (result.status && result.status === 'error')
					{
						// Status-based error
						error_message = result.message || 'Server error';
						error = true;
					} else if (result.files && Array.isArray(result.files))
					{
						// Check if any file in the files array has an error
						for (let i = 0; i < result.files.length; i++)
						{
							if (result.files[i].error)
							{
								error_message = result.files[i].error;
								error = true;
								break;
							}
						}
					}

					// Additional check for other response formats
					if (!error && typeof result === 'object')
					{
						// Look for any property that might indicate an error
						for (let key in result)
						{
							if (key.toLowerCase().includes('error') && result[key])
							{
								error_message = typeof result[key] === 'string' ? result[key] : 'Error detected in response';
								error = true;
								break;
							}
						}
					}

					if (error)
					{
						console.error("Upload error detected:", error_message, result);
						data.context
							.removeClass("file")
							.addClass("error")
							.append($('<span>').text(' Error: ' + error_message))
							.attr({
								'aria-invalid': 'true',
								'aria-errormessage': error_message
							});

						// Announce error to screen reader
						announceToScreenReader(`Error uploading ${filename}: ${error_message}`, 'assertive');

						// Track errors for final callback
						hasUploadErrors = true;

						// Re-add required validation if upload fails
						pendingList--;
						if (settings.required && pendingList === 0)
						{
							$fileInput.attr('required', 'required');
						}
					} else
					{
						data.context.addClass("done")
							.attr({
								'aria-label': `${filename} uploaded successfully`,
								'aria-invalid': 'false'
							});
							
						// Announce success to screen reader
						announceToScreenReader(`${filename} uploaded successfully`);
					}

					// Process the next file in the queue if sequential uploads are in progress
					if (isProcessingUploads && uploadQueue.length > 0)
					{
						// Process next file with a small delay to prevent UI locking
						setTimeout(processNextUpload, 100);
					} else
					{
						// Check if all uploads are done
						checkAllUploadsComplete();
					}
				},
				fail: function (e, data)
				{
					console.error("Upload failed:", data.url, data.errorThrown);
					uploaded_count++; // Count failed uploads in completion tracking
					pendingList--;
					hasUploadErrors = true;
					
					const filename = data.files && data.files[0] ? data.files[0].name : 'File';
					const errorMessage = data.errorThrown || 'Unknown error';

					data.context
						.removeClass("file")
						.addClass("error")
						.append($('<span>').text(' Error: Upload failed - ' + errorMessage))
						.attr({
							'aria-invalid': 'true',
							'aria-errormessage': errorMessage
						});
						
					// Announce failure to screen reader
					announceToScreenReader(`Failed to upload ${filename}: ${errorMessage}`, 'assertive');

					if (settings.required && pendingList === 0)
					{
						$fileInput.attr('required', 'required');
					}

					// Continue with next file despite error
					if (isProcessingUploads && uploadQueue.length > 0)
					{
						setTimeout(processNextUpload, 100);
					} else
					{
						checkAllUploadsComplete();
					}
				},
				limitConcurrentUploads: 1,
				maxChunkSize: 8388000
			});

			setupDragAndDrop();
			
			// Connect any existing file select buttons from the template to this file input
			connectExistingFileSelectButton();
			
			initialized = true;
			return true;
		} catch (e)
		{
			console.error("Error initializing file upload:", e);
			return false;
		}
	};

	// Enhance keyboard accessibility for file upload components
	const enhanceKeyboardAccessibility = function() {
		// Make file upload button keyboard accessible - works with both ID and class selectors
		// to handle buttons defined in templates
		$(`#${settings.fileSelectBtnId}, .file-select-btn`).on('click keydown', function(e) {
			// Trigger on click or Enter/Space key
			if (e.type === 'click' || (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' '))) {
				e.preventDefault();
				$fileInput.click();
			}
		});
		
		// Add keyboard support for file list items
		$(document).on('keydown', '.presentation.files .file-item', function(e) {
			// Delete file when Delete key or Backspace is pressed
			if (e.key === 'Delete' || e.key === 'Backspace') {
				e.preventDefault();
				// Find and click the delete button within this file item
				$(this).find('.delete').click();
			}
		});
		
		// Make delete buttons keyboard accessible
		$(document).on('keydown', '.presentation.files .delete', function(e) {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				$(this).click();
			}
		});

		// Ensure file items are focusable and have proper ARIA attributes
		$(document).on('DOMNodeInserted', '.presentation.files', function() {
			setTimeout(function() {
				$('.file-item').each(function() {
					if (!$(this).attr('tabindex')) {
						$(this).attr('tabindex', '0');
						
						// Add proper accessibility roles
						$(this).attr('role', 'listitem');
						
						// Ensure delete buttons are keyboard accessible
						$(this).find('.delete').attr({
							'tabindex': '0',
							'role': 'button',
							'aria-label': 'Delete file'
						});
					}
				});
				
				// Set the proper role for the file list container
				$('.presentation.files').attr('role', 'list');
			}, 100);
		});
        
		// Set proper ARIA attributes on the file input and related elements
		$fileInput.attr({
			'aria-label': 'File upload',
			'aria-description': 'Select files to upload'
		});
		
		// Make drop zone accessible
		const $dropZone = $(`#${settings.dropAreaId}`);
		if ($dropZone.length) {
			$dropZone.attr({
				'role': 'region',
				'aria-label': 'File drop zone',
				'tabindex': '0'
			});
		}
	};

	// Function to connect existing file select buttons to the file input
	const connectExistingFileSelectButton = function() {
		// Find any existing file select buttons in the DOM
		const $fileSelectBtn = $(`#${settings.fileSelectBtnId}, .file-select-btn`);
		
		if ($fileSelectBtn.length) {
			console.log('Found existing file select button, attaching handlers');
			
			// Add keyboard and click handlers to open file dialog
			$fileSelectBtn.off('click keydown').on('click keydown', function(e) {
				// Trigger on click or Enter/Space key
				if (e.type === 'click' || (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' '))) {
					e.preventDefault();
					$fileInput.click();
				}
			}).data('file-handlers-attached', true);
		} else {
			console.warn('No file select button found in the DOM');
		}
		
		// Add screen reader status for file operations if needed
		if (!$('#file-upload-status').length) {
			$('<div>', {
				id: 'file-upload-status',
				'class': 'sr-only',
				'aria-live': 'polite'
			}).appendTo($('body'));
		}
		
		return $fileSelectBtn.length > 0;
	};

	// Helper functions for accessibility
	const createAccessibleAlert = function(message, type) {
		// Remove existing alerts
		$('.alert-accessible').remove();

		// Create alert with proper ARIA role
		const $alert = $('<div>', {
			'class': 'alert alert-' + (type || 'info') + ' alert-accessible',
			'role': 'alert',
			'aria-live': 'assertive'
		}).text(message);

		// Add to page - preferably near the form
		const $form = $(`#${settings.formId}`);
		if ($form.length) {
			$form.before($alert);
		} else {
			$('body').prepend($alert);
		}

		// Scroll to alert
		$('html, body').animate({
			scrollTop: $alert.offset().top - 100
		}, 200);
	};

	const announceToScreenReader = function(message, priority = 'polite') {
		// Create or update the status element
		const statusId = 'file-upload-status';
		
		if (!$(`#${statusId}`).length) {
			$('<div>', {
				id: statusId,
				'class': 'sr-only',
				'aria-live': priority
			}).appendTo($(`#${settings.dropAreaId}`).length ? `#${settings.dropAreaId}` : 'body');
		}
		
		$(`#${statusId}`).text(message);
	};

	// Create a method to handle file deletion with accessibility support
	const setupFileDeletion = function() {
		// Delegate event handler for file deletion buttons
		$(document).off('click.fileDelete').on('click.fileDelete', '.file-item .delete', function(e) {
			e.preventDefault();
			const $fileItem = $(this).closest('.file-item');
			const filename = $fileItem.data('filename') || 'File';
			
			// Confirm deletion with accessible dialog
			if (confirm(`Are you sure you want to delete the file "${filename}"?`)) {
				// Remove file from UI
				$fileItem.fadeOut(300, function() {
					$(this).remove();
					
					// Decrement file count
					pendingList--;
					$(`#${settings.counterId}`).html(pendingList);
					
					// Re-add required validation if needed
					if (settings.required && pendingList === 0) {
						$fileInput.attr('required', 'required');
					}
					
					// Announce to screen reader
					announceToScreenReader(`File ${filename} removed`);
					
					// Call onDelete callback if provided
					if (typeof settings.onDelete === 'function') {
						settings.onDelete({ name: filename });
					}
				});
			}
		});
		
		// Add keyboard support for file deletion
		$(document).off('keydown.fileDelete').on('keydown.fileDelete', '.file-item', function(e) {
			// Delete file when Delete key or Backspace is pressed
			if (e.key === 'Delete' || e.key === 'Backspace') {
				e.preventDefault();
				// Find and click the delete button within this file item
				$(this).find('.delete').click();
			}
		});
		
		// Make delete buttons keyboard accessible
		$(document).off('keydown.deleteButton').on('keydown.deleteButton', '.file-item .delete', function(e) {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				$(this).click();
			}
		});
	};

	// Set up file type validation 
	const setupFileValidation = function(allowedTypes, maxSizeMB) {
		// Default values if not specified
		const types = allowedTypes || [];
		const maxSize = (maxSizeMB || 10) * 1024 * 1024; // Convert to bytes
		
		// If no allowed types specified, don't add validations
		if (types.length === 0) {
			return;
		}
		
		// Add accept attribute to file input
		$fileInput.attr('accept', types.join(','));
		
		// Create info text for allowed file types
		const $fileInfo = $('<div>', {
			'class': 'file-type-info',
			'aria-live': 'polite'
		});
		
		// Add to page near the file input
		$fileInfo.html(`<small>Allowed file types: ${types.join(', ')}<br>Maximum file size: ${formatFileSize(maxSize)}</small>`);
		$fileInput.after($fileInfo);
		
		// Add validation before file upload
		$fileInput.on('change', function(e) {
			const files = e.target.files;
			let hasError = false;
			let errorMessage = '';
			
			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				
				// Check file size
				if (file.size > maxSize) {
					hasError = true;
					errorMessage = `File "${file.name}" is too large (${formatFileSize(file.size)}). Maximum allowed size is ${formatFileSize(maxSize)}.`;
					break;
				}
				
				// Check file type if types are specified
				if (types.length > 0) {
					const fileExtension = file.name.split('.').pop().toLowerCase();
					const fileType = file.type;
					
					// Check if file type is allowed
					let typeAllowed = false;
					for (let j = 0; j < types.length; j++) {
						const allowedType = types[j].toLowerCase();
						
						if (
							allowedType.includes(fileExtension) || 
							allowedType === fileType || 
							(allowedType.startsWith('.') && allowedType.substring(1) === fileExtension) ||
							(allowedType.includes('/') && fileType.startsWith(allowedType.split('/')[0] + '/'))
						) {
							typeAllowed = true;
							break;
						}
					}
					
					if (!typeAllowed) {
						hasError = true;
						errorMessage = `File type not allowed for "${file.name}". Allowed types: ${types.join(', ')}`;
						break;
					}
				}
			}
			
			// Handle validation errors
			if (hasError) {
				// Clear the file input
				$fileInput.val('');
				
				// Show error
				createAccessibleAlert(errorMessage, 'error');
				
				// Announce to screen reader
				announceToScreenReader(errorMessage, 'assertive');
				
				return false;
			}
			
			return true;
		});
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
		},
		// Accessibility methods that can be used by consumers
		announceToScreenReader: announceToScreenReader,
		createAccessibleAlert: createAccessibleAlert,
		enhanceKeyboardAccessibility: enhanceKeyboardAccessibility,
		
		// File handling UI methods
		connectExistingFileSelectButton: connectExistingFileSelectButton,  // Replaced createFileSelectButton
		setupFileDeletion: setupFileDeletion,
		setupFileValidation: setupFileValidation
	};
}