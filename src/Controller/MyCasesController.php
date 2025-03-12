<?php
// filepath: /home/hc483/public_html/enkel_klient/src/Controller/MyCasesController.php
namespace App\Controller;

use Slim\Views\Twig;
use App\Service\ApiClient;
use App\Service\Fiks;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Traits\UtilityTrait;
use App\Service\Sanitizer;

class MyCasesController
{
	private $twig;
	private $api;

	use UtilityTrait;

	public function __construct(Twig $twig, ApiClient $api)
	{
		// Load configurations
		$str_base_url = self::current_site_url();

		// Basic assignments as globals
		$twig->getEnvironment()->addGlobal('str_base_url', $str_base_url);
		$twig->getEnvironment()->addGlobal('action_url', $str_base_url);

		$this->twig = $twig;
		$this->api = $api;
	}

	public function get_logged_in()
	{
		$headers = getallheaders();
		$ssn = !empty($headers['uid']) ? $headers['uid'] : '';
		$ssn = !empty($_SERVER['HTTP_UID']) ? $_SERVER['HTTP_UID'] : $ssn;
		$ssn = !empty($_SERVER['OIDC_pid']) ? $_SERVER['OIDC_pid'] : $ssn;

		ApiClient::session_set('my_cases', 'ssn', $ssn);

		$session_info = $this->api->get_session_info();
		$url = $this->api->get_backend_url() . "/property/tenant/?";

		$get_data = [
			'ssn' => $ssn,
			$session_info['session_name'] => $session_info['session_id'],
			'domain' => $this->api->get_logindomain(),
			'phpgw_return_as' => 'json',
		];

		$url .= http_build_query($get_data);

		$empty = ['first_name' => '', 'last_name' => '', 'location_code' => '', 'address' => '', 'email' => ''];
		$result = (array)json_decode($this->api->exchange_data($url, []), true);

		return array_merge($empty, $result);
	}

	public function displayCases(Request $request, Response $response): Response
	{
		// Get user information
		$user_info = $this->get_logged_in();

		// Use Fiks service to enhance user data
		$fiks = new Fiks();
		$fiks_data = $fiks->get_name_from_external_service();

		$user_info['first_name'] = !empty($fiks_data['first_name']) ? $fiks_data['first_name'] : $user_info['first_name'];
		$user_info['last_name'] = !empty($fiks_data['last_name']) ? $fiks_data['last_name'] : $user_info['last_name'];

		ApiClient::session_set('my_cases', 'user_info', $user_info);

		// Format user data for display
		$user_name = !empty($user_info['first_name']) ? "{$user_info['first_name']} {$user_info['last_name']}" : '';
		$user_email = $user_info['email'] ?? '';
		$ssn = 	ApiClient::session_get('my_cases', 'ssn');

		// Fetch cases from API
		$result = $this->fetchCasesFromApi($ssn);
		// print_r($result);die();
		// Format dates for display


		if (!$result || !empty($result['error']))
		{
			$result = ['results' => []];
		}
		foreach ($result['results'] as &$case)
		{
			if (!empty($case['entry_date']))
			{
				$case['registered_date'] = date('d.m.Y H:i', $case['entry_date']);
			}
			if (!empty($case['modified_date']))
			{
				$case['status_change_date'] = date('d.m.Y H:i', $case['modified_date']);
			}
			else
			{
				$case['status_change_date'] = $case['registered_date'];
			}
		}

		// Get config from Twig globals
		$config = $this->twig->getEnvironment()->getGlobals()['config'];
		try
		{
			// Render template with Twig
			return $this->twig->render($response, 'my_cases.twig', [
				'currentRoute' => 'my_cases',
				'user_name' => $user_name,
				'user_email' => $user_email,
				'result' => $result,
				'config' => $config
			]);
		}
		catch (\Exception $e)
		{
			// Fall back to rendering minimal content
			$response->getBody()->write('<h1>Error loading template: ' . $e->getMessage() . '</h1>');
			return $response;
		}
	}

	public function viewCase(Request $request, Response $response, array $args): Response
	{
		$caseId = (int) $args['id'];

		if (!$caseId)
		{
			return $response->withStatus(404);
		}

		// Get user information to verify ownership
		$ssn = ApiClient::session_get('my_cases', 'ssn');

		// Fetch case details from API
		$caseDetails = $this->fetchCaseDetails($caseId, $ssn);
		// print_r($caseDetails);die();
		// If no case found or user doesn't have access
		if (empty($caseDetails))
		{
			return $response->withStatus(403)
				->withHeader('Location', self::get_route_url('my_cases'));
		}

		// Format dates
		if (!empty($caseDetails['ticket']['entry_date']))
		{
			$caseDetails['ticket']['registered_date'] = date('d.m.Y H:i', $caseDetails['ticket']['entry_date']);
		}
		if (!empty($caseDetails['ticket']['modified_date']))
		{
			$caseDetails['ticket']['status_change_date'] = date('d.m.Y H:i', $caseDetails['ticket']['modified_date']);
		}
		else
		{
			$caseDetails['ticket']['status_change_date'] = $caseDetails['ticket']['registered_date'];
		}

		// Fetch case files/attachments
		//$attachments = $this->fetchCaseAttachments($caseId);
		$attachments = [];

		// Get config from Twig globals
		$config = $this->twig->getEnvironment()->getGlobals()['config'];
		// echo "<pre>";
		// print_r($caseDetails);
		// echo "</pre>";
		// die();
		try
		{
			// Render template with Twig
			return $this->twig->render($response, 'view_case.twig', [
				'currentRoute' => 'my_cases',
				'case' => $caseDetails['ticket'],
				'attachments' => $attachments,
				'history' => $caseDetails['history'] ?? [],
				'config' => $config
			]);
		}
		catch (\Exception $e)
		{
			// Fall back to rendering minimal content
			$response->getBody()->write('<h1>Error loading template: ' . $e->getMessage() . '</h1>');
			return $response;
		}
	}

	/**
	 * Fetch user's cases from API
	 */
	private function fetchCasesFromApi(?string $ssn): array
	{
		if (!$ssn)
		{
			return [];
		}

		$session_info = $this->api->get_session_info();
		$url = $this->api->get_backend_url() . "/property/usercase/?";

		$get_data = [
			$session_info['session_name'] => $session_info['session_id'],
			'domain' => $this->api->get_logindomain(),
			'phpgw_return_as' => 'json',
			'api_mode' => true,
			'ssn' => $ssn,
			'start' => Sanitizer::sanitizeInt($_GET['start'] ?? 0),
			'sort' => Sanitizer::sanitizeString($_GET['sort'] ?? 'id'),
			'dir' => Sanitizer::sanitizeString($_GET['dir'] ?? 'DESC'),
		];

		$url .= http_build_query($get_data);
		$result = json_decode($this->api->exchange_data($url, []), true);

		return !empty($result) ? $result : [];
	}

	/**
	 * Fetch details for a specific case
	 */
	private function fetchCaseDetails(int $caseId,  ?string $ssn): array
	{
		$session_info = $this->api->get_session_info();
		$url = $this->api->get_backend_url() . "/property/usercase/$caseId/?";

		$get_data = [
			$session_info['session_name'] => $session_info['session_id'],
			'domain' => $this->api->get_logindomain(),
			'phpgw_return_as' => 'json',
			'api_mode' => true,
			'ssn' => $ssn
		];

		$url .= http_build_query($get_data);
		$result = json_decode($this->api->exchange_data($url, []), true);
		if ($this->api->get_http_status() !== 200)
		{
			return [];
		}

		return $result ?? [];
	}

	/**
	 * Fetch attachments for a case
	 */
	private function fetchCaseAttachments(int $caseId): array
	{
		$session_info = $this->api->get_session_info();
		$url = $this->api->get_backend_url() . "/?";

		$get_data = [
			'menuaction' => 'property.uitts.get_attachments',
			$session_info['session_name'] => $session_info['session_id'],
			'domain' => $this->api->get_logindomain(),
			'phpgw_return_as' => 'json',
			'api_mode' => true,
			'id' => $caseId
		];

		$url .= http_build_query($get_data);
		$result = json_decode($this->api->exchange_data($url, []), true);

		return !empty($result['ResultSet']['Result']) ? $result['ResultSet']['Result'] : [];
	}

	/**
	 * Fetch history/comments for a case
	 */
	private function fetchCaseHistory(int $caseId): array
	{
		$session_info = $this->api->get_session_info();
		$url = $this->api->get_backend_url() . "/?";

		$get_data = [
			'menuaction' => 'property.uitts.get_history',
			$session_info['session_name'] => $session_info['session_id'],
			'domain' => $this->api->get_logindomain(),
			'phpgw_return_as' => 'json',
			'api_mode' => true,
			'id' => $caseId
		];

		$url .= http_build_query($get_data);
		$result = json_decode($this->api->exchange_data($url, []), true);

		return !empty($result['ResultSet']['Result']) ? $result['ResultSet']['Result'] : [];
	}
}
