from odoo import models, fields, api, _
import os
import logging
import shutil
from odoo.exceptions import ValidationError
import subprocess

_logger = logging.getLogger(__name__)

class DockerBackupCridential(models.Model):
    _name = 'docker.backup.cridential'
    _description = 'Docker Backup Cridential'

    name = fields.Char(string="Name",required=True)
    ip_address = fields.Char(string="Ip Address",required=True)
    user = fields.Char(string="User",required=True)
    password = fields.Char(string="Password")
    is_active=fields.Boolean(string="Active")
   