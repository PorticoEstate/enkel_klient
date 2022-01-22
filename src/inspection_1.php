<?php

/**
 * @author Sigurd Nes <sigurd.nes@bergen.kommune.no>
 * Skjema for rapportering av vekter-inspeksjon for Bergen kommune, Etat for boligforvaltning
 * - legges bak ID-porten
 */

declare(strict_types=1);

namespace portico;

use portico\sanitizer;
use portico\api;

require 'lib/api.php';

$inspection = new inspection_1();

$method = '';
$invalid_data = false;
if (isset($_GET['menuaction']) || isset($_POST['menuaction']))
{
	if (isset($_GET['menuaction']))
	{
		list($app, $class, $method) = explode('.', $_GET['menuaction']);
	}
	else
	{
		list($app, $class, $method) = explode('.', $_POST['menuaction']);
	}
	if (!$app || !$class || !$method)
	{
		$invalid_data = true;
	}
}
/*
_debug_array($_GET);
_debug_array($method);
die();
*/
if($method)
{
	$inspection->$method();
}
else
{
	$inspection->display_form();
}

class inspection_1
{
	private $api, $smarty;
	function __construct()
	{
		$api					 = new api();
		$smarty					 = new \Smarty;
		$smarty->force_compile	 = true;
		//	$smarty->debugging		 = true;
		$smarty->caching		 = false;
		$smarty->setCaching(\Smarty::CACHING_OFF);
		//	$this->smarty->cache_lifetime	 = 120;
		$smarty->configLoad("test.conf", 'inspection_1');

		$str_base_url = current_page_url();

		$smarty->assign("str_base_url", $str_base_url);

		$this->api = $api;
		$this->smarty = $smarty;
	}

	public function get_locations()
	{
		$session_info	 = $this->api->get_session_info();
		$url = $this->api->backend_url . "/index.php?";

		$get_data = array(
			'menuaction'					 => 'property.bolocation.get_locations',
			$session_info['session_name']	 => $session_info['sessionid'],
			'domain'						 => $this->api->logindomain,
			'phpgw_return_as'				 => 'json',
			'api_mode'						 => true,
			'query'							 => sanitizer::get_var('query', 'string'),
			'level'							 => 4
		);

		$post_data = array(

		);

		$url .= http_build_query($get_data);

		$result = json_decode($this->api->exchange_data($url, $post_data), true);

		$ret = empty($result['ResultSet']['Result']) ? array() : $result['ResultSet']['Result'];

		header('Content-Type: application/json');
		echo json_encode($ret);
	}

	public function save_form()
	{
		if (sanitizer::get_var('REQUEST_METHOD', 'string', 'SERVER') == 'POST' && $_POST['randcheck'] == $_SESSION['rand'])
		{
			$session_info	 = $this->api->get_session_info();

			$url = $this->api->backend_url . "/index.php?";

			$get_data = array(
				'menuaction'					 => 'property.uientity.save',
				$session_info['session_name']	 => $session_info['sessionid'],
				'domain'						 => $this->api->logindomain,
				'phpgw_return_as'				 => 'json',
				'api_mode'						 => true,
				'entity_id'						 => 2,
				'cat_id'						 => 20,
				'type'							 =>'entity',
			);

			$post_data = array(
				'values'	 => array(
					'location_code'	 => sanitizer::get_var('location_code', 'string'),
					'apply'		 => true
				),
				'values_attribute' => sanitizer::get_var('values_attribute')
			);

			$url .= http_build_query($get_data);

			$ret = json_decode($this->api->exchange_data($url, $post_data), true);

			if ($ret['status'] == 'saved') {
				$this->smarty->assign("saved", 1, true);
				$this->smarty->assign("ticket_id", $ret['id'], true);
			} else {
				$error = 'Noe gikk galt med innsendingen';
				$this->smarty->assign("error", $error, true);
				$this->smarty->assign("remark", $remark, true);
				$this->smarty->assign("subject", sanitizer::get_var('subject', 'string'), true);
			}
		}

	}
	public function display_form()
	{
		$get_data = array(
			'menuaction' => 'enkel_klient.inspection_1.save_form',
		);
		$this->smarty->assign("action_url", current_page_url() . '?' . http_build_query($get_data) , true);
		$this->smarty->assign("saved", 0, true);
		$this->smarty->assign("error", '', true);
		$this->smarty->assign("subject", '', true);
		$this->smarty->assign("message", '', true);

		$rand				 = rand();
		$_SESSION['rand']	 = $rand;
		$this->smarty->assign("rand", $rand, true);

		$this->smarty->display('inspection_1.tpl');
	}
}
