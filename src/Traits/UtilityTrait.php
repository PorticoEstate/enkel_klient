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
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'];
        $baseUrl = pathinfo($_SERVER['SCRIPT_NAME'], PATHINFO_DIRNAME);

        $ConfigURL = $_ENV['BASE_URL'] ?? '';
        if (!empty($ConfigURL))
        {
            //remove the protocol if it is wrong - and insert the correct one
            $ConfigURL = preg_replace('/^http(s)?:\/\//', '', $ConfigURL);
            $ConfigURL = $protocol . $ConfigURL;
            return rtrim($ConfigURL, '/');
        }

        // Ensure we have no trailing slash
        return rtrim($protocol . $host . $baseUrl, '/');
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