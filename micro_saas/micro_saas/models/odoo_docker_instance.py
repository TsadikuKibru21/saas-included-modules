import logging
import os
import socket
import subprocess
from datetime import datetime, timedelta
# from queue_job.job import job
from odoo import models, fields, api, _
import secrets
import string
import sys
# sys.path.append('/opt/custom-addons/odoo_micro_saas-17.0')
# from queue_job.job import job
import shutil
import threading
from odoo.exceptions import ValidationError, UserError
_logger = logging.getLogger(__name__)
import xmlrpc.client
import time
import docker
import paramiko
import json

class TenantServer(models.Model):
    _name = 'tenant.server'
    _description = 'Tenant Server'

    name = fields.Char(string='Server Name', required=True)
    ip_address = fields.Char(string='IP Address', required=True)
    ssh_user = fields.Char(string='SSH Username', required=True)
    ssh_password = fields.Char(string='SSH Password',password=True)  # Consider using encrypted fields or keys
    ssh_port = fields.Integer(string='SSH Port', default=22)
    is_active = fields.Boolean(string='Active', default=True)
    total_instance = fields.Integer(string='Total Instances', default=10, required=True)
    current_instance = fields.Integer(string='Current Instances', default=0, readonly=True)
    remaining_instance = fields.Integer(string='Remaining Instances', compute='_compute_remaining_instance', store=True)

    @api.depends('total_instance', 'current_instance')
    def _compute_remaining_instance(self):
        """Compute remaining instances based on total and current instances."""
        for server in self:
            server.remaining_instance = server.total_instance - server.current_instance
    
    def test_ssh_connection(self):
        """Test SSH connection to the server."""
        self.ensure_one()  # Ensure method runs on a single record
        _logger.info(f"Testing SSH connection to {self.ip_address}")

        # Validate required fields
        if not self.ip_address or not self.ssh_user or not self.ssh_port:
            raise UserError(_("IP Address, SSH Username, and SSH Port are required to test the connection."))

        # Create SSH client
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        try:
            # Attempt to connect
            ssh_client.connect(
                hostname=self.ip_address,
                username=self.ssh_user,
                password=self.ssh_password if self.ssh_password else None,
                port=self.ssh_port,
                # timeout=10  # 10-second timeout
            )
            
            # Execute a simple command to verify connection (e.g., 'echo TEST')
            stdin, stdout, stderr = ssh_client.exec_command('echo TEST')
            output = stdout.read().decode().strip()
            error = stderr.read().decode().strip()

            if output == 'TEST' and not error:
                _logger.info(f"SSH connection successful to {self.ip_address}")
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'title': _('Success'),
                        'message': _(f"Successfully connected to {self.ip_address} via SSH"),
                        'type': 'success',
                        'sticky': False,
                    }
                }
            else:
                raise UserError(_(f"SSH connection established but command failed: {error}"))

        except paramiko.AuthenticationException:
            _logger.error(f"SSH authentication failed for {self.ip_address}")
            raise UserError(_("SSH authentication failed. Please check the username and password."))
        except paramiko.SSHException as e:
            _logger.error(f"SSH connection failed to {self.ip_address}: {str(e)}")
            raise UserError(_(f"Failed to connect via SSH: {str(e)}"))
        except Exception as e:
            _logger.error(f"Unexpected error testing SSH connection to {self.ip_address}: {str(e)}")
            raise UserError(_(f"Unexpected error during SSH test: {str(e)}"))
        finally:
            # Always close the connection if it was opened
            ssh_client.close()

class OdooDockerInstance(models.Model):
    _name = 'odoo.docker.instance'
    _inherit = ["docker.compose.template"]
    _description = 'Odoo Docker Instance'
    _sql_constraints = [
        ('name_unique', 'UNIQUE(name)', 'The instance name must be unique.'),
    ]

    

    name = fields.Char(string='Instance Name', required=True)
    customer = fields.Many2one('res.partner', string="Customer", required=True)
    state = fields.Selection([
        ('draft', 'Draft'),
        ('stopped', 'Stopped'),
        ('running', 'Running'),
        ('grace', 'Grace Period'),    # Added grace period state
        ('expired', 'Expired'),       # Added expired state instead of just using is_expires
        ('error', 'Error')
    ], string='State', default='draft')
    http_port = fields.Char(string='HTTP Port')
    longpolling_port = fields.Char(string='Longpolling Port')
    instance_url = fields.Char(string='Instance URL', compute='_compute_instance_url', store=True)
    repository_line = fields.One2many('repository.repo.line', 'instance_id', string='Repository and Branch')
    log = fields.Html(string='Log')
    addons_path = fields.Char(string='Addons Path', compute='_compute_addons_path', store=True)
    user_path = fields.Char(string='User Path', compute='_compute_user_path', store=True)
    instance_data_path = fields.Char(string='Instance Data Path', compute='_compute_user_path', store=True)
    template_id = fields.Many2one('docker.compose.template', string='Product')
    variable_ids = fields.One2many('docker.compose.template.variable', 'instance_id',
                                   string="Template Variables", store=True, compute='_compute_variable_ids',
                                   precompute=True, readonly=False)
    storage_limit_gb = fields.Float(string="Purchased Storage (GB)")
    used_storage = fields.Float(string="Used Storage (GB)", store=True)
    cpu_limit = fields.Float(string='CPU Limit')
    memory_limit = fields.Float(string='Memory Limit')
    network_limit = fields.Float(string='Network Bandwidth Limit (Mbit/sec)')
    purchased_user = fields.Integer(string='Purchased User', required=True)
    purchased_date = fields.Date(string='Purchased Date', default=fields.Date.today())
    expiration_date = fields.Date(string='Expiration Date', required=True)
    is_expires = fields.Boolean(string='Expire', compute='_compute_expire', store=True)
    remaining_storage = fields.Float(string='Remaining Storage(GB)',store=True)
    backup_ids = fields.One2many('docker.container.backup', 'instance_id', string="Backups")
    domain_name = fields.Char(string='Domain Name')
    email_sent_low = fields.Boolean(string="Email Sent for Low Storage", default=False)
    email_sent_full = fields.Boolean(string="Email Sent for Full Storage", default=False)
    cridentail_sent = fields.Boolean(string="cridential sent", default=False)
    tenant_server_id = fields.Many2one('tenant.server', string='Tenant Server', required=True)

    start_cron_id = fields.Many2one('ir.cron', string="Start Cron Job", readonly=True)
    update_cron_id = fields.Many2one('ir.cron', string="Update Cron Job", readonly=True)
    result_odoo_conf = fields.Text(string='Result Odoo Config', compute='_compute_result_odoo_conf', store=True)
    # @api.depends('template_odoo_conf', 'variable_ids', 'is_result_odoo_conf', 'purchased_user', 'cpu_limit', 'memory_limit','template_id')
    # @api.onchange('template_odoo_conf', 'variable_ids', 'is_result_odoo_conf', 'purchased_user', 'cpu_limit', 'memory_limit','template_id')
    # def _compute_result_odoo_conf(self):
    #     _logger.info("################################# oncahange test *************")
    #     for template in self:
    #         _logger.info("################################# oncahange test 1*************")

    #         # Start with the dynamically generated template including workers
    #         template.result_odoo_conf = template._default_template_odoo_conf()
    #         # Apply variable substitutions if any
    #         template.result_odoo_conf = template._get_formatted_body(
    #             template_body=template.result_odoo_conf,
    #             demo_fallback=True
    #         )
    @api.model
    def default_get(self, fields_list):
        res = super(OdooDockerInstance, self).default_get(fields_list)
        _logger.info("**************************** default_get called *****")
        
        # Set default values for fields that influence result_odoo_conf
        res.update({
            'purchased_user': 5,      # Default concurrent users
            'cpu_limit': 1.0,         # Default CPU limit
            'memory_limit': 1.0,      # Default RAM in GB
        })
   
        # Get the base odoo.conf with default values (no record yet)
        # result_odoo_conf = self._default_template_odoo_conf()
        # _logger.info("Default odoo.conf: %s", result_odoo_conf)
        
        # Don’t assign to self.result_odoo_conf here; let _compute_result_odoo_conf handle it
        active_tenant_server = self.env['tenant.server'].search([('is_active', '=', True)], limit=1)
        if active_tenant_server:
            res['tenant_server_id'] = active_tenant_server.id
        # res['result_odoo_conf']=result_odoo_conf
        if 'storage_limit_gb' in fields_list or 'storage_limit_gb' in res:
            res['remaining_storage'] = res.get('storage_limit_gb', 0.0)
        return res
    # @api.model
    # def create(self, vals):
    #     _logger.info("=== Starting create for OdooDockerInstance ===")
    #     # Create the record without queuing anything
    #     record = super(OdooDockerInstance, self).create(vals)
    #     _logger.info(f"=== Record created: ID {record.id}, Name: {record.name} ===")
        
    #     # Optionally log the creation, but do not queue start_instance
    #     record.add_to_log(f"[INFO] Instance {record.name} created successfully. Use 'Start Instance' to activate.")
        
    #     return record

   
    def create_job_start_instance(self):
        """Dynamically create a queued job for start_instance"""
        self.with_delay().start_instance()
        self.with_delay().tenant_service_update()
        
        return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': 'Success',
                    'message': f"Docker Instance created on remote server with Name: {self.name}",
                    'type': 'success',
                }
            }
    @api.constrains('tenant_server_id')
    def _check_remaining_instances(self):
        """Validate that the tenant server has remaining instances available."""
        for record in self:
            if record.tenant_server_id.remaining_instance <= 0:
                raise ValidationError(
                    _("No remaining instances available on the selected tenant server. "
                      "Please choose another server or increase the total instances.")
                )

    # @api.model
    # def default_get(self, fields_list):
    #     res = super(OdooDockerInstance, self).default_get(fields_list)
        
    #     _logger.info("**************************** yu *****")
    #     result_odoo_conf = self._default_template_odoo_conf()
    #     _logger.info(result_odoo_conf)
    #     # Apply variable substitutions if any

    #     self.result_odoo_conf = self._get_formatted_body(
    #         template_body=result_odoo_conf,
    #         demo_fallback=True
    #     )
    #     _logger.info(self.result_odoo_conf )
    #     active_tenant_server = self.env['tenant.server'].search([('active', '=', True)], limit=1)
    #     if active_tenant_server:
    #         res['tenant_server_id'] = active_tenant_server.id
    #     return res
    
    @api.model
    def create(self, vals):
        # Ensure the name is unique
        if 'name' in vals:
            original_name = vals['name']
            new_name = original_name
            counter = 1

            while self.env['odoo.docker.instance'].sudo().search([('name', '=', new_name)]):
                new_name = f"{original_name}_{counter}"
                counter += 1
            
            vals['name'] = new_name  # Assign the new unique name
            _logger.info(f"Finalized unique name for odoo.docker.instance: {new_name}")

        # Create the record
        instance = super(OdooDockerInstance, self).create(vals)
        _logger.info(f"Created odoo.docker.instance with name: {instance.name} (ID: {instance.id})")

        # Update the INSTANCE-NAME variable in variable_ids to match the finalized name
        if instance.variable_ids:
            instance_name_var = instance.variable_ids.filtered(lambda v: v.name == '{{INSTANCE-NAME}}')
            if instance_name_var:
                instance_name_var.write({'demo_value': instance.name})
                _logger.info(f"Updated INSTANCE-NAME variable to {instance.name} for instance {instance.id}")
            else:
                _logger.warning(f"No INSTANCE-NAME variable found in variable_ids for instance {instance.name} (ID: {instance.id})")
        else:
            _logger.warning(f"No variable_ids found for instance {instance.name} (ID: {instance.id})")

        # Regenerate result_dc_body if necessary
        if instance.template_dc_body and instance.variable_ids:
            _logger.info("Regenerating result_dc_body after updating INSTANCE-NAME")
            result_dc_body = instance.template_dc_body
            for var in instance.variable_ids:
                _logger.info(f"Replacing {var.name} with {var.demo_value} in template body")
                result_dc_body = result_dc_body.replace(var.name, var.demo_value or '')
            instance.write({'result_dc_body': result_dc_body})
            _logger.info(f"Updated result_dc_body for instance {instance.name}: {result_dc_body[:100]}...")

        return instance
    
    # @api.model
    # def create(self, vals):
    #     if 'name' in vals:
    #         original_name = vals['name']
    #         new_name = original_name
    #         counter = 1

    #         while self.env['odoo.docker.instance'].sudo().search([('name', '=', new_name)]):
    #             new_name = f"{original_name}_{counter}"
    #             counter += 1
            
    #         vals['name'] = new_name  # Assign the new unique name

    #     return super(OdooDockerInstance, self).create(vals)

    def _get_ssh_client(self):
        """Establish an SSH connection to the tenant server using Paramiko."""
        server = self.tenant_server_id
        if not server:
            raise ValidationError(_("No tenant server configured for instance %s") % self.name)
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            ssh.connect(server.ip_address, port=server.ssh_port, username=server.ssh_user, password=server.ssh_password,timeout=30)
            return ssh
        except Exception as e:
            self.add_to_log(f"[ERROR] Failed to connect to tenant server {server.name}: {str(e)}")
            _logger.error(f"SSH connection failed for {server.name}: {str(e)}")
            raise

    def run_daily_backup(self):
        """Run daily backup for all instances, keeping only the latest 7 days of backups."""
        _logger.info("Starting daily backup process for all Odoo Docker Instances")
        
        instances = self.env['odoo.docker.instance'].search([('state', '=', 'running')])
        cutoff_date = fields.Datetime.now() - timedelta(days=7)
        
        for instance in instances:
            _logger.info(f"Processing backup for instance: {instance.name}")
            instance.add_to_log(f"[INFO] Starting daily backup process for instance {instance.name}")
            
            backups = instance.backup_ids.sorted(key=lambda b: b.backup_date, reverse=True)
            backup_server = instance.backup_server_id
            
            if not backup_server or not backup_server.is_active:
                instance.add_to_log(f"[ERROR] No active backup server configured for instance {instance.name}")
                continue

            old_backups = backups.filtered(lambda b: b.backup_date < cutoff_date)
            
            if len(backups) > 7 or old_backups:
                backups_to_delete = backups[7:] if len(backups) > 7 else old_backups
                ssh = None
                try:
                    ssh = instance._get_ssh_client()
                    for backup in backups_to_delete:
                        try:
                            delete_command = f"rm -f {backup.file_path}"
                            stdin, stdout, stderr = ssh.exec_command(delete_command)
                            exit_status = stdout.channel.recv_exit_status()
                            if exit_status == 0:
                                backup.unlink()
                                instance.add_to_log(f"[INFO] Deleted old backup: {backup.name} (Date: {backup.backup_date})")
                            else:
                                instance.add_to_log(f"[ERROR] Failed to delete backup file {backup.file_path}: {stderr.read().decode()}")
                        except Exception as e:
                            instance.add_to_log(f"[ERROR] Failed to delete backup {backup.name}: {str(e)}")
                except Exception as e:
                    instance.add_to_log(f"[ERROR] SSH error during backup deletion: {str(e)}")
                finally:
                    if ssh:
                        ssh.close()

            try:
                instance.action_create_backup()
            except Exception as e:
                instance.add_to_log(f"[ERROR] Failed to create backup for instance {instance.name}: {str(e)}")
                _logger.error(f"Backup failed for instance {instance.name}: {str(e)}")
        
        _logger.info("Daily backup process completed")

    def action_create_backup(self, backup_name=""):
        self.add_to_log("--------------- BACKUP COMMAND STARTED ---------------")
        ssh = None
        try:
            ssh = self._get_ssh_client()
            if not backup_name:
                timestamp = datetime.now().strftime('%y-%m-%d-%H-%M')
                backup_name = f'{self.name}-backup-{timestamp}'
            
            # backup_server = self.env['docker.backup.cridential'].search([('is_active', '=', True)], limit=1)
            # if not backup_server:
            #     raise ValidationError(_("No active backup server configured"))

            # host = backup_server.ip_address
            # user = backup_server.user
            # password = backup_server.password
            remote_script_path = f"/root/sfs_zoorya/scripts/backup.sh"
            # cmd = f"sudo {remote_script_path} \"{self.name}\" \"{backup_name}\" \"{host}\" \"{user}\" \"{password}\""
            cmd = f"sudo {remote_script_path} \"{self.name}\" \"{backup_name}\""

            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
            self.add_to_log(result.stdout)

            # stdin, stdout, stderr = ssh.exec_command(cmd)
            # self.add_to_log(f'Instance Name: {self.name}')
            # self.add_to_log(f'Backup Name: {backup_name}')
            # self.add_to_log(f"[INFO] Backup output: {stdout.read().decode()}")
            # error = stderr.read().decode()
            # if error:
            #     self.add_to_log(f"[ERROR] Backup error: {error}")
            #     raise Exception(error)

            backup_file_path = f'/root/sfs_zoorya/images.bk/{backup_name}'
            backup = self.env['docker.container.backup'].create({
                'name': backup_name,
                'backup_date': fields.Datetime.now(),
                'file_path': backup_file_path,
                'instance_id': self.id,
                'state': 'completed'
            })
            self.add_to_log("--------------- BACKUP COMMAND COMPLETED ---------------")
        except Exception as e:
            self.add_to_log(f"[ERROR] Failed to create backup: {str(e)}")
        finally:
            if ssh:
                ssh.close()

    def action_restore_latest_backup(self):
        latest_backup = self.backup_ids.filtered(lambda b: b.state == 'completed').sorted('backup_date', reverse=True)
        if latest_backup:
            latest_backup[0].action_restore_backup()
        else:
            raise ValidationError(_("No completed backups found!"))

    @api.model
    def _compute_storage_usage(self):
        _logger.info("Starting cron job to compute storage usage for Odoo Docker instances...")
        instances = self.search([])
        for instance in instances:
            ssh = None
            try:
                ssh = instance._get_ssh_client()
                remote_path = f"/root/sfs_zoorya/odoo_instances/{instance.name}"
                # Use du -sh to get the total size of the directory
                cmd = f"du -sh {remote_path}"
                stdin, stdout, stderr = ssh.exec_command(cmd)
                du_output = stdout.read().decode().splitlines()
                error_output = stderr.read().decode().strip()
                
                if error_output:
                    raise Exception(f"du command failed: {error_output}")

                if du_output:
                    # du -sh output is typically one line like "1.2G    /mnt/instance_name"
                    size_str = du_output[0].split()[0]  # Take the first column (size)
                    size_value = float(size_str[:-1])   # Extract numeric part (e.g., 1.2)
                    size_unit = size_str[-1].upper()    # Extract unit (e.g., G, M)

                    # Convert to GB
                    used_storage_gb = size_value / (1024 if size_unit == 'M' else 1 if size_unit == 'G' else 1024*1024)
                    remaining_storage_gb = instance.storage_limit_gb - used_storage_gb

                    update_vals = {
                        'used_storage': used_storage_gb,
                        'remaining_storage': max(remaining_storage_gb, 0.0),  # Ensure no negative values
                    }
                    if remaining_storage_gb > 1:
                        update_vals['email_sent_low'] = False
                        update_vals['email_sent_full'] = False
                    elif remaining_storage_gb > 0.5:
                        update_vals['email_sent_full'] = False

                    instance.tenant_service_update()
                    if remaining_storage_gb <= 0.5 and not instance.email_sent_full:
                        instance._send_storage_email(instance, full=True)
                        update_vals['email_sent_full'] = True
                    elif remaining_storage_gb <= 1 and not instance.email_sent_low:
                        instance._send_storage_email(instance, remaining=remaining_storage_gb)
                        update_vals['email_sent_low'] = True

                    instance.write(update_vals)
                    _logger.info(f"Updated storage for instance {instance.name}: used_storage={used_storage_gb:.2f} GB, remaining_storage={remaining_storage_gb:.2f} GB")
                else:
                    instance.write({'used_storage': 0.0, 'remaining_storage': instance.storage_limit_gb})
            except Exception as e:
                _logger.error(f"Error computing storage for {instance.name}: {str(e)}")
                instance.write({'used_storage': 0.0, 'remaining_storage': instance.storage_limit_gb})
            finally:
                if ssh:
                    ssh.close()

    def _send_storage_email(self, instance, full=False, remaining=None):
        if not instance.customer.email:
            _logger.warning(f"No email found for customer {instance.customer.name} of instance {instance.name}")
            return

        mail_template = self.env.ref('micro_saas.mail_template_storage_notification', raise_if_not_found=False)
        if not mail_template:
            _logger.error("Email template 'mail_template_storage_notification' not found.")
            return

        # Base variables
        customer_name = instance.customer.name or instance.customer.email
        storage_limit = instance.storage_limit_gb
        instance_name = instance.name
        
        # Determine email content based on condition
        if full:
            subject = f"Urgent: Storage Full for {instance_name}"
            status_message = "Storage Limit Reached!"
            body_content = f"""
                The storage for your instance <strong>{instance_name}</strong> has reached its maximum capacity of {storage_limit} GB.
                To continue using your Zoorya instance without interruption, please free up space or upgrade your storage plan.
            """
            button_text = "Upgrade Now"
        elif remaining is not None:
            subject = f"Storage Alert for {instance_name}"
            status_message = "Storage Running Low!"
            body_content = f"""
                The storage for your instance <strong>{instance_name}</strong> has only <strong>{remaining:.2f} GB</strong> remaining 
                out of your {storage_limit} GB limit. Please take action to manage your storage before it fills up completely.
            """
            button_text = "Manage Storage"
        else:
            return  # No condition met, exit silently

        # Enhanced HTML email template
        body_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h1 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px;">Zoorya Storage Notification</h1>
                <p style="color: #666666; line-height: 1.6; margin: 0 0 15px 0;">
                    Dear {customer_name},
                </p>
                <div style="background-color: #fef3f3; padding: 15px; border-radius: 5px; margin: 0 0 20px 0; border-left: 4px solid #e74c3c;">
                    <p style="margin: 0; color: #e74c3c; font-weight: bold;">{status_message}</p>
                </div>
                <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                    {body_content}
                </p>
              
                <p style="color: #666666; line-height: 1.6; margin: 0;">
                    Need help? Contact our support team at <a href="mailto:info@zoorya.et" style="color: #3498db;">info@zoorya.et</a>.<br>
                    Best regards,<br>
                    The Zoorya Team
                </p>
            </div>
            <div style="text-align: center; padding: 15px; color: #999999; font-size: 12px;">
                © 2025 Zoorya. All rights reserved.
            </div>
        </div>
        """

        mail_values = {
            'subject': subject,
            'body_html': body_html,
            'email_from': self.env.company.email or 'no-reply@zoorya.com',
            'email_to': instance.customer.email,
            'auto_delete': True,
        }

        try:
            mail = self.env['mail.mail'].sudo().create(mail_values)
            mail.send()
            instance.add_to_log(f"[INFO] Sent storage email to {instance.customer.email}: {subject}")
            _logger.info(f"Sent storage email for instance {instance.name} to {instance.customer.email}")
        except Exception as e:
            _logger.error(f"Failed to send storage email for instance {instance.name}: {str(e)}")
            instance.add_to_log(f"[ERROR] Failed to send storage email: {str(e)}")

    def check_expiration(self):
        today = fields.Date.today()
        instances = self.search([])
        for instance in instances:
            if instance.expiration_date:
                days_left = (instance.expiration_date - today).days
                
                # Expired (days_left <= 0)
                if days_left <= 0:  # Less than or equal to 0 means expired
                    if instance.state != 'expired':
                        instance.write({
                            'state': 'expired',
                            'is_expires': True
                        })
                        instance.add_to_log(f"[INFO] Instance marked as expired on {today}")
                        _logger.info(f"Instance {instance.name} expired on {instance.expiration_date}")
                        # self._send_expiration_email(instance, expired=True)
                
                # Grace period (1 to 5 days left)
                elif days_left <= 5:  # Less than or equal to 5, but greater than 0
                    if instance.state == 'running':
                        instance.write({'state': 'grace'})
                        instance.add_to_log(f"[INFO] Instance entered grace period on {today}, {days_left} days left")
                        _logger.info(f"Instance {instance.name} entered grace period, expires on {instance.expiration_date}")
                        # self._send_expiration_email(instance, days_left=days_left)
                
                # Warning period (6 to 10 days left)
                elif days_left <= 10:  # Less than or equal to 10, but greater than 5
                    if instance.state == 'expired':  # Only revert 'expired' if date was extended
                        instance.write({
                            'state': 'running',
                            'is_expires': False
                        })
                        instance.add_to_log(f"[INFO] Instance expiration cleared on {today}")
                        _logger.info(f"Instance {instance.name} expiration cleared, expires on {instance.expiration_date}")
                    # if instance.state not in ['error', 'grace']:  # Don’t send email if in error or grace
                    #     self._send_expiration_email(instance, days_left=days_left)
                
                # More than 10 days left
                else:  # days_left > 10
                    if instance.state in ['grace', 'expired']:
                        instance.write({
                            'state': 'running',
                            'is_expires': False
                        })
                        instance.add_to_log(f"[INFO] Instance expiration cleared on {today}")
                        _logger.info(f"Instance {instance.name} expiration cleared, expires on {instance.expiration_date}")

                # Error state is preserved and not modified by expiration logic

    def _send_expiration_email(self, instance, expired=False, days_left=None):
        if not instance.customer.email:
            _logger.warning(f"No email found for customer {instance.customer.name} of instance {instance.name}")
            return

        mail_template = self.env.ref('micro_saas.mail_template_expiration_notification', raise_if_not_found=False)
        if not mail_template:
            _logger.error("Email template 'mail_template_expiration_notification' not found.")
            return

        subject = "Your Subscription Status Update"
        body = ""
        if expired:
            subject = f"Your Subscription for {instance.name} Has Expired"
            body = f"Dear {instance.customer.name},\n\nYour subscription for instance {instance.name} has expired on {instance.expiration_date}. Please renew your subscription to continue using the service.\n\nBest regards,\nYour Zoorya Team"
        elif days_left is not None:
            subject = f"Your Subscription for {instance.name} is Expiring Soon"
            body = f"Dear {instance.customer.name},\n\nYour subscription for instance {instance.name} will expire in {days_left} day(s) on {instance.expiration_date}. Please take action to renew it.\n\nBest regards,\nYour Zoorya Team"
        formatted_body = body.replace('\n', '<br/>')
        mail_values = {
            'subject': subject,
            'body_html': f"<p>{formatted_body}</p>",
            'email_from': self.env.company.email or 'admin@yourdomain.com',
            'email_to': instance.customer.email,
            'auto_delete': True,
        }
        self.env['mail.mail'].sudo().create(mail_values).send()
        instance.add_to_log(f"[INFO] Sent expiration email to {instance.customer.email}: {subject}")
        _logger.info(f"Sent expiration email for instance {instance.name} to {instance.customer.email}")

    @api.depends('expiration_date', 'purchased_date')
    def _compute_expire(self):
        for record in self:
            if record.expiration_date and record.purchased_date:
                record.is_expires = record.expiration_date < record.purchased_date

    def action_update_expiration_wizard(self):
        return {
            'name': 'Update Expiration Date',
            'type': 'ir.actions.act_window',
            'res_model': 'update.expiration.wizard',
            'view_mode': 'form',
            'view_id': self.env.ref('micro_saas.view_update_expiration_wizard_form').id,
            'target': 'new',
            'context': {'default_user': self.env.uid},
        }

    def action_open_add_resource_wizard(self):
        return {
            'name': 'Add Resources',
            'type': 'ir.actions.act_window',
            'res_model': 'add.resource.wizard',
            'view_mode': 'form',
            'view_id': self.env.ref('micro_saas.view_add_resource_wizard_form').id,
            'target': 'new',
            'context': {'default_user': self.env.uid},
        }

    def tenant_service_update(self):
        """Update tenant service (runs as a background cron job)."""
        if not self.cridentail_sent:
                time.sleep(30)

        if self.state not in ['running', 'grace']:
            self.add_to_log("[ERROR] Instance is not running, skipping tenant_service_update")
            return

        self.add_to_log("[INFO] Starting tenant_service_update")
        common = xmlrpc.client.ServerProxy(f"{self.instance_url}/xmlrpc/2/common")
        self.add_to_log('[INFO] Connected to XML-RPC common endpoint')
        try:
            db_list = xmlrpc.client.ServerProxy(f'{self.instance_url}/xmlrpc/db').list()
            self.add_to_log(f'[INFO] Database list retrieved: {db_list}')
            _logger.info("######################## db")
            _logger.info(db_list)
            _logger.info(db_list[0])
            if not db_list:
                raise Exception("No databases found yet.")
            _logger.info("############################ nure 1")
            uid = common.authenticate(db_list[0], 'admin', 'saassuperadmin', {})
            _logger.info("############################ nure 2")
            if not uid:
                raise Exception("Authentication failed.")
            self.add_to_log(f'[INFO] Authenticated with UID: {uid}')
            _logger.info("############################ nure 3")
            models = xmlrpc.client.ServerProxy(f'{self.instance_url}/xmlrpc/2/object')
            _logger.info("############################ nure 4")
            service_ids = models.execute_kw(
                db_list[0], uid, 'saassuperadmin',
                'saas.service', 'search',
                [[['name', '=', self.name]]]
            )
            _logger.info("############################ nure 5")
            data = {
                'name': self.name,
                'expiry_date': self.expiration_date or False,
                'user_count': self.purchased_user or 0,
                'tenant_db_size': self.storage_limit_gb or 0.0,
                'total_db_size_used': self.used_storage or 0.0,
                'docker_dest_path': self.instance_data_path or '',
            }
            _logger.info(service_ids)
            _logger.info("############################ nure 6")
            if not service_ids:
                _logger.info("############################ tst 1")
                self.add_to_log(f"[INFO] No existing saas.service found, creating new record")
                _logger.info("############################ tst 2")

                new_id = models.execute_kw(
                    db_list[0], uid, 'saassuperadmin',
                    'saas.service', 'create',
                    [data]
                )
                _logger.info("############################ tst 3")
                self._update_instance_user_and_send_email(db_list[0], uid)

                self.add_to_log(f"[INFO] Created saas.service record with ID {new_id}")
            else:
                existing_id = service_ids[0]
                self.add_to_log(f"[INFO] Updating existing saas.service with ID {existing_id}")
                update_data = {
                    'user_count': self.purchased_user or 0,
                    'tenant_db_size': self.storage_limit_gb or 0.0,
                    'expiry_date': self.expiration_date or False,
                    'total_db_size_used': self.used_storage or 0.0,
                    'docker_dest_path': self.instance_data_path or '',
                }
                _logger.info("############################# before update")
                _logger.info(data)
                models.execute_kw(
                    db_list[0], uid, 'saassuperadmin',
                    'saas.service', 'write',
                    [[existing_id], update_data]
                )
                _logger.info("############################ nure 7")
                # if self.customer.email and not self.cridentail_sent:
                #     _logger.info("############################ nure 8")
                #     self.tenant_server_id.write({
                #         'current_instance': self.tenant_server_id.current_instance + 1,
                #     })
                #     _logger.info("############################ nure 9")
                if not self.cridentail_sent:
                    self._update_instance_user_and_send_email(db_list[0], uid)
            self.add_to_log("[INFO] tenant_service_update completed successfully")
        except Exception as e:
            self.add_to_log(f"[ERROR] tenant_service_update failed: {str(e)}")
            _logger.error(f"tenant_service_update failed: {str(e)}")  # Log as error for visibility

    def _update_instance_user_and_send_email(self, db_name, uid):
        _logger.info("############################  nure 11")
        _logger.info("##################### _update_instance_user_and_send_email called")
        password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        models = xmlrpc.client.ServerProxy(f'{self.instance_url}/xmlrpc/2/object')
        _logger.info("############################  nure 12")
        
        try:
            customer_sudo = self.customer.sudo()
            user_ids = models.execute_kw(
                db_name, uid, 'saassuperadmin',
                'res.users', 'search',
                [[['login', '=', 'test'], ['name', '=', 'test']]]
            )
            _logger.info("############################  nure 13")
            if not user_ids:
                _logger.info("################################ ty 1")
                self.add_to_log("[WARNING] No user found with login='test' and email='test'")
                return
            _logger.info("#")
            _logger.info(user_ids)
            _logger.info("############################  nure 14")
            user_id = user_ids[0]
            _logger.info("################################ ty 2")
            models.execute_kw(
                db_name, uid, 'saassuperadmin',
                'res.users', 'write',
                [[user_id], {'login': customer_sudo.email, 'name': customer_sudo.name, 'password': password}]
            )
            _logger.info("############################  nure 15")
            self.add_to_log(f"[INFO] Updated user ID {user_id} login/email from 'test' to {customer_sudo.email}")
        except Exception as e:
            self.add_to_log(f"[ERROR] Failed to update instance user: {str(e)}")
            return
        
        _logger.info("############################  nure 16")
        if not customer_sudo.email:
            self.add_to_log(f"[WARNING] No email found for customer {customer_sudo.name}")
            _logger.warning(f"No email found for customer {customer_sudo.name} of instance {self.name}")
            return
        
        _logger.info("############################  nure 17")
        mail_template = self.env.ref('micro_saas.mail_template_instance_credentials', raise_if_not_found=False)
        if not mail_template:
            self.add_to_log("[ERROR] Email template 'mail_template_instance_credentials' not found")
            _logger.error("Email template 'mail_template_instance_credentials' not found.")
            return
        
        _logger.info("############################  nure 18")
        # Enhanced email template with Zoorya branding
        body_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h1 style="color: #2c3e50; margin: 0 0 20px 0; font-size: 24px;">Welcome!</h1>
                <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                    Dear {customer_sudo.name or customer_sudo.email},
                </p>
                <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                    Your  instance is ready! Here are your login credentials:
                </p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 5px; margin: 0 0 20px 0;">
                    <p style="margin: 5px 0; color: #333333;">
                        <strong>Domain:</strong> {self.instance_url}
                    </p>
                    <p style="margin: 5px 0; color: #333333;">
                        <strong>Email:</strong> {customer_sudo.email}
                    </p>
                    <p style="margin: 5px 0; color: #333333;">
                        <strong>Password:</strong> {password}
                    </p>
                </div>
                <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                    For security, please log in and change your password as soon as possible.
                </p>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="{self.domain_name}" style="background-color: #90c43c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Log In Now
                    </a>
                </div>
                <p style="color: #666666; line-height: 1.6; margin: 0;">
                    Best regards,<br>
                    The  Team
                </p>
            </div>
            <div style="text-align: center; padding: 15px; color: #999999; font-size: 12px;">
                © 2025 . All rights reserved.
            </div>
        </div>
        """
        
        mail_values = {
            'subject': f"Your  Instance is Ready! - {self.name}",
            'body_html': body_html,
            'email_from': self.env.company.email or 'no-reply@zoorya.com',
            'email_to': customer_sudo.email,
            'auto_delete': True,
        }
        
        try:
            _logger.info("############################  nure 19")
            mail = self.env['mail.mail'].sudo().create(mail_values)
            mail.send()
            self.tenant_server_id.write({
                'current_instance': self.tenant_server_id.current_instance + 1,
            })
            
            self.cridentail_sent = True
            self.add_to_log(f"[INFO] Sent credentials email to {customer_sudo.email}: {mail_values['subject']}")
            _logger.info(f"Sent credentials email for instance {self.name} to {customer_sudo.email}")
        except Exception as e:
            self.add_to_log(f"[ERROR] Failed to send email: {str(e)}")
            _logger.error(f"Failed to send email for instance {self.name}: {str(e)}")
    def _remove_cron_job(self, method_name):
        """Search and remove cron jobs for the given method and instance ID."""
        cron_model = self.env['ir.cron']
        cron_jobs = cron_model.search([
            ('code', '=', f"model.browse({self.id}).{method_name}()"),
            ('model_id', '=', self.env['ir.model']._get(self._name).id),
        ])
        if cron_jobs:
            cron_ids = cron_jobs.ids
            cron_jobs.unlink()
            self.add_to_log(f"[INFO] Removed {method_name} cron job(s) with IDs {cron_ids}")
        else:
            self.add_to_log(f"[INFO] No {method_name} cron job found to remove for instance ID {self.id}")

    @api.onchange('template_id')
    def onchange_template_id(self):
        if self.template_id:
            self.template_dc_body = self.template_id.template_dc_body
            self.tag_ids = self.template_id.tag_ids
            self.storage_limit_gb = self.template_id.storage_limit_gb
            self.cpu_limit = self.template_id.cpu_limit
            self.network_limit = self.template_id.network_limit
            self.memory_limit = self.template_id.memory_limit
            self.repository_line = self.template_id.repository_line
            self.result_dc_body = self._get_formatted_body(template_body=self.template_dc_body, demo_fallback=True)
            self.variable_ids = self.template_id.variable_ids
            self.variable_ids.filtered(lambda r: r.name == '{{HTTP-PORT}}').demo_value = self.http_port
            self.variable_ids.filtered(lambda r: r.name == '{{LONGPOLLING-PORT}}').demo_value = self.longpolling_port
            self.variable_ids.filtered(lambda r: r.name == '{{CPU-LIMIT}}').demo_value = str(self.cpu_limit)
            self.variable_ids.filtered(lambda r: r.name == '{{MEMORY-LIMIT}}').demo_value = str(self.memory_limit)
            self.variable_ids.filtered(lambda r: r.name == '{{NETWORK-LIMIT}}').demo_value = str(self.network_limit)
            self.variable_ids.filtered(lambda r: r.name == '{{STORAGE-LIMIT}}').demo_value = str(self.storage_limit_gb)
            self.variable_ids.filtered(lambda r: r.name == '{{INSTANCE-NAME}}').demo_value = self.name

    @api.onchange('name', 'http_port', 'longpolling_port', 'cpu_limit', 'memory_limit', 'network_limit', 'storage_limit_gb')
    def onchange_resource_fields(self):
        self.variable_ids.filtered(lambda r: r.name == '{{HTTP-PORT}}').demo_value = self.http_port
        self.variable_ids.filtered(lambda r: r.name == '{{LONGPOLLING-PORT}}').demo_value = self.longpolling_port
        self.variable_ids.filtered(lambda r: r.name == '{{CPU-LIMIT}}').demo_value = str(self.cpu_limit)
        self.variable_ids.filtered(lambda r: r.name == '{{MEMORY-LIMIT}}').demo_value = str(self.memory_limit)
        self.variable_ids.filtered(lambda r: r.name == '{{NETWORK-LIMIT}}').demo_value = str(self.network_limit)
        self.variable_ids.filtered(lambda r: r.name == '{{STORAGE-LIMIT}}').demo_value = str(self.storage_limit_gb)
        self.variable_ids.filtered(lambda r: r.name == '{{INSTANCE-NAME}}').demo_value = self.name

    @api.onchange('name')
    def onchange_name(self):
        self.http_port = self._get_available_port()
        self.longpolling_port = self._get_available_port(int(self.http_port) + 1)

    @api.depends('name')
    def _compute_user_path(self):
        for instance in self:
            if not instance.name:
                continue
            # instance.user_path = os.path.expanduser('~')
            # instance.instance_data_path = os.path.join(instance.user_path, 'odoo_docker', 'data',
            #                                            instance.name.replace('.', '_').replace(' ', '_').lower())
            instance.result_dc_body = self._get_formatted_body(template_body=instance.template_dc_body,
                                                               demo_fallback=True)
            self.user_path = '/root/sfs_zoorya/odoo_instances/'
            self.instance_data_path = f"{self.user_path}{self.name}/data/"

    @api.depends('repository_line')
    def _compute_addons_path(self):
        for instance in self:
            if not instance.repository_line:
                continue
            addons_path = []
            for line in instance.repository_line:
                addons_path.append("/mnt/extra-addons/" + self._get_repo_name(line))
            instance.addons_path = ','.join(addons_path)

    def add_to_log(self, message):
        now = datetime.now()
        new_log = "</br> \n#" + str(now.strftime("%m/%d/%Y, %H:%M:%S")) + " " + str(message) + " " + str(self.log)
        if len(new_log) > 10000:
            new_log = "</br>" + str(now.strftime("%m/%d/%Y, %H:%M:%S")) + " " + str(message)
        self.log = new_log

    @api.depends('http_port', 'tenant_server_id.ip_address')
    def _compute_instance_url(self):
        """Compute the instance URL based on the tenant server's IP address and HTTP port."""
        for instance in self:
            if not instance.http_port or not instance.tenant_server_id or not instance.tenant_server_id.ip_address:
                instance.instance_url = False  # Set to False if prerequisites are missing
                continue
            # Use the tenant server's IP address instead of the master server's base URL
            tenant_server_ip = instance.tenant_server_id.ip_address
            instance.instance_url = f"http://{tenant_server_ip}:{instance.http_port}"
    def open_instance_url(self):
        for instance in self:
            if instance.http_port:
                url = instance.instance_url
                return {
                    'type': 'ir.actions.act_url',
                    'url': url,
                    'target': 'new',
                }

    def _get_available_port(self, start_port=8069, end_port=9999):
        self.ensure_one()
        tenant_server = self.tenant_server_id
        if not tenant_server:
            self.add_to_log("[ERROR] No tenant server defined for this instance.")
            raise UserError(_("No tenant server defined for this instance."))

        instances = self.env['odoo.docker.instance'].search([('tenant_server_id', '=', tenant_server.id)])
        used_ports = []
        for instance in instances:
            if instance.http_port:
                used_ports.append(int(instance.http_port))
            if instance.longpolling_port:
                used_ports.append(int(instance.longpolling_port))

        ssh = None
        try:
            ssh = self._get_ssh_client()
            self.add_to_log(f"[INFO] Scanning ports on {tenant_server.ip_address} from {start_port} to {end_port}")
            for port in range(start_port, end_port + 1):
                if port in used_ports:
                    continue
                cmd = f"ss -tuln | grep ':{port} ' || echo 'FREE'"
                stdin, stdout, stderr = ssh.exec_command(cmd)
                output = stdout.read().decode().strip()
                error = stderr.read().decode().strip()
                if output == "FREE" and not error:
                    self.add_to_log(f"[INFO] Found available port {port}")
                    return port
            self.add_to_log(f"[ERROR] No available ports in range {start_port}-{end_port}")
            return None
        except Exception as e:
            self.add_to_log(f"[ERROR] Port scan failed: {str(e)}")
            raise
        finally:
            if ssh:
                ssh.close()
    def _update_docker_compose_file(self):
        remote_base_path = f"/root/sfs_zoorya/odoo_instances/{self.name}"
        remote_data_path = f"{remote_base_path}/data"
        modified_path = f"{remote_data_path}/docker-compose.yml"
        self._makedirs(remote_data_path)
        self.create_file(modified_path, self.result_dc_body)

    def _get_repo_name(self, line):
        if not line.repository_id or not line.name or not line.repository_id.name:
            return ''
        name_repo_url = line.repository_id.name.split('/')[-1]
        name = name_repo_url.replace('.git', '').replace('.', '_').replace('-', '_').replace(' ', '_').replace(
            '/', '_').replace('\\', '_') + "_branch_" + line.name.replace('.', '_')
        return name

    def _clone_repositories(self):
        for instance in self:
            for line in instance.repository_line:
                repo_name = self._get_repo_name(line)
                repo_path = f"/root/sfs_zoorya/odoo_instances/{instance.name}/data/addons/{repo_name}"
                self._makedirs(repo_path)
                try:
                    cmd = f"git clone {line.repository_id.name} -b {line.name} {repo_path}"
                    result = self.ssh_execute(cmd)
                    self.add_to_log(f"[INFO] Repository cloned on remote server: {line.repository_id.name} (Branch: {line.name})")
                    self.add_to_log(f"[INFO] Output: {result['stdout']}")
                    line.is_clone = True
                except Exception as e:
                    self.add_to_log(f"[ERROR] Failed to clone repository on remote server: {line.repository_id.name} (Branch: {line.name})")
                    self.add_to_log(f"[ERROR] {str(e)}")

    def _create_odoo_conf(self):
        for instance in self:

            odoo_conf_path = f"/root/sfs_zoorya/odoo_instances/{instance.name}/data/etc/odoo.conf"
            instance._makedirs(os.path.dirname(odoo_conf_path))

            try:
                odoo_conf_content = instance.result_odoo_conf
             
                instance.create_file(odoo_conf_path, odoo_conf_content)
                instance.add_to_log(f"[INFO] File odoo.conf created successfully on remote server at {odoo_conf_path}")
            except Exception as e:
                instance.add_to_log(f"[ERROR] Failed to create odoo.conf on remote server at {odoo_conf_path}: {str(e)}")
                instance.write({'state': 'error'})
                if hasattr(e, 'stderr') and e.stderr:
                    instance.add_to_log(f"[ERROR] {e.stderr}")
                else:
                    instance.add_to_log(f"[ERROR] {str(e)}")
                instance.write({'state': 'stopped'})

    def start_instance(self):

        """Start the Odoo instance (runs as a background cron job)."""
        self.add_to_log("[INFO] Starting Odoo Instance on Remote Tenant Server")
        ssh = None
        _logger.info("************************************* test 1")
        try:
            tenant_server = self.tenant_server_id
            if not tenant_server:
                raise UserError(_("Tenant server is not set for this instance."))
            if tenant_server.remaining_instance <= 0:
                raise UserError(_("No remaining instances available on the selected tenant server."))
            _logger.info("************************************* test 2")
            ssh = self._get_ssh_client()
            _logger.info("************************************* test 13")
            self.add_to_log("--------------- COMMAND STARTED ---------------")

            # command = f"sudo ../../scripts/init_storage.sh \"{self.name}\""
            # script_dir = os.path.dirname(os.path.abspath(__file__))
            # result = subprocess.run(command, shell=True, capture_output=True, text=True, cwd=script_dir)
            # self.add_to_log(result.stdout)
            cmd = f"sudo /root/sfs_zoorya/scripts/init_storage.sh \"{self.name}\""
            self.add_to_log(self.tenant_server_id)
            result = self.ssh_execute(cmd, True)
            self.add_to_log(result['stdout'])
            
            if result['exit_status'] == 4:
                # start the docker instance and update status
                modified_path = f"/root/sfs_zoorya/odoo_instances/{self.name}/data/docker-compose.yml"
                cmd = f"sudo docker compose -f {modified_path} up -d -y"
                result = self.ssh_execute(cmd)
                self.write({'state': 'running'})
                
                return

            self.add_to_log(result)

            self.add_to_log("--------------- COMMAND COMPLETED ---------------")
            _logger.info("************************************* test 16")

            self._update_docker_compose_file()
            self._clone_repositories()
            _logger.info("************************************* test 16")
            


            cm_db1=f"sudo mkdir -p /mnt/micro_saas/{self.name}/db"
            self.ssh_execute(cm_db1)

            cm_db2=f"sudo chmod -R 755 /mnt/micro_saas/{self.name}/db"
            self.ssh_execute(cm_db2)
            cm_db3=f"sudo chown -R $(whoami):$(whoami) /mnt/micro_saas/{self.name}/db"
            self.ssh_execute(cm_db3)
            
            cm_odoo1=f"sudo mkdir -p /mnt/micro_saas/{self.name}/odoo"
            self.ssh_execute(cm_odoo1)

            cm_odoo2=f"sudo chmod -R 755 /mnt/micro_saas/{self.name}/odoo"
            self.ssh_execute(cm_odoo2)
            cm_odoo3=f"sudo chown -R $(whoami):$(whoami) /mnt/micro_saas/{self.name}/odoo"
            self.ssh_execute(cm_odoo3)


            modified_path = f"/root/sfs_zoorya/odoo_instances/{self.name}/data/docker-compose.yml"
            cmd = f"sudo docker compose -f {modified_path} up -d -y"
            _logger.info("************************************* test 17")

            result = self.ssh_execute(cmd)
            self._create_odoo_conf()

            self.add_to_log("[INFO] docker compose run started on remote server")
            self.add_to_log(f"[INFO] Output: {result['stdout']}")

            self.add_to_log("--------------- NGINX COMMAND STARTED ---------------")
            command = f"sudo ../../scripts/init_nginx.sh \"{self.name}\" \"{self.tenant_server_id.ip_address}\" \"{self.http_port}\""
            script_dir = os.path.dirname(os.path.abspath(__file__))
            result = subprocess.run(command, shell=True, capture_output=True, text=True, cwd=script_dir)
            self.add_to_log(result.stdout)
            self.add_to_log("--------------- NGINX COMMAND COMPLETED ---------------")

            self.domain_name = f'http://{self.name}.aa.com'
            self.write({'state': 'running'})
            
            self.add_to_log(f"[INFO] Instance state: {self.state}")
            # self.tenant_service_update()

            # if not self.cridentail_sent:

            #     self._schedule_job('tenant_service_update', delay_seconds=10)
            # else:
            # self.tenant_service_update()


            # Schedule tenant_service_update as a background job
            # self._schedule_job('tenant_service_update', delay_seconds=30)

        except Exception as e:
            self.add_to_log("[ERROR] Failed to start instance on remote server -----------------------------------------")
            self.add_to_log(str(e))
            self.write({'state': 'error'})
        finally:
            if ssh:
                ssh.close()


    # def start_instance(self):
    #     """Trigger start_instance as a one-time cron job after 10 seconds."""
    #     if self:
    #         # Optionally set an initial state
    #         self.write({'state': 'draft'})  # Reset state before starting (optional)
    #         self._schedule_job('action_start_instance', delay_seconds=5)
            
    #         self.add_to_log(f"[INFO] Scheduled start_instance for instance {self.name} to run in 10 seconds")
    #         return {
    #             'type': 'ir.actions.client',
    #             'tag': 'display_notification',
    #             'params': {
    #                 'title': _('Instance Starting'),
    #                 'message': _('The instance is scheduled to start in the background. Please check the status later.'),
    #                 'sticky': False,
    #             }
    #         }
    #     return True
    
    def _schedule_job(self, method_name, delay_seconds=0, field_to_store_cron='start_cron_id'):
        """Schedule a one-time job and store its ID."""
        cron_model = self.env['ir.cron']
        execution_time = datetime.now() + timedelta(seconds=delay_seconds)
        cron_vals = {
            'name': f"One-time {method_name} for {self.name}",
            'model_id': self.env['ir.model']._get(self._name).id,
            'state': 'code',
            'code': f"model.browse({self.id}).{method_name}()",
            'interval_number': 1,
            'interval_type': 'minutes',
            'numbercall': 1,
            'nextcall': execution_time,
            'active': True,
        }
        cron = cron_model.create(cron_vals)
        self.write({field_to_store_cron: cron.id})  # Store the cron ID in the specified field
        self.add_to_log(f"[INFO] Scheduled {method_name} at {execution_time} with cron ID {cron.id}")
        return cron
    # def _create_one_time_cron_job(self):
    #     """Create a one-time cron job to run tenant_service_update after 30 seconds."""
    #     _logger.info("######################### called cron job ******************")
    #     cron_model = self.env['ir.cron']
    #     execution_time = datetime.now() + timedelta(seconds=30)
    #     cron_vals = {
    #         'name': f"One-time tenant update for {self.name}",
    #         'model_id': self.env['ir.model']._get(self._name).id,
    #         'state': 'code',
    #         'code': f"model.browse({self.id}).tenant_service_update()",
    #         'interval_number': 1,
    #         'interval_type': 'minutes',
    #         'numbercall': 1,  # Ensures it runs only once
    #         'nextcall': execution_time,
    #         'active': True,
    #     }
    #     cron = cron_model.create(cron_vals)
    #     self.add_to_log(f"[INFO] One-time cron job scheduled at {execution_time} with ID {cron.id}")

    def _modify_docker_compose_file(self, modified_path, container_name):
        ssh = None
        sftp = None
        try:
            ssh = self._get_ssh_client()
            sftp = ssh.open_sftp()
            temp_local_path = f"/tmp/{os.path.basename(modified_path)}"
            with open(temp_local_path, 'w') as file:
                docker_compose_data = self.result_dc_body.replace("CONTAINER_NAME_PLACEHOLDER", container_name)
                file.write(docker_compose_data)
            sftp.put(temp_local_path, modified_path)
            os.remove(temp_local_path)
        except Exception as e:
            self.add_to_log(f"[ERROR] Failed to modify docker compose file on remote server: {str(e)}")
        finally:
            if sftp:
                sftp.close()
            if ssh:
                ssh.close()

    def stop_instance(self):
        for instance in self:
            if instance.state == 'running':
                self.add_to_log("[INFO] Stopping Odoo Instance on Remote Tenant Server")
                ssh = None
                try:
                    ssh = instance._get_ssh_client()
                    modified_path = f"/root/sfs_zoorya/odoo_instances/{instance.name}/data/docker-compose.yml"
                    cmd = f"sudo docker compose -f {modified_path} down"
                    result = instance.ssh_execute(cmd)
                    self.add_to_log(f"[INFO] Output: {result['stdout']}")
                    instance.write({'state': 'stopped'})
                except Exception as e:
                    self.add_to_log(f"[ERROR] Failed to stop Odoo Instance on remote server: {str(e)}")
                finally:
                    if ssh:
                        ssh.close()

    def restart_instance(self):
        for instance in self:
            if instance.state == 'running':
                self.add_to_log("[INFO] Restarting Odoo Instance on Remote Tenant Server")
                ssh = None
                try:
                    ssh = instance._get_ssh_client()
                    modified_path = f"/root/sfs_zoorya/odoo_instances/{instance.name}/data/docker-compose.yml"
                    cmd = f"sudo docker compose -f {modified_path} restart"
                    result = instance.ssh_execute(cmd)
                    self.add_to_log(f"[INFO] Output: {result['stdout']}")
                    instance.write({'state': 'running'})
                except Exception as e:
                    self.add_to_log(f"[ERROR] Failed to restart Odoo Instance on remote server: {str(e)}")
                    instance.write({'state': 'stopped'})
                finally:
                    if ssh:
                        ssh.close()

    def unlink(self):
        for instance in self:
            if instance.state == 'running':
                ssh = None
                try:
                    ssh = instance._get_ssh_client()
                    modified_path = f"/root/sfs_zoorya/odoo_instances/{instance.name}/data/docker-compose.yml"
                    cmd = f"sudo docker compose -f {modified_path} down"
                    result = instance.ssh_execute(cmd)
                    self.add_to_log(f"[INFO] Output: {result['stdout']}")
                    cmd = f"rm -rf /root/sfs_zoorya/odoo_instances/{instance.name}"
                    result = instance.ssh_execute(cmd)
                    if result['stderr']:
                        self.add_to_log(f"[ERROR] Failed to delete instance directory on remote server: {result['stderr']}")
                except Exception as e:
                    self.add_to_log(f"[ERROR] Failed to clean up instance on remote server: {str(e)}")
                finally:
                    if ssh:
                        ssh.close()
        return super(OdooDockerInstance, self).unlink()

    def ssh_execute(self, cmd, skip = False):
        """Execute a command over SSH on the tenant server."""
        ssh = None
        try:
            ssh = self._get_ssh_client()
            stdin, stdout, stderr = ssh.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            result = {
                'stdout': stdout.read().decode(),
                'stderr': stderr.read().decode(),
                'exit_status': exit_status
            }
            
            if skip:
                return result
            
            if exit_status != 0:
                raise Exception(f"Command failed with exit status {exit_status}: {result['stderr']}")
            else:
                return result
        except Exception as e:
            self.add_to_log(f"[ERROR] Failed to execute SSH command on remote server: {str(e)}")
            self.add_to_log(f"[INFO] **** Execute the following command manually on the remote server for more details **** {cmd}")
            raise
        finally:
            if ssh:
                ssh.close()

    def _makedirs(self, path):
        ssh = None
        try:
            ssh = self._get_ssh_client()
            cmd = f"mkdir -p {path}"
            stdin, stdout, stderr = ssh.exec_command(cmd)
            error = stderr.read().decode()
            if error:
                self.add_to_log(f"[ERROR] Failed to create directory {path} on remote server: {error}")
                raise Exception(error)
            self.add_to_log(f"[INFO] Directory {path} created on remote server")
        except Exception as e:
            self.add_to_log(f"[ERROR] Error while creating directory {path} on remote server: {str(e)}")
            raise
        finally:
            if ssh:
                ssh.close()

    def create_file(self, modified_path, result_dc_body):
        _logger.info("================================ create_file")
        _logger.info(modified_path)
        _logger.info("================================ create_file 1")

        _logger.info(result_dc_body)
        _logger.info("================================ create_file 2")

        _logger.info(self.result_odoo_conf)

        ssh = None
        sftp = None
        try:
            ssh = self._get_ssh_client()
            sftp = ssh.open_sftp()
            temp_local_path = f"/tmp/{os.path.basename(modified_path)}"
            with open(temp_local_path, "w") as temp_file:
                temp_file.write(result_dc_body)
            sftp.put(temp_local_path, modified_path)
            self.add_to_log(f"[INFO] File {modified_path} created/updated on remote server")
            os.remove(temp_local_path)
        except Exception as e:
            self.state = 'error'
            self.add_to_log(f"[ERROR] Failed to create/update file {modified_path} on remote server: {str(e)}")
            raise
        finally:
            if sftp:
                sftp.close()
            if ssh:
                ssh.close()
