<?php

class fiks
{

	private $apikey;
	private $webservicehost;


	public function __construct()
	{
		$webservicehost =		$_ENV['fiks_webservicehost'] ?? '';
		$apikey = $_ENV['fiks_apikey'] ?? '';

		$this->apikey = $apikey;
		$this->webservicehost = $webservicehost;
	}

	function get_ssn()
	{
		$headers = getallheaders();
		$ssn = !empty($headers['uid']) ? $headers['uid'] : '';
		$ssn = !empty($_SERVER['HTTP_UID']) ? $_SERVER['HTTP_UID'] : $ssn;
		$ssn = !empty($_SERVER['OIDC_pid']) ? $_SERVER['OIDC_pid'] : $ssn;
		return $ssn;
	}

	function get_name_from_external_service()
	{

		$ssn = $this->get_ssn();
		if (empty($ssn))
		{
			return;
		}

		$apikey = $this->apikey;

		$webservicehost = !empty($this->webservicehost) ? $this->webservicehost : 'http://fiks/get.php:8210';

		if (!$webservicehost || !$apikey)
		{
			throw new Exception('Missing parametres for webservice');
		}

		$post_data = array(
			'id' => $ssn,
			'apikey' => $apikey,
		);

		$post_string = http_build_query($post_data);

		$url = $webservicehost;

		// $this->log('url', print_r($url, true));
		// $this->log('POST data', print_r($post_data, true));

		$ch = curl_init();
		curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
		curl_setopt($ch, CURLOPT_URL, $url);
		curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/x-www-form-urlencoded'));
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
		curl_setopt($ch, CURLOPT_POSTFIELDS, $post_string);
		$result = curl_exec($ch);

		$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
		curl_close($ch);

		$ret = json_decode($result, true);


		if (!empty($ret['postadresse']) && count($ret['postadresse']) > 2)
		{
			$street = $this->mb_ucfirst(mb_convert_case($ret['postadresse'][0], MB_CASE_TITLE)) . ', ' . $this->mb_ucfirst(mb_convert_case($ret['postadresse'][1], MB_CASE_LOWER));
		}
		else
		{
			$street = $this->mb_ucfirst(mb_convert_case($ret['postadresse'][0], MB_CASE_LOWER));
		}

		$ret['fornavn'] = ucwords(mb_convert_case($ret['fornavn'], MB_CASE_TITLE), "'");
		$ret['etternavn'] = ucwords(mb_convert_case($ret['etternavn'], MB_CASE_TITLE), "'");

		if (!empty($ret['postadresse']))
		{
			$poststed = explode(' ', end($ret['postadresse']));
		}

		$data = array();
		$data['ssn'] = $ssn;
		$data['first_name'] = $ret['fornavn'];
		$data['last_name'] = $ret['etternavn'];
		$data['name'] = "{$ret['fornavn']} {$ret['etternavn']}";
		$data['street'] = $street;
		$data['zip_code'] = $poststed[0];
		$data['city'] = mb_convert_case($poststed[1], MB_CASE_TITLE);
		$data['foedselsdato'] = $ret['foedselsdato']; //"fortrolig"
		$data['adressebeskyttelse'] = $ret['adressebeskyttelse']; //"fortrolig"
		$data['status'] = $ret['status'];
		$data['doedsdato'] = !empty($ret['doedsdato']) ? $ret['doedsdato'] : '';

		return $data;
	}

	private function mb_ucfirst($string)
	{
		$encoding = 'UTF-8';
		$firstChar = mb_substr($string, 0, 1, $encoding);
		$then = mb_substr($string, 1, null, $encoding);
		return mb_strtoupper($firstChar, $encoding) . $then;
	}
}
