<?php
// filepath: /home/hc483/enkel_klient/src/Controller/LandingController.php
namespace App\Controller;

use Slim\Views\Twig;
use App\Service\ApiClient;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Traits\UtilityTrait;

class LandingController
{
	private $twig;
	private $api;

	use UtilityTrait;

	public function __construct(Twig $twig, ApiClient $api)
	{
		// Load configurations
		$str_base_url = self::current_site_url();

		// Basic assignments
		$twig->getEnvironment()->addGlobal('str_base_url', $str_base_url);
		$twig->getEnvironment()->addGlobal('action_url', $str_base_url);
		$twig->getEnvironment()->addGlobal('saved', 0);
		$twig->getEnvironment()->addGlobal('error', '');
		$twig->getEnvironment()->addGlobal('subject', '');
		$twig->getEnvironment()->addGlobal('message', '');

		$this->twig = $twig;
		$this->api = $api;
	}

	public function displayInfo(Request $request, Response $response): Response
	{
		$rand = rand();
		$_SESSION['rand'] = $rand;
		$this->twig->getEnvironment()->addGlobal('rand', $rand);

		try
		{
			return $this->twig->render($response, 'landing.twig',[
				'currentRoute' => 'home'
			]);
		}
		catch (\Exception $e)
		{
			// Fall back to rendering minimal content
			$response->getBody()->write('<h1>Error loading landing page</h1>');
			$response->getBody()->write('<p>' . $e->getMessage() . '</p>');
			return $response;
		}
	}
}
