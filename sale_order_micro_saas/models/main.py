from odoo import models, fields, api, _
from odoo.exceptions import UserError
import logging
from datetime import datetime, timedelta
import paramiko
import json
_logger = logging.getLogger(__name__)

import time
class SaleOrder(models.Model):
    _inherit = 'sale.order'

    is_instance_created = fields.Boolean(string="Instance Created", default=False)
    instance_id = fields.Many2one('odoo.docker.instance', string="Docker Instance", readonly=True)
    def action_confirm(self):
        if not self:
            _logger.warning("No sale order records to confirm.")
            return super(SaleOrder, self).action_confirm()

        self.ensure_one()
        _logger.info("Starting process_subscription_after_payment for sale order %s (ID: %d)", self.name, self.id)

        if self.is_subscription:
            _logger.info("Sale order %s is a subscription, creating instance", self.name)
            if not self.is_instance_created:
                self.action_create_instance()
            else:
                self.update_expiration_date()
            _logger.info("Instance creation completed for sale order %s", self.name)
        else:
            _logger.info("Sale order %s is not a subscription, skipping instance creation", self.name)

        _logger.info("Completed process_subscription_after_payment for sale order %s", self.name)

        return super(SaleOrder, self).action_confirm()

    def process_subscription_after_payment(self):
        """Custom method to process the sale order after payment confirmation."""
        time.sleep(10)
        self.ensure_one()
        _logger.info("Starting process_subscription_after_payment for sale order %s (ID: %d)", self.name, self.id)

      
        # Create the odoo.docker.instance
        if self.is_subscription:
            _logger.info("Sale order %s is a subscription, creating instance", self.name)
            if not self.is_instance_created:
             self.action_create_instance()
            else:
                self.update_expiration_date()
            _logger.info("Instance creation completed for sale order %s", self.name)
        else:
            _logger.info("Sale order %s is not a subscription, skipping instance creation", self.name)

        _logger.info("Completed process_subscription_after_payment for sale order %s", self.name)

    def _get_docker_template_from_products(self):
        """Helper method to fetch the docker template based on sale order products."""
        _logger.info("Entering _get_docker_template_from_products method")
        if not self.order_line:
            _logger.warning("No order lines found in sale order")
            raise UserError("No products found in the sale order.")

        templates = self.env['docker.compose.template'].sudo().search([])
        _logger.info(f"Found {len(templates)} docker compose templates")
        if not templates:
            _logger.warning("No docker templates available in the system")
            raise UserError("No Docker templates defined in the system.")

        matched_product = None
        for line in self.order_line:
            matching_templates = templates.filtered(lambda t: t.product_id.id == line.product_id.id)
            _logger.info(f"Checking line product ID {line.product_id.id} - Matching templates: {matching_templates.ids}")
            if line.product_id and matching_templates:
                matched_product = line.product_id
                _logger.info(f"Found matching product: {matched_product.name}")
                break

        if not matched_product:
            _logger.warning("No matching product with docker template found")
            raise UserError("No product with a matching Docker template found in the sale order.")

        template = self.env['docker.compose.template'].sudo().search([('product_id', '=', matched_product.id)], limit=1)
        _logger.info(f"Returning template: {template.id} for product {matched_product.name}")
        return template



    def action_create_instance(self):
        
        """Create an odoo.docker.instance record directly from the sale order."""
        self.ensure_one()
        _logger.info("Starting action_create_instance for sale order %s (ID: %d)", self.name, self.id)

        # Fetch the docker template
        _logger.info("Fetching docker template for sale order %s", self.name)
        template = self._get_docker_template_from_products()
        if not template:
            _logger.error("No instance template matched with sale order %s products", self.name)
            raise UserError("No instance template matched with the sale order products.")
        _logger.info("Successfully retrieved template: %s (ID: %d)", template.name, template.id)

        # Generate instance name
        instance_name = (self.partner_id.parent_id.name if self.partner_id.parent_id 
                        else self.partner_id.name or "default_customer").lower().replace(" ", "_")
        _logger.info("Generated instance name: %s from partner %s (ID: %d)", 
                     instance_name, self.partner_id.name, self.partner_id.id)

        # Prepare customer data
        customer_data = {
            'name': self.partner_id.name,
            'email': self.partner_id.email or f"noemail_{self.partner_id.id}@example.com",
            'phone': self.partner_id.phone or False,
            'company_type': self.partner_id.company_type or 'person',
        }
        _logger.info("Prepared customer data: %s", customer_data)

        try:
            # Check or create partner
            _logger.info("Searching for existing partner with name: %s", customer_data['name'])
            partner = self.env['res.partner'].sudo().search([('name', '=', customer_data['name'])], limit=1)
            if not partner:
                _logger.info("No existing partner found. Creating new partner with data: %s", customer_data)
                partner = self.env['res.partner'].sudo().create(customer_data)
                _logger.info("Created new partner with ID: %d", partner.id)
            else:
                _logger.info("Found existing partner with ID: %d", partner.id)
            customer_id = partner.id

            # Initialize instance model and fetch defaults
            instance_model = self.env['odoo.docker.instance'].sudo()
            _logger.info("Fetching default values for odoo.docker.instance")
            default_vals = instance_model.default_get(['tenant_server_id', 'state', 'purchased_user', 'cpu_limit', 'memory_limit', 'storage_limit_gb', 'remaining_storage'])
            _logger.info("Default values retrieved: %s", default_vals)

            # Get tenant server
            tenant_server = self.env['tenant.server'].sudo().browse(default_vals['tenant_server_id'])
            if not tenant_server:
                _logger.error("No tenant server available or specified for sale order %s", self.name)
                raise UserError('No tenant server available or specified')
            _logger.info("Using tenant server: %s (ID: %d, IP: %s)", 
                         tenant_server.name, tenant_server.id, tenant_server.ip_address)

            # Function to get available port
            def get_available_port(start_port=8069, end_port=9900):
                _logger.info("Finding available port in range %d-%d for tenant server %s", 
                             start_port, end_port, tenant_server.name)
                used_ports = set()
                instances = instance_model.search_read([], ['http_port', 'longpolling_port'])
                for inst in instances:
                    if inst.get('http_port'):
                        used_ports.add(int(inst['http_port']))
                    if inst.get('longpolling_port'):
                        used_ports.add(int(inst['longpolling_port']))
                _logger.info("Found %d used ports: %s", len(used_ports), list(used_ports))

                ssh = paramiko.SSHClient()
                ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                try:
                    _logger.info("Connecting to tenant server %s (IP: %s, Port: %d, User: %s)", 
                                 tenant_server.name, tenant_server.ip_address, tenant_server.ssh_port, tenant_server.ssh_user)
                    ssh.connect(
                        tenant_server.ip_address,
                        port=tenant_server.ssh_port,
                        username=tenant_server.ssh_user,
                        password=tenant_server.ssh_password,
                        timeout=10
                    )
                    _logger.info("SSH connection established")

                    for port in range(start_port, end_port + 1):
                        if port in used_ports:
                            _logger.debug("Port %d already in use, skipping", port)
                            continue
                        cmd = f"ss -tuln | grep ':{port} ' || echo 'FREE'"
                        _logger.info("Checking port %d with command: %s", port, cmd)
                        stdin, stdout, stderr = ssh.exec_command(cmd)
                        output = stdout.read().decode('utf-8').strip()
                        _logger.info("Port %d check result: %s", port, output)
                        if output == 'FREE':
                            _logger.info("Found available port: %d", port)
                            return port
                    _logger.error("No available ports found in range %d-%d", start_port, end_port)
                    raise Exception("No available ports found in range")
                finally:
                    ssh.close()
                    _logger.info("SSH connection closed")

            # Get ports and expiration date
            _logger.info("Getting HTTP port")
            http_port = get_available_port()
            _logger.info("Assigned HTTP port: %d", http_port)
            _logger.info("Getting longpolling port starting from %d", int(http_port) + 1)
            longpolling_port = get_available_port(int(http_port) + 1)
            _logger.info("Assigned longpolling port: %d", longpolling_port)
            expiration_date = self.next_invoice_date
            _logger.info("########################### expiration_date")
            _logger.info(expiration_date)
            if not expiration_date:
                _logger.warning("next_invoice_date is None for sale order %s. Using fallback: today + 30 days", self.name)
                expiration_date = fields.Date.today() + timedelta(days=30)  # Fallback to 30 days from today
            _logger.info("Expiration date set to: %s", expiration_date.strftime('%Y-%m-%d'))

            # Prepare instance values
            instance_vals = {
                'name': instance_name,
                'customer': customer_id,
                'state': 'draft',
                'http_port': str(http_port),
                'longpolling_port': str(longpolling_port),
                'template_id': template.id,
                'purchased_date': fields.Date.today().strftime('%Y-%m-%d'),
                'expiration_date': expiration_date.strftime('%Y-%m-%d') if expiration_date else False,
                'purchased_user': 5,
                'storage_limit_gb': template.storage_limit_gb or 10.0,
                'cpu_limit': template.cpu_limit or 1.0,
                'memory_limit': template.memory_limit or 1024.0,
                'network_limit': template.network_limit or 100.0,
                'template_dc_body': template.template_dc_body or '',
                'tenant_server_id': tenant_server.id,
            }
            _logger.info("Initial instance values prepared: %s", instance_vals)

            # Handle template variables
            if template.variable_ids:
                _logger.info("Processing %d template variables", len(template.variable_ids))
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
                    _logger.info("Added variable: %s with value %s", var.name, demo_value)
                instance_vals['variable_ids'] = variable_ids

            # Handle repository lines
            if template.repository_line:
                _logger.info("Processing %d repository lines", len(template.repository_line))
                instance_vals['repository_line'] = [(0, 0, {
                    'repository_id': line.repository_id.id,
                    'name': line.name
                }) for line in template.repository_line]
                _logger.info("Repository lines added: %s", instance_vals['repository_line'])

            # Generate result_dc_body
            if template.template_dc_body and instance_vals.get('variable_ids'):
                _logger.info("Generating result_dc_body from template body")
                result_dc_body = template.template_dc_body
                for var_cmd in instance_vals['variable_ids']:
                    var_data = var_cmd[2]
                    _logger.info("Replacing %s with %s in template body", var_data['name'], var_data['demo_value'])
                    result_dc_body = result_dc_body.replace(var_data['name'], var_data['demo_value'] or '')
                instance_vals['result_dc_body'] = result_dc_body
                _logger.info("Generated result_dc_body: %s", result_dc_body[:100] + "..." if len(result_dc_body) > 100 else result_dc_body)
            else:
                instance_vals['result_dc_body'] = template.template_dc_body or ''
                _logger.info("Using default template_dc_body: %s", instance_vals['result_dc_body'][:100] + "..." if instance_vals['result_dc_body'] else "None")

            # Create the instance
            _logger.info("Creating odoo.docker.instance with values: %s", instance_vals)
            instance = self.env['odoo.docker.instance'].sudo().create(instance_vals)
            _logger.info("Created odoo.docker.instance with ID: %d for sale order %s", instance.id, self.name)

            # Link instance and start job
            self.instance_id = instance.id
            _logger.info("Linked instance %s (ID: %d) to sale order %s", instance.name, instance.id, self.name)
            instance.create_job_start_instance()
            _logger.info("Scheduled job to start instance %s", instance.name)
            self.write({'is_instance_created': True})
            _logger.info("Updated sale order %s with is_instance_created = True", self.name)

            _logger.info("Completed action_create_instance for sale order %s", self.name)
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
            _logger.error("Error creating odoo.docker.instance from sale order %s: %s", self.name, str(e), exc_info=True)
            raise UserError(f"Failed to create Docker Instance: {str(e)}")

    def update_expiration_date(self):
        self.ensure_one()
        _logger.info(f"Starting update_expiration_date for sale order {self.name}")

        instance = self.instance_id
        if not instance:
            _logger.error(f"No instance linked to sale order {self.name}")
            raise UserError(f"No Docker instance linked to Sale Order: {self.name}")

        current_expiration = instance.expiration_date or fields.Date.today()
        _logger.info(f"Current expiration date: {current_expiration}")
        new_expiration_date = self.next_invoice_date
        new_expiration_date_str = new_expiration_date.strftime('%Y-%m-%d')
        _logger.info(f"New expiration date calculated: {new_expiration_date_str}")

        try:

            update_vals = {
                'expiration_date': new_expiration_date_str,
                'state': 'running' if (new_expiration_date - fields.Date.today()).days > 5 else 'grace',
                'is_expires': False,
            }
            _logger.info(f"Updating instance with values: {update_vals}")
            instance.write(update_vals)

            instance.start_instance()
            instance.tenant_service_update()
            _logger.info(f"Updated odoo.docker.instance {instance.name} expiration to {new_expiration_date_str}")

            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'title': 'Success',
                    'message': f"Expiration date updated to {new_expiration_date_str} for instance {instance.name}",
                    'type': 'success',
                }
            }

        except Exception as e:
            _logger.error(f"Error updating expiration date for instance from sale order: {str(e)}")
            raise UserError(f"Failed to update expiration date: {str(e)}")




# class PaymentTransaction(models.Model):
#     _inherit = 'payment.transaction'

#     def _set_done(self, state_message=None, extra_allowed_states=()):
#         """ Update the transactions' state to `done` and process custom instance creation logic.

#         :param str state_message: The reason for setting the transactions in the state `done`.
#         :param tuple[str] extra_allowed_states: Extra states allowed as source states for 'done'.
#         :return: The updated transactions.
#         :rtype: recordset of `payment.transaction`
#         """
#         _logger.info("Starting _set_done for transaction %s (current state: %s)", self.reference, self.state)
#         _logger.info("Parameters - state_message: %s, extra_allowed_states: %s", state_message, extra_allowed_states)

#         # Call the parent (super) _set_done method
#         _logger.info("Calling super()._set_done for %s", self.reference)
#         txs_to_process = super(PaymentTransaction, self)._set_done(state_message=state_message, extra_allowed_states=extra_allowed_states)
#         _logger.info("Super _set_done completed for %s, returned: %s", self.reference, txs_to_process)

#         # Custom logic after state is 'done'
#         _logger.info("Processing custom logic for transaction %s after setting state to 'done'", self.reference)
        
#         # Get related invoices (from direct invoice payment or sale order)
#         invoices = self.invoice_ids or self.sale_order_ids.mapped('invoice_ids')
#         _logger.info("Found %d related invoices for transaction %s: %s", 
#                      len(invoices), self.reference, invoices.mapped('name'))

#         if invoices:
#             for move in invoices:
#                 _logger.info("Processing invoice: %s (Type: %s, State: %s)", 
#                             move.name, move.move_type, move.state)
#                 if move.move_type in ('out_invoice', 'out_refund'):
#                     sale_orders = move.invoice_line_ids.mapped('sale_line_ids.order_id')
#                     _logger.info("Found %d sale orders for invoice %s: %s", 
#                                 len(sale_orders), move.name, sale_orders.mapped('name'))

#                     for order in sale_orders:
#                         _logger.info("------------------------------------------------")
#                         _logger.info("Evaluating sale order: %s (ID: %d)", order.name, order.id)
#                         _logger.info("Subscription state: %s", order.subscription_state)
#                         _logger.info("Is renewing: %s", order.is_renewing)
#                         _logger.info("Is subscription: %s", order.is_subscription)
#                         _logger.info("Partner: %s (ID: %d)", order.partner_id.name, order.partner_id.id)

#                         template = order._get_docker_template_from_products()
#                         _logger.info("Retrieved template: %s (ID: %d)", 
#                                     template.name, template.id if template else "None")

#                         instance_name = (order.partner_id.parent_id.name if order.partner_id.parent_id 
#                                        else order.partner_id.name or "default_customer").lower().replace(" ", "_").replace("/", "_")
#                         _logger.info("Generated instance name: %s", instance_name)

#                         existing_instance = self.env['odoo.docker.instance'].sudo().search([
#                             ('customer', '=', order.partner_id.id),
#                             ('name', '=', instance_name),
#                             ('template_id', '=', template.id),
#                         ], limit=1)
#                         _logger.info("Existing instance: %s (ID: %d)", 
#                                     existing_instance.name if existing_instance else "None", 
#                                     existing_instance.id if existing_instance else 0)

#                         if order.is_subscription:
#                             if existing_instance:
#                                 _logger.info("Assigning instance %s to %s", existing_instance.name, order.name)
#                                 order.instance_id = existing_instance
#                                 if order.is_renewing:
#                                     _logger.info("Renewing %s - Updating expiration", order.name)
#                                     order.update_expiration_date()
#                                     _logger.info("Expiration date updated for %s", order.name)
#                                 if not order.is_instance_created:
#                                     order.is_instance_created = True
#                                     _logger.info("Set is_instance_created for %s", order.name)
#                             else:
#                                 _logger.info("No instance found for %s", order.name)
#                                 if not order.is_instance_created:
#                                     order.action_create_instance()
#                                     order.is_instance_created = True
#                                     _logger.info("Created new instance for %s", order.name)
#                         else:
#                             _logger.info("%s is not a subscription", order.name)
#                 else:
#                     _logger.info("Invoice %s is not a customer invoice/refund", move.name)
#         else:
#             _logger.info("No invoices linked to transaction %s", self.reference)

#         _logger.info("Completed _set_done for transaction %s", self.reference)
#         return txs_to_process