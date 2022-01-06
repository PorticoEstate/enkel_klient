function quilljs_textarea(elem = null, options = null)
{
	if (elem)
	{
		var editorElems = Array.prototype.slice.call(document.querySelectorAll(elem));
	}
	else
	{
		var editorElems = Array.prototype.slice.call(document.querySelectorAll('[data-quilljs]'));
	}
	editorElems.forEach(function (el)
	{
		if (elem && el.hasAttribute("data-quilljs"))
		{
			return;
		}
		var elemType = el.type;
		if (elemType == 'textarea')
		{
			elemValue = el.value;
			editorDiv = document.createElement('div');
			editorDiv.innerHTML = elemValue;
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
		}
		else
		{
			if (!options.placeholder)
			{
				options.placeholder = placeholder;
			}
			var default_options = options;
		}

		var editor = new Quill(editorDiv, default_options);
		editor.on('text-change', function (delta, oldDelta, source)
		{
			var editor_value = editor.root.innerHTML;
			el.value = editor_value;
		});
	});
}
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
	if(typeof(editors) !== 'undefined')
	{
		quill.message = editors.message;
	}
});
