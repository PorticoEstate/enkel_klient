FROM php:8.4-apache


ARG http_proxy
ARG https_proxy
ARG INSTALL_XDEBUG=true

RUN apt-get update -y
RUN apt-get install -y libpq-dev cron curl git unzip openssl

#RUN touch $PHP_INI_DIR/conf.d/91-app.ini
# PHP configuration

# Download and install the install-php-extensions script
# https://github.com/mlocati/docker-php-extension-installer
RUN curl -sSL https://github.com/mlocati/docker-php-extension-installer/releases/latest/download/install-php-extensions -o /usr/local/bin/install-php-extensions \
    && chmod +x /usr/local/bin/install-php-extensions

ENV http_proxy=${http_proxy}
ENV https_proxy=${https_proxy}

# Configure PEAR
RUN if [ -n "${http_proxy}" ]; then pear config-set http_proxy ${http_proxy}; fi && \
    pear config-set php_ini $PHP_INI_DIR/php.ini

RUN if [ "${INSTALL_XDEBUG}" = "true" ]; then \
    pecl install xdebug && docker-php-ext-enable xdebug; \
    echo 'zend_extension=xdebug' >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo 'xdebug.mode=debug,develop' >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo 'xdebug.discover_client_host=1' >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo 'xdebug.client_host=host.docker.internal' >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo 'xdebug.start_with_request=yes' >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo 'xdebug.idekey=netbeans-xdebug' >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini; \
   fi

# Add to your Dockerfile
RUN echo "upload_max_filesize = 20M" > /usr/local/etc/php/conf.d/uploads.ini && \
    echo "post_max_size = 25M" >> /usr/local/etc/php/conf.d/uploads.ini && \
    echo "memory_limit = 128M" >> /usr/local/etc/php/conf.d/uploads.ini
    
RUN apt-get clean \
	&& rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Enable Apache modules
RUN a2enmod proxy_fcgi setenvif
RUN a2enmod rewrite
RUN a2enmod headers
RUN a2enmod ssl
RUN a2enmod proxy
RUN a2enmod proxy_http

# write to the apache configuration file

RUN echo "ProxyPass /boligreg http://web" >> /etc/apache2/apache2.conf && \
    echo "ProxyPassReverse /boligreg http://web" >> /etc/apache2/apache2.conf


# Configure Apache to write logs to files instead of stdout/stderr
# RUN rm -f /var/log/apache2/access.log && \
#     rm -f /var/log/apache2/error.log && \
#     rm -f /var/log/apache2/other_vhosts_access.log && \
#     touch /var/log/apache2/access.log && \
#     touch /var/log/apache2/error.log && \
#     touch /var/log/apache2/other_vhosts_access.log && \
#     chown -R www-data:www-data /var/log/apache2

# # Make sure apache can write to the log directory
# RUN mkdir -p /var/log/apache2 && \
#     chmod -R 755 /var/log/apache2 && \
#     chown -R www-data:www-data /var/log/apache2

COPY startup.sh /usr/local/bin/
RUN chmod +x  /usr/local/bin/startup.sh

RUN cd ~
RUN curl -sS https://getcomposer.org/installer -o composer-setup.php
RUN php composer-setup.php --install-dir=/usr/local/bin --filename=composer
EXPOSE 8210

ENTRYPOINT /usr/local/bin/startup.sh

