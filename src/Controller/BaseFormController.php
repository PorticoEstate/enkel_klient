<?php
namespace App\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Views\Twig;
use App\Service\ApiClient;


abstract class BaseFormController
{
    protected Twig $twig;
    protected $apiClient;

    public function __construct(Twig $twig, $apiClient)
    {
        $this->twig = $twig;
        $this->apiClient = $apiClient;
    }

    // Common form rendering
    protected function renderForm(Response $response, string $template, array $data = []): Response
    {
        // Forms now use clean architecture with modular validation extensions
        // Legacy form-validator.js removed in favor of form-validation.js extension
        
        return $this->twig->render($response, $template, $data);
    }

    /**
     * Generate or retrieve existing CSRF token for the form
     * Only generates a new token if one doesn't exist for this form
     */
    protected function getCsrfToken(string $formName): string
    {
        $sessionKey = "csrf_token_{$formName}";
        
        // Check if we already have a valid token for this form
        if (isset($_SESSION[$sessionKey]) && !empty($_SESSION[$sessionKey])) {
            return $_SESSION[$sessionKey];
        }
        
        // Generate new token
        $token = bin2hex(random_bytes(32));
        $_SESSION[$sessionKey] = $token;
        
        return $token;
    }
    
    /**
     * Validate CSRF token for the form
     */
    protected function validateCsrfToken(string $formName, string $submittedToken): bool
    {
        $sessionKey = "csrf_token_{$formName}";
        
        if (!isset($_SESSION[$sessionKey])) {
            return false;
        }
        
        return hash_equals($_SESSION[$sessionKey], $submittedToken);
    }
    
    /**
     * Clear CSRF token after successful form submission
     */
    protected function clearCsrfToken(string $formName): void
    {
        $sessionKey = "csrf_token_{$formName}";
        unset($_SESSION[$sessionKey]);
    }

    // Common form validation (to be overridden)
    protected function validate(array $data): array
    {
        // Return array of errors, empty if valid
        return [];
    }

    // Common form processing (to be overridden)
    protected function processForm(array $data): bool
    {
        // Implement in child
        return true;
    }

	/**
	 * Check if the user is logged in, if the user is a tenant - and return their information
	 */
	protected function getLoggedIn(): array
	{
		$headers = getallheaders();
		$ssn = !empty($headers['uid']) ? $headers['uid'] : '';
		$ssn = !empty($_SERVER['HTTP_UID']) ? $_SERVER['HTTP_UID'] : $ssn;
		$ssn = !empty($_SERVER['HTTP_X_OIDC_CLAIM_PID']) ? $_SERVER['HTTP_X_OIDC_CLAIM_PID'] : $ssn;

        //ID-porten, Bergen kommune, portalen
        $oidc_claim_pid = !empty($headers['X-Oidc-Claim-Pid']) ? $headers['X-Oidc-Claim-Pid'] : false;

        if ($oidc_claim_pid)
        {
            $ssn = $oidc_claim_pid;
        }
        echo '<pre>';
        print_r($ssn);
        echo '</pre>';
        ApiClient::session_set('common', 'ssn', $ssn);

		$session_info = $this->apiClient->get_session_info();
		$url = $this->apiClient->get_backend_url() . "/property/tenant/?";

		$get_data = [
			'ssn' => $ssn,
			$session_info['session_name'] => $session_info['session_id'],
			'domain' => $this->apiClient->get_logindomain(),
			'phpgw_return_as' => 'json',
		];

		$url .= http_build_query($get_data);

		$empty = ['first_name' => '', 'last_name' => '', 'location_code' => '', 'address' => ''];
		$result = (array)json_decode($this->apiClient->exchange_data($url, []), true);

		return array_merge($empty, $result);
	}
}
