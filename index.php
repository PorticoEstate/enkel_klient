<?php

use DI\ContainerBuilder;
use Slim\Factory\AppFactory;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Response;
use Slim\Views\Twig;
use Slim\Views\TwigMiddleware;
use App\Service\ApiClient;
use App\Service\Translator;
use Dotenv\Dotenv;

// Set base paths for the application
define('APP_ROOT', '/var/www/html');
define('SRC_ROOT', APP_ROOT . '/src');

// Include the Composer autoloader
require APP_ROOT . '/vendor/autoload.php';

$configs_dir = SRC_ROOT . '/configs';
$dotenv = Dotenv::createImmutable($configs_dir);
$dotenv->load();

// Detect language from query parameter or session
ini_set('session.cookie_samesite', 'Lax');

session_start();
$lang = 'no'; // Default language
if (isset($_GET['lang']) && in_array($_GET['lang'], ['en', 'no']))
{
	$lang = $_GET['lang'];
	$_SESSION['lang'] = $lang;
}
elseif (isset($_SESSION['lang']))
{
	$lang = $_SESSION['lang'];
}

// Create PHP-DI ContainerBuilder
$containerBuilder = new ContainerBuilder();

// Add container definitions
$containerBuilder->addDefinitions([
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

		$twig->getEnvironment()->addGlobal('config', $config);
		$twig->getEnvironment()->addGlobal('cache_refresh_token', time());

		// Add base URL for consistent links
		$twig->getEnvironment()->addGlobal('str_base_url', '');

		return $twig;
	},

	// API Client service
	ApiClient::class => function ()
	{
		return new ApiClient();
	},

	// Register Translator in container
	Translator::class => function () use ($lang)
	{
		return new Translator($lang);
	},

	// Controller definitions
	\App\Controller\LandingController::class => function ($container)
	{
		return new \App\Controller\LandingController(
			$container->get(Twig::class),
			$container->get(ApiClient::class)
		);
	},

	\App\Controller\NokkelbestillingController::class => function ($container)
	{
		return new \App\Controller\NokkelbestillingController(
			$container->get(Twig::class),
			$container->get(ApiClient::class)
		);
	},

	\App\Controller\HelpdeskController::class => function ($container)
	{
		return new \App\Controller\HelpdeskController(
			$container->get(Twig::class),
			$container->get(ApiClient::class)
		);
	},

	\App\Controller\Inspection1Controller::class => function ($container)
	{
		return new \App\Controller\Inspection1Controller(
			$container->get(Twig::class),
			$container->get(ApiClient::class)
		);
	},
	
	\App\Controller\InvoicerequestController::class => function ($container)
	{
		return new \App\Controller\InvoicerequestController(
			$container->get(Twig::class),
			$container->get(ApiClient::class)
		);
	},
	
	// My Cases controller
	\App\Controller\MyCasesController::class => function ($container)
	{
		return new \App\Controller\MyCasesController(
			$container->get(Twig::class),
			$container->get(ApiClient::class)
		);
	},
	\App\Helper\ErrorHandler::class => function ($container)
	{
		return new \App\Helper\ErrorHandler($container->get(Twig::class));
	},
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
$displayErrorDetails = $_ENV['APP_ENV'] ?? 'production';
$displayErrorDetails = ($displayErrorDetails === 'development');

// Create error handling middleware with proper settings
$errorMiddleware = $app->addErrorMiddleware(
	$displayErrorDetails,  // display error details (only in development)
	true,                  // log errors
	true                   // log error details
);

// Create and register the custom error handler
$container->set(\App\Helper\ErrorHandler::class, function($container) {
    return new \App\Helper\ErrorHandler($container->get(Twig::class));
});

// Set the error handler (using our custom implementation)
$customErrorHandler = $container->get(\App\Helper\ErrorHandler::class);
$errorMiddleware->setDefaultErrorHandler($customErrorHandler);

// Add CORS middleware
$app->add(function (Request $request, $handler)
{
	$response = $handler->handle($request);
	return $response
		->withHeader('Access-Control-Allow-Origin', '*')
		->withHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Origin, Authorization')
		->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
});

// After Twig is created, add translation function to Twig
$twig = $container->get(Twig::class);
$translator = $container->get(Translator::class);
$twig->getEnvironment()->addGlobal('current_section', null);
$twig->getEnvironment()->addGlobal('current_lang', $lang); // Add the current language to the Twig environment
$twig->getEnvironment()->addFunction(new \Twig\TwigFunction('__', function ($key, $section = null) use ($translator, $twig)
{
	if ($section === null)
	{
		$section = $twig->getEnvironment()->getGlobals()['current_section'] ?? null;
	}
	return $translator->translate($key, $section);
}));

// Automatically load all route files from src/routes
foreach (glob(SRC_ROOT . '/routes/*.php') as $routeFile) {
    require $routeFile;
}

// Run the application
$app->run();
