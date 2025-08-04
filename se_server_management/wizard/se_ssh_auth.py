# -*- coding: utf-8 -*-

import base64
import logging

from odoo import _, fields, models

_logger = logging.getLogger(__name__)


class SshAuth(models.TransientModel):
    _name = "se.ssh.auth"
    _description = "Wizard para configurar certificado ssh en los servers"
    _inherit = "server.util"

    strategy = fields.Selection(
        selection=[("generate", _("Generate")), ("upload", _("Upload"))],
        default="generate",
    )
    user_name = fields.Char(string="User Name")
    password = fields.Char(string="Password")
    server = fields.Many2one("server.server")
    ssh_key = fields.Binary(string="SSH Key")
    ssh_password = fields.Char(string="SSH Passphrase")

    def connect(self):
        context = {
            "host": self.server.main_hostname,
            "user_name": self.user_name,
            "password": self.password,
            "port": self.server.ssh_port,
        }
        if self.strategy == "generate":
            _logger.error("!!!!!!!!!!!!!!Testing connection..." + str(context))
            private_key, public_key = self.create_blob_ssh_key(
                context, name=self.server.name
            )
            self.server.ssh_private_key = private_key
            self.server.ssh_public_key = public_key
            self.server.ssh_password = base64.b64encode(self.password.encode()).decode() if self.password else False
            self.server.ssh_init = True
        elif self.strategy == "upload":
            # must read uploaded file
            self.server.ssh_private_key = base64.b64decode(self.ssh_key)
            self.server.ssh_password = base64.b64encode(self.password.encode()).decode() if self.password else False
            self.server.ssh_init = False
            # Save the file as attachment
            attachment = self.env["ir.attachment"].create(
                {
                    "name": self.server.name,
                    "datas": self.server.ssh_private_key.encode(),
                    # 'datas': self.server.ssh_private_key,
                    "res_model": "server.server",
                    "res_id": self.server.id,
                }
            )
            attachment._post_add_create()
