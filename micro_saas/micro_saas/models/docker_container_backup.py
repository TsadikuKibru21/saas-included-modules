from odoo import models, fields, api, _
import os
import logging
import shutil
from odoo.exceptions import ValidationError
import subprocess

_logger = logging.getLogger(__name__)

class DockerContainerBackup(models.Model):
    _name = 'docker.container.backup'
    _description = 'Container Backup'
    _order = 'backup_date desc'

    name = fields.Char(string="Backup Name", required=True)
    backup_date = fields.Datetime(string="Backup Date", default=fields.Datetime.now)
    file_path = fields.Char(string="Backup File Path")
    instance_id = fields.Many2one('odoo.docker.instance', string="Odoo Instance", required=True, ondelete="cascade")
    state = fields.Selection([('pending', 'Pending'), ('completed', 'Completed'), ('failed', 'Failed')], 
                             string="Status", default="pending")
    
    def action_restore_backup(self):
        # new code
        self.instance_id.add_to_log("--------------- RESOTRE COMMAND STARTED ---------------")

        self.instance_id.stop_instance()
        # self.instance_id.action_create_backup(backup_name=f"Backup-before-{self.name}")
        
        _logger.info("Starting storage resize command")
        self.instance_id.add_to_log("--------------- COMMAND STARTED ---------------")
        command = f"sudo /root/sfs_zoorya/scripts/restore.sh \"{self.instance_id.name}\" \"{self.name}\""
        result = self.instance_id.ssh_execute(command)
        self.instance_id.add_to_log(result)

        self.instance_id.start_instance()

        self.instance_id.add_to_log(result)
        self.instance_id.add_to_log("--------------- RESOTRE COMMAND COMPLETED ---------------")
        # new code end

    def unlink(self):
        """Delete backup file when record is deleted."""
        for record in self:
            if os.path.exists(record.file_path):
                os.remove(record.file_path)
        return super(DockerContainerBackup, self).unlink()
