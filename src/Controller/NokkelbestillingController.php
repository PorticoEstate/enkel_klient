<?php
// src/Controller/NokkelbestillingController.php
namespace App\Controller;

use Smarty;
use App\Service\ApiClient;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class NokkelbestillingController
{
    private $smarty;
    private $api;
    
    public function __construct(Smarty $smarty, ApiClient $api)
    {
        $this->smarty = $smarty;
        $this->api = $api;
    }
    
    public function displayForm(Request $request, Response $response): Response
    {
        // Your existing logic, modified to use PSR-7 request/response
        $saved = false;
        $error = [];
        $id = null;
		print_r($this->smarty->getTemplateDir());
		// ...existing logic from display_form method...

		try
		{
			$html = $this->smarty->fetch('nokkelbestilling.tpl');
			$response->getBody()->write($html);
			return $response;
		}
		catch (\Exception $e)
		{
			echo "Smarty error: " . $e->getMessage();
			// Fall back to rendering minimal content
			$response->getBody()->write('<h1>Error loading template</h1>');
			return $response;
		}
    }
    
    // ...other methods...
}