<?php

	declare(strict_types=1);

	namespace portico;

	use Dotenv\Dotenv;
	use Exception;

	require dirname(__DIR__,1) . '/vendor/autoload.php';
	require 'lib/sanitizer.php';
	require 'lib/functions.php';

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
			session_start();
//			_debug_array($_SESSION);

			$up_one = dirname(__DIR__,1);
			$dotenv = Dotenv::createImmutable($up_one);
			$dotenv->load();

			$this->login =  $_ENV['login'];
			$this->password =  $_ENV['password'];
			$this->backend_url = rtrim($_ENV['backend_url'],'/');
			$this->logindomain = $_ENV['backend_domain'];

			if(!$this->get_session_info())
			{
				try
				{
					$session_info	 = $this->login();
				}
				catch (Exception $e)
				{
					echo $e->getMessage();
					die();
				}
				$this->session_info	 = json_decode($session_info, true);
				$_SESSION['session_info']	 = $this->session_info;
			}
		}

		function get_session_info()
		{
			if(isset($_SESSION['session_info']) && is_array($_SESSION['session_info']))
			{
				$this->session_info = $_SESSION['session_info'];
			}
			return $this->session_info;
		}

		function login()
		{
			if(isset($_SESSION['session_info']) && is_array($_SESSION['session_info']))
			{
				return json_encode($_SESSION['session_info']);
			}

			$url =  $this->backend_url . "/login_api.php";

			if(!$this->login || !$this->password)
			{
				throw new Exception('Missing parametres for webservice');
			}

			$post_data = array
			(
				'api_mode'		=> true,
				'logindomain'	=> $this->logindomain,
				'login'			=> $this->login,
				'passwd'		=> $this->password
			);

			$session_info = $this->exchange_data($url, $post_data);
			if(!$session_info)
			{
				throw new Exception("login to backend failed");
			}
			return $session_info;
		}

		function exchange_data($url, $post_data = array())
		{

			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL, $url);
			curl_setopt($ch, CURLOPT_POST, true);
			curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_data));
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
			$result = curl_exec($ch);
			$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
			curl_close($ch);

			return $result;
		}

		public static function link($url, $extravars = array())
		{
			return current_site_url() . "{$url}?" . http_build_query($extravars);
		}

	}
