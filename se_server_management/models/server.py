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


class ServerServer(models.Model):
    _name = "server.server"
    _description = "server"
    _order = "sequence"
    _inherit = "server.util"

    _states_ = [
        ("draft", "Draft"),
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("cancel", "Cancel"),
    ]

    sequence = fields.Integer("Sequence", default=10)
    name = fields.Char(string="Name", required=True)
    ip_address = fields.Char(string="IP Address", readonly=True)
    odoo_service_name=fields.Char(string="Service")
    file_moved_path=fields.Char(string="File Moved Path")
    file_upload = fields.Binary(string="File to Upload")
    file_name = fields.Char(string="File Name")
    ssh_port = fields.Integer(
        string="SSH Port",
        required=True,
        help="Port used for ssh connection to the server",
        default=22,
        readonly=True,
        states={"draft": [("readonly", False)]},
    )
    ssh_init = fields.Boolean(string="Init ssh", default=False)
    http_port = fields.Integer(
        string="HTTP Port",
        required=True,
        default=80,
        help="Port used to access odoo via web browser",
        readonly=True,
        states={"draft": [("readonly", False)]},
    )
    https_port = fields.Integer(
        string="HTTPS Port",
        required=True,
        default=443,
        help="Port used to access odoo via web browser over ssl",
        readonly=True,
        states={"draft": [("readonly", False)]},
    )
    main_hostname = fields.Char(string="Main Hostname", required=True)
    user_name = fields.Char(string="User Name", required=True, default="root")
    number_of_processors = fields.Integer(
        string="Number of Processors",
        readonly=True,
        help="This is used to suggest instance workers qty, you can get this "
             "information with: grep processor /proc/cpuinfo | wc -l",
    )
    key_filename = fields.Text(
        readonly=True,
        states={"draft": [("readonly", False)]},
        # required=True,
        help="This file must be owned by adhoc-server and with 400 perm.\n"
             "To do that, run:\n"
             "* sudo chown syslog.netdev [file path]\n"
             "* sudo chmod 400  [file path]\n",
    )
    server_use_type = fields.Selection(
        [("customer", "Customer"), ("own", "Own"), ("backup", "Backup")],
        "Server Type",
        default="customer",
        required=True,
    )
    holder_id = fields.Many2one(
        "res.partner",
        string="Holder",
        readonly=True,
        states={"draft": [("readonly", False)]},
        help="Partner that you should contact related to server service.",
    )

    note = fields.Html(string="Note")

    color = fields.Integer(string="Color Index", compute="get_color")
    state = fields.Selection(_states_, string="State", default="draft")
    command_ids = fields.One2many(
        comodel_name="server.command", string="Commands", inverse_name="server_id"
    )
    odoo_version_info = fields.One2many(
        comodel_name="server.info", string="odoo version", inverse_name="server_id",readonly=True
    )

    is_remote = fields.Boolean(string="Remote", default=True)
    # The Python function socket.gethostname() returns the host name of the current system under which the Python interpreter is executed.
    host_name = fields.Char(default=socket.gethostname())
    ssh_private_key = fields.Text()
    ssh_password = fields.Char()
    ssh_public_key = fields.Text()

    host_offline = fields.Boolean()

    ram_capacity = fields.Float()
    ram_available = fields.Float()
    ram_consumption = fields.Float()

    ram_capacity_gib = fields.Float()
    ram_available_gib = fields.Float()
    ram_consumption_gib = fields.Float()
    ram_consumption_percent = fields.Float()

    disk_capacity = fields.Float(
        "Disk Total",
    )
    disk_available = fields.Float()
    disk_consumption = fields.Float()
    disk_percentage = fields.Float()

    cpu_load_1 = fields.Float()
    cpu_load_5 = fields.Float()
    cpu_load_15 = fields.Float()
    cpu_load_percent = fields.Float()
    cpu_number = fields.Integer()

    log = fields.Html(string='Log')


    
    
        
    def fetch_server_info(self):
        for server in self:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            path = self.env["ir.config_parameter"].get_param("se_server_management.ssh_key_store_path", False)

            try:
                server.ip_address = socket.gethostbyname(server.main_hostname)

                # Load the private key for SSH connection
                if path:
                    privatekeyfile = os.path.expanduser(os.path.join(path, server.name))
                    mykey = paramiko.RSAKey.from_private_key_file(privatekeyfile)
                else:
                    kf = StringIO()
                    kf.write(server.ssh_private_key)
                    kf.seek(0)
                    mykey = paramiko.RSAKey.from_private_key(kf, password=server.ssh_password)

                _logger.info("Connecting to %s on port %d", server.ip_address, server.ssh_port)
                ssh.connect(server.ip_address, username=server.user_name, port=server.ssh_port, pkey=mykey)

                # Find all Odoo config files
                command = "find /etc/ -name 'odoo*.conf' 2>/dev/null"
                stdin, stdout, stderr = ssh.exec_command(command)
                conf_file_paths = stdout.read().decode().strip().splitlines()

                command1 = "find / -name 'odoo-bin' 2>/dev/null"
                stdin, stdout, stderr = ssh.exec_command(command1)
                installed_paths = stdout.read().decode().strip().splitlines()

                if not conf_file_paths:
                    _logger.error("No odoo.conf files found in /etc/")
                    continue

                _logger.info("Found odoo.conf files: %s", conf_file_paths)

                # Get service information
                service_command = "sudo systemctl list-units --type=service | grep odoo"
                stdin, stdout, stderr = ssh.exec_command(service_command)
                services = stdout.read().decode().strip().splitlines()

                _logger.info("Found Odoo services: %s", services)
                for i in self.odoo_version_info:
                    i.unlink()

                # Loop through each found odoo.conf file and list databases
                for conf_file in conf_file_paths:
                    _logger.info("Processing odoo.conf file: %s", conf_file)

                    # Get PostgreSQL owner (db_user) from the config file
                    db_user_command = f"grep -Po '(?<=db_user = ).*' {conf_file}"
                    stdin, stdout, stderr = ssh.exec_command(db_user_command)
                    db_user = stdout.read().decode().strip()

                    if not db_user:
                        _logger.error("No db_user found in odoo.conf file: %s", conf_file)
                        continue

                    _logger.info("PostgreSQL user (odoo user): %s", db_user)

                    # Use sudo to switch to the postgres user and query the databases
                    # db_query = f"sudo su postgres -c \"psql -c '\\l'\" | grep {db_user}"
                    db_query = f"cd /tmp && sudo -u postgres psql -c \"\\l\" | grep {db_user}"
                    stdin, stdout, stderr = ssh.exec_command(db_query)

                    dbs = stdout.read().decode().strip().splitlines()
                    errors = stderr.read().decode().strip()

                    # if errors:
                    #     _logger.error("Error querying PostgreSQL databases: %s", errors)
                    #     continue  # Skip to the next config file

                    # Get master password from the config file
                    master_passwd_command = f"grep -Po '(?<=admin_passwd = ).*' {conf_file}"
                    stdin, stdout, stderr = ssh.exec_command(master_passwd_command)
                    master_passwd = stdout.read().decode().strip()

                    # List databases found
                    db_names = ', '.join([db.split('|')[0].strip() for db in dbs]) if dbs else ''

                    _logger.info("Databases found for %s: %s", conf_file, db_names)

                    # Match service with db_user from odoo.conf
                    matched_service = None
                    for service in services:
                        service_name = service.split()[0].replace('.service', '')  # Extract the service name
                        if db_user in service:
                            matched_service = service_name
                            break

                    if matched_service:
                        _logger.info("Matched service: %s with odoo_user: %s", matched_service, db_user)

                        # Find an installed path related to the matched service (if applicable)
                        installed_path = None
                        for path in installed_paths:
                            if matched_service in path:  # Adjust this condition as needed
                                installed_path = path
                                break

                        if not installed_path:
                            installed_path = installed_paths[0] if installed_paths else None  # Fallback to first if no match

                        # Create records in the odoo_version_info model for this server and config
                        self.odoo_version_info.create({
                            'name': f"Odoo Databases for {conf_file}",
                            'installed_path': installed_path,  # Use the matched or fallback installed path
                            'master_passwd': master_passwd,  # You can pass the actual master password here
                            'its_db': db_names,
                            'conf_path': conf_file,
                            'service_name': matched_service,
                            'server_id': server.id,
                        })
                    else:
                        _logger.error("No matching service found for odoo user: %s", db_user)

            except paramiko.AuthenticationException:
                _logger.error("Authentication failed for server %s", server.main_hostname)
                raise UserError("Authentication failed. Please check your credentials.")
            except paramiko.SSHException as e:
                _logger.error("SSH error for server %s: %s", server.main_hostname, str(e))
                raise UserError(f"SSH error: {str(e)}")
            except Exception as e:
                _logger.error("An error occurred while fetching server info: %s", str(e))
                raise UserError(f"An error occurred: {str(e)}")
            finally:
                ssh.close()













    def upload_file(self):
        if not self.file_name:
            raise UserError("Please provide a file name.")

    # Create a temporary file path
       
        temp_file_path = os.path.join(tempfile.gettempdir(), self.file_name)
       
        
        # local_path = "/path/to/temp/file"  # Modify as needed to save the uploaded file temporarily
        with open(temp_file_path, 'wb') as f:
            f.write(base64.b64decode(self.file_upload))
        remote_path = f"{self.file_moved_path}/{self.file_name}"

    
        self.upload_files(temp_file_path, remote_path)
    def upload_files(self, local_path, remote_path):
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            path = self.env["ir.config_parameter"].get_param(
                "se_server_management.ssh_key_store_path", False
            )
            context={}
            for server in self:
                if server.main_hostname and server.ssh_port:
                    try:
                        server.ip_address = socket.gethostbyname(server.main_hostname)
                        context = {
                            "host": server.main_hostname,
                            "name": server.name,
                            "port": server.ssh_port,
                            "init": server.ssh_init,
                            "module_path": get_module_resource("se_server_management"),
                            # 'odoo_host': socket.gethostbyname(server.main_hostname),
                            "odoo_host": server.ip_address,
                            "odoo_db": self.env.registry.db_name,
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

            ssh.connect(self.ip_address, username=self.user_name,port=self.ssh_port,pkey=mykey)

            sftp = ssh.open_sftp()
            sftp.put(local_path, remote_path)
            sftp.close()
            ssh.close()
        except Exception as e:
            raise UserError(f"Failed to upload file: {str(e)}")

    def actualizar_log(self, message):
        """Agrega un mensaje al registro (log) y lo limpia si supera 1000 caracteres."""
        now = datetime.now()
        new_log = "</br> \n#" + str(now.strftime("%m/%d/%Y, %H:%M:%S")) + " " + str(message) + " " + str(self.log)
        if len(new_log) > 10000:
            # Si el registro supera los 1000 caracteres, límpialo
            new_log = "</br>" + str(now.strftime("%m/%d/%Y, %H:%M:%S")) + " " + str(message)
        self.log = new_log

    @api.model
    def compute_system_resources_cron(self):
        for server in self.env["server.server"].search([]):
            server._compute_system_resources()

    def _compute_system_resources(self):
        for server in self:
            if server.main_hostname and server.ssh_port:
                try:
                    server.ip_address = socket.gethostbyname(server.main_hostname)
                    context = {
                        "host": server.main_hostname,
                        "name": server.name,
                        "port": server.ssh_port,
                        "init": server.ssh_init,
                        "module_path": get_module_resource("se_server_management"),
                        # 'odoo_host': socket.gethostbyname(server.main_hostname),
                        "odoo_host": server.ip_address,
                        "odoo_db": self.env.registry.db_name,
                        "db_user": config.options["db_user"],
                        "db_pass": config.options["db_password"],
                        "user": server.user_name,
                        "sshkey": server.ssh_private_key,
                        "passkey": server.ssh_password,
                    }
                    general_inf = server.get_general_info(server.is_remote, context)
                    if general_inf:
                        ram_capacity = float(general_inf["memory_total"][0])
                        ram_available = float(general_inf["memory_total_free"][0])
                        ram_consumption = ram_capacity - ram_available
                        cpu_count = float(
                            general_inf["cpu_no"][0].split(": ")[1].split("\n")[0]
                        )
                        storage_info = [
                            x
                            for x in filter(
                                lambda x: x != "",
                                general_inf["storage_info"][-1].strip().split(" "),
                            )
                        ]
                        disk_capacity = float(storage_info[0].split("G")[0])
                        disk_consumption = float(storage_info[1].split("G")[0])
                        disk_available = float(storage_info[2].split("G")[0])
                        cpu_load = general_inf["cpu_load"][0].split(" ")

                        # Average of cpu load_averages divided by number of CPUs (?)

                        server.write(
                            {
                                "ram_capacity": ram_capacity,
                                "ram_capacity_gib": ram_capacity / 1024 / 1024,
                                "ram_available": ram_available,
                                "ram_available_gib": ram_available / 1024 / 1024,
                                "ram_consumption": ram_consumption,
                                "ram_consumption_gib": ram_consumption / 1024 / 1024,
                                "ram_consumption_percent": ram_consumption
                                                           * 100
                                                           / ram_capacity
                                if ram_capacity
                                else 0.0,
                                "cpu_number": int(cpu_count),
                                "disk_capacity": disk_capacity,
                                "disk_consumption": disk_consumption
                                if disk_consumption
                                else 0.0,
                                "disk_available": disk_available
                                if disk_available
                                else 0.0,
                                "cpu_load_1": float(cpu_load[0]),
                                "cpu_load_5": float(cpu_load[1]),
                                "cpu_load_15": float(cpu_load[2]),
                                "cpu_load_percent": (float(cpu_load[0]) / cpu_count)
                                                    * 100,
                                "disk_percentage": disk_consumption
                                                   * 100
                                                   / disk_capacity
                                if disk_capacity
                                else 0.0,
                                "host_offline": False,
                            }
                        )
                    else:
                        server.write(
                            {
                                "ram_capacity": 0,
                                "ram_capacity_gib": 0,
                                "ram_available": 0,
                                "ram_available_gib": 0,
                                "ram_consumption": 0,
                                "ram_consumption_gib": 0,
                                "ram_consumption_percent": 0,
                                "cpu_number": 0,
                                "disk_capacity": 0,
                                "disk_consumption": 0,
                                "disk_available": 0,
                                "cpu_load_1": 0,
                                "cpu_load_5": 0,
                                "cpu_load_15": 0,
                                "cpu_load_percent": 0,
                                "disk_percentage": 0,
                                "host_offline": True,
                            }
                        )

                except Exception as e:
                    # Manejar cualquier excepción y continuar con el siguiente servidor
                    _logger.error("Error en _compute_system_resources: %s", str(e))
                    continue

    _sql_constraints = [("name_uniq", "unique(name)", "Server Name must be unique!")]

    def action_dummy(self):
        self._compute_system_resources()
        return True

    @api.depends("state")
    def get_color(self):
        color = 4
        for record in self:
            if record.state == "draft":
                color = 7
            elif record.state == "cancel":
                color = 1
            elif record.state == "inactive":
                color = 3
            record.color = color

    def get_data_and_activate(self):
        """Check server data"""
        self._compute_system_resources()
        if self.host_offline:
            raise UserError(
                "Couldn't reach the server, please check the settings and try again."
            )
        self.write({"state": "active"})
    
    

    def action_test_connection(self):
        result = self.custom_sudo("ls")
        if result:
            self.state = "active"
            message = _("Connection successful!")
        else:
            message = _("Could not connect to host. Please check credentials")
        return {
            "warning": {
                "title": _("Connection Test"),
                "type": "notification",
                "message": message,
            },
        }

    def reboot_server(self):
        self.custom_sudo("sudo reboot")
    def get_data_and_restart(self):
        if not self.odoo_service_name:
            raise UserError(_("Please set the Service"))
        self.custom_sudo("sudo systemctl restart "+self.odoo_service_name)
    def get_data_and_start(self):
        if not self.odoo_service_name:
            raise UserError(_("Please set the Service"))
        self.custom_sudo("sudo systemctl start "+self.odoo_service_name)
    def get_data_and_stop(self):
        if not self.odoo_service_name:
            raise UserError(_("Please set the Service"))
        self.custom_sudo("sudo systemctl stop "+self.odoo_service_name)

    def action_to_draft(self):
        self.write({"state": "draft"})
        return True

    def action_activate(self):
        self.write({"state": "active"})

    def action_cancel(self):
        self.write({"state": "cancel"})

    def action_inactive(self):
        self.check_to_inactive()
        self.write({"state": "inactive"})

    def check_to_inactive(self):

        return True

    @api.model
    def module_path(self):
        if self.we_are_frozen():
            return os.path.dirname(sys.executable)
        return os.path.dirname(__file__)

    def custom_sudo(self, command):
        if not self.is_remote:
            try:
                res = subprocess.check_output(
                    command, stderr=subprocess.STDOUT, shell=True
                )
                self.actualizar_log(str(res))
                return True
            except Exception as e:
                self.actualizar_log(str(e))
                return False
        else:
            try:
                context = {
                    "host": self.main_hostname,
                    "port": self.ssh_port,
                    "sshkey": self.ssh_private_key,
                    "user": self.user_name,
                    "name": self.name,
                    "passkey": self.ssh_password,
                }
                ssh_obj, error = self.login_remote(context)
                if error:
                    self.actualizar_log(str(error))
                    _logger.exception("%s" % error)
                    return False

                ssh_stdin, ssh_stdout, ssh_stderr = ssh_obj.exec_command(
                    "sudo " + command
                )
                _logger.info("############################# custom sudo #################")
                _logger.info("Input: %s" % ssh_stdin)
                _logger.info("Output: %s" % ssh_stdout)
                _logger.info("Error: %s" % ssh_stderr)
                result = ssh_stdout.readlines()
                self.actualizar_log(str(result))
                return True
            except Exception as e:
                _logger.exception("%s" % e)
                self.actualizar_log(str(e))
                return False



    def name_get(self):
        res = []
        for rec in self:
            res.append((rec.id, _("%s - %s") % (rec.name, rec.main_hostname)))
        return res

    def generate_ssh_key(self):
        return {
            "name": _("Configure certificate SSH"),
            "view_type": "form",
            "view_mode": "form",
            "target": "new",
            "res_model": "se.ssh.auth",
            "type": "ir.actions.act_window",
            "context": {"default_server": self.id},
        }
    def install_odoo(self):
        return {
            "name": _("Install Odoo"),
            "view_type": "form",
            "view_mode": "form",
            "target": "new",
            "res_model": "install.odoo",
            "type": "ir.actions.act_window",
            "context": {"default_server": self.id},
        }

    def store_keys_to_file_path(self):
        try:
            path = self.env["ir.config_parameter"].get_param(
                "se_server_management.ssh_key_store_path"
            )
            if not os.path.isdir(path):
                os.makedirs(path)
        except:
            raise UserError(
                _("Please configure the ssh key store path in the settings")
            )

    def create_remote_file(self, remote_path, content):
        try:
            context = {
                "host": self.main_hostname,
                "port": self.ssh_port,
                "sshkey": self.ssh_private_key,
                "user": self.user_name,
                "name": self.name,
                "passkey": self.ssh_password,
            }
            ssh_obj, error = self.login_remote(context)
            sftp = ssh_obj.open_sftp()
            with sftp.file(remote_path, 'w') as remote_file:
                remote_file.write(content)
            sftp.close()
        except Exception as e:
            raise UserError("Error creating remote file: %s" % e)

    def connect_to_webssh(self):
        # ejecutar comando para iniciarl el servicio wssh --fbidhttp=False
        try:
            subprocess.Popen("wssh --fbidhttp=False &", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except Exception as e:
            _logger.info("Error al iniciar el servicio wssh: %r", e)
            raise UserError(_("Error iniciando el servicio wssh: %r") % e)

        path = self.env["ir.config_parameter"].get_param(
            "se_server_management.ssh_key_store_path"
        )
        private_keyfile = os.path.join(path, self.name)
        private_key = False
        with open(private_keyfile, 'rb') as file:
            private_key = file.read()

        # Obtén los datos de conexión desde el registro actual de server.server
        webssh_url = self.env["ir.config_parameter"].get_param("se_server_management.webssh_url", default="")
 
        # Now safely concatenate
        # if webssh_url:
        #     webssh_url += "/?"
        # else:
        #     raise UserError("WebSSH URL is not configured. Please set the 'se_server_management.webssh_url' parameter in System Parameters.")

        # enviar en el parametro privatekey el archivo de la clave privada
        connection_data = {
            'hostname': self.main_hostname,
            'port': str(self.ssh_port),
            'username': self.user_name,
            'password': self.ssh_password,
            'allow_agent': False,  # Add this line to disable using SSH agent
        }
        # Comprueba si se proporciona una clave privada y, en caso afirmativo, agrégala a los datos de conexión.
        for key, value in connection_data.items():
            webssh_url += f"{key}={value}&"

        # Redirige al usuario a la URL de WebSSH.
        return {
            'type': 'ir.actions.act_url',
            'url': webssh_url,
            'target': 'self',  # Abre la URL en la misma ventana.
        }
