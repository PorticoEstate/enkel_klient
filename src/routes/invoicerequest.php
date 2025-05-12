<?php
// routes/invoicerequest.php
use App\Controller\InvoicerequestController;

$app->get('/invoicerequest', InvoicerequestController::class . ':displayForm');
$app->post('/invoicerequest', InvoicerequestController::class . ':saveForm');
$app->get('/invoicerequest/locations', InvoicerequestController::class . ':getLocations');
$app->post('/invoicerequest/upload', InvoicerequestController::class . ':handleMultiUploadFile');
