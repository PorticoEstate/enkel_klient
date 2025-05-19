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
 * Global constants for ARIA roles and states
 */
const ARIA = {
	ROLE: {
		ALERT: 'alert',
		ALERTDIALOG: 'alertdialog',
		BUTTON: 'button',
		CHECKBOX: 'checkbox',
		DIALOG: 'dialog',
		GRID: 'grid',
		LINK: 'link',
		LISTBOX: 'listbox',
		MENU: 'menu',
		MENUITEM: 'menuitem',
		MENUITEMCHECKBOX: 'menuitemcheckbox',
		MENUITEMRADIO: 'menuitemradio',
		OPTION: 'option',
		PROGRESSBAR: 'progressbar',
		RADIO: 'radio',
		REGION: 'region',
		SEARCHBOX: 'searchbox',
		SEPARATOR: 'separator',
		SLIDER: 'slider',
		SPINBUTTON: 'spinbutton',
		STATUS: 'status',
		SWITCH: 'switch',
		TAB: 'tab',
		TABLIST: 'tablist',
		TABPANEL: 'tabpanel',
		TEXTBOX: 'textbox',
		TIMER: 'timer',
		TOOLTIP: 'tooltip',
		TREE: 'tree',
		TREEGRID: 'treegrid',
		TREEITEM: 'treeitem'
	},
	STATE: {
		BUSY: 'aria-busy',
		CHECKED: 'aria-checked',
		CURRENT: 'aria-current',
		DISABLED: 'aria-disabled',
		EXPANDED: 'aria-expanded',
		HIDDEN: 'aria-hidden',
		INVALID: 'aria-invalid',
		LABEL: 'aria-label',
		LABELLEDBY: 'aria-labelledby',
		LEVEL: 'aria-level',
		LIVE: 'aria-live',
		MODAL: 'aria-modal',
		MULTILINE: 'aria-multiline',
		MULTISELECTABLE: 'aria-multiselectable',
		ORIENTATION: 'aria-orientation',
		PLACEHOLDER: 'aria-placeholder',
		POSINSET: 'aria-posinset',
		PRESSED: 'aria-pressed',
		READONLY: 'aria-readonly',
		REQUIRED: 'aria-required',
		SELECTED: 'aria-selected',
		SETSIZE: 'aria-setsize',
		SORT: 'aria-sort',
		VALUEMAX: 'aria-valuemax',
		VALUEMIN: 'aria-valuemin',
		VALUENOW: 'aria-valuenow',
		VALUETEXT: 'aria-valuetext'
	}
};

/**
 * Sets multiple ARIA attributes on an element at once
 * @param {HTMLElement} element - The element to set attributes on
 * @param {Object} attributes - Object with attribute names as keys and values as values
 */
function setAriaAttributes(element, attributes)
{
	if (element && attributes && typeof attributes === 'object')
	{
		Object.keys(attributes).forEach(attr =>
		{
			if (attributes[attr] !== null && attributes[attr] !== undefined)
			{
				element.setAttribute(attr, attributes[attr]);
			}
		});
	}
}

/**
 * Sets the ARIA role attribute on an element
 * @param {HTMLElement} element - The element to set the role on
 * @param {string} role - The ARIA role value from ARIA.ROLE constants
 */
function setAriaRole(element, role)
{
	if (element && role)
	{
		element.setAttribute('role', role);
	}
}

/**
 * Makes tables more accessible by adding ARIA attributes and roles
 * Implements WCAG 2.1 requirements for data tables
 */
function makeTablesAccessible()
{
	// Find all data tables in the document
	document.querySelectorAll('table').forEach(table =>
	{
		// Skip if already processed
		if (table.dataset.a11yEnhanced) return;

		// Mark as enhanced
		table.dataset.a11yEnhanced = 'true';

		// Set appropriate role (default to 'table' if not presentation)
		if (!table.hasAttribute('role'))
		{
			setAriaRole(table, 'table');
		}

		// Add caption if missing but there is a preceding heading
		if (!table.querySelector('caption'))
		{
			const prevHeading = table.previousElementSibling;
			if (prevHeading && /^H[1-6]$/.test(prevHeading.tagName))
			{
				const caption = document.createElement('caption');
				caption.textContent = prevHeading.textContent;
				if (table.firstChild)
				{
					table.insertBefore(caption, table.firstChild);
				} else
				{
					table.appendChild(caption);
				}
			}
		}

		// Process table headers
		const headers = table.querySelectorAll('th');
		headers.forEach(header =>
		{
			// Set scope attribute for headers if not already set
			if (!header.hasAttribute('scope'))
			{
				// Determine if header is row or column header
				const headerParent = header.parentElement;
				if (headerParent.tagName === 'TR')
				{
					const headerIndex = Array.from(headerParent.children).indexOf(header);
					const isFirstRow = headerParent === table.querySelector('tr');

					if (isFirstRow)
					{
						header.setAttribute('scope', 'col');
					} else if (headerIndex === 0)
					{
						header.setAttribute('scope', 'row');
					}
				}
			}
		});

		// Handle complex tables with rowspan/colspan
		const complexHeaders = table.querySelectorAll('th[rowspan], th[colspan]');
		if (complexHeaders.length > 0)
		{
			// Add id to each header if it doesn't have one
			complexHeaders.forEach((header, index) =>
			{
				if (!header.id)
				{
					header.id = `table-header-${index}-${Date.now()}`;
				}
			});

			// Add headers attribute to cells that are spanned by the complex headers
			table.querySelectorAll('td').forEach(cell =>
			{
				// This would require complex calculation based on rowspan/colspan
				// For simplicity, we'll just ensure cells have required attributes
				if (!cell.hasAttribute('headers') && cell.hasAttribute('aria-labelledby'))
				{
					cell.setAttribute('headers', cell.getAttribute('aria-labelledby'));
				}
			});
		}
	});
}

/**
 * Sets up all interactive regions like accordions, tabs, etc. in the document
 * Applies WCAG 2.1 compliant interaction patterns
 */
function setupInteractiveRegions()
{
	// Find and enhance accordion components
	document.querySelectorAll('.accordion, [data-accordion], [role="tablist"].accordion').forEach(accordion =>
	{
		if (accordion.dataset.a11yInteractive) return;

		makeInteractiveRegionAccessible(accordion, {
			type: 'accordion',
			itemSelector: '.accordion-item, [data-accordion-item]',
			headerSelector: '.accordion-header, [data-accordion-header]',
			contentSelector: '.accordion-content, [data-accordion-content]',
			multiselectable: accordion.getAttribute('data-multiselectable') !== 'false'
		});
	});

	// Find and enhance tab components
	document.querySelectorAll('[role="tablist"], .tabs, [data-tabs]').forEach(tablist =>
	{
		if (tablist.dataset.a11yInteractive) return;

		// Determine the tab panel container
		let tabPanelContainer;
		const tabPanelContainerId = tablist.getAttribute('aria-controls');

		if (tabPanelContainerId)
		{
			tabPanelContainer = document.getElementById(tabPanelContainerId);
		} else
		{
			// Try to find the panel container by convention (sibling or next element)
			tabPanelContainer = tablist.nextElementSibling;
			if (tabPanelContainer && !tabPanelContainer.querySelector('[role="tabpanel"]'))
			{
				tabPanelContainer = document.querySelector('.tab-content, .tabpanel-container');
			}
		}

		if (tabPanelContainer)
		{
			makeInteractiveRegionAccessible(tablist, {
				type: 'tabs',
				itemSelector: '[role="tab"], .tab, [data-tab]',
				contentSelector: '[role="tabpanel"], .tab-pane, [data-tab-content]',
				contentContainer: tabPanelContainer
			});
		}
	});

	// Find and enhance other interactive components as needed
	// (Dropdowns, modals, etc. could be added here)
}

/**
 * Makes common UI elements accessible according to WCAG guidelines
 * Enhances buttons, links, form controls, and other interactive elements
 */
function makeCommonElementsAccessible()
{
	// Process buttons that are not actually button elements
	document.querySelectorAll('div[role="button"], span[role="button"]').forEach(element =>
	{
		if (element.dataset.a11yEnhanced) return;

		// Ensure it's keyboard accessible
		if (!element.hasAttribute('tabindex'))
		{
			element.setAttribute('tabindex', '0');
		}

		// Add keyboard event listeners if missing
		if (!element.hasAttribute('onclick'))
		{
			element.addEventListener('keydown', (e) =>
			{
				if (e.key === 'Enter' || e.key === ' ')
				{
					e.preventDefault();
					element.click();
				}
			});
		}

		// Mark as enhanced
		element.dataset.a11yEnhanced = 'true';
	});

	// Enhance links with missing attributes
	document.querySelectorAll('a').forEach(link =>
	{
		if (link.dataset.a11yEnhanced) return;

		// Add appropriate role if missing
		if (!link.hasAttribute('role'))
		{
			setAriaRole(link, 'link');
		}

		// If it opens in a new window, make this clear to screen readers
		if (link.getAttribute('target') === '_blank' && !link.getAttribute('aria-describedby'))
		{
			// Create the description element if it doesn't exist
			let newWindowDesc = document.getElementById('new-window-description');
			if (!newWindowDesc)
			{
				newWindowDesc = document.createElement('span');
				newWindowDesc.id = 'new-window-description';
				newWindowDesc.className = 'sr-only';
				newWindowDesc.textContent = '(opens in a new window)';
				document.body.appendChild(newWindowDesc);
			}

			link.setAttribute('aria-describedby', 'new-window-description');
		}

		// Mark as enhanced
		link.dataset.a11yEnhanced = 'true';
	});

	// Add appropriate ARIA attributes to icons that should be hidden from screen readers
	document.querySelectorAll('i.fas, i.far, i.fab, i.icon, span.icon').forEach(icon =>
	{
		if (icon.dataset.a11yEnhanced) return;

		// If icon is alone, it might be meaningful
		const hasTextSibling = [...icon.parentNode.childNodes].some(
			node => node !== icon &&
				(node.nodeType === Node.TEXT_NODE && node.textContent.trim() ||
					node.nodeType === Node.ELEMENT_NODE)
		);

		// If icon is decorative (has text siblings or is in a button/link with text)
		if (hasTextSibling ||
			(icon.parentNode.tagName === 'BUTTON' && icon.parentNode.textContent.trim()) ||
			(icon.parentNode.tagName === 'A' && icon.parentNode.textContent.trim()))
		{

			// Hide decorative icon from screen readers
			icon.setAttribute('aria-hidden', 'true');

			// Remove from tab order if it has tabindex
			if (icon.hasAttribute('tabindex'))
			{
				icon.removeAttribute('tabindex');
			}
		}

		// Mark as enhanced
		icon.dataset.a11yEnhanced = 'true';
	});

	// Enhance other common components like tooltips, badges, etc.
	document.querySelectorAll('[data-toggle="tooltip"], [data-bs-toggle="tooltip"]').forEach(tooltip =>
	{
		if (tooltip.dataset.a11yEnhanced) return;

		const title = tooltip.getAttribute('title') || tooltip.getAttribute('data-bs-title') || tooltip.getAttribute('data-original-title');
		if (title)
		{
			tooltip.setAttribute('aria-label', title);
		}

		// Mark as enhanced
		tooltip.dataset.a11yEnhanced = 'true';
	});
}

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

	// Make all tables accessible
	makeTablesAccessible();

	// Make all form inputs accessible
	document.querySelectorAll('form').forEach(form =>
	{
		if (!form.dataset.a11yEnhanced)
		{
			makeInputsAccessible(form);
			form.dataset.a11yEnhanced = 'true';
		}
	});

	// Make common UI elements accessible
	makeCommonElementsAccessible();

	// Set up interactive regions (accordions, tabs, etc.)
	setupInteractiveRegions();
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
 * Makes an element accessible according to its role and purpose
 * @param {HTMLElement} element - The element to make accessible
 * @param {string} role - The ARIA role to set
 * @param {Object} attributes - Additional ARIA attributes to set
 */
function makeElementAccessible(element, role, attributes = {})
{
	if (!element) return;

	if (role)
	{
		setAriaRole(element, role);
	}

	if (attributes && typeof attributes === 'object')
	{
		setAriaAttributes(element, attributes);
	}

	// Ensure the element is keyboard navigable if interactive
	const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem', 'slider', 'switch'];
	if (role && interactiveRoles.includes(role))
	{
		if (element.tagName !== 'BUTTON' && element.tagName !== 'A' && element.tagName !== 'INPUT')
		{
			if (!element.getAttribute('tabindex'))
			{
				element.setAttribute('tabindex', '0');
			}
		}
	}

	// Mark as enhanced
	element.dataset.a11yEnhanced = 'true';
}

/**
 * Announces language change to screen readers in the appropriate language
 * Provides immediate feedback to screen reader users and stores language change in session
 * @param {string} lang - The language code (e.g., 'en', 'no') that is being switched to
 */
function announceLangChange(lang)
{
	// Store the language preference immediately
	if (typeof sessionStorage !== 'undefined')
	{
		sessionStorage.setItem('langChanging', 'true');
	}

	// Announce language change to screen readers with the correct language
	if (lang === 'no')
	{
		// Announce in Norwegian
		announceToScreenReader('Bytter språk til norsk. Vennligst vent...', SCREEN_READER.PRIORITY.ASSERTIVE, SCREEN_READER.TIMEOUT, 'no');
	} else
	{
		// Announce in English
		announceToScreenReader('Changing language to English. Please wait...', SCREEN_READER.PRIORITY.ASSERTIVE, SCREEN_READER.TIMEOUT, 'en');
	}
}

// Export functions if module exports is defined
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
{
	module.exports = {
		// Screen reader and announcement functions
		SCREEN_READER,
		ARIA,
		createScreenReaderAnnouncer,
		announceToScreenReader,
		announceFormStatus,
		announceLangChange,

		// Core accessibility functions
		initAccessibility,
		checkLanguageChange,

		// Element-specific accessibility functions
		makeIconsAccessible,
		enhanceFocusVisibility,
		makeDropzoneAccessible,
		makeTablesAccessible,
		makeInputsAccessible,
		makeCommonElementsAccessible,

		// Form accessibility functions
		setupAccessibleValidation,

		// Dialog and interactive region functions
		setupAccessibleDialog,
		makeInteractiveRegionAccessible,
		setupInteractiveRegions,

		// ARIA attribute management
		setAriaAttributes,
		setAriaRole,
		makeElementAccessible,

		// Language-related functions
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
