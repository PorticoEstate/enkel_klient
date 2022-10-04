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

			if(sanitizer::get_var('phpgw_return_as', 'string') == 'json')
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

		public function display_form( $saved = false, $error = array(), $id = null )
		{
			if(!$saved)
			{
				$saved = api::session_get('inspection_1', 'saved');
				api::session_clear('inspection_1', 'saved');
			}

			if(!$error)
			{
				$error = (array)api::session_get('inspection_1', 'error');
				api::session_clear('inspection_1', 'error');
			}
			if(!$id)
			{
				$id = api::session_get('inspection_1', 'id');
				api::session_clear('inspection_1', 'id');
			}

			$get_data = array(
				'menuaction' => 'enkel_klient.inspection_1.save_form',
			);
			$this->smarty->assign("action_url", api::link('index.php', $get_data), true);
			$this->smarty->assign("saved", $saved, true);
			$this->smarty->assign("error", $error, true);
			$this->smarty->assign("id", $id, true);

			$enable_fileupload = $this->smarty->getConfigVars('enable_fileupload');

			$this->smarty->assign("enable_fileupload", $enable_fileupload, true);

			$rand				 = rand();
			$_SESSION['rand']	 = $rand;
			$this->smarty->assign("rand", $rand, true);

			$this->smarty->display('inspection_1.tpl');
		}

		protected function get_server_var($id)
		{
			return isset($_SERVER[$id]) ? $_SERVER[$id] : null;
		}

		public function handle_multi_upload_file(  )
		{
			$id = sanitizer::get_var('id', 'int', 'GET');

			$session_info = $this->api->get_session_info();

			$url = $this->api->backend_url . "/index.php?";

			$get_data = array(
				'menuaction'					 => 'property.uientity.handle_multi_upload_file',
				$session_info['session_name']	 => $session_info['sessionid'],
				'domain'						 => $this->api->logindomain,
				'phpgw_return_as'				 => 'json',
				'api_mode'						 => true,
				'entity_id'						 => 2,
				'cat_id'						 => 19,
				'type'							 => 'entity',
				'id'							 => $id
			);

			// [HTTP_CONTENT_RANGE] => bytes 10000000-17679248/17679249 - last chunk looks like this
			$content_range_header = $this->get_server_var('HTTP_CONTENT_RANGE');
			$content_type = $this->get_server_var('CONTENT_TYPE');
			$content_length = $this->get_server_var('CONTENT_LENGTH');
			$content_disposition = $this->get_server_var('HTTP_CONTENT_DISPOSITION');

			$headers = getallheaders();

//			$content_range_header = $headers['Content-Range'];

//			_debug_array($headers);

			$post_data = $_POST;
//			$post_data['files'] = $_FILES;

//			_debug_array($post_data);

			$url .= http_build_query($get_data);

			$return_data = $this->api->exchange_data($url, $post_data, $content_range_header, $content_type, $content_length, $content_disposition);

			header('Content-Type: application/json');
			echo $return_data;

		}
	}