<?php
	/**
	 * @author Sigurd Nes <sigurd.nes@bergen.kommune.no>
	 * Skjema for rapportering av vekter-inspeksjon for Bergen kommune, Etat for boligforvaltning
	 * - legges bak ID-porten
	 */
	declare(strict_types=1);

	use portico\sanitizer;
	use portico\api;

	class inspection_1
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
			$smarty->configLoad("test.conf", 'inspection_1');

			$smarty->assign("str_base_url", current_site_url());

			$this->smarty = $smarty;
		}

		public function get_locations()
		{
			$session_info	 = $this->api->get_session_info();
			$url			 = $this->api->backend_url . "/index.php?";

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

		/**
		 * Hjelpefunksjon for å mappe inputfelt mot riktig atributt på hovedsystemet
		 * Eksempel url:
		 * http://localhost/~hc483/enkel_klient/src/index.php?menuaction=enkel_klient.inspection_1.get_attributes
		 */
		public function get_attributes()
		{
			$session_info	 = $this->api->get_session_info();
			$url			 = $this->api->backend_url . "/index.php?";

			$get_data = array(
				'menuaction'					 => 'property.boentity.get_attributes',
				$session_info['session_name']	 => $session_info['sessionid'],
				'domain'						 => $this->api->logindomain,
				'phpgw_return_as'				 => 'json',
				'api_mode'						 => true,
				'entity_id'						 => 2,
				'cat_id'						 => 19,
				'type'							 => 'entity',
			);

			$url .= http_build_query($get_data);

			$result = json_decode($this->api->exchange_data($url), true);

			_debug_array($result);
		}

		public function save_form()
		{
			$error	 = array();
			$saved	 = false;

			if (sanitizer::get_var('REQUEST_METHOD', 'string', 'SERVER') == 'POST' && $_POST['randcheck'] == $_SESSION['rand'])
			{
				$session_info = $this->api->get_session_info();

				$url = $this->api->backend_url . "/index.php?";

				$get_data = array(
					'menuaction'					 => 'property.uientity.save',
					$session_info['session_name']	 => $session_info['sessionid'],
					'domain'						 => $this->api->logindomain,
					'phpgw_return_as'				 => 'json',
					'api_mode'						 => true,
					'entity_id'						 => 2,
					'cat_id'						 => 19,
					'type'							 => 'entity',
				);

				$values_attribute	 = sanitizer::get_var('values_attribute');

				//Who is responsible for posting data
				$headers = getallheaders();
				if(!empty($headers['uid']))
				{
					$values_attribute[6] = array('value' => $headers['uid'], 'disabled' => 0);
				}

				$post_data = array(
					'values'			 => array(
						'location_code'	 => sanitizer::get_var('location_code', 'string'),
						'save'			 => true
					),
					'values_attribute'	 => $values_attribute
				);

				$url .= http_build_query($get_data);

				$ret = json_decode($this->api->exchange_data($url, $post_data), true);

				if (isset($ret['status']) && $ret['status'] == 'saved')
				{
					$saved = true;
				}
				else
				{
					if(!empty($ret['receipt']['error']))
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

			$this->display_form($saved, $error, !empty($ret['id']) ? $ret['id'] : null);
		}

		public function display_form( $saved = false, $error = array(), $id = null )
		{
			$get_data = array(
				'menuaction' => 'enkel_klient.inspection_1.save_form',
			);
			$this->smarty->assign("action_url", api::link('index.php', $get_data), true);
			$this->smarty->assign("saved", $saved, true);
			$this->smarty->assign("error", $error, true);
			$this->smarty->assign("id", $id, true);

			$rand				 = rand();
			$_SESSION['rand']	 = $rand;
			$this->smarty->assign("rand", $rand, true);

			$this->smarty->display('inspection_1.tpl');
		}
	}