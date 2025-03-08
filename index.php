<?php

use DI\ContainerBuilder;
use Slim\Factory\AppFactory;
use DI\Bridge\Slim\Bridge;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

// Set base paths for the application
define('APP_ROOT', '/var/www/html');
define('SRC_ROOT', APP_ROOT . '/src');

// Include the Composer autoloader
require APP_ROOT . '/vendor/autoload.php';

// Create PHP-DI ContainerBuilder
$containerBuilder = new ContainerBuilder();

// Add container definitions
$containerBuilder->addDefinitions([
	// Smarty template engine
	\Smarty::class => function ()
	{
		$smarty = new \Smarty();
		$smarty->setTemplateDir(SRC_ROOT . '/templates');
		$smarty->setCompileDir(SRC_ROOT . '/templates_c');
		$smarty->setConfigDir(SRC_ROOT . '/configs');
		$smarty->setCacheDir(SRC_ROOT . '/cache');

		// Create directories if they don't exist
		$dirs = ['templates_c', 'cache'];
		foreach ($dirs as $dir)
		{
			$path = SRC_ROOT . '/' . $dir;
			if (!is_dir($path))
			{
				mkdir($path, 0777, true);
			}
			if (!is_writable($path))
			{
				chmod($path, 0777);
			}
		}

		// Debug and performance settings
		$smarty->debugging = false;
		$smarty->force_compile = true;
		$smarty->caching = false;
		$smarty->setCaching(Smarty::CACHING_OFF);

		return $smarty;
	},

	// API Client service
	\App\Service\ApiClient::class => function ()
	{
		return new \App\Service\ApiClient();
	},

	// Legacy named dependencies
	'smarty' => function ($container)
	{
		return $container->get(\Smarty::class);
	},
	'api' => function ($container)
	{
		return $container->get(\App\Service\ApiClient::class);
	},

	// Controller definitions
	\App\Controller\LandingController::class => function ($container)
	{
		return new \App\Controller\LandingController(
			$container->get(\Smarty::class),
			$container->get(\App\Service\ApiClient::class)
		);
	},

	\App\Controller\NokkelbestillingController::class => function ($container)
	{
		return new \App\Controller\NokkelbestillingController(
			$container->get(\Smarty::class),
			$container->get(\App\Service\ApiClient::class)
		);
	}
]);

// Build PHP-DI Container instance
$container = $containerBuilder->build();

// Create App instance
$app = Bridge::create($container);

// Add error handling middleware
$errorMiddleware = $app->addErrorMiddleware(true, true, true);

// Add CORS middleware
$app->add(function (Request $request, $handler)
{
	$response = $handler->handle($request);
	return $response
		->withHeader('Access-Control-Allow-Origin', '*')
		->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
		->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
});

// Add legacy router middleware
$legacyRouter = new \App\LegacyRouter($app);
$app->add(function ($request, $handler) use ($legacyRouter)
{
	return $legacyRouter->route($request, $handler);
});

// Define debug route
$app->get('/debug', function (Request $request, Response $response) use ($container)
{
	$response->getBody()->write('<h1>Debug Information</h1>');
	$response->getBody()->write('<pre>');

	// Show template directories
	$smarty = $container->get('smarty');
	$response->getBody()->write("Template directories:\n");
	$response->getBody()->write(print_r($smarty->getTemplateDir(), true));

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

// Define application routes
$app->get('/', \App\Controller\LandingController::class . ':displayInfo');

// Nokkelbestilling routes
$app->get('/locations', \App\Controller\NokkelbestillingController::class . ':getLocations');
$app->get('/nokkelbestilling', \App\Controller\NokkelbestillingController::class . ':displayForm');
$app->post('/nokkelbestilling', \App\Controller\NokkelbestillingController::class . ':saveForm');
$app->post('/nokkelbestilling/upload', \App\Controller\NokkelbestillingController::class . ':handleMultiUploadFile');

// Run the application
$app->run();
