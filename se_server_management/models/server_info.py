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


class ServerInfo(models.Model):
    _name = "server.info"
    _description = "server"

    name=fields.Char(string="Installed Odoo version")
    installed_path=fields.Char(string="Odoo installed Path")
    conf_path=fields.Char(string="Odoo Conf Path")
    master_passwd=fields.Char(string="Master Password")
    service_name=fields.Char(string="service")
    server_id=fields.Many2one('server.server')
    its_db=fields.Char(string="DataBase")
 
    # its_db = fields.One2many(
    #     comodel_name="server.db", string="DB", inverse_name="odoo_version"
    # )


class ServerDB(models.Model):
    _name = "server.db"
    _description = "server"

    db_name=fields.Char(string="DB Name")
    odoo_version=fields.Many2one('server.info') 


