<?php

declare(strict_types=1);

use portico\api;
use portico\sanitizer;



class landing
{

	private $api, $smarty;
	function __construct()
	{
		$this->api = &$GLOBALS['api'];
		$smarty = new Smarty;

		// Configure Smarty
		$smarty->force_compile = true;
		$smarty->caching = false;
		$smarty->setCaching(Smarty::CACHING_OFF);

		// Load the config file
		$smarty->configLoad("site.conf", 'landing');
		$smarty->configLoad("site.conf", 'services');  // Also load services section

		$str_base_url = current_site_url();

		// Basic assignments
		$smarty->assign([
			"str_base_url" => $str_base_url,
			"action_url" => current_site_url(),
			"saved" => 0,
			"error" => '',
			"subject" => '',
			"message" => ''
		]);

		$this->smarty = $smarty;
	}

	public function display_info()
	{

		$rand				 = rand();
		$_SESSION['rand']	 = $rand;
		$this->smarty->assign("rand", $rand, true);

		$this->smarty->display('landing.tpl');
	}
}
