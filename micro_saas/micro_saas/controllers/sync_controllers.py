from odoo import http
from odoo.http import request
import json
import logging
import paramiko  # Requires 'paramiko' package: pip install paramiko
_logger = logging.getLogger(__name__)

class MicroSaasSyncController(http.Controller):

    @http.route('/micro_saas/sync_templates', type='http', auth='public', methods=['GET'])
    def sync_templates(self):
        """Return a list of docker.compose.template records for syncing."""
        try:
            templates = request.env['docker.compose.template'].sudo().search_read(
                domain=[],
                fields=['name'],  # Add more fields if needed
            )
            return json.dumps(templates)
        except Exception as e:
            _logger.error(f"Error in sync_templates controller: {str(e)}")
            return json.dumps({'error': str(e)}, status=500)

    @http.route('/micro_saas/create_instance', type='json', auth='public', methods=['POST'])
    def create_instance(self, **kwargs):
        """Create an odoo.docker.instance record based on received data."""
        try:
            data = json.loads(http.request.httprequest.data)
            _logger.info(f"Received instance creation request: {data}")

            # Extract and validate data
            instance_name = data.get('name')
            customer_data = data.get('customer')
            template_name = data.get('template_name')
            purchased_date = data.get('purchased_date')
            expiration_date = data.get('expiration_date')
            purchased_user = data.get('purchased_user', 5)

            if not all([instance_name, customer_data, template_name]):
                return {'success': False, 'error': 'Missing required fields: name, customer, or template_name'}

            # Find or create the customer (res.partner)
            partner = request.env['res.partner'].sudo().search([('name', '=', customer_data['name'])], limit=1)
            if not partner:
                partner = request.env['res.partner'].sudo().create(customer_data)
            customer_id = partner.id

            # Find the template
            template = request.env['docker.compose.template'].sudo().search([('name', '=', template_name)], limit=1)
            if not template:
                return {'success': False, 'error': f"Template '{template_name}' not found"}
            
            instance_model = request.env['odoo.docker.instance'].sudo()
            default_vals = instance_model.default_get(['tenant_server_id', 'state', 'purchased_user', 'cpu_limit', 'memory_limit', 'storage_limit_gb', 'remaining_storage'])
            _logger.info(f"Default values from default_get: {default_vals}")
            tenant_server = request.env['tenant.server'].sudo().browse(default_vals['tenant_server_id'])
            if tenant_server:
                pass
            else:
                return {'success': False, 'error': 'No tenant server available or specified'}
            # Simulate _get_available_port logic
            def get_available_port(start_port=8069, end_port=9900):
                used_ports = set()
                # Check ports in Odoo database
                instances = instance_model.search_read(
                    [], ['http_port', 'longpolling_port']
                )
                for inst in instances:
                    if inst.get('http_port'):
                        used_ports.add(int(inst['http_port']))
                    if inst.get('longpolling_port'):
                        used_ports.add(int(inst['longpolling_port']))

                # SSH client setup
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
                        # Check port availability on tenant server
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
                'purchased_date': purchased_date,
                'expiration_date': expiration_date,
                'purchased_user': purchased_user,
                'storage_limit_gb': template.storage_limit_gb or 10.0,
                'cpu_limit': template.cpu_limit or 1.0,
                'memory_limit': template.memory_limit or 1024.0,
                'network_limit': template.network_limit or 100.0,
                'template_dc_body': template.template_dc_body or '',
            }

            # Handle variable_ids (simulate onchange_template_id)
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
            instance = request.env['odoo.docker.instance'].sudo().create(instance_vals)
            instance.with_delay().start_instance()  # Queue the start_instance job

            return {'success': True, 'instance_id': instance.id}
        except Exception as e:
            _logger.error(f"Error in create_instance controller: {str(e)}")
            return {'success': False, 'error': str(e)}