<?php
// filepath: /home/hc483/public_html/enkel_klient/src/Service/ApiClient.php

namespace App\Service;

class ApiClient
{
    private $backend_url;
    private $login;
    private $password;
    private $logindomain;
    private $session_info = [];
    private $httpCode;
    private $debug;

    public function __construct()
    {
        ini_set('session.cookie_samesite', 'Lax');
        session_start();

        $this->initializeConfig();
        $this->validateAndRefreshSession();
    }

    private function initializeConfig()
    {
        $configs_dir = SRC_ROOT . '/configs';
        $dotenv = \Dotenv\Dotenv::createImmutable($configs_dir);
        $dotenv->load();

        $this->login = $_ENV['login'] ?? '';
        $this->password = $_ENV['password'] ?? '';
        $this->backend_url = rtrim($_ENV['backend_url'] ?? '', '/');
        $this->logindomain = $_ENV['backend_domain'] ?? '';
        $this->debug = $_ENV['debug'] ?? false;
    }

	private function validateAndRefreshSession()
	{
		// First check if we have session info stored
		if (isset($_SESSION['session_info']) && is_array($_SESSION['session_info']))
		{
			$this->session_info = $_SESSION['session_info'];
		}

		// Check session timeout
		if ($this->isSessionExpired())
		{
			$this->clearSession();
		}
		$_SESSION['LAST_ACTIVITY'] = time();

		// Try to refresh existing session or create new one
		if (!$this->refreshSession())
		{
			$this->performLogin();
		}
	}

	private function isSessionExpired(): bool
	{
		return isset($_SESSION['LAST_ACTIVITY'])
			&& (time() - $_SESSION['LAST_ACTIVITY'] > 1800);
	}

	private function clearSession(): void
	{
		session_unset();
		session_destroy();
		$this->session_info = [];
	}

	private function refreshSession(): bool
	{
		if (empty($this->session_info) || !isset($this->session_info['session_name']))
		{
			return false;
		}

		$url = $this->backend_url . "/refreshsession/?";

		$get_data = [
			$this->session_info['session_name'] => $this->session_info['session_id'],
			'domain' => $this->logindomain,
			'api_mode' => true,
		];

		$url .= http_build_query($get_data);
		$response = $this->exchange_data($url, []);

		return $this->httpCode === 200;
	}

	private function performLogin(): void
	{
		try
		{
			$session_info = $this->login();
			$this->session_info = json_decode($session_info, true);
			$_SESSION['session_info'] = $this->session_info;
		}
		catch (Exception $e)
		{
			echo $e->getMessage();
			die();
		}
	}

	function login()
	{
		if (!$this->login || !$this->password)
		{
			throw new Exception('Missing parameters for webservice');
		}

		$url = $this->backend_url . "/login";
		$post_data = [
			'logindomain' => $this->logindomain,
			'login' => $this->login,
			'passwd' => $this->password
		];

		$session_info = $this->exchange_data($url, $post_data);
		if (!$session_info)
		{
			throw new Exception("Login to backend failed");
		}
		return $session_info;
	}

	function get_session_info()
	{
		return $this->session_info ?? null;
	}

	/**
	 * Clear a value from the session cache
	 *
	 * @param string $module the module to store the data
	 * @param string $id the identifier for the data
	 */
	public static function session_clear($module, $id)
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
	public static function session_get($module, $id)
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
	public static function session_set($module, $id, $data)
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
	protected static function _gen_key($module, $id)
	{
		return sha1("{$module}::{$id}");
	}

	protected static function _value_prepare($value)
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
	protected static function _value_return($str)
	{
		if (is_null($str))
		{
			return null;
		}
		return unserialize($str);
	}


	function exchange_data($url, $post_data = array(), $content_range = null, $content_disposition = null)
	{
		$ch = curl_init();
		curl_setopt($ch, CURLOPT_URL, $url);

		if (!empty($_FILES['files']['tmp_name'][0]))
		{
			// Don't set Content-Type header - let cURL set it with boundary
			$http_header = array();

			// Create CURLFile object
			$post_data['files'] = new \CURLFile(
				$_FILES['files']['tmp_name'][0],
				$_FILES['files']['type'][0],
				$_FILES['files']['name'][0]
			);

			// Set additional file metadata if needed
			$post_data['filename'] = $_FILES['files']['name'][0];
			$post_data['filetype'] = $_FILES['files']['type'][0];

			// Set proper cURL options for file upload
			curl_setopt($ch, CURLOPT_POST, true);
			curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
		}
		else if ($post_data)
		{
			curl_setopt($ch, CURLOPT_POST, true);
			curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_data));
		}

		// Debug headers
		if ($this->debug)
		{
			$http_header[] = 'Cookie: XDEBUG_SESSION=VSCODE';
		}

		// Add range and disposition headers if present
		if ($content_range)
		{
			$http_header[] = "Content-Range: {$content_range}";
		}
		if ($content_disposition)
		{
			$http_header[] = "Content-Disposition: {$content_disposition}";
		}

		if (!empty($http_header))
		{
			curl_setopt($ch, CURLOPT_HTTPHEADER, $http_header);
		}

		// Additional necessary options for file upload
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30); // Increased timeout for files
		curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
		curl_setopt($ch, CURLOPT_MAXREDIRS, 3);

		$result = curl_exec($ch);

		if (curl_errno($ch))
		{
			throw new \Exception('Curl error: ' . curl_error($ch));
		}

		$this->httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

		if ($this->debug)
		{
			error_log('Upload response: ' . print_r($result, true));
			error_log('HTTP Code: ' . $this->httpCode);
		}

		curl_close($ch);
		return $result;
	}

	public static function link($url, $extravars = array())
	{
		$current_site_url = rtrim(current_site_url(), '/');
		return $current_site_url . '/' . ltrim("{$url}?", '/') . http_build_query($extravars);
	}
}
