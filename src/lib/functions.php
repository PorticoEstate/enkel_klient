<?php

	function current_page_url()
	{
		$page_url = 'http';

		if (isset($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] == "on")
		{
			$page_url .= "s";
		}
		$page_url .= "://";

		if ($_SERVER["SERVER_PORT"] != "80")
		{
			$page_url .= $_SERVER["SERVER_NAME"] . ":" . $_SERVER["SERVER_PORT"] . $_SERVER["REQUEST_URI"];
		}
		else
		{
			$page_url .= $_SERVER["SERVER_NAME"] . $_SERVER["REQUEST_URI"];
		}

		return $page_url;
	}

	function _debug_array($obj)
	{
		echo "<pre>";
		print_r($obj);
		echo "</pre>";
	}
	