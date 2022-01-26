<?php
	declare(strict_types=1);

	use portico\sanitizer;

//	use portico\api;


	class helpdesk
	{

		private $api, $smarty;

		function __construct()
		{
			$this->api				 = & $GLOBALS['api'];
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
			$smarty->debugging		 = true;
			$smarty->caching		 = false;
			$smarty->setCaching(Smarty::CACHING_OFF);
			//	$smarty->cache_lifetime	 = 120;
			$smarty->configLoad("test.conf");
			$smarty->assign("action_url", current_site_url(), true);
			$smarty->assign("saved", 0, true);
			$smarty->assign("error", '', true);
			$smarty->assign("subject", '', true);
			$smarty->assign("message", '', true);

			$this->smarty = $smarty;
		}

		public function save_form()
		{

			$message = sanitizer::get_var('message', 'html');
			if (sanitizer::get_var('REQUEST_METHOD', 'string', 'SERVER') == 'POST' && $_POST['randcheck'] == $_SESSION['rand'])
			{
				$session_info = $this->api->get_session_info();

				$url = $this->api->backend_url . "/index.php?";

				$get_data = array(
					'menuaction'					 => 'helpdesk.uitts.add',
					$session_info['session_name']	 => $session_info['sessionid'],
					'domain'						 => $this->api->logindomain,
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

				$ret = json_decode($this->api->exchange_data($url, $post_data), true);

				if ($ret['status'] == 'saved')
				{
					$this->smarty->assign("saved", 1, true);
					$this->smarty->assign("ticket_id", $ret['id'], true);
				}
				else
				{
					$error = 'Noe gikk galt med innsendingen';
					$this->smarty->assign("error", $error, true);
					$this->smarty->assign("message", $message, true);
					$this->smarty->assign("subject", sanitizer::get_var('subject', 'string'), true);
				}
			}
		}

		public function display_form( $saved = false, $error = '', $id = null )
		{
			$rand				 = rand();
			$_SESSION['rand']	 = $rand;
			$this->smarty->assign("rand", $rand, true);

			$this->smarty->display('helpdesk.tpl');
		}
	}