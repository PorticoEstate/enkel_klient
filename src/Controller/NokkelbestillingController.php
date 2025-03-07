<?php
// src/Controller/NokkelbestillingController.php
namespace App\Controller;

use Smarty;
use App\Service\ApiClient;
use App\Service\Fiks;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Traits\UtilityTrait;

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

		$smarty->assign("str_base_url", $str_base_url);
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
			'menuaction' => 'enkel_klient.nokkelbestilling.save_form',
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
		$this->smarty->assign("action_url", ApiClient::link('/index.php', $get_data), true);
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

	// ...other methods...
}
