<?php
// routes/nokkelbestilling.php
use App\Controller\NokkelbestillingController;

$app->get('/nokkelbestilling', NokkelbestillingController::class . ':displayForm');
$app->post('/nokkelbestilling', NokkelbestillingController::class . ':saveForm');
$app->get('/nokkelbestilling/locations', NokkelbestillingController::class . ':getLocations');
$app->post('/nokkelbestilling/upload', NokkelbestillingController::class . ':handleMultiUploadFile');
