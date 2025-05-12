<?php
// routes/inspection1.php
use App\Controller\Inspection1Controller;

$app->get('/inspection_1', Inspection1Controller::class . ':displayForm');
$app->post('/inspection_1', Inspection1Controller::class . ':saveForm');
$app->get('/inspection_1/attributes', Inspection1Controller::class . ':getAttributes');
$app->get('/inspection_1/locations', Inspection1Controller::class . ':getLocations');
$app->post('/inspection_1/upload', Inspection1Controller::class . ':handleMultiUploadFile');
