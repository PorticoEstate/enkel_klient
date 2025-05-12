<?php
namespace App\Controller;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Views\Twig;

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
        return $this->twig->render($response, $template, $data);
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
}
