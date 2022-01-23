/**
 * Generic sitemgr JS functions
 *
 * @author Dave Hall skwashd at phpgroupware.org
 * @license GPL
 */

/**
 * Emulate phpGW's link function
 *
 * @param String strURL target URL
 * @param Object oArgs Query String args as associate array object
 * @param bool bAsJSON ask that the request be returned as JSON (experimental feature)
 * @returns String URL
 */
function phpGWLink(strURL, oArgs, bAsJSON)
{
	var arURLParts = strBaseURL.split('?');
	var strNewURL = arURLParts[0] + strURL + '?';

	if (oArgs == null)
	{
		oArgs = new Object();
	}

	for (obj in oArgs)
	{
		strNewURL += obj + '=' + oArgs[obj] + '&';
	}

	if(typeof(arURLParts[1]) !=='undefined')
	{
		strNewURL += arURLParts[1];
	}

	if (bAsJSON)
	{
		strNewURL += '&phpgw_return_as=json';
	}
	return strNewURL;
}
