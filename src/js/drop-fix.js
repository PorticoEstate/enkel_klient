/**
 * jQuery File Upload Drop Area Fix
 * This script ensures the drop area works with jQuery File Upload
 * It must be included after jQuery, jQuery UI, and jQuery File Upload
 */
$(document).ready(function() {
    // Wait a short time for FileUploader to initialize
    setTimeout(function() {
        // Manually connect the drop-area to the fileupload plugin
        if ($('#drop-area').length && $('#fileupload').length && $.fn.fileupload) {
            console.log('Fixing drop area connection to fileupload plugin');
            
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
        } else {
            console.error('Could not fix drop area: missing elements or plugin');
            console.log('drop-area exists:', $('#drop-area').length > 0);
            console.log('fileupload exists:', $('#fileupload').length > 0);
            console.log('fileupload plugin exists:', typeof $.fn.fileupload === 'function');
        }
    }, 1000); // Wait 1 second for everything to initialize
});
