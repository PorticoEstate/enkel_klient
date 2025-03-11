<?php

use DI\ContainerBuilder;
use Slim\Factory\AppFactory;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Views\Twig;
use Slim\Views\TwigMiddleware;
use Twig\Loader\FilesystemLoader;

// Set base paths for the application
define('APP_ROOT', '/var/www/html');
define('SRC_ROOT', APP_ROOT . '/src');

// Include the Composer autoloader
require APP_ROOT . '/vendor/autoload.php';

$configs_dir = SRC_ROOT . '/configs';
$dotenv = \Dotenv\Dotenv::createImmutable($configs_dir);
$dotenv->load();


// Create PHP-DI ContainerBuilder
$containerBuilder = new ContainerBuilder();

// Add container definitions
$containerBuilder->addDefinitions([
	// Twig template engine (replacing Smarty)
	Twig::class => function ()
	{
		// Create directory if it doesn't exist
		$cacheDir = SRC_ROOT . '/cache/twig';
		if (!is_dir($cacheDir))
		{
			mkdir($cacheDir, 0777, true);
		}
		if (!is_writable($cacheDir))
		{
			chmod($cacheDir, 0777);
		}

		// Pass the path directly instead of creating a FilesystemLoader first
		$twig = Twig::create(SRC_ROOT . '/templates', [
			'cache' => $cacheDir,
			'debug' => true,
			'auto_reload' => true,
		]);

		// Add extensions if needed
		$twig->addExtension(new \Twig\Extension\DebugExtension());

		$base_path = rtrim($_ENV['BASE_PATH'] ?? '', '/');
		$twig->getEnvironment()->addGlobal('base_path', $base_path);
	
		// Load configuration
		$config = [];
		if (file_exists(SRC_ROOT . '/configs/site.conf'))
		{
			$config = parse_ini_file(SRC_ROOT . '/configs/site.conf', true);
		}

		// Add global variables equivalent to Smarty config
		$twig->getEnvironment()->addGlobal('config', $config);
		$twig->getEnvironment()->addGlobal('cache_refresh_token', time());

		// Add base URL for consistent links
		$twig->getEnvironment()->addGlobal('str_base_url', '');

		return $twig;
	},

	// API Client service
	\App\Service\ApiClient::class => function ()
	{
		return new \App\Service\ApiClient();
	},

	// Controller definitions
	\App\Controller\LandingController::class => function ($container)
	{
		return new \App\Controller\LandingController(
			$container->get(Twig::class),
			$container->get(\App\Service\ApiClient::class)
		);
	},

	\App\Controller\NokkelbestillingController::class => function ($container)
	{
		return new \App\Controller\NokkelbestillingController(
			$container->get(Twig::class),
			$container->get(\App\Service\ApiClient::class)
		);
	},

	\App\Controller\HelpdeskController::class => function ($container)
	{
		return new \App\Controller\HelpdeskController(
			$container->get(Twig::class),
			$container->get(\App\Service\ApiClient::class)
		);
	},

	\App\Controller\Inspection1Controller::class => function ($container)
	{
		return new \App\Controller\Inspection1Controller(
			$container->get(Twig::class),
			$container->get(\App\Service\ApiClient::class)
		);
	}
]);

// Build PHP-DI Container instance
$container = $containerBuilder->build();

// Set container to create App from AppFactory
AppFactory::setContainer($container);
$app = AppFactory::create();

// Add Twig-View Middleware
$app->add(TwigMiddleware::createFromContainer($app, Twig::class));

// Add routing middleware
$app->addRoutingMiddleware();

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
$app->get('/nokkelbestilling', \App\Controller\NokkelbestillingController::class . ':displayForm');
$app->post('/nokkelbestilling', \App\Controller\NokkelbestillingController::class . ':saveForm');
$app->get('/nokkelbestilling/locations', \App\Controller\NokkelbestillingController::class . ':getLocations');
$app->post('/nokkelbestilling/upload', \App\Controller\NokkelbestillingController::class . ':handleMultiUploadFile');

// Helpdesk routes
$app->get('/helpdesk', \App\Controller\HelpdeskController::class . ':displayForm');
$app->post('/helpdesk', \App\Controller\HelpdeskController::class . ':saveForm');
$app->get('/helpdesk/locations', \App\Controller\HelpdeskController::class . ':getLocations');
$app->post('/helpdesk/upload', \App\Controller\HelpdeskController::class . ':handleMultiUploadFile');

// Inspection1 routes
$app->get('/inspection_1', \App\Controller\Inspection1Controller::class . ':displayForm');
$app->post('/inspection_1', \App\Controller\Inspection1Controller::class . ':saveForm');
$app->get('/inspection_1/attributes', \App\Controller\Inspection1Controller::class . ':getAttributes');
$app->get('/inspection_1/locations', \App\Controller\Inspection1Controller::class . ':getLocations');
$app->post('/inspection_1/upload', \App\Controller\Inspection1Controller::class . ':handleMultiUploadFile');

// Run the application
$app->run();
