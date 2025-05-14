<?php

namespace App\Helper;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Psr7\Response;
use Slim\Views\Twig;
use Throwable;

class ErrorHandler
{
	private $twig;

	public function __construct(Twig $twig)
	{
		$this->twig = $twig;
	}

	/**
	 * This method handles all error cases and always returns a ResponseInterface
	 * 
	 * @param mixed $first Either the exception or the request
	 * @param mixed $second Either the request or display error details
	 * @return ResponseInterface Always returns a response
	 */
	public function __invoke($first, $second = null, $third = null, $fourth = null, $fifth = null): ResponseInterface
	{
		// Log what we received to help debug
		error_log('ErrorHandler called with types: ' . gettype($first) . ', ' . gettype($second));

		// Get the exception object, regardless of parameter order
		$exception = ($first instanceof Throwable) ? $first : (($second instanceof Throwable) ? $second :
				new \Exception('Unknown error occurred'));
				
		// Get displayErrorDetails value from Slim's parameter order
		// In the standard Slim error handler signature:
		// __invoke(Throwable $exception, ServerRequestInterface $request, bool $displayErrorDetails, bool $logErrors, bool $logErrorDetails)
		// So $displayErrorDetails is typically the third parameter
		$displayErrorDetails = false;
		
		// Handle case when used as error handler (parameter order as expected)
		if ($first instanceof Throwable && $second instanceof ServerRequestInterface && is_bool($third)) {
			$displayErrorDetails = $third;
		} 
		// Handle case when parameters might be in different order
		elseif (is_bool($first) && $first === true) {
			$displayErrorDetails = true;
		}
		elseif (is_bool($second) && $second === true) {
			$displayErrorDetails = true;
		}
		elseif (is_bool($third) && $third === true) {
			$displayErrorDetails = true;
		}
		
		// Log the actual error regardless of display settings
		error_log($exception->getMessage() . "\n" . $exception->getTraceAsString());

		// Create response with error page
		$response = new Response();

		// Prepare template variables
		$templateVars = [
			'error_message' => $displayErrorDetails
				? $exception->getMessage()
				: 'Det oppstod en feil på serveren. Vennligst prøv igjen senere.',
			'error_code' => 500
		];

		// Add trace information in development mode
		if ($displayErrorDetails)
		{
			$templateVars['error_trace'] = $exception->getTraceAsString();
			$templateVars['error_file'] = $exception->getFile();
			$templateVars['error_line'] = $exception->getLine();
		}

		$response->getBody()->write(
			$this->twig->getEnvironment()->render('error.twig', $templateVars)
		);

		// Always return a proper response
		return $response->withStatus(500)->withHeader('Content-Type', 'text/html');
	}
}
