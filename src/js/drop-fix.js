/**
 * jQuery File Upload Drop Area Fix
 * This script ensures the drop area works with jQuery File Upload
 * It must be included after jQuery, jQuery UI, and jQuery File Upload
 */
$(document).ready(function() {
    let retryCount = 0;
    const maxRetries = 10;
    const retryDelay = 500;

    // Wait for FileUploader to initialize and check multiple times if needed
    function waitForFileUploadInit() {
        retryCount++;
        
        console.log(`Attempting to fix drop area connection (attempt ${retryCount}/${maxRetries})`);
        
        // Check if the fileupload plugin is initialized on the element
        if ($('#drop-area').length && $('#fileupload').length && $.fn.fileupload) {
            // Check if the plugin is actually initialized on the element
            const fileuploadData = $('#fileupload').data('blueimp-fileupload');
            
            if (fileuploadData) {
                console.log('Fixing drop area connection to fileupload plugin');
                
                try {
                    // Make sure the dropZone option is correctly set
                    $('#fileupload').fileupload('option', 'dropZone', $('#drop-area'));
                    
                    // Log that we've fixed the connection
                    console.log('Drop area connection fix applied');
                    
                    // Test that the drop area responds to events
                    $('#drop-area')
                        .on('dragover', function() { 
                            console.log('Drop area dragover event detected'); 
                        })
                        .on('drop', function() {
                            console.log('Drop area drop event detected - should be handled by jQuery File Upload');
                        })
                        .on('keydown', function(e) {
                            // When focused with Alt+D, allow Space to trigger file select button
                            if (e.key === ' ' || e.key === 'Enter') {
                                e.preventDefault();
                                $('#file-select-btn').click();
                                console.log('Drop area keyboard activation - triggering file select');
                            }
                        });
                    
                    return; // Success, exit the retry loop
                    
                } catch (error) {
                    console.error('Error fixing drop area connection:', error);
                }
            } else {
                console.log('FileUpload plugin not yet initialized on #fileupload element');
            }
        } else {
            console.log('Required elements or plugin not ready');
            console.log('drop-area exists:', $('#drop-area').length > 0);
            console.log('fileupload exists:', $('#fileupload').length > 0);
            console.log('fileupload plugin exists:', typeof $.fn.fileupload === 'function');
        }
        
        // If we haven't succeeded and haven't exceeded max retries, try again
        if (retryCount < maxRetries) {
            console.log(`Retrying in ${retryDelay}ms...`);
            setTimeout(waitForFileUploadInit, retryDelay);
        } else {
            console.error(`Could not fix drop area connection after ${maxRetries} attempts`);
        }
    }
    
    // Start the initialization check process
    waitForFileUploadInit();
});
