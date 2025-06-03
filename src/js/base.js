/**
 * Generic sitemgr JS functions
 *
 * @author Dave Hall skwashd at phpgroupware.org
 * @license GPL
 */

/**
 * Safely encode URL parameters
 * @param {string} value - The value to encode
 * @returns {string} Encoded value
 */
function encodeUrlParam(value) {
    return encodeURIComponent(value || '');
}

/**
 * Convert object to URL query string
 * @param {Object} params - Parameters object
 * @returns {string} Query string
 */
function buildQueryString(params) {
    if (!params || typeof params !== 'object') {
        return '';
    }
    
    const pairs = [];
    for (const key in params) {
        if (params.hasOwnProperty(key) && params[key] !== null && params[key] !== undefined) {
            pairs.push(encodeUrlParam(key) + '=' + encodeUrlParam(params[key]));
        }
    }
    return pairs.join('&');
}

/**
 * Build complete URL with base URL, path and parameters
 * @param {string} baseUrl - Base URL
 * @param {string} path - URL path
 * @param {Object} params - Query parameters
 * @returns {string} Complete URL
 */
function buildUrl(baseUrl, path, params) {
    if (!baseUrl) {
        throw new Error('Base URL is required');
    }
    
    const urlParts = baseUrl.split('?');
    let newUrl = urlParts[0] + (path || '');
    
    // Combine existing query params with new ones
    const allParams = {};
    
    // Parse existing query string
    if (urlParts[1]) {
        const existingParams = new URLSearchParams(urlParts[1]);
        for (const [key, value] of existingParams) {
            allParams[key] = value;
        }
    }
    
    // Add new parameters
    if (params) {
        Object.assign(allParams, params);
    }
    
    const queryString = buildQueryString(allParams);
    return queryString ? newUrl + '?' + queryString : newUrl;
}

/**
 * Emulate phpGW's link function
 *
 * @param {string} strURL target URL
 * @param {Object} oArgs Query String args as associate array object
 * @param {boolean} bAsJSON ask that the request be returned as JSON (experimental feature)
 * @returns {string} URL
 */
function phpGWLink(strURL, oArgs, bAsJSON) {
    if (typeof strBaseURL === 'undefined') {
        throw new Error('strBaseURL is not defined');
    }
    
    const params = oArgs ? { ...oArgs } : {};
    
    if (bAsJSON) {
        params.phpgw_return_as = 'json';
    }
    
    return buildUrl(strBaseURL, strURL, params);
}