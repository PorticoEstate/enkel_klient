<?php
	declare(strict_types=1);

	use portico\sanitizer;
	use portico\api;

	require 'lib/api.php';

	$api					 = new api();
	$smarty					 = new Smarty;
	$smarty->force_compile	 = true;
//	$smarty->debugging		 = true;
	$smarty->caching		 = false;
	$smarty->setCaching(Smarty::CACHING_OFF);
//	$smarty->cache_lifetime	 = 120;
	$smarty->configLoad("test.conf", 'inspection_1');
	$smarty->assign("str_base_url", $api->backend_url . '/');
	$smarty->assign("action_url", current_page_url(), true);
	$smarty->assign("saved", 0, true);
	$smarty->assign("error", '', true);
	$smarty->assign("subject", '', true);
	$smarty->assign("message", '', true);


	$message = sanitizer::get_var('message', 'html');
	if (sanitizer::get_var('REQUEST_METHOD', 'string', 'SERVER') == 'POST' && $_POST['randcheck'] == $_SESSION['rand'])
	{
		$session_info	 = json_decode($api->login(), true);

		$url = $api->backend_url . "/index.php?";

		$get_data = array
			(
			'menuaction'					 => 'helpdesk.uitts.add',
			$session_info['session_name']	 => $session_info['sessionid'],
			'domain'						 => $api->logindomain,
			'phpgw_return_as'				 => 'json',
			'api_mode'						 => true
		);

		$post_data = array(
			'values'	 => array(
				'subject'	 => sanitizer::get_var('subject', 'string'),
				'cat_id'	 => 248,
				'priority'	 => 3,
				'apply'		 => true
			),
			'details'	 => $message
		);

		$url .= http_build_query($get_data);

		$ret = json_decode($api->exchange_data($url, $post_data), true);

		if ($ret['status'] == 'saved')
		{
			$smarty->assign("saved", 1, true);
			$smarty->assign("ticket_id", $ret['id'], true);
		}
		else
		{
			$error = 'Noe gikk galt med innsendingen';
			$smarty->assign("error", $error, true);
			$smarty->assign("message", $message, true);
			$smarty->assign("subject", sanitizer::get_var('subject', 'string'), true);
		}
	}

	$rand				 = rand();
	$_SESSION['rand']	 = $rand;
	$smarty->assign("rand", $rand, true);

	$smarty->display('inspection_1.tpl');
