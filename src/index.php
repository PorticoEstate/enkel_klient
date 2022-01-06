<?php
// Start the session
	session_start();

	use portico\sanitizer;
	use portico\api;

	require __DIR__ . '/vendor/autoload.php';
	require 'lib/sanitizer.php';
	require 'lib/api.php';
	require 'lib/functions.php';

	$smarty					 = new Smarty;
//$smarty->force_compile = true;
	$smarty->debugging		 = false;
	$smarty->caching		 = false;
	$smarty->cache_lifetime	 = 120;
	$smarty->assign("page_title", "LRS Hjelper deg", true);
	$smarty->assign("action_url", current_page_url(), true);
	$smarty->assign("description", "LRS Hjelper deg", true);
	$smarty->assign("keywords", "Helpdesk,Kemner,kommune", true);

	$smarty->assign("saved", 0, true);
	$smarty->assign("error", '', true);
	$smarty->assign("subject", '', true);
	$smarty->assign("message", '', true);

	$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
	$dotenv->load();

	$message = sanitizer::get_var('message', 'html');
	if (sanitizer::get_var('REQUEST_METHOD', 'string', 'SERVER') == 'POST' && $_POST['randcheck'] == $_SESSION['rand'])
	{
		$api			 = new api();
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

	$smarty->display('index.tpl');
