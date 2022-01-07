<?php
	namespace portico;


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
		public $backend_url, $logindomain;
		private $login, $password;

		function __construct()
		{
			$this->login =  $_ENV['login'];
			$this->password =  $_ENV['password'];
			$this->backend_url = $_ENV['backend_url'];
			$this->logindomain = $_ENV['backend_domain'];

		}

		function login()
		{
			$url =  $this->backend_url . "/login_api.php";

			if(!$this->login || !$this->password)
			{
				throw new \Exception('Missing parametres for webservice');
			}

			$post_data = array
			(
				'api_mode'		=> true,
				'logindomain'	=> $this->logindomain,
				'login'			=> $this->login,
				'passwd'		=> $this->password
			);

			return $this->exchange_data($url, $post_data);
		}

		function exchange_data($url, $post_data = array())
		{

			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL, $url);
			curl_setopt($ch, CURLOPT_POST, true);
			curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_data));
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
			$result = curl_exec($ch);

			$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
			curl_close($ch);

			return $result;
		}
	}
