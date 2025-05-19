/**
 * Accessibility helpers for improving user experience with assistive technologies
 * WCAG 2.1 compliant utilities for enhancing user experience with assistive technologies
 */

/**
 * Global constants for screen reader announcements
 */
const SCREEN_READER = {
	ANNOUNCER_ID: 'screen-reader-announcer',
	FORM_STATUS_ID: 'form-status',
	PRIORITY: {
		POLITE: 'polite',
		ASSERTIVE: 'assertive'
	},
	TIMEOUT: 5000, // Default 5 seconds before clearing messages
	LANGUAGES: {
		NO: 'no',
		EN: 'en'
	}
};

/**
 * Initialize accessibility features for the page
 * Should be called when the DOM content is loaded
 */
function initAccessibility()
{
	// Create screen reader announcer if it doesn't exist
	createScreenReaderAnnouncer();

	// Check if we just changed language (for screen reader announcement)
	checkLanguageChange();

	// Make all icons properly hidden from screen readers
	makeIconsAccessible();

	// Add focus visibility enhancement
	enhanceFocusVisibility();

	// Set up language-specific accessibility features
	setupLanguageChangeObserver();

	// Add keyboard shortcuts for language switching
	addLanguageKeyboardShortcuts();

	// Enhance language-specific elements
	const currentLang = document.documentElement.lang || SCREEN_READER.LANGUAGES.NO;
	if (currentLang === SCREEN_READER.LANGUAGES.EN)
	{
		enhanceLanguageElements('.en-content', SCREEN_READER.LANGUAGES.EN);
	} else
	{
		enhanceLanguageElements('.no-content', SCREEN_READER.LANGUAGES.NO);
	}

	// Initialize accessible validation for forms with the 'needs-validation' class
	document.querySelectorAll('form.needs-validation').forEach(form =>
	{
		// Initialize form only if it has an ID forms and interactive elements
		if (form.id)
		{
			setupAccessibleValidation(form.id);
		}
	});
}

/**
 * Creates a global ARIA live region announcer if it doesn't exist
 * @returns {HTMLElement} The announcer element
 */
function createScreenReaderAnnouncer()
{
	// Check if the announcer already exists
	let liveRegion = document.getElementById(SCREEN_READER.ANNOUNCER_ID);

	// If it doesn't exist, create it
	if (!liveRegion)
	{
		liveRegion = document.createElement('div');
		liveRegion.id = SCREEN_READER.ANNOUNCER_ID;
		liveRegion.className = 'sr-only';
		liveRegion.setAttribute('aria-live', SCREEN_READER.PRIORITY.POLITE);
		liveRegion.setAttribute('aria-relevant', 'additions');
		liveRegion.setAttribute('aria-atomic', 'true');
		document.body.appendChild(liveRegion);
	}

	return liveRegion;
}

/**
 * Announce messages to screen readers using aria-live region
 * Unified method for all screen reader announcements
 * 
 * @param {string} message - The message to announce
 * @param {string} priority - Priority level ('polite' or 'assertive')
 * @param {number} timeout - Time in milliseconds before clearing the message
 * @param {string} lang - Language code (optional) - if not provided, uses document language
 * @returns {void}
 */
function announceToScreenReader(message, priority = SCREEN_READER.PRIORITY.POLITE, timeout = SCREEN_READER.TIMEOUT, lang = null)
{
	if (!message || typeof message !== 'string') return;

	// Get or create the announcer element
	const liveRegion = createScreenReaderAnnouncer();

	// Set the appropriate priority level
	if (priority === SCREEN_READER.PRIORITY.ASSERTIVE || priority === SCREEN_READER.PRIORITY.POLITE)
	{
		liveRegion.setAttribute('aria-live', priority);
	}

	// Set the language if provided, otherwise use document language
	if (lang)
	{
		liveRegion.setAttribute('lang', lang);
	} else
	{
		// Use the document language or default to Norwegian
		const docLang = document.documentElement.lang || SCREEN_READER.LANGUAGES.NO;
		liveRegion.setAttribute('lang', docLang);
	}

	// Set the message content
	liveRegion.textContent = message;

	// Clear the announcement after screen readers have time to read it
	setTimeout(() =>
	{
		liveRegion.textContent = '';
	}, timeout);
}

/**
 * Announce form submission status to screen readers
 * Special case for form status announcements
 * 
 * @param {string} message - The status message
 * @param {string} formId - ID of the form (optional)
 * @returns {void}
 */
function announceFormStatus(message, formId = null)
{
	if (!message) return;

	// Try to find a form-specific status element first
	let statusElement = null;

	if (formId)
	{
		statusElement = document.getElementById(`${formId}-status`);
	}

	// If no form-specific element, try the general form status
	if (!statusElement)
	{
		statusElement = document.getElementById(SCREEN_READER.FORM_STATUS_ID);
	}

	// If found, update it
	if (statusElement)
	{
		statusElement.textContent = message;

		// Clear after a delay
		setTimeout(() =>
		{
			statusElement.textContent = '';
		}, SCREEN_READER.TIMEOUT);
	} else
	{
		// Fall back to the general announcer
		announceToScreenReader(message, SCREEN_READER.PRIORITY.ASSERTIVE);
	}
}

/**
 * Make all Font Awesome icons properly hidden from screen readers
 */
function makeIconsAccessible()
{
	document.querySelectorAll('.fas, .fa, .far, .fab').forEach(icon =>
	{
		if (!icon.hasAttribute('aria-hidden'))
		{
			icon.setAttribute('aria-hidden', 'true');
		}
	});
}

/**
 * Enhance focus visibility for interactive elements
 */
function enhanceFocusVisibility()
{
	// Add a class to the body element when using keyboard navigation
	document.body.addEventListener('keydown', (e) =>
	{
		if (e.key === 'Tab')
		{
			document.body.classList.add('keyboard-navigation');
		}
	});

	// Remove the class when using mouse
	document.body.addEventListener('mousedown', () =>
	{
		document.body.classList.remove('keyboard-navigation');
	});

	// Enhance card focus visibility
	document.querySelectorAll('.card').forEach(card =>
	{
		card.addEventListener('focusin', function ()
		{
			this.classList.add('focus-within');
		});

		card.addEventListener('focusout', function ()
		{
			this.classList.remove('focus-within');
		});
	});
}

/**
 * Make file dropzone accessible for keyboard and screen reader users
 * 
 * @param {string} dropzoneId - ID of the dropzone element
 * @param {string} fileInputId - ID of the associated file input
 * @returns {void}
 */
function makeDropzoneAccessible(dropzoneId, fileInputId)
{
	const dropzone = document.getElementById(dropzoneId);
	const fileInput = document.getElementById(fileInputId);

	if (!dropzone || !fileInput) return;

	// Make the dropzone focusable
	dropzone.setAttribute('tabindex', '0');

	// Add keyboard event listeners
	dropzone.addEventListener('keydown', function (e)
	{
		// Activate on Enter or Space
		if (e.key === 'Enter' || e.key === ' ')
		{
			e.preventDefault();
			fileInput.click();
		}
	});

	// Add focus styling
	dropzone.addEventListener('focus', function ()
	{
		this.style.outline = '2px solid #4a90e2';
	});

	dropzone.addEventListener('blur', function ()
	{
		this.style.outline = '';
	});

	// Add role and ARIA attributes
	dropzone.setAttribute('role', 'button');
	dropzone.setAttribute('aria-controls', fileInputId);

	// Announce file selection
	fileInput.addEventListener('change', function ()
	{
		if (this.files && this.files.length > 0)
		{
			const fileCount = this.files.length;
			const fileText = fileCount === 1
				? `File selected: ${this.files[0].name}`
				: `${fileCount} files selected`;

			announceToScreenReader(fileText, SCREEN_READER.PRIORITY.POLITE);
		}
	});
}

/**
 * Set up accessible form validation with clear error messages for screen readers
 * 
 * @param {string} formId - ID of the form element
 * @returns {void}
 */
function setupAccessibleValidation(formId)
{
	const form = document.getElementById(formId);
	if (!form) return;

	// Create container for validation messages if it doesn't exist
	let validationContainer = document.getElementById(`${formId}-validation`);
	if (!validationContainer)
	{
		validationContainer = document.createElement('div');
		validationContainer.id = `${formId}-validation`;
		validationContainer.setAttribute('aria-live', 'assertive');
		validationContainer.classList.add('sr-only');
		form.appendChild(validationContainer);
	}

	// Add invalid event listeners to form elements
	const formElements = form.querySelectorAll('input, select, textarea');
	formElements.forEach(element =>
	{
		element.addEventListener('invalid', function (event)
		{
			// Get field label
			const id = this.id;
			const labelElement = document.querySelector(`label[for="${id}"]`);
			const labelText = labelElement ? labelElement.textContent.trim() : id;

			// Announce the error
			const errorMessage = `${labelText}: ${this.validationMessage}`;
			validationContainer.textContent = errorMessage;

			// Set styling on the invalid field
			this.classList.add('is-invalid');

			// Announce to screen reader
			announceToScreenReader(errorMessage, SCREEN_READER.PRIORITY.ASSERTIVE);
		});

		// Clear error state on input
		element.addEventListener('input', function ()
		{
			this.classList.remove('is-invalid');
		});
	});

	// Handle form submission
	form.addEventListener('submit', function ()
	{
		if (this.checkValidity())
		{
			announceFormStatus('Form is being submitted, please wait...', formId);
		}
	});
}

/**
 * Make tables fully accessible for screen readers and keyboard navigation
 * 
 * @param {string} tableId - ID of the table (optional)
 * @returns {void}
 */
function makeTablesAccessible(tableId = null)
{
	const tables = tableId
		? [document.getElementById(tableId)].filter(Boolean)
		: document.querySelectorAll('table');

	tables.forEach(table =>
	{
		// Skip if already processed
		if (table.dataset.a11yEnhanced) return;

		// Add appropriate roles
		table.setAttribute('role', 'table');

		// Make sure table has a caption for screen readers if missing
		if (!table.querySelector('caption'))
		{
			const tableId = table.getAttribute('aria-labelledby');
			if (tableId)
			{
				const labelElement = document.getElementById(tableId);
				if (labelElement)
				{
					const captionText = labelElement.textContent;
					const caption = document.createElement('caption');
					caption.className = 'sr-only';
					caption.textContent = captionText;
					table.prepend(caption);
				}
			}
		}

		// Add scope attributes to headers if missing
		table.querySelectorAll('th').forEach(th =>
		{
			if (!th.getAttribute('scope'))
			{
				// Determine if this is a column or row header
				const isInFirstRow = th.parentElement === th.parentElement.parentElement.querySelector('tr');
				th.setAttribute('scope', isInFirstRow ? 'col' : 'row');
			}
		});

		// Mark as enhanced
		table.dataset.a11yEnhanced = 'true';
	});
}

/**
 * Checks if the user just changed the language and announces it
 * This is for improving the experience for screen reader users when language changes
 */
function checkLanguageChange()
{
	if (sessionStorage.getItem('langChanging') === 'true')
	{
		// Clear the flag
		sessionStorage.removeItem('langChanging');

		// Get the current language
		const currentLang = document.documentElement.lang;

		// Announce the language change confirmation
		setTimeout(() =>
		{
			if (currentLang === 'en')
			{
				// Announce in English with English language tag
				announceToScreenReader(
					'Language changed to English. You are now viewing the page in English.',
					SCREEN_READER.PRIORITY.ASSERTIVE,
					SCREEN_READER.TIMEOUT,
					'en'
				);
			} else
			{
				// Announce in Norwegian with Norwegian language tag
				announceToScreenReader(
					'Språket er endret til norsk. Du ser nå siden på norsk.',
					SCREEN_READER.PRIORITY.ASSERTIVE,
					SCREEN_READER.TIMEOUT,
					'no'
				);
			}
		}, 1000);
	}
}

/**
 * Enhances elements with language-specific attributes for better screen reader support
 * Automatically adds lang attributes to elements based on their content language
 * 
 * @param {string} selector - CSS selector to find elements that should have language attributes
 * @param {string} language - The language code to apply (e.g., 'en', 'no')
 * @returns {void}
 */
function enhanceLanguageElements(selector, language)
{
	if (!selector || !language) return;

	document.querySelectorAll(selector).forEach(element =>
	{
		if (!element.hasAttribute('lang'))
		{
			element.setAttribute('lang', language);
		}
	});
}

/**
 * Sets up language attribute observer to automatically detect and handle 
 * changes to the HTML lang attribute for improved accessibility
 * 
 * @returns {void}
 */
function setupLanguageChangeObserver()
{
	// Create a MutationObserver to watch for changes to the HTML lang attribute
	const htmlElement = document.documentElement;

	const observer = new MutationObserver((mutations) =>
	{
		mutations.forEach((mutation) =>
		{
			if (mutation.type === 'attributes' && mutation.attributeName === 'lang')
			{
				// Language has changed, trigger language-specific adjustments
				const newLang = htmlElement.getAttribute('lang');

				// Check for language change and announce if needed
				if (sessionStorage.getItem('langChanging') === 'true')
				{
					checkLanguageChange();
				}
			}
		});
	});

	// Start observing the HTML element for lang attribute changes
	observer.observe(htmlElement, {
		attributes: true,
		attributeFilter: ['lang']
	});
}

/**
 * Adds language-specific keyboard shortcuts for language switching
 * Alt+N for Norwegian, Alt+E for English
 *
 * @returns {void}
 */
function addLanguageKeyboardShortcuts()
{
	document.addEventListener('keydown', (e) =>
	{
		// Alt+N for Norwegian
		if (e.altKey && e.key === 'n')
		{
			const noLink = document.querySelector('a[lang="no"]');
			if (noLink && noLink.href)
			{
				e.preventDefault();
				window.location.href = noLink.href;
			}
		}

		// Alt+E for English
		if (e.altKey && e.key === 'e')
		{
			const enLink = document.querySelector('a[lang="en"]');
			if (enLink && enLink.href)
			{
				e.preventDefault();
				window.location.href = enLink.href;
			}
		}
	});
}

// Export functions if module exports is defined
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
{
	module.exports = {
		initAccessibility,
		announceToScreenReader,
		announceFormStatus,
		makeDropzoneAccessible,
		setupAccessibleValidation,
		makeTablesAccessible,
		makeIconsAccessible,
		enhanceFocusVisibility,
		checkLanguageChange,
		SCREEN_READER,
		enhanceLanguageElements,
		setupLanguageChangeObserver,
		addLanguageKeyboardShortcuts
	};
}

// Initialize when the DOM is loaded if this is running in a browser
if (typeof window !== 'undefined')
{
	window.addEventListener('DOMContentLoaded', () =>
	{
		initAccessibility();
	});
}
