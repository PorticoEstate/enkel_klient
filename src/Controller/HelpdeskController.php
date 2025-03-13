<?php
// filepath: /home/hc483/enkel_klient/src/Controller/HelpdeskController.php
namespace App\Controller;

use Slim\Views\Twig;
use App\Service\ApiClient;
use App\Service\Fiks;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Traits\UtilityTrait;
use App\Service\Sanitizer;

class HelpdeskController
{
	private $twig;
	private $api;

	use UtilityTrait;

	public function __construct(Twig $twig, ApiClient $api)
	{
		// Load configurations
		$str_base_url = self::current_site_url();

		// Basic assignments as global variables
		$twig->getEnvironment()->addGlobal('str_base_url', $str_base_url);
		$twig->getEnvironment()->addGlobal('action_url', $str_base_url);
		$twig->getEnvironment()->addGlobal('saved', 0);
		$twig->getEnvironment()->addGlobal('error', []);
		$twig->getEnvironment()->addGlobal('subject', '');
		$twig->getEnvironment()->addGlobal('message', '');

		$this->twig = $twig;
		$this->api = $api;
	}

	private function getLoggedIn(): array
	{
		$headers = getallheaders();
		$ssn = !empty($headers['uid']) ? $headers['uid'] : '';
		$ssn = !empty($_SERVER['HTTP_UID']) ? $_SERVER['HTTP_UID'] : $ssn;
		$ssn = !empty($_SERVER['OIDC_pid']) ? $_SERVER['OIDC_pid'] : $ssn;

		ApiClient::session_set('helpdesk', 'ssn', $ssn);

		$session_info = $this->api->get_session_info();
		$url = $this->api->get_backend_url() . "/property/tenant/?";

		$get_data = [
			'ssn' => $ssn,
			$session_info['session_name'] => $session_info['session_id'],
			'domain' => $this->api->get_logindomain(),
			'phpgw_return_as' => 'json',
		];

		$url .= http_build_query($get_data);

		$empty = ['first_name' => '', 'last_name' => '', 'location_code' => '', 'address' => ''];
		$result = (array)json_decode($this->api->exchange_data($url, []), true);

		return array_merge($empty, $result);
	}

	public function getLocations(Request $request, Response $response): Response
	{
		$session_info = $this->api->get_session_info();
		$url = $this->api->get_backend_url() . "/?";

		$get_data = [
			'menuaction' => 'property.bolocation.get_locations',
			$session_info['session_name'] => $session_info['session_id'],
			'domain' => $this->api->get_logindomain(),
			'phpgw_return_as' => 'json',
			'api_mode' => true,
			'query' => $request->getQueryParams()['query'] ?? ''
		];

		$url .= http_build_query($get_data);
		$result = json_decode($this->api->exchange_data($url, []), true);
		$locations = empty($result['ResultSet']['Result']) ? [] : $result['ResultSet']['Result'];

		$response = $response->withHeader('Content-Type', 'application/json');
		$response->getBody()->write(json_encode($locations));
		return $response;
	}

	public function saveForm(Request $request, Response $response): Response
	{
		$saved = false;
		$error = [];

		if ($request->getMethod() === 'POST')
		{
			$post = $request->getParsedBody();

			// Verify CSRF token
			if (!isset($post['randcheck']) || $post['randcheck'] != $_SESSION['rand'])
			{
				$error[] = 'Invalid security token';
				return $this->handleFormResponse($request, $response, false, $error, null);
			}

			$session_info = $this->api->get_session_info();
			$url = $this->api->get_backend_url() . "/?";

			// Sanitize input data
			$sanitizedPost = [
				'location_code' => Sanitizer::sanitizeString($post['location_code'] ?? ''),
				'address' => Sanitizer::sanitizeString($post['address'] ?? ''),
				'location_name' => Sanitizer::sanitizeString($post['location_name'] ?? ''),
				'subject' => Sanitizer::sanitizeString($post['subject'] ?? ''),
				'message' => Sanitizer::sanitizeHTML($post['message'] ?? ''),
				'phone' => Sanitizer::sanitizePhone($post['phone'] ?? ''),
				'email' => Sanitizer::sanitizeEmail($post['email'] ?? '')
			];

			$get_data = [
				'menuaction' => 'property.uitts.add',
				$session_info['session_name'] => $session_info['session_id'],
				'domain' => $this->api->get_logindomain(),
				'phpgw_return_as' => 'json',
				'api_mode' => true
			];

			// Get category ID from config
			$config = $this->twig->getEnvironment()->getGlobals()['config'];
			$cat_id = $config['helpdesk']['cat_id'] ?? null;

			$user_info = ApiClient::session_get('helpdesk', 'user_info');

			// Build user info string
			$userinfo = $this->buildUserInfo($user_info, $sanitizedPost);
			$details = $sanitizedPost['message'];
			if ($userinfo)
			{
				$details = $userinfo . $details;
			}

			$tenant_data = $this->api->get_tenant($post['location_code']);

			$post_data = [
				'values' => [
					'cat_id' => $cat_id,
					'priority' => 3,
					'apply' => true,
					'location_code' => $sanitizedPost['location_code'],
					'address' => !empty($sanitizedPost['address']) ? $sanitizedPost['address'] : $sanitizedPost['location_name'],
					'subject' => $sanitizedPost['subject'],
					'details' => $details,
					'extra' => [
						'tenant_id' => $tenant_data['id'] ?? null,
						'external_owner_ssn' => ApiClient::session_get('helpdesk', 'ssn')
					]
				]
			];

			$url .= http_build_query($get_data);
			$ret = json_decode($this->api->exchange_data($url, $post_data), true);

			if (isset($ret['status']) && $ret['status'] === 'saved')
			{
				$saved = true;
			}
			else
			{
				$error = $this->processErrors($ret);
			}
		}

		if (
			isset($request->getQueryParams()['phpgw_return_as']) &&
			$request->getQueryParams()['phpgw_return_as'] === 'json'
		)
		{
			return $this->handleFormResponse($request, $response, $saved, $error, $ret['id'] ?? null);
		}

		return $this->displayForm($request, $response);
	}

	public function displayForm(Request $request, Response $response): Response
	{
		$saved = false;
		$error = [];
		$id = null;

		// Check for session data
		if (!$saved)
		{
			$saved = ApiClient::session_get('helpdesk', 'saved');
			ApiClient::session_clear('helpdesk', 'saved');
		}

		if (empty($error))
		{
			$error = (array)ApiClient::session_get('helpdesk', 'error');
			ApiClient::session_clear('helpdesk', 'error');
		}

		if (!$id)
		{
			$id = ApiClient::session_get('helpdesk', 'id');
			ApiClient::session_clear('helpdesk', 'id');
		}

		$get_data = [];
		$user_info = $this->getLoggedIn();
		$fiks = new Fiks();
		$fiks_data = $fiks->get_name_from_external_service();

		$user_info['first_name'] = !empty($fiks_data['first_name']) ? $fiks_data['first_name'] : $user_info['first_name'];
		$user_info['last_name'] = !empty($fiks_data['last_name']) ? $fiks_data['last_name'] : $user_info['last_name'];

		ApiClient::session_set('helpdesk', 'user_info', $user_info);

		$location_code = !empty($user_info['location_code']) ? $user_info['location_code'] : '';
		$address = !empty($user_info['address']) ? $user_info['address'] : '';
		$user_name = !empty($user_info['first_name']) ? "{$user_info['first_name']} {$user_info['last_name']}" : '';

		// Get config
		$config = $this->twig->getEnvironment()->getGlobals()['config'];
		$enable_fileupload = $config['helpdesk']['enable_fileupload'] ?? 0;

		// Generate and set CSRF token
		$rand = rand();
		$_SESSION['rand'] = $rand;

		try
		{
			// Render template with Twig
			return $this->twig->render($response, 'helpdesk.twig', [
				'location_code' => $location_code,
				'address' => $address,
				'user_name' => $user_name,
				'action_url' => self::get_route_url('helpdesk', $get_data),
				'saved' => $saved,
				'error' => $error,
				'id' => $id,
				'enable_fileupload' => $enable_fileupload,
				'rand' => $rand,
				'currentRoute' => 'helpdesk'
			]);
		}
		catch (\Exception $e)
		{
			// Fall back to rendering minimal content
			$response->getBody()->write('<h1>Error loading template: ' . $e->getMessage() . '</h1>');
			return $response;
		}
	}

	public function handleMultiUploadFile(Request $request, Response $response): Response
	{
		$id = (int)($request->getQueryParams()['id'] ?? 0);
		$session_info = $this->api->get_session_info();

		$url = $this->api->get_backend_url() . "/?" . http_build_query([
			'menuaction' => 'property.uitts.handle_multi_upload_file',
			$session_info['session_name'] => $session_info['session_id'],
			'domain' => $this->api->get_logindomain(),
			'phpgw_return_as' => 'json',
			'api_mode' => true,
			'id' => $id
		]);

		$content_range = $request->getServerParams()['HTTP_CONTENT_RANGE'] ?? null;
		$content_disposition = $request->getServerParams()['HTTP_CONTENT_DISPOSITION'] ?? null;

		$return_data = $this->api->exchange_data($url, [], $content_range, $content_disposition);

		$response = $response->withHeader('Content-Type', 'application/json');
		$response->getBody()->write($return_data);
		return $response;
	}

	private function buildUserInfo(array $user_info, array $post): string
	{
		$userinfo = [];
		$user_name = !empty($user_info['first_name']) ?
			"{$user_info['first_name']} {$user_info['last_name']}" : '';

		if (!empty($user_info['location_code']) && $user_name)
		{
			$userinfo[] = "Innmeldt av leietaker: {$user_name}";
		}
		elseif ($user_name)
		{
			$userinfo[] = "Innmeldt av: {$user_name}";
		}

		if (!empty($post['phone']))
		{
			$userinfo[] = "Telefon: {$post['phone']}";
		}
		if (!empty($post['email']))
		{
			$userinfo[] = "E-post: {$post['email']}";
		}

		return $userinfo ? "<p>" . implode("</p>\n<p>", $userinfo) . "</p>\n" : '';
	}

	private function processErrors(array $ret): array
	{
		if (!empty($ret['receipt']['error']))
		{
			return array_map(fn($error) => $error['msg'], $ret['receipt']['error']);
		}
		return ['Noe gikk galt med innsendingen'];
	}

	private function handleFormResponse(Request $request, Response $response, bool $saved, array $error, ?int $id): Response
	{
		ApiClient::session_set('helpdesk', 'id', $id);
		ApiClient::session_set('helpdesk', 'error', $error);
		ApiClient::session_set('helpdesk', 'saved', $saved);

		$response = $response->withHeader('Content-Type', 'application/json');
		$response->getBody()->write(json_encode([
			'id' => $id,
			'status' => $saved ? 'saved' : 'error',
			'message' => $error
		]));
		return $response;
	}
}
