/**
 * View Case page accessibility enhancements
 * For WCAG 2.1 compliance
 */

document.addEventListener('DOMContentLoaded', function ()
{
	// Set up specific case page enhancements beyond the basic accessibility
	setupCasePageAccessibility();

	// Make tables accessible - use the global function from accessibility-helpers.js
	if (typeof makeTablesAccessible === 'function')
	{
		makeTablesAccessible();
	}
});

/**
 * Initialize case page specific accessibility features
 */
function setupCasePageAccessibility()
{
	// Make alert dismissal buttons accessible
	document.querySelectorAll('.alert .btn-close').forEach(button =>
	{
		button.addEventListener('click', function ()
		{
			// Use the global announceToScreenReader function from accessibility-helpers.js
			if (typeof announceToScreenReader === 'function')
			{
				announceToScreenReader('Alert dismissed');
			}
		});
	});

	// Add form status announcements
	const commentForm = document.querySelector('form[action*="/my_cases/respond/"]');
	if (commentForm)
	{
		// Create a form status element if it doesn't exist
		if (!document.getElementById('form-status'))
		{
			const formStatus = document.createElement('div');
			formStatus.id = 'form-status';
			formStatus.className = 'sr-only';
			formStatus.setAttribute('aria-live', 'polite');
			formStatus.setAttribute('role', 'status');
			commentForm.appendChild(formStatus);
		}

		// Initialize form validation
		if (typeof setupAccessibleValidation === 'function' && commentForm.id)
		{
			setupAccessibleValidation(commentForm.id);
		}
	}
}

/**
 * Enhance the file upload experience with proper feedback for screen readers
 */
function enhanceFileUploadAccessibility()
{
	const fileInput = document.getElementById('responseAttachment');
	if (!fileInput) return;

	// Create a status element for the file upload if it doesn't exist
	let fileStatusEl = document.getElementById('file-upload-status');
	if (!fileStatusEl)
	{
		fileStatusEl = document.createElement('div');
		fileStatusEl.id = 'file-upload-status';
		fileStatusEl.className = 'sr-only';
		fileStatusEl.setAttribute('aria-live', 'polite');
		fileInput.parentNode.appendChild(fileStatusEl);
	}

	// Add event listener for file selection
	fileInput.addEventListener('change', function ()
	{
		if (this.files && this.files.length > 0)
		{
			const file = this.files[0];
			const fileSize = formatFileSize(file.size);
			const message = `File selected: ${file.name}, ${fileSize}`;

			if (typeof announceToScreenReader === 'function')
			{
				announceToScreenReader(message);
			} else
			{
				fileStatusEl.textContent = message;
			}
		} else
		{
			const message = 'No file selected';
			if (typeof announceToScreenReader === 'function')
			{
				announceToScreenReader(message);
			} else
			{
				fileStatusEl.textContent = message;
			}
		}
	});
}

/**
 * Format file size in a readable format (KB, MB)
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatFileSize(bytes)
{
	if (bytes < 1024)
	{
		return bytes + ' bytes';
	}
	else if (bytes < 1024 * 1024)
	{
		return (bytes / 1024).toFixed(1) + ' KB';
	}
	else
	{
		return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
	}
}

// Call the setup function when document is ready
document.addEventListener('DOMContentLoaded', function ()
{
	enhanceFileUploadAccessibility();
});
