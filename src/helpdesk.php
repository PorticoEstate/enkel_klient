<?php

declare(strict_types=1);

use portico\api;
use portico\sanitizer;



class helpdesk
{

	private $api, $smarty;

	function __construct()
	{
		$this->api				 = &$GLOBALS['api'];
		$smarty					 = new Smarty;
		$smarty->force_compile	 = true;
		//	$smarty->debugging		 = true;
		$smarty->caching		 = false;
		$smarty->setCaching(Smarty::CACHING_OFF);
		//	$this->smarty->cache_lifetime	 = 120;
		$smarty->configLoad("test.conf", 'helpdesk');

		$str_base_url = current_site_url();

		$smarty->assign("str_base_url", $str_base_url);
		$smarty->force_compile	 = true;
		//			$smarty->debugging		 = true;
		$smarty->caching		 = false;
		$smarty->setCaching(Smarty::CACHING_OFF);
		//	$smarty->cache_lifetime	 = 120;
		$smarty->assign("action_url", current_site_url(), true);
		$smarty->assign("saved", 0, true);
		$smarty->assign("error", '', true);
		$smarty->assign("subject", '', true);
		$smarty->assign("message", '', true);

		$this->smarty = $smarty;
		
	}

	function get_logged_in()
	{
		$headers = getallheaders();
		$ssn = !empty($headers['uid']) ? $headers['uid'] : '';
		$ssn = !empty($_SERVER['HTTP_UID']) ? $_SERVER['HTTP_UID'] : $ssn;
		$ssn = !empty($_SERVER['OIDC_pid']) ? $_SERVER['OIDC_pid'] : $ssn;

		$session_info	 = $this->api->get_session_info();
		$url			 = $this->api->backend_url . "/property/tenant/?";

		$get_data = array(
			'ssn'							 => $ssn,
			$session_info['session_name']	 => $session_info['session_id'],
			'domain'						 => $this->api->logindomain,
			'phpgw_return_as'				 => 'json',
		);

		$post_data = array();

		$url .= http_build_query($get_data);

		$result = (array)json_decode($this->api->exchange_data($url, $post_data), true);
		return $result;
	}

	public function get_locations()
	{
		$session_info	 = $this->api->get_session_info();
		$url			 = $this->api->backend_url . "/?";

		$get_data = array(
			'menuaction'					 => 'property.bolocation.get_locations',
			$session_info['session_name']	 => $session_info['session_id'],
			'domain'						 => $this->api->logindomain,
			'phpgw_return_as'				 => 'json',
			'api_mode'						 => true,
			'query'							 => sanitizer::get_var('query', 'string'),
//			'level'							 => 4
		);

		$post_data = array();

		$url .= http_build_query($get_data);

		$result = json_decode($this->api->exchange_data($url, $post_data), true);

		$ret = empty($result['ResultSet']['Result']) ? array() : $result['ResultSet']['Result'];

		header('Content-Type: application/json');
		echo json_encode($ret);
	}

	public function save_form()
	{
		$saved = false;
		$error = array();

		if (sanitizer::get_var('REQUEST_METHOD', 'string', 'SERVER') == 'POST' && $_POST['randcheck'] == $_SESSION['rand'])
		{
			$session_info = $this->api->get_session_info();

			$url = $this->api->backend_url . "/?";

			$get_data = array(
				'menuaction'					 => 'property.uitts.add',
				$session_info['session_name']	 => $session_info['session_id'],
				'domain'						 => $this->api->logindomain,
				'phpgw_return_as'				 => 'json',
				'api_mode'						 => true
			);

			$cat_id = $this->smarty->getConfigVars('cat_id');

			$user_info = api::session_get('helpdesk', 'user_info');

			$user_name = !empty($user_info['first_name']) ? "{$user_info['first_name']} {$user_info['last_name']}" : null;
			$details	 = sanitizer::get_var('message', 'html');

			if(!empty($user_info['location_code']) && $user_name)
			{
				$details = "<p>Innmeldt av leietaker: $user_name</p>$details";
			}
			else if($user_name)
			{
				$details = "<p>Innmeldt av: $user_name</p>$details";
			}

			$location_name = sanitizer::get_var('location_name', 'string');
			$address = sanitizer::get_var('address', 'string');

			$post_data = array(
				'values'	 => array(
					'cat_id'	 => $cat_id,
					'priority'	 => 3,
					'apply'		 => true,
					'location_code'	 => sanitizer::get_var('location_code', 'string'),
					'address'	 => $address ? $address : $location_name,
					'subject'	 => sanitizer::get_var('subject', 'string'),
					'details'	 => $details,
				),
			);

			$url .= http_build_query($get_data);

			$ret = json_decode($this->api->exchange_data($url, $post_data), true);
			$error = array();

			if (isset($ret['status']) && $ret['status'] == 'saved')
			{
				$saved = true;
			}
			else
			{
				if (!empty($ret['receipt']['error']))
				{
					foreach ($ret['receipt']['error'] as $_error => $message)
					{
						$error[] = $message['msg'];
					}
				}
				else
				{
					$error[] = 'Noe gikk galt med innsendingen';
				}
			}
		}

		if (sanitizer::get_var('phpgw_return_as', 'string') == 'json')
		{
			api::session_set('helpdesk', 'id', !empty($ret['id']) ? $ret['id'] : null);
			api::session_set('helpdesk', 'error', $error);
			api::session_set('helpdesk', 'saved', $saved);
			$return_data =  array(
				'id' => !empty($ret['id']) ? $ret['id'] : null,
				'status' => $saved ? 'saved' : 'error',
				'message' => $error
			);
			header('Content-Type: application/json');
			echo json_encode($return_data);
		}
		else
		{
			$this->display_form($saved, $error, !empty($ret['id']) ? $ret['id'] : null);
		}

	}

	public function display_form($saved = false, $error = array(), $id = null)
	{

		if (!$saved)
		{
			$saved = api::session_get('helpdesk', 'saved');
			api::session_clear('helpdesk', 'saved');
		}

		if (!$error)
		{
			$error = (array)api::session_get('helpdesk', 'error');
			api::session_clear('helpdesk', 'error');
		}
		if (!$id)
		{
			$id = api::session_get('helpdesk', 'id');
			api::session_clear('helpdesk', 'id');
		}

		$get_data = array(
			'menuaction' => 'enkel_klient.helpdesk.save_form',
		);

		$user_info = $this->get_logged_in();
		$fiks = new fiks();
		$fiks_data = $fiks->get_name_from_external_service();

		$user_info['first_name'] = !empty($fiks_data['first_name']) ? $fiks_data['first_name'] : $user_info['first_name'];
		$user_info['last_name'] = !empty($fiks_data['last_name']) ? $fiks_data['last_name'] : $user_info['last_name'];

		api::session_set('helpdesk', 'user_info', $user_info);

		$location_code = !empty($user_info['location_code']) ? $user_info['location_code'] : '';
		$address = !empty($user_info['address']) ? $user_info['address'] : '';
		$user_name = !empty($user_info['first_name']) ? "{$user_info['first_name']} {$user_info['last_name']}" : '';
		$this->smarty->assign("location_code", $location_code, true);
		$this->smarty->assign("address", $address, true);
		$this->smarty->assign("user_name", $user_name, true);
		$this->smarty->assign("action_url", api::link('/index.php', $get_data), true);
		$this->smarty->assign("saved", $saved, true);
		$this->smarty->assign("error", $error, true);
		$this->smarty->assign("id", $id, true);

		$enable_fileupload = $this->smarty->getConfigVars('enable_fileupload');

		$this->smarty->assign("enable_fileupload", $enable_fileupload, true);

		$rand				 = rand();
		$_SESSION['rand']	 = $rand;
		$this->smarty->assign("rand", $rand, true);

		$this->smarty->display('helpdesk.tpl');
	}
}
