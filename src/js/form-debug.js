/**
 * Form Validation Debug Utility
 * 
 * This script provides debug controls for the form validation framework.
 * It allows enabling or disabling debug logging in both form-validator.js 
 * and form-accessibility.js at runtime.
 * 
 * Usage: 
 * - Include this script after loading the validation libraries
 * - Call toggleFormDebug(true) to enable debugging
 * - Call toggleFormDebug(false) to disable debugging
 * 
 * Created: May 2025
 */

/**
 * Toggle debug mode for form validation libraries
 * @param {boolean} enable - Whether to enable or disable debug mode
 * @param {Object} options - Optional configuration
 * @param {boolean} options.validator - Whether to toggle form-validator.js debugging
 * @param {boolean} options.a11y - Whether to toggle form-accessibility.js debugging
 * @param {boolean} options.console - Whether to log the debug state change
 * @returns {boolean} - Whether debug mode was enabled
 */
function toggleFormDebug(enable, options = {})
{
	const config = {
		validator: options.validator !== false,
		a11y: options.a11y !== false,
		console: options.console !== false
	};

	let isEnabled = false;

	// Update form-validator.js debug flag
	if (config.validator && typeof FORM_VALIDATOR_CONFIG !== 'undefined')
	{
		FORM_VALIDATOR_CONFIG.debug = !!enable;
		isEnabled = isEnabled || FORM_VALIDATOR_CONFIG.debug;
	}

	// Update form-accessibility.js debug flag
	if (config.a11y && typeof window.FORM_A11Y_CONFIG !== 'undefined')
	{
		window.FORM_A11Y_CONFIG.debug = !!enable;
		isEnabled = isEnabled || window.FORM_A11Y_CONFIG.debug;
	}

	// Log status change if requested
	if (config.console)
	{
		console.log(
			`[FormDebug] Validation debugging ${isEnabled ? 'enabled' : 'disabled'} ` +
			`(validator: ${config.validator && typeof FORM_VALIDATOR_CONFIG !== 'undefined'}, ` +
			`a11y: ${config.a11y && typeof window.FORM_A11Y_CONFIG !== 'undefined'})`
		);
	}

	return isEnabled;
}

/**
 * Get current debug status
 * @returns {Object} - Current debug configuration
 */
function getFormDebugStatus()
{
	return {
		validator: typeof FORM_VALIDATOR_CONFIG !== 'undefined' ?
			!!FORM_VALIDATOR_CONFIG.debug : false,
		a11y: typeof window.FORM_A11Y_CONFIG !== 'undefined' ?
			!!window.FORM_A11Y_CONFIG.debug : false,
		enabled: (typeof FORM_VALIDATOR_CONFIG !== 'undefined' && !!FORM_VALIDATOR_CONFIG.debug) ||
			(typeof window.FORM_A11Y_CONFIG !== 'undefined' && !!window.FORM_A11Y_CONFIG.debug)
	};
}
