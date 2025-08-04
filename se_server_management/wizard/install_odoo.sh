#!/bin/bash

# Update and upgrade system
sudo apt update && sudo apt upgrade -y

# Install necessary packages
sudo apt install python3-pip build-essential wget python3-dev python3-venv python3-wheel libxslt-dev libzip-dev libldap2-dev libsasl2-dev python3-setuptools node-less libjpeg-dev libpq-dev git gdebi-core libxml2-dev -y

# Install PostgreSQL
sudo apt install postgresql postgresql-server-dev-all -y

# Create PostgreSQL user
sudo su - postgres -c "createuser -s odoo14"

# Install wkhtmltopdf (for Odoo reports)
sudo apt install xfonts-75dpi -y
wget https://github.com/wkhtmltopdf/packaging/releases/download/0.12.5-1/wkhtmltox_0.12.5-1.focal_amd64.deb
sudo gdebi --n wkhtmltox_0.12.5-1.focal_amd64.deb

# Create Odoo system user
sudo useradd -m -d /opt/odoo14 -U -r -s /bin/bash odoo14

# Clone Odoo source code
sudo git clone https://www.github.com/odoo/odoo --depth 1 --branch 14.0 --single-branch /opt/odoo/odoo

# Create and activate virtual environment
cd /opt/odoo
python3 -m venv odoo-venv
source odoo-venv/bin/activate

# Install Python dependencies
pip3 install wheel
pip3 install -r odoo/requirements.txt

# Deactivate the virtual environment
deactivate

# Create log directory
mkdir /opt/odoo14/odoo-custom-addons
sudo mkdir /var/log/odoo
sudo chown odoo: /var/log/odoo

# Create Odoo configuration file
sudo cp /opt/odoo/odoo/debian/odoo.conf /etc/odoo.conf
sudo chown odoo: /etc/odoo.conf
sudo chmod 640 /etc/odoo.conf

# Edit the configuration file (optional)

# Create Odoo service
echo -e "[Unit]
Description=Odoo
Documentation=http://www.odoo.com
[Service]
# Ubuntu/Debian convention:
Type=simple
User=odoo
Group=odoo
ExecStart=/opt/odoo/odoo-venv/bin/python3 /opt/odoo/odoo/odoo-bin -c /etc/odoo.conf
[Install]
WantedBy=default.target" | sudo tee /etc/systemd/system/odoo.service

# Enable and start Odoo service
sudo systemctl daemon-reload
sudo systemctl enable odoo
sudo systemctl start odoo

# Check if Odoo is running
sudo systemctl status odoo
