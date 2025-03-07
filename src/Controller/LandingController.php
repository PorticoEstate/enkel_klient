<?php

namespace App\Controller;

use Smarty;
use App\Service\ApiClient;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Traits\UtilityTrait;

class LandingController
{
	private $smarty;
	private $api;

	use UtilityTrait;

	public function __construct(Smarty $smarty, ApiClient $api)
	{
		// Configure Smarty
		$smarty->force_compile = true;
		$smarty->caching = false;
		$smarty->setCaching(Smarty::CACHING_OFF);

		// Load configurations
		$smarty->configLoad("site.conf", 'landing');
		$smarty->configLoad("site.conf", 'services');

		$str_base_url = self::current_site_url();

		// Basic assignments
		$smarty->assign([
			"str_base_url" => $str_base_url,
			"action_url" => $str_base_url,
			"saved" => 0,
			"error" => '',
			"subject" => '',
			"message" => ''
		]);

		$this->smarty = $smarty;
		$this->api = $api;
	}

	public function displayInfo(Request $request, Response $response): Response
	{
		$rand = rand();
		$_SESSION['rand'] = $rand;
		$this->smarty->assign("rand", $rand, true);

		try
		{
			$html = $this->smarty->fetch('landing.tpl');
			$response->getBody()->write($html);
			return $response;
		}
		catch (\Exception $e)
		{
			// Fall back to rendering minimal content
			$response->getBody()->write('<h1>Error loading landing page</h1>');
			return $response;
		}
	}
}
