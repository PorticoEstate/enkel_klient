<?php

	namespace portico;

	use \HTMLPurifier_Config;
	use \HTMLPurifier;

	class sanitizer
	{

		/**
		 * Strips out html chars
		 *
		 * Used as a shortcut for stripping out html special chars.
		 *
		 * @param $s string The string to have its html special chars stripped out.
		 * @return string The string with html special characters removed
		 */
		public static function strip_html( $s )
		{
			$s = htmlspecialchars(strip_tags($s), ENT_QUOTES, 'UTF-8');
			return $s;
		}

		/**
		 * Clean the inputted HTML to make sure it is free of any nasties
		 *
		 * @param string $html     the HTML to clean
		 * @param string $base_url the base URL for all links - currently not used
		 *
		 * @return string the cleaned html
		 *
		 * @internal uses HTMLPurifier a whitelist based html sanitiser and tidier
		 */
		public static function clean_html( $html )
		{
			$config = HTMLPurifier_Config::createDefault();
			$config->set('HTML.Doctype', 'HTML 4.01 Transitional');
			$config->set('HTML.Allowed', 'u,p,b,i,span[style],p,strong,em,li,ul,ol,div[align],br,img');
			$config->set('HTML.AllowedAttributes', 'class, src, height, width, alt, id, target, href, colspan');

			$config->set('Attr.AllowedFrameTargets', array('_blank', '_self', '_parent', '_top'));
			$html_purifier_cache_dir = sys_get_temp_dir() . '/HTMLPurifier/DefinitionCache';
			if (!is_dir($html_purifier_cache_dir))
			{
				mkdir($html_purifier_cache_dir, 0770, TRUE);
			}
			$config->set('Cache.SerializerPath', $html_purifier_cache_dir);

			if (true)
			{
				$config->set('URI.DisableExternalResources', false);
				$config->set('URI.DisableResources', false);
				$config->set('URI.AllowedSchemes', array(
					'data'	 => true,
					'http'	 => true,
					'https'	 => true,
					'mailto' => true,
					'ftp'	 => true,
					'nntp'	 => true,
					'news'	 => true,
					'tel'	 => true
					)
				);
			}

			$purifier = new HTMLPurifier($config);

			$clean_html = $purifier->purify($html);



			return $clean_html;
		}

		/**
		 * Get the value of a variable
		 *
		 * @param string $var_name the name of the variable sought
		 * @param string $value_type the expected data type
		 * @param string $var_type the variable type sought
		 * @param mixed $default the default value
		 * @return mixed the sanitised variable requested
		 */
		public static function get_var( $var_name, $value_type = 'string', $var_type = 'REQUEST', $default = null )
		{
			$value = null;
			switch (strtoupper($var_type))
			{
				case 'COOKIE':
					if (isset($_COOKIE[$var_name]))
					{
						$value = $_COOKIE[$var_name];
					}
					break;

				case 'GET':
					if (isset($_GET[$var_name]))
					{
						$value = $_GET[$var_name];
					}
					break;

				case 'POST':

					if (isset($_POST[$var_name]))
					{
						$value = $_POST[$var_name];
					}
					break;

				case 'SERVER':
					if (isset($_SERVER[$var_name]))
					{
						$value = $_SERVER[$var_name];
					}
					break;

				case 'SESSION':
					if (isset($_SESSION[$var_name]))
					{
						$value = $_SESSION[$var_name];
					}
					break;

				case 'REQUEST':
				default:
					if (isset($_REQUEST[$var_name]))
					{
						$value = $_REQUEST[$var_name];
					}
			}

			if (is_null($value) && is_null($default))
			{
				return null;
			}
			else if ((is_null($value) || !$value) && !is_null($default))
			{
				return $default;
			}

			return self::clean_value($value, $value_type, $default);
		}

		public static function get_ip_address()
		{
			$ip_keys = array('HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_X_CLUSTER_CLIENT_IP', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR');
			foreach ($ip_keys as $key)
			{
				if (array_key_exists($key, $_SERVER) === true)
				{
					foreach (explode(',', $_SERVER[$key]) as $ip)
					{
						// trim for safety measures
						$ip = trim($ip);
						// attempt to validate IP
						if (self::validate_ip($ip))
						{
							return $ip;
						}
					}
				}
			}
			return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : false;
		}

		/**
		 * Ensures an ip address is both a valid IP and does not fall within
		 * a private network range.
		 */
		public static function validate_ip( $ip )
		{
			if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false)
			{
				return false;
			}
			return true;
		}

		/**
		 * Test (and sanitize) the value of a variable
		 *
		 * @param mixed $value the value to test
		 * @param string $value_type the expected type of the variable
		 * @return mixed the sanitised variable
		 */
		public static function clean_value( $value, $value_type = 'string', $default = null )
		{
			if (is_array($value))
			{
				foreach ($value as &$val)
				{
					$val = self::clean_value($val, $value_type, $default);
				}
				return $value;
			}

			// Trim whitespace so it doesn't trip us up
			$value = trim($value);

			switch ($value_type)
			{
				case 'string':
				default:
					$value	 = str_replace(array(';', '(', ')', '=', '--'), array('&#59;', '&#40;', '&#41;', '&#61;', '&#8722;&#8722;'), $value); // prevent SQL-injection
					$value	 = filter_var($value, FILTER_SANITIZE_STRING, FILTER_FLAG_NO_ENCODE_QUOTES);
					$value	 = htmlspecialchars($value, ENT_QUOTES, 'UTF-8', true);
					//	$value = htmlentities($value, ENT_QUOTES, 'UTF-8', true);
					break;

				case 'boolean':
				case 'bool':
					if (preg_match('/^[false|0|no]$/', $value))
					{
						$value = false;
					}
					return !!$value;

				case 'float':
				case 'double':
					$value = str_replace(array(' ', ','), array('', '.'), $value);
					if ((float)$value == $value)
					{
						return (float)$value;
					}
					return (float)$default;

				case 'int':
				case 'integer':
				case 'number':
					if ((int)$value == $value)
					{
						return (int)$value;
					}
					return (int)$default;

				/* Specific string types */
				case 'color':
					$regex		 = array('options' => array('regexp' => '/^#([a-f0-9]{3}){1,2}$/i'));
					$filtered	 = strtolower(filter_var($value, FILTER_VALIDATE_REGEXP, $regex));
					if ($filtered == strtolower($value))
					{
						return $filtered;
					}
					return (string)$default;

				case 'email':
					$filtered = filter_var($value, FILTER_VALIDATE_EMAIL);
					if ($filtered == $value)
					{
						if ($filtered)
						{
							return $filtered;
						}
						else
						{
							return $value;
						}
					}
					return (string)$default;

				case 'filename':
					if ($value != '.' || $value != '..')
					{
						$regex		 = array('options' => array('regexp' => '/^[a-z0-9_]+$/i'));
						$filtered	 = filter_var($value, FILTER_VALIDATE_REGEXP, $regex);
						if ($filtered == $value)
						{
							return $filtered;
						}
					}
					return (string)$default;

				case 'ip':
					$filtered = filter_var($value, FILTER_VALIDATE_IP);
					if ($filtered == $value)
					{
						return $filtered;
					}

					// make the default sane
					if (!$default)
					{
						$default = '0.0.0.0';
					}

					return (string)$default;

				case 'location':
					$regex		 = array('options' => array('regexp' => '/^([a-z0-9_]+\.){2}[a-z0-9_]+$/i'));
					$filtered	 = filter_var($value, FILTER_VALIDATE_REGEXP, $regex);
					if ($filtered == $value)
					{
						return $filtered;
					}
					return (string)$default;

				case 'url':
					$filtered = filter_var($value, FILTER_VALIDATE_URL);
					if ($filtered == $value)
					{
						if ($filtered)
						{
							return $filtered;
						}
						else
						{
							return $value;
						}
					}
					return (string)$default;

				/* only use this if you really know what you are doing */
				case 'raw':
					$value = filter_var($value, FILTER_UNSAFE_RAW);
					break;

				case 'html':
					$value	 = self::clean_html($value);
					break;
				case 'date':
					$timezone = $_ENV['timezone'] ? $_ENV['timezone'] : 'UTC';
					$value = new DateTime($value, new DateTimeZone($timezone));
					$value = $value->getTimestamp();
					break;
			}
			return $value;
		}
	}