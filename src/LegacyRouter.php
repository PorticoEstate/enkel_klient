<?php

namespace App;  // Add this namespace line

class LegacyRouter
{
	private $app;

	public function __construct($app)
	{
		$this->app = $app;
	}

	public function route($request, $handler)
	{
		$params = $request->getQueryParams();

		if (isset($params['menuaction']))
		{
			// Parse the old menuaction format (module.class.method)
			list($module, $class, $method) = explode('.', $params['menuaction']);

			// Map to your new controller structure
			return $this->handleLegacyRoute($request, $module, $class, $method);
		}

		// Continue with normal Slim routing
		return $handler->handle($request);
	}

	private function handleLegacyRoute($request, $module, $class, $method)
	{
		// Map old routes to new controllers
		$routeMap = [
			'enkel_klient.nokkelbestilling.display_form' =>
			[\App\Controller\NokkelbestillingController::class, 'displayForm'],
			'enkel_klient.nokkelbestilling.save_form' =>
			[\App\Controller\NokkelbestillingController::class, 'saveForm'],
			'enkel_klient.nokkelbestilling.handle_multi_upload_file' =>
			[\App\Controller\NokkelbestillingController::class, 'handleMultiUploadFile'],
		];

		$routeKey = "$module.$class.$method";

		if (isset($routeMap[$routeKey]))
		{
			list($controllerClass, $action) = $routeMap[$routeKey];
			$container = $this->app->getContainer();
			$controller = $container->get($controllerClass);
			return $controller->$action($request, $this->app->getResponseFactory()->createResponse());
		}

		// Fallback to legacy code if not yet migrated
		return $this->executeLegacyCode($module, $class, $method, $request);
	}

	private function executeLegacyCode($module, $class, $method, $request)
	{
		// Load the legacy class file
		require_once "src/$class.php";

		// Instantiate the legacy class
		$instance = new $class();

		// Capture output instead of sending directly to browser
		ob_start();
		$instance->$method();
		$content = ob_get_clean();

		// Create a response with the captured output
		$response = $this->app->getResponseFactory()->createResponse();
		$response->getBody()->write($content);
		return $response;
	}
}
