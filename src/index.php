<?php
	/**
	 * @author Sigurd Nes <sigurd.nes@bergen.kommune.no>
	 * Skjema for rapportering av vekter-inspeksjon for Bergen kommune, Etat for boligforvaltning
	 * - legges bak ID-porten
	 */

	declare(strict_types=1);

	if (!is_file(__DIR__ . '/.env'))
	{
		die('missing settings: ".env"');
	}

	require 'lib/api.php';

	$GLOBALS['api'] = new portico\api();

	$class = $_ENV['default_form'];

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

	switch ($class)
	{
		case 'helpdesk':
		case 'inspection_1':
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
		throw new Exception('metode ikke angitt');
	}
