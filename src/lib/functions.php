<?php

	function current_site_url()
	{
//		$page_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://{$_SERVER['HTTP_HOST']}" . pathinfo($_SERVER['SCRIPT_NAME'], PATHINFO_DIRNAME) . '/';
		$page_url = pathinfo($_SERVER['SCRIPT_NAME'], PATHINFO_DIRNAME) . '/';
		return $page_url;
	}

	function _debug_array( $obj )
	{
		echo "<pre>";
		print_r($obj);
		echo "</pre>";
	}
