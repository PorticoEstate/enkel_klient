<?php
namespace App\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Views\Twig;
use App\Service\ApiClient;


abstract class BaseFormController
{
    protected Twig $twig;
    protected $apiClient;

    public function __construct(Twig $twig, $apiClient)
    {
        $this->twig = $twig;
        $this->apiClient = $apiClient;
    }

    // Common form rendering
    protected function renderForm(Response $response, string $template, array $data = []): Response
    {
        return $this->twig->render($response, $template, $data);
    }

    // Common form validation (to be overridden)
    protected function validate(array $data): array
    {
        // Return array of errors, empty if valid
        return [];
    }

    // Common form processing (to be overridden)
    protected function processForm(array $data): bool
    {
        // Implement in child
        return true;
    }

	/**
	 * Check if the user is logged in, if the user is a tenant - and return their information
	 */
	protected function getLoggedIn(): array
	{
		$headers = getallheaders();
		$ssn = !empty($headers['uid']) ? $headers['uid'] : '';
		$ssn = !empty($_SERVER['HTTP_UID']) ? $_SERVER['HTTP_UID'] : $ssn;
		$ssn = !empty($_SERVER['OIDC_pid']) ? $_SERVER['OIDC_pid'] : $ssn;

		ApiClient::session_set('common', 'ssn', $ssn);

		$session_info = $this->apiClient->get_session_info();
		$url = $this->apiClient->get_backend_url() . "/property/tenant/?";

		$get_data = [
			'ssn' => $ssn,
			$session_info['session_name'] => $session_info['session_id'],
			'domain' => $this->apiClient->get_logindomain(),
			'phpgw_return_as' => 'json',
		];

		$url .= http_build_query($get_data);

		$empty = ['first_name' => '', 'last_name' => '', 'location_code' => '', 'address' => ''];
		$result = (array)json_decode($this->apiClient->exchange_data($url, []), true);

		return array_merge($empty, $result);
	}
}
