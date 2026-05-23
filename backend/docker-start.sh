#!/bin/sh
set -e

php artisan migrate --force
php artisan storage:link --force 2>/dev/null || true
php artisan config:cache
php artisan route:cache

exec supervisord -c /etc/supervisord.conf
