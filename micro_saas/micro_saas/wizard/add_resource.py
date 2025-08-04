from odoo import models, fields, api
import os
import logging
_logger = logging.getLogger(__name__)
import subprocess


class AddResourceWizard(models.TransientModel):
    _name = "add.resource.wizard"
    _description = "Add Resource Wizard"

    user = fields.Integer(string="User")
    storage = fields.Float(string="Storage (GB)")
    cpu = fields.Float(string="CPU Cores")
    memory_ram = fields.Float(string="Memory RAM (GB)")
    network = fields.Float(string="Network Bandwidth (Mbps)")

    @api.model
    def default_get(self, fields_list):
        _logger.info("Entering default_get method")
        res = super(AddResourceWizard, self).default_get(fields_list)
        _logger.info(f"Default get result: {res}")
        active_id = self.env.context.get('active_id')
        _logger.info(f"Active ID from context: {active_id}")
        if active_id:
            _logger.info(f"Fetching instance with ID: {active_id}")
            instance = self.env['odoo.docker.instance'].browse(active_id)
            _logger.info(f"Instance fetched: {instance.name}")
            res.update({
                'user': instance.purchased_user,
                'storage': instance.storage_limit_gb,
                'cpu': instance.cpu_limit,
                'memory_ram': instance.memory_limit,
                'network': instance.network_limit,
            })
            _logger.info(f"Updated res with instance values: {res}")
        _logger.info("Exiting default_get method")
        return res

    def action_confirm(self):
        """Action triggered when clicking the Confirm button."""
        _logger.info("Entering action_confirm method")
        active_id = self.env.context.get('active_id')
        _logger.info(f"Active ID from context: {active_id}")

        if active_id:
            _logger.info(f"Fetching instance with ID: {active_id}")
            instance = self.env['odoo.docker.instance'].browse(active_id)
            _logger.info(f"Instance fetched: {instance.name}")

            # Update instance fields
            _logger.info("Updating instance fields")
            instance.write({
                'storage_limit_gb': self.storage,
                'cpu_limit': self.cpu,
                'memory_limit': self.memory_ram,
                'network_limit': self.network,
                'purchased_user': self.user
            })
            _logger.info(f"Instance updated with: storage={self.storage}, cpu={self.cpu}, memory={self.memory_ram}, network={self.network}, user={self.user}")

            # Update tenant service
            _logger.info("Calling tenant_service_update")
            instance.tenant_service_update()
            _logger.info("########################## update resource #########################")

            # Regenerate docker-compose content
            _logger.info("Regenerating docker-compose content")
            instance.result_dc_body = instance._get_formatted_body(
                template_body=instance.template_dc_body,
                demo_fallback=True
            )
            _logger.info("Docker-compose content regenerated")

            # Sync variable_ids with new values
            _logger.info("Syncing variable_ids with template")
            instance.variable_ids = instance.template_id.variable_ids
            _logger.info("Updating variable_ids with new values")
            instance.variable_ids.filtered(lambda r: r.name == '{{CPU-LIMIT}}').demo_value = str(self.cpu)
            instance.variable_ids.filtered(lambda r: r.name == '{{MEMORY-LIMIT}}').demo_value = str(self.memory_ram)
            instance.variable_ids.filtered(lambda r: r.name == '{{NETWORK-LIMIT}}').demo_value = str(self.network)
            instance.variable_ids.filtered(lambda r: r.name == '{{STORAGE-LIMIT}}').demo_value = str(self.storage)
            _logger.info("variable_ids updated")

            # Define remote path
            modified_path = f"/root/sfs_zoorya/odoo_instances/{instance.name}/data/docker-compose.yml"
            _logger.info(f"Remote docker-compose path: {modified_path}")

            instance.stop_instance()

            # Execute resize_storage.sh on remote server
            try:
                _logger.info("Starting storage resize command")
                instance.add_to_log("--------------- COMMAND STARTED ---------------")
                command = f"sudo /root/sfs_zoorya/scripts/resize_storage.sh \"{instance.name}\" \"{self.storage}\""
                
                result = instance.ssh_execute(command, True)
                # TODO: run the command using ssh
                instance.add_to_log(result['stdout'])
                
                if result['exit_status'] == 4:
                    pass

                instance.add_to_log("--------------- COMMAND COMPLETED ---------------")
            except Exception as e:
                _logger.error(f"Failed to resize storage: {str(e)}")
                instance.add_to_log(f"[ERROR] Failed to resize storage: {str(e)}")
                instance.write({'state': 'error'})
                return

            # Update docker-compose file on remote server
            try:
                _logger.info(f"Updating docker-compose.yml at {modified_path}")
                instance.create_file(modified_path, instance.result_dc_body)
                instance.add_to_log(f"[INFO] Updated docker-compose.yml at {modified_path}")
                _logger.info(f"########################## Updated docker-compose.yml at {modified_path} #########################")
            except Exception as e:
                _logger.error(f"Failed to update docker-compose.yml: {str(e)}")
                instance.add_to_log(f"[ERROR] Failed to update docker-compose.yml: {str(e)}")
                instance.write({'state': 'error'})
                return

            # Restart the instance with updated configuration on remote server
            _logger.info("Restarting instance with updated configuration")
            try:
                _logger.info(f"Stopping instance: docker-compose down")
                cmd = f"docker compose -f {modified_path} down"
                instance.ssh_execute(cmd)
                _logger.info("Instance stopped successfully")

                _logger.info(f"Starting instance: docker-compose up -d")
                cmd = f"docker compose -f {modified_path} up -d"
                result = instance.ssh_execute(cmd)
                _logger.info(f"Instance started successfully: {result['stdout']}")
                instance.add_to_log("[INFO] Instance restarted with updated configuration")
                instance.write({'state': 'running'})
            except Exception as e:
                _logger.error(f"Failed to restart instance: {str(e)}")
                instance.add_to_log(f"[ERROR] Failed to restart instance: {str(e)}")
                instance.write({'state': 'error'})
                # instance.start_instance()
                return

            _logger.info("########################## update resource #########################")

        _logger.info("Closing wizard")
        return {'type': 'ir.actions.act_window_close'}