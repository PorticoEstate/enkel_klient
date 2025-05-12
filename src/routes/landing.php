<?php
// routes/landing.php
use App\Controller\LandingController;

$app->get('/', LandingController::class . ':displayInfo');
