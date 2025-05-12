<?php
// routes/helpdesk.php
use App\Controller\HelpdeskController;

$app->get('/helpdesk', HelpdeskController::class . ':displayForm');
$app->post('/helpdesk', HelpdeskController::class . ':saveForm');
$app->get('/helpdesk/locations', HelpdeskController::class . ':getLocations');
$app->post('/helpdesk/upload', HelpdeskController::class . ':handleMultiUploadFile');
