#!/bin/bash
touch /var/log/apache2/access.log
touch /var/log/apache2/error.log
touch /var/log/apache2/other_vhosts_access.log
chown -R www-data:www-data /var/log/apache2

/usr/local/bin/docker-php-entrypoint
cd /var/www/html
composer require firebase/php-jwt
composer require vlucas/phpdotenv
composer install
/usr/local/bin/apache2-foreground
