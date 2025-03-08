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
	
	editorElems.forEach(function (el) {
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
			
			// Copy the tabindex from the textarea to the editor div
			if (el.hasAttribute('tabindex'))
			{
				editorDiv.setAttribute('tabindex', el.getAttribute('tabindex'));
			}
			else 
			{
				editorDiv.setAttribute('tabindex', '0'); // Ensure it's focusable
			}
			
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

		var editor = new Quill(editorDiv, default_options);
		
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
		});
		
		// Update textarea when content changes
		editor.on('text-change', function (delta, oldDelta, source) 
		{
			var editor_value = editor.root.innerHTML;
			el.value = editor_value;
			
			// Trigger change event for form validation
			const event = new Event('change', { bubbles: true });
			el.dispatchEvent(event);
		});
	});
	
	// Add CSS for focus styling
	const styleElement = document.createElement('style');
	styleElement.textContent = `
		.quill-editor-container:focus-within {
			border-color: #80bdff;
			outline: 0;
			box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
		}
		.ql-container:focus-within {
			border-color: #80bdff;
		}
	`;
	document.head.appendChild(styleElement);
	
	return editors;
}

// Auto-initialize
(function () 
{
	quilljs_textarea();
})();

var quill = {};
var toolbarOptions = [
	['bold', 'italic', 'underline', 'strike'], // toggled buttons
	[{'list': 'ordered'}, {'list': 'bullet'}],
	[{'indent': '-1'}, {'indent': '+1'}], // outdent/indent
	[{'header': [1, 2, 3, 4, 5, 6, false]}],
	[{'align': []}],
	['clean']  // remove formatting button
];

$(document).ready(function () 
{
	var editors = quilljs_textarea('textarea#message', {
		modules: {
			toolbar: toolbarOptions
		},
		table: true,
		placeholder: 'Detaljer....',
		theme: 'snow'
	});
	
	if (typeof (editors) !== 'undefined') 
	{
		quill.message = editors.message;
	}
	
	// Handle tab key navigation properly within the editor
	$(document).on('keydown', '.ql-editor', function(e) {
		// If Tab key is pressed without shift
		if (e.key === 'Tab' && !e.shiftKey)
		{
			if (!e.target.closest('.ql-toolbar')) 
			{
				// Let default tab behavior happen (move to next focusable element)
				return true;
			}
		}
	});
});