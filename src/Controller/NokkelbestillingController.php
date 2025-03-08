<?php
// src/Controller/NokkelbestillingController.php
namespace App\Controller;

use Smarty;
use App\Service\ApiClient;
use App\Service\Fiks;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Traits\UtilityTrait;
use App\Service\Sanitizer;

class NokkelbestillingController
{
	private $smarty;
	private $api;

	use UtilityTrait;

	public function __construct(Smarty $smarty, ApiClient $api)
	{
		$smarty->configLoad("site.conf", 'nokkelbestilling');
		$smarty->configLoad("site.conf", 'services');  // Also load services section

		$str_base_url = self::current_site_url();

		$smarty->assign("str_base_url", $str_base_url, true);
		$smarty->assign("action_url", $str_base_url, true);
		$smarty->assign("saved", 0, true);
		$smarty->assign("error", '', true);
		$smarty->assign("subject", '', true);
		$smarty->assign("message", '', true);
		$this->smarty = $smarty;
		$this->api = $api;
	}

	function get_logged_in()
	{
		$headers = getallheaders();
		$ssn = !empty($headers['uid']) ? $headers['uid'] : '';
		$ssn = !empty($_SERVER['HTTP_UID']) ? $_SERVER['HTTP_UID'] : $ssn;
		$ssn = !empty($_SERVER['OIDC_pid']) ? $_SERVER['OIDC_pid'] : $ssn;

		ApiClient::session_set('nokkelbestilling', 'ssn', $ssn);

		$session_info	 = $this->api->get_session_info();
		$url			 = $this->api->get_backend_url() . "/property/tenant/?";

		$get_data = array(
			'ssn'							 => $ssn,
			$session_info['session_name']	 => $session_info['session_id'],
			'domain'						 => $this->api->get_logindomain(),
			'phpgw_return_as'				 => 'json',
		);

		$post_data = array();

		$url .= http_build_query($get_data);

		$empty = array('first_name' => '', 'last_name' => '', 'location_code' => '', 'address' => '');

		$result = (array)json_decode($this->api->exchange_data($url, $post_data), true);
		return array_merge($empty, $result);
	}

	public function displayForm(Request $request, Response $response): Response
	{
		// Your existing logic, modified to use PSR-7 request/response
		$saved = false;
		$error = [];
		$id = null;
		if (!$saved)
		{
			$saved = ApiClient::session_get('nokkelbestilling', 'saved');
			ApiClient::session_clear('nokkelbestilling', 'saved');
		}

		if (!$error)
		{
			$error = (array)ApiClient::session_get('nokkelbestilling', 'error');
			ApiClient::session_clear('nokkelbestilling', 'error');
		}
		if (!$id)
		{
			$id = ApiClient::session_get('nokkelbestilling', 'id');
			ApiClient::session_clear('nokkelbestilling', 'id');
		}

		$get_data = array(
		);

		$user_info = $this->get_logged_in();
		$fiks = new Fiks();
		$fiks_data = $fiks->get_name_from_external_service();

		$user_info['first_name'] = !empty($fiks_data['first_name']) ? $fiks_data['first_name'] : $user_info['first_name'];
		$user_info['last_name'] = !empty($fiks_data['last_name']) ? $fiks_data['last_name'] : $user_info['last_name'];

		ApiClient::session_set('nokkelbestilling', 'user_info', $user_info);

		$location_code = !empty($user_info['location_code']) ? $user_info['location_code'] : '';
		$address = !empty($user_info['address']) ? $user_info['address'] : '';
		$user_name = !empty($user_info['first_name']) ? "{$user_info['first_name']} {$user_info['last_name']}" : '';
		$this->smarty->assign("location_code", $location_code, true);
		$this->smarty->assign("address", $address, true);
		$this->smarty->assign("user_name", $user_name, true);
		$this->smarty->assign("action_url", self::get_route_url('nokkelbestilling', $get_data), true);
		$this->smarty->assign("saved", $saved, true);
		$this->smarty->assign("error", $error, true);
		$this->smarty->assign("id", $id, true);

		$enable_fileupload = $this->smarty->getConfigVars('enable_fileupload');

		$this->smarty->assign("enable_fileupload", $enable_fileupload, true);

		$rand				 = rand();
		$_SESSION['rand']	 = $rand;
		$this->smarty->assign("rand", $rand, true);

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
			'query' => $request->getQueryParams()['query'] ?? '',
			'level' => 4
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
			$session_info = $this->api->get_session_info();
			$url = $this->api->get_backend_url() . "/?";
			$post = $request->getParsedBody();

			// Sanitize input data
			$sanitizedPost = [
				'location_code' => Sanitizer::sanitizeString($post['location_code'] ?? ''),
				'address' => Sanitizer::sanitizeString($post['address'] ?? ''),
				'location_name' => Sanitizer::sanitizeString($post['location_name'] ?? ''),
				'subject' => Sanitizer::sanitizeString($post['subject'] ?? ''),
				'message' => Sanitizer::sanitizeHTML($post['message'] ?? ''),
				'phone' => Sanitizer::sanitizePhone($post['phone'] ?? ''),
				'email' => Sanitizer::sanitizeEmail($post['email'] ?? ''),
				'paavegne_av' => Sanitizer::sanitizeString($post['paavegne_av'] ?? ''),
				'key_number' => Sanitizer::sanitizeString($post['key_number'] ?? ''),
				'number_of_keys' => Sanitizer::sanitizeInt($post['number_of_keys'] ?? 0)
			];

			$get_data = [
				'menuaction' => 'property.uitts.add',
				$session_info['session_name'] => $session_info['session_id'],
				'domain' => $this->api->get_logindomain(),
				'phpgw_return_as' => 'json',
				'api_mode' => true
			];

			$cat_id = $this->smarty->getConfigVars('cat_id');
			$user_info = ApiClient::session_get('nokkelbestilling', 'user_info');

			// Build user info string
			$userinfo = $this->buildUserInfo($user_info, $sanitizedPost);
			$details = $sanitizedPost['message'];
			if ($userinfo)
			{
				$details = $userinfo . $details;
			}

			$post_data = [
				'values' => [
					'cat_id' => $cat_id,
					'priority' => 3,
					'apply' => true,
					'location_code' => $sanitizedPost['location_code'] ?? '',
					'address' => $sanitizedPost['address'] ?? $post['location_name'] ?? '',
					'subject' => Sanitizer::sanitizeString($post['subject'] ?? ''),
					'details' => $details,
					'extra' => [
						'tenant_id' => $user_info['id'] ?? null,
						'external_owner_ssn' => ApiClient::session_get('nokkelbestilling', 'ssn')
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

		return $this->handleFormResponse($request, $response, $saved, $error, $ret['id'] ?? null);
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
		if (!empty($post['paavegne_av']))
		{
			$userinfo[] = "På vegne av: {$post['paavegne_av']}";
		}
		if (!empty($post['key_number']))
		{
			$userinfo[] = "Nøkkelnummer: {$post['key_number']}";
		}
		if (!empty($post['number_of_keys']))
		{
			$userinfo[] = "Antall nøkler: {$post['number_of_keys']}";
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
		if ($request->getQueryParams()['phpgw_return_as'] ?? '' === 'json')
		{
			ApiClient::session_set('nokkelbestilling', 'id', $id);
			ApiClient::session_set('nokkelbestilling', 'error', $error);
			ApiClient::session_set('nokkelbestilling', 'saved', $saved);

			$response = $response->withHeader('Content-Type', 'application/json');
			$response->getBody()->write(json_encode([
				'id' => $id,
				'status' => $saved ? 'saved' : 'error',
				'message' => $error
			]));
			return $response;
		}

		return $this->displayForm($request, $response);
	}
}