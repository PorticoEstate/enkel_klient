<?php

namespace App\Traits;

trait UtilityTrait
{
	/**
	 * Get the current site URL with proper route handling
	 *
	 * @return string
	 */
	protected static function current_site_url(): string
	{
		// Determine protocol
		$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';

		// Handle host with proper port detection
		if (isset($_SERVER['HTTP_X_FORWARDED_HOST']))
		{
			$host = $_SERVER['HTTP_X_FORWARDED_HOST']; // Already includes port if needed
		}
		else
		{
			$host = $_SERVER['HTTP_HOST'];

			// Only add port if it's not already in the host and not the default port
			if (!str_contains($host, ':') && isset($_SERVER['SERVER_PORT']))
			{
				$standardPort = ($protocol === 'https://') ? '443' : '80';
				if ($_SERVER['SERVER_PORT'] !== $standardPort)
				{
					$host .= ':' . $_SERVER['SERVER_PORT'];
				}
			}
		}

		// Get the base path from environment variable
		$basePath = $_ENV['BASE_PATH'] ?? '';

		// Build the URL
		$baseUrl = $protocol . $host;

		// Add the base path if defined
		if ($basePath)
		{
			$baseUrl .= '/' . trim($basePath, '/');
		}

		return rtrim($baseUrl, '/');
	}
	
	/**
	 * Get route URL for specific endpoint
	 *
	 * @param string $route The route name (e.g. 'locations', 'nokkelbestilling')
	 * @param array $params Optional query parameters
	 * @return string
	 */
	protected static function get_route_url(string $route, array $params = []): string
	{
		$url = self::current_site_url() . '/' . ltrim($route, '/');
		
		if (!empty($params)) {
			$url .= '?' . http_build_query($params);
		}
		
		return $url;
	}

	/**
	 * Debug an array or object with formatted output
	 *
	 * @param mixed $obj The object or array to debug
	 * @return void
	 */
	protected function _debug_array($obj): void
	{
		echo "<pre>";
		print_r($obj);
		echo "</pre>";
	}
}