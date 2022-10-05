<?php
	declare(strict_types=1);

	namespace portico;

	use Dotenv\Dotenv;
	use Exception;

define('PHPGW_SERVER_ROOT', dirname(__DIR__, 1));
	require_once dirname(__DIR__, 1) . '/vendor/autoload.php';
	require_once 'lib/sanitizer.php';
	require_once 'lib/functions.php';

	/*
	  Generelt:
	  &phpgw_return_as=stripped_html
	  - vil returnere metoderesultatet fra den interne klientet - innenfor <body></body>

	  &phpgw_return_as=json
	  - vil returnere dataobjektet som går til den interne klienten



	  /**
	 * Trinn 1: Logg på, for å få tilbake sesjonsnavn og sesjons id
	 */
//	$session_info = json_decode($api->login($login, $passwd), true);

	/**
	 * Trinn 2: utveksle data med Portico.
	 * Dersom sesjonen ikke er håndtert med cookie - må sesjonsinfo inkluderes i url'en
	 */
//	$url =  "http://localhost/~hc483/github_trunk/index.php?";
//	$get_data = array
//	(
//		'menuaction'					=> 'property.uilocation.index',
//		'type_id'						=> 1,
//		$session_info['session_name']	=> $session_info['sessionid'],
//		'domain'=>'default',
//		'phpgw_return_as'=>'json',
//		'api_mode'		=> true
//	);
//	$post_data = array();
//
//
//	$url .= http_build_query($get_data);
//
//	echo $api->exchange_data($url, $post_data);

	class api
	{

		public
			$backend_url,
			$logindomain;
		private
			$login,
			$password,
			$session_info;

		function __construct()
		{
			// Start the session
			ini_set('session.cookie_samesite', 'Lax');
			session_start();
//			_debug_array($_SESSION);

			$configs_dir = dirname(__DIR__, 1) . '/configs';
			$dotenv		 = Dotenv::createImmutable($configs_dir);
			$dotenv->load();

			$this->login		 = $_ENV['login'];
			$this->password		 = $_ENV['password'];
			$this->backend_url	 = rtrim($_ENV['backend_url'], '/');
			$this->logindomain	 = $_ENV['backend_domain'];

			if (!$this->get_session_info())
			{
				try
				{
					$session_info = $this->login();
				}
				catch (Exception $e)
				{
					echo $e->getMessage();
					die();
				}
				$this->session_info			 = json_decode($session_info, true);
				$_SESSION['session_info']	 = $this->session_info;
			}
		}

		function get_session_info()
		{
			if (isset($_SESSION['session_info']) && is_array($_SESSION['session_info']))
			{
				$this->session_info = $_SESSION['session_info'];
			}

			return $this->session_info;
		}

		/**
		 * Clear a value from the session cache
		 *
		 * @param string $module the module to store the data
		 * @param string $id the identifier for the data
		 */
		public static function session_clear( $module, $id )
		{
			$key = self::_gen_key($module, $id);
			if (isset($_SESSION['phpgw_cache'][$key]))
			{
				unset($_SESSION['phpgw_cache'][$key]);
			}
			// we don't really care if it is already not set
			return true;
		}

		/**
		 * Retreive data from session cache
		 *
		 * @param string $module the module name the data belongs to
		 * @param string $id the internal module id for the data
		 * @return mixed the data from session cache
		 */
		public static function session_get( $module, $id )
		{
			$key = self::_gen_key($module, $id);
			if (isset($_SESSION['phpgw_cache'][$key]))
			{
				return self::_value_return($_SESSION['phpgw_cache'][$key]);
			}
			return null;
		}

		/**
		 * Store data in the session cache
		 *
		 * @param string $module the module name the data belongs to
		 * @param string $id the internal module id for the data
		 * @param mixed $data the data to store
		 * @return bool was the data stored in the session cache?
		 */
		public static function session_set( $module, $id, $data )
		{
			$key							 = self::_gen_key($module, $id);
			$_SESSION['phpgw_cache'][$key]	 = self::_value_prepare($data);
			return true;
		}

		/**
		 * Generate the key for the data to be stored/retreived
		 *
		 * @param string $module the module name the data belongs to
		 * @param string $id the internal module id for the data
		 * @return string a unique hash for the data
		 */
		protected static function _gen_key( $module, $id )
		{
			return sha1("{$module}::{$id}");
		}

		protected static function _value_prepare( $value )
		{
			return serialize($value);
		}

		/**
		 * Returns a value is a usable form - all values must be run through here before returning to the user
		 *
		 * @param string $str the string to process
		 * @param bool $bypass to skip encryption
		 * @return mixed the unserialized string
		 */
		protected static function _value_return( $str )
		{
			if (is_null($str))
			{
				return null;
			}
			return unserialize($str);
		}

		function login()
		{
			if (isset($_SESSION['session_info']) && is_array($_SESSION['session_info']))
			{
				return json_encode($_SESSION['session_info']);
			}

			$url = $this->backend_url . "/login_api.php";

			if (!$this->login || !$this->password)
			{
				throw new Exception('Missing parametres for webservice');
			}

			$post_data = array(
				'api_mode'		 => true,
				'logindomain'	 => $this->logindomain,
				'login'			 => $this->login,
				'passwd'		 => $this->password
			);

			$session_info = $this->exchange_data($url, $post_data);
			if (!$session_info)
			{
				throw new Exception("login to backend failed");
			}
			return $session_info;
		}

		function exchange_data( $url, $post_data = array(), $range = null, $content_type = null, $content_length = null, $content_disposition = null )
		{

			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL, $url);
			curl_setopt($ch, CURLOPT_POST, true);

			if (!empty($_FILES['files']['tmp_name'][0]))
			{
				// Assign POST data
				$post_data = array
				(
					'files' => curl_file_create(
						$_FILES['files']['tmp_name'][0],
						$_FILES['files']['type'][0],
						$_FILES['files']['name'][0])
				);
				curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
			}
			else
			{
				curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_data));
			}


			$http_header = array();

			if ($range)
			{
				$http_header[] = "Content-Range: {$range}";
			}
			if ($content_type)
			{
//				$http_header[] = "Content-Type: {$content_type}";
			}

			if ($content_length && $range)
			{
				$http_header[] = "Content-Length: {$content_length}";
			}

			if ($content_disposition)
			{
				$http_header[] = "Content-Disposition: {$content_disposition}";
			}

			if ($http_header)
			{
//				_debug_array($http_header);
				curl_setopt($ch, CURLOPT_HTTPHEADER, $http_header);
			}

			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

			$result = curl_exec($ch);

			$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

			curl_close($ch);

			return $result;
		}

		public static function link( $url, $extravars = array() )
		{
			return current_site_url() . "{$url}?" . http_build_query($extravars);
		}
	}