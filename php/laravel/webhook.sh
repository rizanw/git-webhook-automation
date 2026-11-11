#!/bin/sh

# stop on the first failing command
set -e

# activate maintenance mode, and always bring the app back up when the script exits,
# even if a step below fails
php artisan down
trap 'php artisan up' EXIT

# update source code
git pull

# update PHP dependencies
#export COMPOSER_HOME='/tmp/composer'
#composer install --no-interaction --no-dev --prefer-dist
	# --no-interaction	Do not ask any interactive question
	# --no-dev		Disables installation of require-dev packages.
	# --prefer-dist		Forces installation from package dist even for dev versions.

# clear cache
php artisan cache:clear

# clear config cache
php artisan config:clear

# cache config
php artisan config:cache

# restart queues
php artisan -v queue:restart

# update database
#php artisan migrate --force
	# --force		Required to run when in production.
