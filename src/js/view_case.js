/**
 * View Case page accessibility enhancements
 * For WCAG 2.0 compliance
 */

document.addEventListener('DOMContentLoaded', function ()
{
	// Initialize accessibility features
	initializeAccessibility();

	// Make sure all icons are properly hidden from screen readers
	makeIconsAccessible();

	// Enhance keyboard navigation
	enhanceKeyboardNavigation();

	// Make tables accessible
	makeTablesAccessible();
});

/**
 * Initialize accessibility features
 */
function initializeAccessibility()
{
	// Create screen reader announcer if it doesn't exist
	if (!document.getElementById('screen-reader-announcer'))
	{
		const announcer = document.createElement('div');
		announcer.id = 'screen-reader-announcer';
		announcer.className = 'sr-only';
		announcer.setAttribute('aria-live', 'polite');
		announcer.setAttribute('aria-relevant', 'additions');
		document.body.appendChild(announcer);
	}

	// Make alert dismissal buttons accessible
	document.querySelectorAll('.alert .btn-close').forEach(button =>
	{
		button.addEventListener('click', function ()
		{
			announceToScreenReader('Alert dismissed');
		});
	});
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
 * Enhance keyboard navigation for interactive elements
 */
function enhanceKeyboardNavigation()
{
	// Add keyboard support for card focus
	document.querySelectorAll('.card').forEach(card =>
	{
		// We don't want to make cards focusable directly as they contain
		// other focusable elements. Instead, enhance focus visibility
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
 * Make tables fully accessible
 */
function makeTablesAccessible()
{
	// Add keyboard navigation for tables
	document.querySelectorAll('table').forEach(table =>
	{
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
				th.setAttribute('scope', 'col');
			}
		});
	});
}

/**
 * Announce a message to screen readers
 * @param {string} message - The message to announce
 * @param {string} priority - The priority level (polite or assertive)
 */
function announceToScreenReader(message, priority = 'polite')
{
	const announcer = document.getElementById('screen-reader-announcer');
	if (!announcer) return;

	// Update priority if needed
	announcer.setAttribute('aria-live', priority);

	// Set the message
	announcer.textContent = message;

	// Clear after a delay
	setTimeout(() =>
	{
		announcer.textContent = '';
	}, 3000);
}
