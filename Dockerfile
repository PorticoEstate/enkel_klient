FROM php:8.4-apache


ARG http_proxy
ARG https_proxy

ENV http_proxy=${http_proxy}
ENV https_proxy=${https_proxy}

RUN apt-get update -y
RUN apt-get install -y libpq-dev cron curl git unzip openssl

#RUN touch $PHP_INI_DIR/conf.d/91-app.ini
# PHP configuration

RUN if [ "${INSTALL_XDEBUG}" = "true" ]; then \
    pecl install xdebug && docker-php-ext-enable xdebug; \
    echo 'xdebug.mode=debug,develop' >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo 'xdebug.discover_client_host=1' >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo 'xdebug.client_host=host.docker.internal' >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo 'xdebug.start_with_request=yes' >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini \
    && echo 'xdebug.idekey=netbeans-xdebug' >> /usr/local/etc/php/conf.d/docker-php-ext-xdebug.ini; \
   fi

RUN apt-get clean \
	&& rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

#RUN echo "xdebug.mode = debug,develop" >> $PHP_INI_DIR/conf.d/91-app.ini
#RUN echo "xdebug.start_with_request=yes" >> $PHP_INI_DIR/conf.d/91-app.ini
#RUN echo "xdebug.idekey=netbeans-xdebug" >> $PHP_INI_DIR/conf.d/91-app.ini
#RUN echo "xdebug.remote_connect_back=On" >> $PHP_INI_DIR/conf.d/91-app.ini
#RUN echo "xdebug.discover_client_host = 1" >> $PHP_INI_DIR/conf.d/91-app.ini
#RUN echo "xdebug.client_host=''" >> $PHP_INI_DIR/conf.d/91-app.ini
#RUN echo "xdebug.client_port=9005" >> $PHP_INI_DIR/conf.d/91-app.ini
#RUN echo "session.cookie_secure=Off" >> $PHP_INI_DIR/conf.d/91-app.ini
#RUN echo "session.use_cookies=On" >> $PHP_INI_DIR/conf.d/91-app.ini
#RUN echo "session.use_only_cookies=On" >> $PHP_INI_DIR/conf.d/91-app.ini
#RUN echo "short_open_tag=Off" >> $PHP_INI_DIR/conf.d/91-app.ini
#RUN echo "request_order = 'GPCS'" >> $PHP_INI_DIR/conf.d/91-app.ini
#RUN echo "variables_order = 'GPCS'" >> $PHP_INI_DIR/conf.d/91-app.ini


COPY startup.sh /usr/local/bin/
RUN chmod +x  /usr/local/bin/startup.sh

RUN cd ~
RUN curl -sS https://getcomposer.org/installer -o composer-setup.php
RUN php composer-setup.php --install-dir=/usr/local/bin --filename=composer
EXPOSE 8210

ENTRYPOINT /usr/local/bin/startup.sh

