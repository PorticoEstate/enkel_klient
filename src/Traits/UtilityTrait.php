<?php

namespace App\Traits;

trait UtilityTrait
{
    /**
     * Get the current site URL
     *
     * @return string
     */
	protected static function current_site_url(): string
    {
        $page_url = pathinfo($_SERVER['SCRIPT_NAME'], PATHINFO_DIRNAME) . '/';
        return $page_url;
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