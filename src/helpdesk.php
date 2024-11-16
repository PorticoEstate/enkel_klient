<?php

declare(strict_types=1);

use portico\sanitizer;
use portico\api;



class helpdesk
{

	private $api, $smarty;

	function __construct()
	{
		$this->api				 = &$GLOBALS['api'];
		$smarty					 = new \Smarty;
		$smarty->force_compile	 = true;
		//	$smarty->debugging		 = true;
		$smarty->caching		 = false;
		$smarty->setCaching(\Smarty::CACHING_OFF);
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
			'level'							 => 4
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
			$post_data = array(
				'values'	 => array(
					'cat_id'	 => $cat_id,
					'priority'	 => 3,
					'apply'		 => true,
					'location_code'	 => sanitizer::get_var('location_code', 'string'),
					'subject'	 => sanitizer::get_var('subject', 'string'),
					'details'	 => sanitizer::get_var('message', 'html'),
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
			api::session_set('inspection_1', 'id', !empty($ret['id']) ? $ret['id'] : null);
			api::session_set('inspection_1', 'error', $error);
			api::session_set('inspection_1', 'saved', $saved);
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
