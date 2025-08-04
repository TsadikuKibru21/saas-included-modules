# -*- coding: utf-8 -*-

import logging
import os
import socket
import subprocess
import sys
from datetime import datetime
import tempfile
import base64
from odoo import models, fields, api, _
from odoo.exceptions import UserError
from odoo.modules.module import get_module_resource
from odoo.tools import config
import paramiko
import time

_logger = logging.getLogger(__name__)


class SshAuth(models.TransientModel):
    _name = "install.odoo"
    _description = "Wizard para configurar certificado ssh en los servers"
    _inherit = "server.util"

    # strategy = fields.Selection(
    #     selection=[("generate", _("Generate")), ("upload", _("Upload"))],
    #     default="generate",
    # )
    version = fields.Float(string="Version",required=True)
    user = fields.Char(string="User",required=True)
    installed_path = fields.Char(string="Path",required=True)
    service_name = fields.Char(string="Service Name",required=True)
    server = fields.Many2one("server.server")
    port = fields.Integer(string="Port",required=True)
    is_enterprise=fields.Boolean(string="Is Enterprise")


    # def install(self):
    #     context = {
    #         "host": self.server.main_hostname,
    #         "user_name": self.user_name,
    #         "password": self.password,
    #         "port": self.server.ssh_port,
    #     }
    #     pass
    # def action_install_odoo(self):
    #     # Call the installation method with the provided service name and port
    #     # self.service_name = self.self.service_name
    #     # port = self.port
    #     # user=self.user


    #     # Generate and execute the installation script with dynamic values
    #     self._generate_and_run_script()
    

    def install(self):
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            path = self.env["ir.config_parameter"].get_param(
                "se_server_management.ssh_key_store_path", False
            )
            context = {}
            for server in self.server:
                if server.main_hostname and server.ssh_port:
                    try:
                        server.ip_address = socket.gethostbyname(server.main_hostname)
                        context = {
                            "host": server.main_hostname,
                            "name": server.name,
                            "port": server.ssh_port,
                            "init": server.ssh_init,
                            "module_path": get_module_resource("se_server_management"),
                            "odoo_host": server.ip_address,
                            "odoo_db": self.server.env.registry.db_name,
                            "db_user": config.options["db_user"],
                            "db_pass": config.options["db_password"],
                            "user": server.user_name,
                            "sshkey": server.ssh_private_key,
                            "passkey": server.ssh_password,
                        }
                        general_inf = server.get_general_info(server.is_remote, context)
                        if path:
                            privatekeyfile = os.path.expanduser(os.path.join(path, context["name"]))
                            mykey = paramiko.RSAKey.from_private_key_file(privatekeyfile)
                        else:
                            kf = StringIO()
                            kf.write(context["sshkey"])
                            kf.seek(0)
                            mykey = paramiko.RSAKey.from_private_key(
                                kf, password=context["passkey"]
                            )
                    except Exception as e:
                        raise UserError(f"Failed to get general info: {str(e)}")

            ssh.connect(server.ip_address, username=server.user_name, port=server.ssh_port, pkey=mykey)

            # Step 2: Generate the shell script
            shell_script_content = f"""#!/bin/bash
            sudo apt update && sudo apt upgrade -y
            sudo apt install python3-pip build-essential wget python3-dev python3-venv python3-wheel libxslt-dev libzip-dev libldap2-dev libsasl2-dev python3-setuptools node-less libjpeg-dev libpq-dev git gdebi-core libxml2-dev -y
            sudo apt install postgresql postgresql-server-dev-all -y
            sudo su - postgres -c "createuser -s {self.user}"
            sudo apt install xfonts-75dpi -y
            wget https://github.com/wkhtmltopdf/packaging/releases/download/0.12.5-1/wkhtmltox_0.12.5-1.focal_amd64.deb
            sudo gdebi --n wkhtmltox_0.12.5-1.focal_amd64.deb
            sudo useradd -m -d {self.installed_path} -U -r -s /bin/bash {self.user}
            sudo git clone https://www.github.com/odoo/odoo --depth 1 --branch {self.version} --single-branch /{self.installed_path}/{self.service_name}/odoo
            cd /{self.installed_path}/{self.service_name}
            python3 -m venv odoo-venv
            source odoo-venv/bin/activate
            pip3 install wheel
            pip3 install -r odoo/requirements.txt
            deactivate
            mkdir {self.installed_path}/odoo-custom-addons
            sudo mkdir /var/log/{self.service_name}
            sudo chown {self.service_name}: /var/log/{self.service_name}
            echo '[options]' > /etc/{self.service_name}.conf
            echo 'admin_passwd = my_admin_passwd
            echo 'addons_path = /{self.installed_path}/{self.service_name}/odoo/addons' >> /etc/{self.service_name}.conf
            echo 'admin_passwd = admin' >> /etc/{self.service_name}.conf
            echo 'db_host = False' >> /etc/{self.service_name}.conf
            echo 'db_port = False' >> /etc/{self.service_name}.conf
            echo 'db_user = {self.service_name}' >> /etc/{self.service_name}.conf
            echo 'db_password = False' >> /etc/{self.service_name}.conf
            echo 'logfile = /var/log/{self.service_name}/{self.service_name}.log' >> /etc/{self.service_name}.conf
            echo 'http_port = {self.port}' >> /etc/{self.service_name}.conf
            echo '[Unit]
            Description=Odoo
            Documentation=http://www.odoo.com
            [Service]
            Type=simple
            User={self.service_name}
            Group={self.service_name}
            ExecStart=/{self.installed_path}/{self.service_name}/odoo-venv/bin/python3 /{self.installed_path}/{self.service_name}/odoo/odoo-bin -c /etc/{self.service_name}.conf
            [Install]
            WantedBy=default.target' | sudo tee /etc/systemd/system/{self.service_name}.service
            sudo systemctl daemon-reload
            sudo systemctl enable {self.service_name}
            sudo systemctl start {self.service_name}
            sudo systemctl status {self.service_name}
            """

            # Step 3: Write the script to a temporary file on the remote server
            sftp = ssh.open_sftp()
            remote_script_path = '/tmp/install_odoo.sh'
            with sftp.open(remote_script_path, 'w') as remote_script_file:
                remote_script_file.write(shell_script_content)
            sftp.close()

            # Step 4: Make the script executable
            ssh.exec_command(f'chmod +x {remote_script_path}')

            # Step 5: Execute the shell script on the remote server
            stdin, stdout, stderr = ssh.exec_command(f'bash {remote_script_path}')
            stdout.channel.recv_exit_status()  # Wait for command to finish
            output = stdout.read().decode()
            error = stderr.read().decode()

            if error:
                raise UserError(f"Error during installation: {error}")
            else:
                print("Odoo installation successful!")
               # print(output)

            # Close the SSH connection
            ssh.close()

        except Exception as e:
            raise UserError(f"Failed to upload file: {str(e)}")
