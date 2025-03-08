<?php
// src/Controller/Inspection1Controller.php
namespace App\Controller;

use Smarty;
use App\Service\ApiClient;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use App\Traits\UtilityTrait;
use App\Service\Sanitizer;

class Inspection1Controller
{
    private $smarty;
    private $api;

    use UtilityTrait;

    public function __construct(Smarty $smarty, ApiClient $api)
    {
        // Configure Smarty
        $smarty->force_compile = true;
        $smarty->caching = false;
        $smarty->setCaching(Smarty::CACHING_OFF);
        
        // Load configurations
        $smarty->configLoad("site.conf", 'inspection_1');
        $smarty->configLoad("site.conf", 'services');  // Also load services section

        $str_base_url = self::current_site_url();

        // Basic assignments
        $smarty->assign([
            "str_base_url" => $str_base_url,
            "action_url" => $str_base_url,
            "saved" => 0,
            "error" => '',
            "subject" => '',
            "message" => ''
        ]);

        $this->smarty = $smarty;
        $this->api = $api;
    }

    public function getLocations(Request $request, Response $response): Response
    {
        $session_info = $this->api->get_session_info();
        $url = $this->api->get_backend_url() . "/?";

        $get_data = [
            'menuaction' => 'property.bolocation.get_locations',
            $session_info['session_name'] => $session_info['session_id'],
            'domain' => $this->api->get_logindomain(),
            'phpgw_return_as' => 'json',
            'api_mode' => true,
            'query' => $request->getQueryParams()['query'] ?? '',
            'level' => 4
        ];

        $url .= http_build_query($get_data);
        $result = json_decode($this->api->exchange_data($url, []), true);
        $locations = empty($result['ResultSet']['Result']) ? [] : $result['ResultSet']['Result'];

        $response = $response->withHeader('Content-Type', 'application/json');
        $response->getBody()->write(json_encode($locations));
        return $response;
    }

    public function getAttributes(Request $request, Response $response): Response
    {
        $session_info = $this->api->get_session_info();
        $url = $this->api->get_backend_url() . "/index.php?";

        $get_data = [
            'menuaction' => 'property.boentity.get_attributes',
            $session_info['session_name'] => $session_info['session_id'],
            'domain' => $this->api->get_logindomain(),
            'phpgw_return_as' => 'json',
            'api_mode' => true,
            'entity_id' => 2,
            'cat_id' => 19,
            'type' => 'entity',
        ];

        $url .= http_build_query($get_data);
        $result = json_decode($this->api->exchange_data($url), true);

        $response->getBody()->write('<pre>' . print_r($result, true) . '</pre>');
        return $response;
    }

    public function saveForm(Request $request, Response $response): Response
    {
        $error = [];
        $saved = false;

        if ($request->getMethod() === 'POST') {
            $post = $request->getParsedBody();
            $session_info = $this->api->get_session_info();
            
            // Verify CSRF token
            if ($post['randcheck'] != $_SESSION['rand']) {
                $error[] = 'Invalid security token';
                return $this->handleFormResponse($request, $response, false, $error, null);
            }

            $url = $this->api->get_backend_url() . "/index.php?";

            $get_data = [
                'menuaction' => 'property.uientity.save',
                $session_info['session_name'] => $session_info['session_id'],
                'domain' => $this->api->get_logindomain(),
                'phpgw_return_as' => 'json',
                'api_mode' => true,
                'entity_id' => 2,
                'cat_id' => 19,
                'type' => 'entity',
            ];

            $values_attribute = $post['values_attribute'] ?? [];

            // Who is responsible for posting data
            $headers = getallheaders();
            if (!empty($headers['uid'])) {
                $values_attribute[6] = ['value' => $headers['uid'], 'disabled' => 0];
            }

            $post_data = [
                'values' => [
                    'location_code' => Sanitizer::sanitizeString($post['location_code'] ?? ''),
                    'save' => true
                ],
                'values_attribute' => $values_attribute
            ];

            $url .= http_build_query($get_data);
            $ret = json_decode($this->api->exchange_data($url, $post_data), true);

            if (isset($ret['status']) && $ret['status'] == 'saved') {
                $saved = true;
            } else {
                $error = $this->processErrors($ret);
            }
        }

        if (isset($request->getQueryParams()['phpgw_return_as']) && 
            $request->getQueryParams()['phpgw_return_as'] == 'json') {
            return $this->handleFormResponse($request, $response, $saved, $error, $ret['id'] ?? null);
        }

        return $this->displayForm($request, $response);
    }

    public function displayForm(Request $request, Response $response): Response
    {
        $saved = false;
        $error = [];
        $id = null;
        
        // Check for session data
        if (!$saved) {
            $saved = ApiClient::session_get('inspection_1', 'saved');
            ApiClient::session_clear('inspection_1', 'saved');
        }

        if (empty($error)) {
            $error = (array)ApiClient::session_get('inspection_1', 'error');
            ApiClient::session_clear('inspection_1', 'error');
        }
        
        if (!$id) {
            $id = ApiClient::session_get('inspection_1', 'id');
            ApiClient::session_clear('inspection_1', 'id');
        }

        $get_data = [];
        $this->smarty->assign("action_url", self::get_route_url('inspection_1', $get_data), true);
        $this->smarty->assign("saved", $saved, true);
        $this->smarty->assign("error", $error, true);
        $this->smarty->assign("id", $id, true);

        $enable_fileupload = $this->smarty->getConfigVars('enable_fileupload');
        $this->smarty->assign("enable_fileupload", $enable_fileupload, true);

        // Generate and set CSRF token
        $rand = rand();
        $_SESSION['rand'] = $rand;
        $this->smarty->assign("rand", $rand, true);

        try {
            $html = $this->smarty->fetch('inspection_1.tpl');
            $response->getBody()->write($html);
            return $response;
        } catch (\Exception $e) {
            // Fall back to rendering minimal content
            $response->getBody()->write('<h1>Error loading template: ' . $e->getMessage() . '</h1>');
            return $response;
        }
    }

    public function handleMultiUploadFile(Request $request, Response $response): Response
    {
        $id = (int)($request->getQueryParams()['id'] ?? 0);
        $session_info = $this->api->get_session_info();

        $url = $this->api->get_backend_url() . "/index.php?" . http_build_query([
            'menuaction' => 'property.uientity.handle_multi_upload_file',
            $session_info['session_name'] => $session_info['session_id'],
            'domain' => $this->api->get_logindomain(),
            'phpgw_return_as' => 'json',
            'api_mode' => true,
            'entity_id' => 2,
            'cat_id' => 19,
            'type' => 'entity',
            'id' => $id
        ]);

        $content_range = $request->getServerParams()['HTTP_CONTENT_RANGE'] ?? null;
        $content_disposition = $request->getServerParams()['HTTP_CONTENT_DISPOSITION'] ?? null;

        $return_data = $this->api->exchange_data($url, [], $content_range, $content_disposition);

        $response = $response->withHeader('Content-Type', 'application/json');
        $response->getBody()->write($return_data);
        return $response;
    }

    private function processErrors(array $ret): array
    {
        if (!empty($ret['receipt']['error'])) {
            return array_map(fn($error) => $error['msg'], $ret['receipt']['error']);
        }
        return ['Noe gikk galt med innsendingen'];
    }

    private function handleFormResponse(Request $request, Response $response, bool $saved, array $error, ?int $id): Response
    {
        ApiClient::session_set('inspection_1', 'id', $id);
        ApiClient::session_set('inspection_1', 'error', $error);
        ApiClient::session_set('inspection_1', 'saved', $saved);

        $response = $response->withHeader('Content-Type', 'application/json');
        $response->getBody()->write(json_encode([
            'id' => $id,
            'status' => $saved ? 'saved' : 'error',
            'message' => $error
        ]));
        return $response;
    }
}