# -*- coding: utf-8 -*-

from odoo import models, fields


class CommandCommand(models.Model):
    _name = "server.command"
    _description = "command"
    _order = "sequence"

    sequence = fields.Integer(
        string="sequence",
        default=10,
    )
    name = fields.Char(string="Name", required=True)
    command = fields.Text(string="Command", required=True)

    server_id = fields.Many2one(comodel_name="server.server", string="Server")

    def action_ejecutar(self):
        for record in self:
            if record.server_id:
                record.server_id.custom_sudo(self.command)
