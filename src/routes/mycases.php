<?php
// routes/mycases.php
use App\Controller\MyCasesController;

$app->get('/my_cases', MyCasesController::class . ':displayCases')->setName('my_cases');
$app->get('/view_case/{id}', MyCasesController::class . ':viewCase')->setName('view_case');
$app->post('/my_cases/respond/{id}', MyCasesController::class . ':respondToCase');
