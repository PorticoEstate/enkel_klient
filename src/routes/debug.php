<?php
// routes/debug.php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

$app->get('/debug', function (Request $request, Response $response) use ($container)
{
	$response->getBody()->write('<h1>Debug Information</h1>');
	$response->getBody()->write('<pre>');

	// Show important paths and system information
	$response->getBody()->write("\nSystem Information:\n");
	$response->getBody()->write("PHP Version: " . PHP_VERSION . "\n");
	$response->getBody()->write("APP_ROOT: " . APP_ROOT . "\n");
	$response->getBody()->write("SRC_ROOT: " . SRC_ROOT . "\n");
	$response->getBody()->write("templates_c writable: " . (is_writable(SRC_ROOT . '/templates_c') ? 'Yes' : 'No') . "\n");
	$response->getBody()->write("cache writable: " . (is_writable(SRC_ROOT . '/cache') ? 'Yes' : 'No') . "\n");

	$response->getBody()->write('</pre>');
	return $response;
});
