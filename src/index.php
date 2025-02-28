<?php
	/**
	 * @author Sigurd Nes <sigurd.nes@bergen.kommune.no>
	 * Skjema for rapportering av vekter-inspeksjon for Bergen kommune, Etat for boligforvaltning
	 * - legges bak ID-porten
	 */
	declare(strict_types=1);

	if (!is_file(__DIR__ . '/configs/.env'))
	{
		die('missing settings: ".env"');
	}

	require 'lib/api.php';
	require 'lib/fiks.php';

	$GLOBALS['api'] = new portico\api();

	$class = $_ENV['default_form'];

	/**
	 * Unngå problemer med regler i reverse-proxy
	 */
	if(!preg_match('/index.php/', $_SERVER['REQUEST_URI']))
	{
		header('Location: '.$_SERVER['REQUEST_URI'] .'index.php');
	}

	$method			 = 'display_form';
	$invalid_data	 = false;
	if (isset($_GET['menuaction']) || isset($_POST['menuaction']))
	{
		if (isset($_GET['menuaction']))
		{
			list($app, $class, $method) = explode('.', $_GET['menuaction']);
		}
		else
		{
			list($app, $class, $method) = explode('.', $_POST['menuaction']);
		}
		if (!$app || !$class || !$method)
		{
			$invalid_data = true;
		}
	}

	if(empty($_ENV["activate_{$class}"]))
	{
		die("skjema '{$class}' er ikke aktivert");
	}

	switch ($class)
	{
		case 'helpdesk':
		case 'inspection_1':
		case 'nokkelbestilling':
			require_once "{$class}.php";
			$object = new $class;
			break;

		default:
			throw new Exception('Not supported');
			break;
	}



	if ($method)
	{
		$object->$method();
	}
	else
	{
		die('metode ikke angitt');
	}
