from odoo import models, fields, api, _
from odoo.exceptions import UserError
import logging
from datetime import datetime, timedelta
import paramiko
import json
_logger = logging.getLogger(__name__)

class CrmLead(models.Model):
    _inherit = 'crm.lead'
    docker_compose_template = fields.Many2one('docker.compose.template', string="Products")
    is_validated = fields.Boolean(string="Validated")

    def action_validate_lead(self):
        """Create an odoo.docker.instance record directly from the lead."""
        self.ensure_one()
        _logger.info("Starting action_validate_lead")

        if not self.docker_compose_template:
            raise UserError("No instance template selected.")
        _logger.info("***************************************************** ab1")

        # Prepare instance data
        instance_name = self.partner_name.lower().replace(" ", "")
        customer_data = {
            'name': self.partner_id.name,
            'email': self.partner_id.email or f"noemail_{self.partner_id.id}@example.com",
            'phone': self.partner_id.phone or False,
            'company_type': self.partner_id.company_type or 'person',
        }
        _logger.info("***************************************************** ab4")

        try:
            # Find or create the customer (res.partner)
            partner = self.env['res.partner'].sudo().search([('name', '=', customer_data['name'])], limit=1)
            if not partner:
                partner = self.env['res.partner'].sudo().create(customer_data)
            customer_id = partner.id
            _logger.info("***************************************************** ab5")

            # Find the template
            template = self.docker_compose_template
            if not template:
                raise UserError(f"Template '{self.docker_compose_template.name}' not found")

            instance_model = self.env['odoo.docker.instance'].sudo()
            default_vals = instance_model.default_get(['tenant_server_id', 'state', 'purchased_user', 'cpu_limit', 'memory_limit', 'storage_limit_gb', 'remaining_storage'])
            _logger.info(f"Default values from default_get: {default_vals}")
            tenant_server = self.env['tenant.server'].sudo().browse(default_vals['tenant_server_id'])
            if not tenant_server:
                raise UserError('No tenant server available or specified')

            # Simulate _get_available_port logic
            def get_available_port(start_port=8069, end_port=9900):
                used_ports = set()
                instances = instance_model.search_read([], ['http_port', 'longpolling_port'])
                for inst in instances:
                    if inst.get('http_port'):
                        used_ports.add(int(inst['http_port']))
                    if inst.get('longpolling_port'):
                        used_ports.add(int(inst['longpolling_port']))

                ssh = paramiko.SSHClient()
                ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                try:
                    ssh.connect(
                        tenant_server.ip_address,
                        port=tenant_server.ssh_port,
                        username=tenant_server.ssh_user,
                        password=tenant_server.ssh_password,
                        timeout=10
                    )
                    for port in range(start_port, end_port + 1):
                        if port in used_ports:
                            continue
                        cmd = f"ss -tuln | grep ':{port} ' || echo 'FREE'"
                        stdin, stdout, stderr = ssh.exec_command(cmd)
                        output = stdout.read().decode('utf-8').strip()
                        error = stderr.read().decode('utf-8').strip()
                        if error:
                            _logger.error(f"SSH error checking port {port}: {error}")
                            continue
                        if output == 'FREE':
                            return port
                    raise Exception("No available ports found in range")
                finally:
                    ssh.close()

            http_port = get_available_port()
            longpolling_port = get_available_port(int(http_port) + 1)

            # Prepare instance values
            instance_vals = {
                'name': instance_name,
                'customer': customer_id,
                'state': 'draft',
                'http_port': str(http_port),
                'longpolling_port': str(longpolling_port),
                'template_id': template.id,
                'purchased_date': fields.Date.today().strftime('%Y-%m-%d'),
                'expiration_date': (fields.Date.today() + timedelta(days=180)).strftime('%Y-%m-%d'),
                'purchased_user': 5,
                'storage_limit_gb': template.storage_limit_gb or 10.0,
                'cpu_limit': template.cpu_limit or 1.0,
                'memory_limit': template.memory_limit or 1024.0,
                'network_limit': template.network_limit or 100.0,
                'template_dc_body': template.template_dc_body or '',
                'tenant_server_id': tenant_server.id,
            }

            # Handle variable_ids
            if template.variable_ids:
                variable_ids = []
                for var in template.variable_ids:
                    demo_value = var.demo_value or ''
                    if var.name == '{{HTTP-PORT}}':
                        demo_value = str(http_port)
                    elif var.name == '{{LONGPOLLING-PORT}}':
                        demo_value = str(longpolling_port)
                    elif var.name == '{{CPU-LIMIT}}':
                        demo_value = str(instance_vals['cpu_limit'])
                    elif var.name == '{{MEMORY-LIMIT}}':
                        demo_value = str(instance_vals['memory_limit'])
                    elif var.name == '{{NETWORK-LIMIT}}':
                        demo_value = str(instance_vals['network_limit'])
                    elif var.name == '{{STORAGE-LIMIT}}':
                        demo_value = str(instance_vals['storage_limit_gb'])
                    elif var.name == '{{INSTANCE-NAME}}':
                        demo_value = instance_name
                    variable_ids.append((0, 0, {'name': var.name, 'demo_value': demo_value}))
                instance_vals['variable_ids'] = variable_ids

            # Handle repository_line
            if template.repository_line:
                instance_vals['repository_line'] = [(0, 0, {
                    'repository_id': line.repository_id.id,
                    'name': line.name
                }) for line in template.repository_line]

            # Compute result_dc_body
            if template.template_dc_body and instance_vals.get('variable_ids'):
                result_dc_body = template.template_dc_body
                for var_cmd in instance_vals['variable_ids']:
                    var_data = var_cmd[2]
                    result_dc_body = result_dc_body.replace(var_data['name'], var_data['demo_value'] or '')
                instance_vals['result_dc_body'] = result_dc_body
            else:
                instance_vals['result_dc_body'] = template.template_dc_body or ''

            # Create the instance
            instance = self.env['odoo.docker.instance'].sudo().create(instance_vals)
            _logger.info(f"Created odoo.docker.instance with ID: {instance.id}")
            instance.create_job_start_instance()  # Queue the start_instance job

            # Update lead status
            self.write({'is_validated': True})

            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': 'Success',
                    'message': f"Docker Instance created with Name: {instance_name}",
                    'type': 'success',
                }
            }

        except Exception as e:
            _logger.error(f"Error creating odoo.docker.instance from lead: {str(e)}")
            raise UserError(f"Failed to create Docker Instance: {str(e)}")