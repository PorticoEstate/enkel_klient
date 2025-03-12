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
		$baseUrl = '/';
		// Add the base path if defined
		$basePath = $_ENV['BASE_PATH'] ?? '';
		if ($basePath)
		{
			$baseUrl .= trim($basePath, '/');
		}

		return $baseUrl;
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