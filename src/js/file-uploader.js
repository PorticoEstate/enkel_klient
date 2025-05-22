// Refactored FileUploader: Modular, concise, and accessible

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
    const formatSize = b => b >= 1e9 ? (b/1e9).toFixed(2)+' GB' : b >= 1e6 ? (b/1e6).toFixed(2)+' MB' : (b/1e3).toFixed(2)+' KB';
    const announce = (msg, prio='polite') => {
        let $el = $('#file-upload-status');
        if (!$el.length) $el = $('<div>',{id:'file-upload-status','class':'sr-only','aria-live':prio}).appendTo('body');
        $el.text(msg);
    };
    const updateCounter = () => $(`#${settings.counterId}`).html(pending);
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
        const $item = $('<p class="file file-item" tabindex="0" role="listitem">')
            .append($('<span>').text(file.name+' '+formatSize(file.size)))
            .appendTo($(`.${settings.uploadContainerId}`));
        const $btn = $('<button type="button" class="start_file_upload" style="display:none">start</button>')
            .on('click', () => { data.url = currentUrl; data.submit(); });
        $item.append($btn);
        data.context = $item;
        return $item;
    }
    function markError($ctx, msg) {
        $ctx.removeClass('file').addClass('error').append($('<span>').text(' Error: '+msg)).attr({'aria-invalid':'true','aria-errormessage':msg});
        announce(msg, 'assertive');
    }
    function markSuccess($ctx, name) {
        $ctx.addClass('done').attr({'aria-label':`${name} uploaded successfully`,'aria-invalid':'false'});
        announce(`${name} uploaded successfully`);
    }

    // --- Main Logic ---
    // Maintain a persistent file list
    let allFiles = [];

    function initialize() {
        if (!$.fn.fileupload || !$fileInput.length) return false;
        $fileInput.attr('data-url', settings.uploadUrl);
        settings.multiple ? $fileInput.attr('multiple','multiple') : $fileInput.removeAttr('multiple');
        enhanceAccessibility();
        setupDeletion();
        if (settings.allowedFileTypes.length) setupValidation();
        try { if ($fileInput.data('blueimp-fileupload')) $fileInput.fileupload('destroy'); } catch {}
        $fileInput.fileupload({
            url: settings.uploadUrl,
            dropZone: $(`#${settings.dropAreaId}`),
            autoUpload: false,
            sequentialUploads: true,
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
                data.context.css('background-position-x', 100-p+'%').attr({'aria-valuenow':p,'aria-valuetext':`${p}% complete`});
                if (p%25===0) announce(`Upload ${p}% complete`);
                settings.onProgress && settings.onProgress(p);
            },
            done: (e, data) => {
                uploaded++;
                let r = data.result, err = false, msg = '', name = data.files[0]?.name||'File';
                if (!r) { err = true; msg = 'No response from server'; }
                else if (typeof r==='string' && r.includes('error')) { err = true; msg = r; }
                else if (r.error) { err = true; msg = r.error; }
                else if (r.status==='error') { err = true; msg = r.message||'Server error'; }
                else if (r.files?.some(f=>f.error)) { err = true; msg = r.files.find(f=>f.error).error; }
                if (err) { markError(data.context, msg); errors = true; pending--; setRequired(settings.required && pending===0); }
                else { markSuccess(data.context, name); }
                if (queue.length) setTimeout(processNext, 100); else checkComplete();
            },
            fail: (e, data) => {
                uploaded++; pending--; errors = true;
                markError(data.context, data.errorThrown||'Upload failed');
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
        currentUrl = `${settings.uploadUrl}?id=${id}`;
        pending = uploaded = 0; errors = false;
        if (!initialized) if (!initialize()) { settings.onComplete && settings.onComplete(false); return; }
        $fileInput.attr('data-url', currentUrl);
        try { $fileInput.fileupload('option','url',currentUrl); } catch {}
        queue = $('.start_file_upload').toArray().map(btn => $(btn));
        if (!queue.length) { settings.onComplete && settings.onComplete(true); return; }
        processNext();
    }
    function processNext() {
        if (!queue.length) return;
        const $btn = queue.shift();
        try { $btn.click(); } catch { if (queue.length) setTimeout(processNext, 100); else checkComplete(); }
    }
    function checkComplete() {
        if (uploaded >= pending && settings.onComplete) settings.onComplete(!errors);
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
        if ($drop.length) $drop.attr({'role':'region','aria-label':'File drop zone','tabindex':'0'});
    }
    function setupDeletion() {
        $(document).off('click.fileDelete').on('click.fileDelete', '.file-item .delete', function(e) {
            e.preventDefault();
            const $item = $(this).closest('.file-item');
            const name = $item.data('filename') || $item.find('span').text().split(' ')[0] || 'File';
            if (confirm(`Delete file "${name}"?`)) {
                $item.fadeOut(300, function() {
                    // Also remove from our persistent file list
                    const fileName = name.trim();
                    allFiles = allFiles.filter(f => f.name !== fileName);
                    $(this).remove();
                    pending--; updateCounter(); setRequired(settings.required && pending===0);
                    announce(`File ${name} removed`);
                    settings.onDelete && settings.onDelete({name});
                });
            }
        });
    }
    function setupValidation() {
        $fileInput.attr('accept', settings.allowedFileTypes.join(','));
        if (!$fileInput.next('.file-type-info').length) {
            $('<div>',{'class':'file-type-info','aria-live':'polite'}).html(`<small>Allowed: ${settings.allowedFileTypes.join(', ')}<br>Max: ${formatSize(settings.maxFileSizeMB*1024*1024)}</small>`).insertAfter($fileInput);
        }
        // Ensure we're not attaching multiple handlers
        $fileInput.off('change.fileupload').on('change.fileupload', e => {
            if (e.target.files && e.target.files.length) {
                // Pass the files to the fileupload add handler
                $fileInput.fileupload('add', {files: e.target.files});
            }
            // Always clear the input value so the same files can be selected again
            $fileInput.val('');
            return true;
        });
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
        setupFileValidation: setupValidation
    };
}
