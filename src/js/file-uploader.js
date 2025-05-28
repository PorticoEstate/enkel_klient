// Refactored FileUploader: Modular, concise, and accessible
$(document).on('dragover drop', function (e) { e.preventDefault(); });

function FileUploader(config) {
    // --- Settings & State ---
    const settings = Object.assign({
        formId: '',
        uploadUrl: '',
        fileInputId: 'fileupload',
        dropAreaId: 'drop-area',
        counterId: 'files-count',
        uploadContainerId: 'content_upload_download',
        required: false,
        multiple: true,
        onComplete: null,
        onAdd: null,
        onDelete: null,
        onProgress: null,
        fileSelectBtnId: 'file-select-btn',
        allowedFileTypes: [],
        maxFileSizeMB: 10
    }, config);
    let pending = 0, uploaded = 0, queue = [], errors = false, initialized = false, currentUrl = settings.uploadUrl;
    const $fileInput = $(`#${settings.fileInputId}`);

    // --- Helpers ---
	const formatSize = b => {
		const KB = 1024;
		const MB = KB * 1024;
		const GB = MB * 1024;
		return b >= GB ? (b/GB).toFixed(2)+' GB' : 
			   b >= MB ? (b/MB).toFixed(2)+' MB' : 
			   (b/KB).toFixed(2)+' KB';
	};    const announce = (msg, prio = 'polite') =>
	{
        let $el = $('#file-upload-status');
        if (!$el.length) $el = $('<div>',{id:'file-upload-status','class':'sr-only','aria-live':prio}).appendTo('body');
        $el.text(msg);
    };
    
    // Function to show a toast notification with undo option
    function showUndoToast(fileName) {
        // Remove any existing toasts
        $('.fileupload-toast').remove();
        
        // Create the toast element
        const $toast = $('<div>', {
            'class': 'fileupload-toast',
            'role': 'status',
            'aria-live': 'polite'
        }).css({
            'position': 'fixed',
            'bottom': '20px',
            'right': '20px',
            'background-color': '#333',
            'color': 'white',
            'padding': '10px 15px',
            'border-radius': '4px',
            'box-shadow': '0 2px 5px rgba(0,0,0,0.3)',
            'z-index': '9999',
            'display': 'flex',
            'align-items': 'center',
            'max-width': '300px'
        });
        
        // Add message and button
        $toast.html(`<span>File "${fileName}" removed</span>`);
        
        // Add to document
        $toast.appendTo('body');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            $toast.fadeOut(300, function() {
                $(this).remove();
            });
        }, 3000);
    };
	const updateCounter = () => {
		// First find directly by ID
		const $counter = $(`#${settings.counterId}`);
		if ($counter.length) {
			$counter.html(pending);
			console.log(`Counter updated: ${pending} files`);
			return;
		}
		
		// Fallback to find within specific containers
		const $fallback = $(`.fileupload-count #${settings.counterId}`);
		if ($fallback.length) {
			$fallback.html(pending);
			console.log(`Counter updated (fallback): ${pending} files`);
			return;
		}
		
		// Last resort: update all elements with the counter class
		$(`.fileupload-count span`).html(pending);
		console.log(`Counter updated (generic): ${pending} files`);
	};	

    const setRequired = req => req ? $fileInput.attr('required','required') : $fileInput.removeAttr('required');

    // --- File Validation ---
    function validateFiles(files) {
        const types = settings.allowedFileTypes.map(t=>t.toLowerCase());
        const max = settings.maxFileSizeMB * 1024 * 1024;
        for (let f of files) {
            if (f.size > max) return `File "${f.name}" too large (${formatSize(f.size)}). Max: ${formatSize(max)}`;
            if (types.length) {
                const ext = f.name.split('.').pop().toLowerCase();
                const type = f.type;
                if (!types.some(t => t === ext || t === type || t === '.'+ext || (t.includes('/') && type.startsWith(t.split('/')[0]+'/'))))
                    return `File type not allowed for "${f.name}". Allowed: ${settings.allowedFileTypes.join(', ')}`;
            }
        }
        return null;
    }

    // --- UI & Accessibility ---
    function addFileItem(file, data) {
        // Create the main file item container
        const $item = $('<div class="file file-item" tabindex="0" role="listitem">')
            .attr({
                'aria-label': `File: ${file.name}, Size: ${formatSize(file.size)}`,
                'data-filename': file.name,
                'data-size': file.size
            })
            .appendTo($(`.${settings.uploadContainerId}`));
        
        // Create file info container
        const $fileInfo = $('<div class="file-info">')
            .appendTo($item);
        
        // Add file name and size
        $fileInfo.append($('<span class="file-name">').text(file.name))
            .append($('<span class="file-size">').text(formatSize(file.size)));
        
        // Add progress bar container (initially hidden)
        const $progressContainer = $('<div class="progress-container" style="display: none;">')
            .append($('<div class="progress-bar">'))
            .appendTo($item);
        
        // Add hidden upload button
        const $btn = $('<button type="button" class="start_file_upload" style="display:none">start</button>')
            .on('click', () => { 
                data.url = currentUrl; 
                // Show progress bar when upload starts
                $progressContainer.show();
                $item.find('.delete').prop('disabled', true);
                data.submit(); 
            });
            
        // Add delete button with proper accessibility attributes
        const $deleteBtn = $('<button type="button" class="delete">&times;</button>')
            .attr({
                'aria-label': `Delete file ${file.name}`,
                'title': `Delete ${file.name}`,
                'role': 'button'
            });
        
        $item.append($deleteBtn).append($btn);
        data.context = $item;
        return $item;
    }
    function markError($ctx, msg) {
        // Remove existing error message if any
        $ctx.find('.error-message').remove();
        
        // Add error styling and message
        $ctx.removeClass('file').addClass('error')
            .append($('<div class="error-message">').text('Error: ' + msg))
            .attr({
                'aria-invalid': 'true',
                'aria-errormessage': msg
            });
        
        // Announce error to screen readers
        announce(msg, 'assertive');
    }
    
    function markSuccess($ctx, name) {
        // Add success styling and icon
        $ctx.addClass('done')
            .attr({
                'aria-label': `${name} uploaded successfully`,
                'aria-invalid': 'false'
            });
        
        // Add success icon
        const $checkmark = $('<span class="success-icon">✓</span>')
            .css({
                'color': '#198754',
                'font-weight': 'bold',
                'margin-left': '10px'
            });
        
        // Add to file info section
        $ctx.find('.file-info').append($checkmark);
        
        // Announce success to screen readers
        announce(`${name} uploaded successfully`);
    }

    // --- Main Logic ---
    // Maintain a persistent file list
    let allFiles = [];

function setupDropZone() {
    const $dropZone = $(`#${settings.dropAreaId}`);
    if (!$dropZone.length) {
        console.error(`Drop zone #${settings.dropAreaId} not found in the document`);
        return;
    }
    
    console.log(`Setting up drop zone #${settings.dropAreaId}`, $dropZone);
    
    // Only add visual feedback, do NOT handle drop event for file processing
    $dropZone.off('dragover dragenter dragleave dragend drop');
    
    // Handle dragover/dragenter for visual feedback only
    $dropZone.on('dragover dragenter', function(e) {
        e.preventDefault();
        $(this).addClass('is-dragover');
        console.log('Dragover/enter detected, added is-dragover class');
    });
    
    // Handle dragleave/dragend for visual feedback only
    $dropZone.on('dragleave dragend', function(e) {
        e.preventDefault();
        $(this).removeClass('is-dragover');
        console.log('Dragleave/end detected, removed is-dragover class');
    });
    
    // For drop event, ONLY remove visual feedback. LET THE PLUGIN HANDLE THE FILE PROCESSING
    $dropZone.on('drop', function(e) {
        console.log('DROP DETECTED IN DROP ZONE', e);
        e.preventDefault(); // Prevent browser from opening file
        $(this).removeClass('is-dragover');
        // DO NOT stop propagation - let the event bubble to jQuery File Upload
        console.log('Drop event should now bubble to jQuery File Upload handler');
    });
    
    // Also log when events happen at the document level
    $(document).on('drop', function(e) {
        console.log('Document drop event occurred', e.target);
    });
    
    announce("Drop files here to upload", "polite");
}

	function initialize()
	{
		// Check if jQuery File Upload is available
		if (!$.fn.fileupload) {
		    console.error('jQuery File Upload plugin not found or not properly loaded');
		    return false;
		}
		
		if (!$fileInput.length) {
		    console.error(`File input #${settings.fileInputId} not found in the document`);
		    return false;
		}
		
		// Add enhanced styles for file items if not already added
		if (!$('#file-uploader-enhanced-css').length) {
		    $('<link>', {
		        id: 'file-uploader-enhanced-css',
		        rel: 'stylesheet',
		        href: `${strBaseURL}/src/css/file-uploader-enhanced.css`
		    }).appendTo('head');
		}
		
		// First, clean up any existing instance properly
		try
		{ 
			if ($fileInput.data('blueimp-fileupload'))
			{
				console.log('Cleaning up existing fileupload instance');
				$fileInput.fileupload('destroy');
				// Remove any extra UI elements created by the plugin
				$fileInput.siblings('.ui-button').remove();
			}
		}
		catch (e)
		{
			console.error('Error cleaning up file upload widget:', e);
		}
	
     // Setup accessibility and event handlers before initializing the widget
	 	$fileInput.attr('data-url', settings.uploadUrl);
        settings.multiple ? $fileInput.attr('multiple','multiple') : $fileInput.removeAttr('multiple');
        enhanceAccessibility();
        setupDeletion();
		setupDropZone(); 
		if (settings.allowedFileTypes.length) setupValidation();

        // Debug output before initializing the plugin
        console.log('Initializing jQuery File Upload with settings:', {
            url: settings.uploadUrl,
            dropZoneId: settings.dropAreaId,
            fileInputId: settings.fileInputId,
            dropZoneExists: $(`#${settings.dropAreaId}`).length > 0,
            fileInputExists: $fileInput.length > 0
        });
        
        // If the drop area ID matches "drop-area", use direct jQuery selector
        // This is a fallback for compatibility with old code using static IDs
        const $dropZone = settings.dropAreaId === 'drop-area' ? $('#drop-area') : $(`#${settings.dropAreaId}`);
        console.log('Using drop zone:', $dropZone.length ? 'Found' : 'Not found', $dropZone);
        
        $fileInput.fileupload({
            url: settings.uploadUrl,
            dropZone: $dropZone,
            autoUpload: false,
			sequentialUploads: true,
			fileInput: $fileInput, // Explicitly set the file input
			replaceFileInput: false, // Don't replace the file input element
	
            add: (e, data) => {
                // Append new files to allFiles, avoiding duplicates by name+size
                const newFiles = Array.from(data.files).filter(f => !allFiles.some(existing => existing.name === f.name && existing.size === f.size));
                if (!newFiles.length) {
                    $fileInput.val(''); // Always clear input
                    return;
                }
                const err = validateFiles(newFiles);
                if (err) { announce(err, 'assertive'); $fileInput.val(''); return; }
                
                // Process each file with its own data context
                newFiles.forEach(file => {
                    // For each file, create a new data/context pair so each file is tracked independently
                    const singleFileData = $.extend(true, {}, data, { files: [file] });
                    addFileItem(file, singleFileData);
                    allFiles.push(file);
                    pending++;
                    updateCounter();
                    setRequired(false);
                    announce(`File added: ${file.name}, size: ${formatSize(file.size)}`);
                    settings.onAdd && settings.onAdd(file);
                });
                
                // Always clear input so user can select the same file again if needed
                $fileInput.val('');
            },
            submit: (e, data) => { data.url = currentUrl; return true; },
            progress: (e, data) => {
                const p = parseInt((data.loaded/data.total)*100,10);
                
                // Update progress bar
                const $progressBar = data.context.find('.progress-bar');
                if ($progressBar.length) {
                    $progressBar.css('width', p + '%');
                    $progressBar.parent().show();
                }
                
                // Set ARIA attributes for accessibility
                data.context.attr({
                    'aria-valuenow': p,
                    'aria-valuetext': `${p}% complete`
                });
                
                // Announce progress at 25% intervals
                if (p%25===0) announce(`Upload ${p}% complete`);
                
                settings.onProgress && settings.onProgress(p);
            },
            done: (e, data) => {
                uploaded++;
                let r = data.result, err = false, msg = '', name = data.files[0]?.name||'File';
                
                // Log the raw response for debugging
                console.log(`Upload response for ${name}:`, r);
                
                // Check for various error conditions
                if (!r) { err = true; msg = 'No response from server'; }
                else if (typeof r==='string' && r.includes('error')) { err = true; msg = r; }
                else if (r.error) { err = true; msg = r.error; }
                else if (r.status==='error') { 
                    err = true; 
                    // Handle array or string message format
                    if (Array.isArray(r.message)) {
                        // Check for CSRF token related errors
                        if (r.message.some(m => m.includes('security token') || m.includes('randcheck'))) {
                            console.error(`CSRF token error for ${name}:`, r.message);
                            msg = 'Invalid security token. Please ensure the randcheck token is sent as a POST parameter.';
                        } else {
                            msg = r.message.join(', ');
                        }
                    } else {
                        msg = r.message || 'Server error'; 
                    }
                    // Log error details
                    console.error(`Server error for ${name}:`, r.message);
                }
                else if (r.files?.some(f=>f.error)) { err = true; msg = r.files.find(f=>f.error).error; }
                
                // Check for other standard errors
                else if (r.statusText === 'Invalid security token') {
                    err = true;
                    msg = 'Invalid security token';
                    console.error(`Security token error for ${name}`);
                }
                
                // Hide progress bar when complete
                data.context.find('.progress-container').fadeOut(300);
                
                if (err) { 
                    // Mark as error
                    markError(data.context, msg); 
                    errors = true; 
                    pending--; 
                    setRequired(settings.required && pending===0); 
                    
                    // Enable delete button again
                    data.context.find('.delete').prop('disabled', false);
                }
                else { 
                    // Mark as success
                    markSuccess(data.context, name); 
                    
                    // Remove delete button since file is already uploaded
                    data.context.find('.delete').remove();
                }
                
                if (queue.length) setTimeout(processNext, 100); else checkComplete();
            },
            fail: (e, data) => {
                uploaded++; pending--; errors = true;
                
                // Hide progress bar
                data.context.find('.progress-container').fadeOut(300);
                
                // Show error message
                markError(data.context, data.errorThrown||'Upload failed');
                
                // Re-enable delete button
                data.context.find('.delete').prop('disabled', false);
                
                setRequired(settings.required && pending===0);
                if (queue.length) setTimeout(processNext, 100); else checkComplete();
            },
            limitConcurrentUploads: 1,
            maxChunkSize: 8388000
        });
        initialized = true;
        return true;
    }
    function sendAllFiles(id) {
        // Preserve any existing query parameters and add the ID
        const baseUrl = settings.uploadUrl;
        const hasQueryParams = baseUrl.includes('?');
        const separator = hasQueryParams ? '&' : '?';
        
        currentUrl = `${baseUrl}${separator}id=${id}&phase2=true`;
        
        // Try to get the randcheck token to include in the form data (not in URL)
        let randcheckValue = null;
        try {
            // Try multiple methods to find the randcheck token
            randcheckValue = $('input[name="randcheck"]').val();
            
            if (!randcheckValue) {
                // Try to find it in hidden fields
                $('input[type="hidden"]').each(function() {
                    if ($(this).attr('name') === 'randcheck') {
                        randcheckValue = $(this).val();
                        return false; // Break the loop
                    }
                });
            }
            
            // Store the randcheck value for use in formData, but don't include it in the URL
            if (randcheckValue) {
                console.log('Found randcheck token for file upload (will send as POST parameter)');
            }
        } catch (e) {
            console.warn('Error finding randcheck token:', e);
        }
        
        pending = uploaded = 0; errors = false;
        if (!initialized) if (!initialize()) { settings.onComplete && settings.onComplete(false); return; }
        $fileInput.attr('data-url', currentUrl);
        try { 
            $fileInput.fileupload('option','url', currentUrl); 
            
            // Also include randcheck in the formData if available
            if (randcheckValue) {
                $fileInput.fileupload('option', 'formData', {
                    randcheck: randcheckValue,
                    id: id,
                    phase2: 'true'
                });
            }
        } catch {}
        
        // Get all start buttons
        queue = $('.start_file_upload').toArray().map(btn => $(btn));
        
        console.log(`Found ${queue.length} start buttons for file upload`);
        
        // Check if there are files in the input element
        let hasFilesInInput = false;
        if ($fileInput.length) {
            const files = $fileInput.prop('files') || [];
            hasFilesInInput = files.length > 0;
            if (hasFilesInInput) {
                console.log(`Found ${files.length} files in the input element`);
            }
        }
        
        // If no queue but we have files in the UI or input, handle them
        if (!queue.length && ($('.file-item').length > 0 || hasFilesInInput)) {
            console.log('No start buttons but files exist, manually triggering upload...');
            
            // If file items exist but no start buttons, we need to handle differently
            // by directly submitting the files that were already added
            const fileData = $fileInput.data('blueimp-fileupload') || {};
            if (fileData._getFilesFromQueue) {
                const filesToSubmit = fileData._getFilesFromQueue();
                if (filesToSubmit && filesToSubmit.length) {
                    console.log(`Directly submitting ${filesToSubmit.length} files`);
                    filesToSubmit.forEach(data => data.submit());
                    return;
                }
            }
            
            // If still no files to upload, attempt to reprocess any UI file elements
            $('.file-item').each(function() {
                const $item = $(this);
                if (!$item.hasClass('done')) {
                    // Create and trigger a start button if it doesn't exist
                    let $btn = $item.find('.start_file_upload');
                    if (!$btn.length) {
                        $btn = $('<button type="button" class="start_file_upload" style="display:none">start</button>');
                        $item.append($btn);
                    }
                    queue.push($btn[0]);
                }
            });
            
            // If still no queue but we have files in the input, try to re-add them
            if (!queue.length && hasFilesInInput) {
                console.log('Attempting to re-process files from input');
                const files = Array.from($fileInput.prop('files') || []);
                
                // We need to manually trigger the add callback
                try {
                    const addHandler = $fileInput.data('blueimp-fileupload')?.options?.add;
                    if (addHandler && files.length) {
                        console.log('Manually triggering add handler with files');
                        files.forEach(file => {
                            const data = {files: [file], fileInput: $fileInput};
                            addHandler(null, data);
                        });
                        
                        // Refresh queue after adding files
                        queue = $('.start_file_upload').toArray().map(btn => $(btn));
                    }
                } catch (e) {
                    console.error('Error re-processing files:', e);
                }
            }
        }
        
        if (!queue.length) { 
            console.log('No files to upload, marking as complete');
            
            // Check if there might be files we're not detecting
            if (hasFilesInInput) {
                console.warn('Files exist in input but no queue was created! Trying to force-initialize...');
                
                // Try to re-initialize the uploader to force file processing
                if (!initialized) {
                    console.log('Reinitializing file uploader to process files');
                    initialize();
                    
                    // Give the initialization a moment to process files
                    setTimeout(() => {
                        queue = $('.start_file_upload').toArray().map(btn => $(btn));
                        if (queue.length) {
                            console.log('Queue created after reinitialization, processing files...');
                            processNext();
                        } else {
                            console.log('Still no queue after reinitialization, marking as complete');
                            settings.onComplete && settings.onComplete(true);
                        }
                    }, 100);
                    return;
                }
            }
            
            settings.onComplete && settings.onComplete(true); 
            return; 
        }
        
        console.log(`Starting upload of ${queue.length} files`);
        processNext();
    }
    function processNext() {
        if (!queue.length) {
            console.log('Queue is empty, checking if upload is complete');
            checkComplete();
            return;
        }
        
        const $btn = $(queue.shift());
        
        try { 
            const filename = $btn.parent().data('filename') || 'File';
            console.log('Triggering upload for:', filename);
            
            // If button click doesn't trigger file upload, directly submit the associated file data
            const $fileItem = $btn.closest('.file-item');
            if ($fileItem.length) {
                if (!$fileItem.hasClass('uploading')) {
                    $fileItem.addClass('uploading');
                    
                    // Show progress bar if it exists
                    const $progressContainer = $fileItem.find('.progress-container');
                    if ($progressContainer.length) {
                        $progressContainer.show();
                    }
                    
                    // Disable delete button during upload
                    $fileItem.find('.delete').prop('disabled', true);
                }
                
                // Attempt to trigger upload via click
                $btn.click();
                
                // Check if the click actually triggered anything
                setTimeout(() => {
                    if (!$fileItem.hasClass('uploading-started')) {
                        console.log('Click event did not trigger upload for:', filename);
                        console.log('Attempting alternative upload method...');
                        
                        // Mark that we've tried an alternative method
                        $fileItem.addClass('uploading-started');
                        
                        // Try to find the file in the input that matches
                        const targetFilename = $fileItem.data('filename');
                        const targetSize = parseInt($fileItem.data('size'));
                        
                        if (targetFilename && $fileInput.length) {
                            // Try to submit via file uploader's data object
                            try {
                                const fileUploaderData = $fileInput.data('blueimp-fileupload');
                                if (fileUploaderData && fileUploaderData.options) {
                                    // Find matching file in the input
                                    const inputFiles = $fileInput.prop('files') || [];
                                    for (let i = 0; i < inputFiles.length; i++) {
                                        const file = inputFiles[i];
                                        if (file.name === targetFilename || (targetSize && file.size === targetSize)) {
                                            console.log('Found matching file in input, submitting directly:', file.name);
                                            const data = {
                                                files: [file],
                                                context: $fileItem,
                                                url: currentUrl,
                                                fileInput: $fileInput
                                            };
                                            fileUploaderData.options.add?.(null, data);
                                            fileUploaderData._getFilesFromQueue?.()?.[0]?.submit?.();
                                            break;
                                        }
                                    }
                                }
                            } catch (directErr) {
                                console.error('Error trying alternative upload method:', directErr);
                            }
                        }
                    }
                    
                    // Continue to next file
                    if (queue.length) {
                        setTimeout(processNext, 100);
                    } else {
                        checkComplete();
                    }
                }, 300);
            }
        } catch (e) {
            console.error('Error processing file upload:', e);
            if (queue.length) {
                setTimeout(processNext, 100);
            } else {
                checkComplete();
            }
        }
    }
    function checkComplete() {
        if (uploaded >= pending && settings.onComplete) {
            if (errors) {
                // Create an error object with details
                const errorInfo = {
                    message: 'One or more files failed to upload',
                    details: 'Check the file list for specific error messages'
                };
                // Call with false status and error details
                settings.onComplete(false, errorInfo);
            } else {
                settings.onComplete(true);
            }
        }
    }

    // --- Accessibility & UI ---
    function enhanceAccessibility() {
        $(`#${settings.fileSelectBtnId}, .file-select-btn`).on('click keydown', e => {
            if (e.type==='click'||(e.type==='keydown'&&(e.key==='Enter'||e.key===' '))) { e.preventDefault(); $fileInput.click(); }
        });
        $(document).on('keydown', '.presentation.files .file-item', e => {
            if (e.key==='Delete'||e.key==='Backspace') { e.preventDefault(); $(e.currentTarget).find('.delete').click(); }
        });
        $(document).on('keydown', '.presentation.files .delete', e => {
            if (e.key==='Enter'||e.key===' ') { e.preventDefault(); $(e.currentTarget).click(); }
        });
        $fileInput.attr({'aria-label':'File upload','aria-description':'Select files to upload'});
		const $drop = $(`#${settings.dropAreaId}`);

		if ($drop.length)
		{
			// Make the drop area only focusable when using keyboard modifiers (like Alt+Tab)
			// This allows screen reader users to access it if needed but doesn't put it in
			// the normal tab sequence, improving keyboard navigation efficiency
			$drop.attr({
				'role': 'region',
				'aria-label': 'File drop zone',
				'tabindex': '-1', // Remove from normal tab flow
				'aria-description': 'To activate drag and drop mode, press Alt+D'
			});
			
			// Add keyboard activation for the drop area
			$(document).on('keydown', e => {
				// Alt+D activates drop zone focus
				if (e.altKey && e.key === 'd') {
					e.preventDefault();
					$drop.focus();
					announce("Drop zone activated. Press Escape to exit.");
				}
				
				// Escape exits drop zone focus
				if (e.key === 'Escape' && document.activeElement === $drop[0]) {
					e.preventDefault();
					$(`#${settings.fileSelectBtnId}`).focus();
					announce("Exited drop zone.");
				}
			});
			
			$drop.on('dragenter', () => announce("Files detected. Drop to upload."));
			$drop.on('dragleave dragend', () => announce("Drag cancelled."));
			$drop.on('drop', () => announce("Files dropped, processing..."));
		}
	
    }
    function setupDeletion() {
        $(document).off('click.fileDelete').on('click.fileDelete', '.file-item .delete', function(e) {
            e.preventDefault();
            const $item = $(this).closest('.file-item');
            const name = $item.data('filename') || $item.find('span').text().split(' ')[0] || 'File';
            
            // Remove file directly without confirmation for better UX
            // Files aren't actually uploaded yet, so deletion is reversible
            $item.fadeOut(300, function() {
                // Also remove from our persistent file list
                const fileName = name.trim();
                allFiles = allFiles.filter(f => f.name !== fileName);
                $(this).remove();
                pending--; updateCounter(); setRequired(settings.required && pending===0);
                
                // Announce deletion to screen readers
                announce(`File ${name} removed`);
                
                // Show a brief undo toast notification
                showUndoToast(name);
                
                // Call onDelete callback if provided
                settings.onDelete && settings.onDelete({name});
            });
        });
    }
    function setupValidation() {
        $fileInput.attr('accept', settings.allowedFileTypes.join(','));
        if (!$fileInput.next('.file-type-info').length) {
            $('<div>',{'class':'file-type-info','aria-live':'polite'}).html(`<small>Allowed: ${settings.allowedFileTypes.join(', ')}<br>Max: ${formatSize(settings.maxFileSizeMB*1024*1024)}</small>`).insertAfter($fileInput);
        }
    }

    // --- Public API ---
    return {
        initialize,
        sendAllFiles,
        getPendingCount: () => pending,
        getFileCount: () => pending,
        resetCounts: () => { pending=uploaded=0; updateCounter(); },
        isInitialized: () => initialized,
        announceToScreenReader: announce,
        enhanceKeyboardAccessibility: enhanceAccessibility,
        setupFileDeletion: setupDeletion,
        setupFileValidation: setupValidation,
        updatePendingCount: function(count) {
            console.log(`Manually updating pending count to ${count}`);
            pending = count;
            updateCounter();
            
            // Also update global queue if needed
            if (queue.length !== count) {
                // Create placeholder queue items if actual files aren't in queue
                while (queue.length < count) {
                    queue.push({});
                }
            }
        }
    };
}
