from odoo import models, fields
import logging
import uuid
import os

class PosDownLoadWizard(models.TransientModel):
    _name="pos.log.download"
    
    password = fields.Char("Password")
        
    def action_confirm(self):
        # Retrieve the system parameter for the password
        system_password = self.env['ir.config_parameter'].sudo().get_param('pos_etta.log_password', default=None)
        
        if not system_password:
            logging.error("System password is not set in the Odoo configuration.")
            return {
                'type': 'ir.actions.client',
                'tag': 'display_notification',
                'params': {
                    'type': 'danger',
                    'title': 'Error',
                    'message': 'System password is not set in the Odoo configuration.'
                }
            }

        logging.info(f"Password entered: {self.password}")
        log_model_data = self.env["logging.event.model"].search([])

        # Check if the entered password matches the system parameter value
        if self.password == system_password:
            filename = "LOG [ETTAPOS] -" + uuid.uuid4().hex + ".txt"
            logging.info("Logging info: creating record")
            
            # Get the directory paths
            module_directory_path = os.path.dirname(os.path.abspath(__file__))
            parent_directory = os.path.dirname(module_directory_path)
            logs_directory_path = os.path.join(parent_directory, 'logs')

            # Check if directory exists and if write permissions are available
            if not os.path.exists(logs_directory_path):
                try:
                    os.makedirs(logs_directory_path)
                    logging.info(f"Created logs directory at: {logs_directory_path}")
                except PermissionError:
                    logging.error(f"Permission denied: Unable to create logs directory at {logs_directory_path}")
                    return {
                        'type': 'ir.actions.client',
                        'tag': 'display_notification',
                        'params': {
                            'type': 'danger',
                            'title': 'Error',
                            'message': f"Permission denied: Unable to create logs directory at {logs_directory_path}"
                        }
                    }
            elif not os.access(logs_directory_path, os.W_OK):
                logging.error(f"Write permission denied for directory: {logs_directory_path}")
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'type': 'danger',
                        'title': 'Error',
                        'message': f"Write permission denied for directory: {logs_directory_path}"
                    }
                }

            # Continue with file creation
            filepath = os.path.join(logs_directory_path, filename)
            try:
                with open(filepath, "w") as f:
                    logs = "\n".join(
                        f"{log.timestamp.strftime('%Y-%m-%d %H:%M:%S')} {log.log}" 
                        for log in log_model_data
                    )
                    logging.info(f"Logging info: {logs}")
                    f.write(logs)
            except Exception as e:
                logging.error(f"Error occurred while writing to file: {e}")
                return {
                    'type': 'ir.actions.client',
                    'tag': 'display_notification',
                    'params': {
                        'type': 'danger',
                        'title': 'Error',
                        'message': 'Failed to create log file.'
                    }
                }

            return {
                'type': 'ir.actions.act_url',
                'url': f'/download/logfile?filepath={filepath}',
                'target': 'self'
            }

        # Password mismatch
        logging.warning("Incorrect password entered.")
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'type': 'danger',
                'title': 'Error',
                'message': 'Incorrect password entered.'
            }
        }