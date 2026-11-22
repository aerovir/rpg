#!/bin/sh
set -eu

source_dir=/etc/letsencrypt-nizhniy-kontur/live/nizhniy-kontur-ip
target_dir=/etc/letsencrypt/nizhniy-kontur-ip-current

install -D -m 644 "$source_dir/fullchain.pem" "$target_dir/fullchain.pem"
install -D -m 600 "$source_dir/privkey.pem" "$target_dir/privkey.pem"

docker exec ticketsellbot-nginx-1 nginx -t
docker exec ticketsellbot-nginx-1 nginx -s reload
