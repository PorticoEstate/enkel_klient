// Define toolbar options
var toolbarOptions = [
	['bold', 'italic', 'underline', 'strike'], // toggled buttons
	[{ 'list': 'ordered' }, { 'list': 'bullet' }],
	[{ 'indent': '-1' }, { 'indent': '+1' }], // outdent/indent
	[{ 'header': [1, 2, 3, 4, 5, 6, false] }],
	[{ 'align': [] }],
	['clean']  // remove formatting button
];

/**
 * Global registry for Quill instances
 * Single source of truth for all editor instances
 */
window.quillInstances = window.quillInstances || {};

// Backward compatibility alias
Object.defineProperty(window, 'quill', {
	get: function() { return window.quillInstances; },
	set: function(value) { Object.assign(window.quillInstances, value); }
});

/**
 * Quill Editor initialization for textareas
 * Enhanced for WCAG 2.0 compliance with improved accessibility
 */
function quilljs_textarea(elem = null, options = null)
{
	let editors = {};

	if (elem)
	{
		var editorElems = Array.prototype.slice.call(document.querySelectorAll(elem));
	}
	else 
	{
		var editorElems = Array.prototype.slice.call(document.querySelectorAll('[data-quilljs]'));
	}

	// If no elements match, return empty object
	if (!editorElems || !editorElems.length)
	{
		return editors;
	}

	editorElems.forEach(function (el)
	{
		if (elem && el.hasAttribute("data-quilljs"))
		{
			return;
		}

		var elemType = el.type;
		var elemId = el.id || '';
		var editorDiv; // Declare variable outside the conditional blocks

		if (elemType == 'textarea')
		{
			let elemValue = el.value;
			editorDiv = document.createElement('div'); // Reassign instead of redeclaring
			editorDiv.innerHTML = elemValue;
			editorDiv.className = 'quill-editor-container';

			// Get rows attribute for height if available
			const rows = el.getAttribute('rows');
			if (rows)
			{
				// Set custom height based on rows (approx 21px per row plus padding)
				const height = Math.max(200, parseInt(rows) * 21);
				editorDiv.style.minHeight = `${height}px`;
			}

			// Get style attribute values if available
			if (el.hasAttribute('style'))
			{
				// Extract any height-related styles
				const style = el.getAttribute('style');
				if (style.includes('height') || style.includes('min-height'))
				{
					// Apply those styles to the editor div
					editorDiv.setAttribute('style', style);
				}
			}

			// Add accessibility attributes
			editorDiv.setAttribute('role', 'textbox');
			editorDiv.setAttribute('aria-multiline', 'true');

			// Set accessible label by referencing the original label
			const labelSelector = `label[for="${elemId}"]`;
			const label = document.querySelector(labelSelector);
			if (label)
			{
				editorDiv.setAttribute('aria-labelledby', label.id || `${elemId}-label`);
				if (!label.id)
				{
					label.id = `${elemId}-label`;
				}
			}

			// Copy required state for accessibility
			if (el.hasAttribute('required'))
			{
				editorDiv.setAttribute('aria-required', 'true');
			}

			// Ensure it's focusable (via natural tab order)
			editorDiv.setAttribute('tabindex', '0');

			// Add ID for easier reference
			if (elemId) 
			{
				editorDiv.id = 'quill-' + elemId;
			}

			el.parentNode.insertBefore(editorDiv, el.nextSibling);
			el.style.display = "none";
			var placeholder = el.placeholder;
		}
		else 
		{
			var placeholder = null;
			editorDiv = el;
		}

		if (!options) 
		{
			var default_options = {
				theme: 'snow',
				placeholder: placeholder,
			};
		} else 
		{
			if (!options.placeholder) 
			{
				options.placeholder = placeholder;
			}
			var default_options = options;
		}

		try
		{
			// Add a11y toolbar options
			if (!options || !options.modules || !options.modules.toolbar)
			{
				if (!options)
				{
					options = {};
				}
				if (!options.modules)
				{
					options.modules = {};
				}
				// Set up default accessible toolbar
				options.modules.toolbar = toolbarOptions;
			}

			// Enable keyboard navigation - allow tab to exit editor
			if (!options.keyboard) {
				options.keyboard = {
					bindings: {
						tab: {
							key: 9,
							handler: function(range, context) {
								// Allow tab to move focus out of the editor to the next form field
								return true;
							}
						},
						'shift+tab': {
							key: 9,
							shiftKey: true,
							handler: function(range, context) {
								// Allow shift+tab to move focus out of the editor to the previous form field
								return true;
							}
						}
					}
				};
			}

			var editor = new Quill(editorDiv, default_options);
			
			// Store in global registry
			if (elemId) {
				window.quillInstances[elemId] = editor;
				
				// Add a data attribute to the editor element for easier selection
				$(editorDiv).attr('data-quill-id', elemId);
				
				// Log that we've registered this Quill instance
				Debug.debug(`📝 Quill editor registered with ID: ${elemId}`);
			}

			// Set up ARIA states for accessibility
			const editorContainer = editorDiv.querySelector('.ql-editor');
			if (editorContainer)
			{
				editorContainer.setAttribute('aria-multiline', 'true');
				editorContainer.setAttribute('role', 'textbox');

				// Transfer any aria-describedby from the original textarea
				if (el.hasAttribute('aria-describedby'))
				{
					editorContainer.setAttribute('aria-describedby', el.getAttribute('aria-describedby'));
				}
			}

			// Store editor instance if element has an ID
			if (elemId) 
			{
				editors[elemId] = editor;
			}

			// Make sure the Quill editor can be focused with tab key
			editorDiv.addEventListener('focus', function (e)
			{
				// Prevent default to avoid double focus handling
				e.preventDefault();
				// Focus on the editor area
				editor.focus();
				
				// Announce shortcut for accessing formatting toolbar
				setTimeout(() => {
					announceToScreenReader('Editor focused. Press Alt+F to access formatting toolbar. Use Tab or Shift+Tab to navigate between form fields.');
				}, 1000);
			});

			// Update textarea when content changes
			editor.on('text-change', function (delta, oldDelta, source) 
			{
				var editor_value = editor.root.innerHTML;
				el.value = editor_value;

				// Trigger change event for form validation
				const event = new Event('change', { bubbles: true });
				el.dispatchEvent(event);

				// Update ARIA live region to announce changes for screen readers
				if (source === 'user')
				{
					updateAccessibilityStatus(editor, elemId);
				}
			});

			// Add accessibility announcement for formatting changes
			editor.on('selection-change', function (range, oldRange, source)
			{
				if (range && source === 'user')
				{
					// When format is changed, announce it
					const formats = editor.getFormat(range);

					// Check if format buttons are clicked
					if (Object.keys(formats).length > 0)
					{
						let formatMessages = [];

						if (formats.bold) formatMessages.push("bold");
						if (formats.italic) formatMessages.push("italic");
						if (formats.underline) formatMessages.push("underlined");
						if (formats.header) formatMessages.push("heading level " + formats.header);

						if (formatMessages.length)
						{
							announceToScreenReader(`Text format changed to ${formatMessages.join(', ')}`);
						}
					}
				}
			});
		} catch (err)
		{
			Debug.warn("Failed to initialize Quill editor for element:", elemId, err);
		}
	});

	// Add CSS for focus styling and accessibility improvements
	const styleElement = document.createElement('style');
	styleElement.textContent = `
        .quill-editor-container:focus-within {
            border-color: #80bdff;
            outline: 3px solid #4a90e2 !important;
            outline-offset: 1px;
            box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        .ql-container:focus-within {
            border-color: #80bdff;
        }
        
        /* Improve toolbar button contrast and focus visibility */
        .ql-toolbar button:focus {
            outline: 2px solid #4a90e2 !important;
            outline-offset: 2px;
        }
        .ql-toolbar button {
            color: #333;
        }
        .ql-toolbar button.ql-active {
            background-color: rgba(0, 123, 255, 0.15);
        }
        
        /* Make toolbar labels more visible */
        .ql-toolbar button:hover::after,
        .ql-toolbar button:focus::after {
            position: absolute;
            top: 100%;
            left: 0;
            margin-top: 5px;
            background: #333;
            color: white;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 12px;
            z-index: 10;
            white-space: nowrap;
        }
        
        /* Ensure ALL toolbar elements are non-tabbable */
        .ql-toolbar *, 
        .ql-toolbar button,
        .ql-toolbar .ql-picker,
        .ql-toolbar .ql-picker-label,
        .ql-toolbar .ql-picker-item,
        .ql-clean {
            tabindex: -1 !important;
        }
        
        /* Prevent any toolbar element from receiving focus */
        .ql-toolbar *:focus,
        .ql-clean:focus {
            outline: none !important;
            box-shadow: none !important;
        }
        
        /* Specifically target the clean button to ensure it's never focusable */
        .ql-clean,
        button.ql-clean,
        .ql-toolbar .ql-clean {
            tabindex: -1 !important;
            pointer-events: auto; /* Keep mouse interaction */
        }
        
        /* Hide screen reader announcement visually but keep it accessible */
        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            border: 0;
        }
    `;
	document.head.appendChild(styleElement);

	// Add screen reader status elements for announcements
	if (!document.getElementById('quill-a11y-status'))
	{
		const statusElement = document.createElement('div');
		statusElement.id = 'quill-a11y-status';
		statusElement.className = 'sr-only';
		statusElement.setAttribute('aria-live', 'polite');
		statusElement.setAttribute('role', 'status');
		document.body.appendChild(statusElement);
	}

	// Add button tooltips and ensure toolbar accessibility
	addAccessibleButtonLabels();
	
	// Set up simplified toolbar accessibility
	setupSimpleToolbarAccessibility();

	return editors;
}

/**
 * Simplified toolbar accessibility setup
 * Uses a single MutationObserver for efficient DOM monitoring
 */
function setupSimpleToolbarAccessibility() {
	// Initial setup
	makeToolbarElementsNonTabbable();
	
	// Set up MutationObserver to handle dynamically added toolbar elements
	if (typeof MutationObserver !== 'undefined') {
		const observer = new MutationObserver((mutations) => {
			let needsUpdate = false;
			mutations.forEach((mutation) => {
				if (mutation.type === 'childList') {
					mutation.addedNodes.forEach((node) => {
						if (node.nodeType === 1 && node.matches && 
							(node.matches('.ql-toolbar') || node.closest('.ql-toolbar'))) {
							needsUpdate = true;
						}
					});
				}
			});
			
			if (needsUpdate) {
				makeToolbarElementsNonTabbable();
			}
		});
		
		// Observe changes to the document body
		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}
}

/**
 * Make toolbar elements non-tabbable
 */
function makeToolbarElementsNonTabbable() {
	// Give Quill time to fully render before applying
	setTimeout(() => {
		document.querySelectorAll('.ql-toolbar, .ql-toolbar *').forEach(element => {
			element.setAttribute('tabindex', '-1');
			
			// Also remove any existing focus event listeners that might interfere
			element.setAttribute('data-quill-toolbar', 'true');
		});
		
		// Extra safety: ensure clean button is never focusable
		document.querySelectorAll('.ql-clean').forEach(element => {
			element.setAttribute('tabindex', '-1');
			element.style.pointerEvents = 'auto'; // Keep mouse interaction
		});
	}, 100);
}

/**
 * Announce text to screen readers using ARIA live region
 * Uses the global announceToScreenReader function if available, otherwise falls back to local implementation
 * @param {string} text - The text to announce
 */
function announceToScreenReader(text)
{
	// Prevent recursive calls by checking if we're inside the global announceToScreenReader already
	if (window._announcerRecursionGuard)
	{
		return;
	}

	// Check if global accessibility helper function exists
	if (typeof window.announceToScreenReader === 'function' &&
		window.announceToScreenReader !== announceToScreenReader)
	{
		// Set recursion guard
		window._announcerRecursionGuard = true;
		try
		{
			window.announceToScreenReader(text, 'polite');
		} finally
		{
			// Always clear the guard
			window._announcerRecursionGuard = false;
		}
		return;
	}

	// Fallback to local implementation
	const statusEl = document.getElementById('quill-a11y-status');
	if (statusEl)
	{
		statusEl.textContent = text;

		// Clear after 5 seconds to prevent multiple announcements stacking
		setTimeout(() =>
		{
			statusEl.textContent = '';
		}, 5000);
	}
}

/**
 * Update accessibility status when editor content changes
 * @param {Object} editor - Quill editor instance
 * @param {string} elemId - Element ID
 */
function updateAccessibilityStatus(editor, elemId)
{
	const length = editor.getLength();
	// Only announce significant changes
	if (length > 1)
	{ // More than just a newline
		const text = editor.getText().trim();
		const words = text.split(/\s+/).filter(Boolean).length;

		// Announce character count for shorter texts, word count for longer
		if (text.length < 50)
		{
			announceToScreenReader(`Editor updated. ${text.length} characters.`);
		} else
		{
			announceToScreenReader(`Editor updated. ${words} words.`);
		}
	}
}

/**
 * Add accessible labels to Quill toolbar buttons
 */
function addAccessibleButtonLabels()
{
	// Wait for Quill to be fully initialized
	setTimeout(() =>
	{
		const buttonLabels = {
			'.ql-bold': 'Bold',
			'.ql-italic': 'Italic',
			'.ql-underline': 'Underline',
			'.ql-strike': 'Strikethrough',
			'.ql-list[value="ordered"]': 'Ordered list',
			'.ql-list[value="bullet"]': 'Bullet list',
			'.ql-indent[value="-1"]': 'Decrease indent',
			'.ql-indent[value="+1"]': 'Increase indent',
			'.ql-header': 'Heading',
			'.ql-align': 'Text alignment',
			'.ql-clean': 'Clear formatting'
		};

		// Add ARIA labels to toolbar buttons
		Object.keys(buttonLabels).forEach(selector =>
		{
			document.querySelectorAll(selector).forEach(button =>
			{
				button.setAttribute('aria-label', buttonLabels[selector]);
				button.setAttribute('title', buttonLabels[selector]);

				// Make toolbar buttons non-tabbable to skip them in tab order
				// They can still be accessed with arrow keys if needed
				button.setAttribute('tabindex', '-1');

				// Add keyboard event to activate buttons with Enter/Space
				button.addEventListener('keydown', function (e)
				{
					if (e.key === 'Enter' || e.key === ' ')
					{
						e.preventDefault();
						button.click();
						announceToScreenReader(`${buttonLabels[selector]} ${button.classList.contains('ql-active') ? 'activated' : 'deactivated'}`);
					}
				});
			});
		});

		// Add keyboard handler for dropdown menus
		document.querySelectorAll('.ql-picker').forEach(picker =>
		{
			const label = picker.querySelector('.ql-picker-label');
			if (label)
			{
				const pickerName = label.textContent.trim() || 'Formatting option';
				label.setAttribute('aria-label', pickerName);
				label.setAttribute('aria-haspopup', 'true');
				label.setAttribute('aria-expanded', 'false');
				// Make picker labels non-tabbable to remove from tab order
				label.setAttribute('tabindex', '-1');

				// Add keyboard support for opening/closing dropdown
				label.addEventListener('keydown', function (e)
				{
					if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')
					{
						e.preventDefault();
						label.click();
						label.setAttribute('aria-expanded', 'true');

						// Focus first item in dropdown
						const firstItem = picker.querySelector('.ql-picker-item');
						if (firstItem)
						{
							firstItem.focus();
						}
					}
				});

				// Make dropdown items non-tabbable (still accessible via arrow keys)
				picker.querySelectorAll('.ql-picker-item').forEach((item, index) =>
				{
					item.setAttribute('tabindex', '-1');
					const itemLabel = item.getAttribute('data-value') || item.textContent || `Option ${index + 1}`;
					item.setAttribute('aria-label', itemLabel);

					// Add keyboard support for selecting items
					item.addEventListener('keydown', function (e)
					{
						if (e.key === 'Enter' || e.key === ' ')
						{
							e.preventDefault();
							item.click();
							label.focus();
							label.setAttribute('aria-expanded', 'false');
							announceToScreenReader(`${itemLabel} selected`);
						} else if (e.key === 'Escape')
						{
							label.focus();
							label.setAttribute('aria-expanded', 'false');
						}
					});
				});
			}
		});
	}, 500); // Give Quill time to initialize
}

/**
 * Check if the editor content is valid
 * @param {string} elemId - Element ID
 * @returns {boolean} - True if valid, false if empty
 */
function validateQuillEditor(elemId)
{
	// Get the editor instance from the global registry
	const editor = window.quillInstances[elemId];
	if (!editor) return true; // If no editor found, consider it valid

	// Check if editor is empty (only contains empty paragraphs or whitespace)
	const text = editor.getText().trim();
	const html = editor.root.innerHTML;
	
	// Improved empty content detection
	let isEmpty = false;
	
	// First check: if text content is truly empty
	if (text.length === 0) {
		isEmpty = true;
	} else {
		// Second check: if HTML only contains empty formatting structures
		// Create a temporary element to extract text content from HTML
		const tempDiv = document.createElement('div');
		tempDiv.innerHTML = html;
		const extractedText = (tempDiv.textContent || tempDiv.innerText || '').trim();
		
		// If extracted text is empty, the editor only contains empty formatting
		if (extractedText.length === 0) {
			isEmpty = true;
		}
	}

	// Get the editor container for validation UI
	const editorContainer = document.getElementById(`quill-${elemId}`);

	if (isEmpty && editorContainer)
	{
		// Mark as invalid
		editorContainer.classList.add('is-invalid');

		// Announce to screen reader
		announceToScreenReader(`${elemId} field is required. Please enter content.`);

		// Add error message for screen readers
		const errorId = `${elemId}-error`;
		let errorEl = document.getElementById(errorId);

		if (!errorEl)
		{
			errorEl = document.createElement('div');
			errorEl.id = errorId;
			errorEl.className = 'invalid-feedback';
			errorEl.setAttribute('role', 'alert');
			editorContainer.parentNode.insertBefore(errorEl, editorContainer.nextSibling);
		}

		errorEl.textContent = 'This field is required';
		editorContainer.setAttribute('aria-describedby', errorId);
		return false;
	} else if (editorContainer)
	{
		// Clear validation state
		editorContainer.classList.remove('is-invalid');
		const errorId = `${elemId}-error`;
		const errorEl = document.getElementById(errorId);
		if (errorEl)
		{
			errorEl.textContent = '';
		}
		return true;
	}

	return !isEmpty;
}

// Remove the global quill variable declaration as we're using window.quillInstances consistently

// Wait for DOM to be ready before initializing Quill
$(document).ready(function () 
{
	// Initialize basic elements with data-quilljs attributes
	quilljs_textarea();

	// Initialize specific message textarea with custom toolbar
	try
	{
		if ($('textarea#message').length)
		{
			var editors = quilljs_textarea('textarea#message', {
				modules: {
					toolbar: toolbarOptions
				},
				table: true,
				placeholder: 'Detaljer....',
				theme: 'snow'
			});

			// Safely assign the editor to the global quill object for backward compatibility
			if (editors && typeof editors === 'object')
			{
				if (editors.message)
				{
					window.quillInstances.message = editors.message;
				}
			}
		}
	} catch (err)
	{
		Debug.warn("Error initializing Quill editor for message:", err);
	}

	// Handle tab navigation between form fields
	$(document).on('keydown', '.ql-editor', function(e) {
		// Handle Tab and Shift+Tab for form field navigation
		if (e.key === 'Tab') {
			e.preventDefault();
			e.stopPropagation();
			
			// Find all focusable form elements, explicitly excluding toolbar elements
			const focusableElements = $('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"], .quill-editor-container')
				.filter(':visible')
				.not('.ql-toolbar')
				.not('.ql-toolbar *')
				.not('.ql-clean')
				.not('[data-quill-toolbar]');
			
			// Sort by document order
			const sortedElements = focusableElements.sort(function(a, b) {
				return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
			});
			
			const currentContainer = $(this).closest('.quill-editor-container');
			const currentIndex = sortedElements.index(currentContainer);
			
			if (e.shiftKey) {
				// Shift+Tab: Move to previous element
				if (currentIndex > 0) {
					const prevElement = sortedElements.eq(currentIndex - 1);
					prevElement.focus();
				} else {
					// If we're at the first element, let browser handle (may go to address bar)
					// Use a timeout to ensure the focus is properly removed
					setTimeout(() => {
						$(this).blur();
						window.focus();
					}, 10);
				}
			} else {
				// Tab: Move to next element
				if (currentIndex < sortedElements.length - 1) {
					const nextElement = sortedElements.eq(currentIndex + 1);
					nextElement.focus();
				} else {
					// If we're at the last element, let browser handle
					setTimeout(() => {
						$(this).blur();
						window.focus();
					}, 10);
				}
			}
			return false;
		}
		
		// Alt+F to focus the first toolbar button (for users who want to access toolbar)
		if (e.altKey && e.key.toLowerCase() === 'f') {
			e.preventDefault();
			const toolbar = $(this).closest('.quill-editor-container').find('.ql-toolbar');
			const firstButton = toolbar.find('button').first();
			if (firstButton.length) {
				firstButton.removeAttr('tabindex').focus();
				announceToScreenReader('Toolbar navigation activated. Use Tab to navigate buttons, Escape to return to editor.');
			}
			return false;
		}
	});
	
	// Prevent toolbar elements from receiving focus during tab navigation
	$(document).on('focus', '.ql-toolbar, .ql-toolbar *, .ql-clean', function(e) {
		// If this element has tabindex="-1", it shouldn't receive focus
		if ($(this).attr('tabindex') === '-1') {
			e.preventDefault();
			e.stopPropagation();
			
			// Find the associated editor and focus it instead
			const toolbar = $(this).closest('.ql-toolbar');
			const editorContainer = toolbar.closest('.quill-editor-container');
			
			if (editorContainer.length) {
				const editor = editorContainer.find('.ql-editor');
				if (editor.length) {
					// Small delay to ensure proper focus handling
					setTimeout(() => {
						editor.focus();
					}, 10);
				}
			}
			return false;
		}
	});
	
	// Add form validation support
	$(document).on('submit', 'form', function (e)
	{
		// Check all Quill editors in the form
		let formValid = true;

		// Find all textareas with quill editors
		$(this).find('textarea').each(function ()
		{
			const id = $(this).attr('id');
			if (id && window.quillInstances[id])
			{
				// If this is a required field
				if ($(this).attr('required'))
				{
					const isValid = validateQuillEditor(id);
					if (!isValid)
					{
						formValid = false;
						e.preventDefault();
					}
				}
			}
		});

		return formValid;
	});

	// Add ARIA labels for each button group in the toolbar
	$('.ql-toolbar .ql-formats').each(function (index)
	{
		$(this).attr('role', 'group');
		$(this).attr('aria-label', 'Formatting options group ' + (index + 1));
	});
});