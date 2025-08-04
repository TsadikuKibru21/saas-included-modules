#!/bin/bash


# Ensure the script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root using: sudo $0"
    exit 1
fi

NAME=$1
IP_ADDR=$2
PORT=$3
CONF_FILE="/etc/nginx/conf.d/subdomains.conf"
DOMAIN="zooryatest.et"


if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <subdomain> <ip> <port>"
    exit 1
fi

SUBDOMAIN="$1"."$DOMAIN"
TARGET="$2:$3"

# Check if the subdomain already exists
if grep -qE "^\s*$SUBDOMAIN\s+" "$CONF_FILE"; then
    echo "Error: Subdomain $SUBDOMAIN already exists in $CONF_FILE"
    exit 1
fi

# Append the new record before the closing `}`
sudo sed -i "/^}/i \    $SUBDOMAIN   $TARGET;" "$CONF_FILE"

# Reload Nginx
# sudo systemctl reload nginx
nginx -s reload

echo "Added $SUBDOMAIN -> $TARGET and reloaded Nginx."
