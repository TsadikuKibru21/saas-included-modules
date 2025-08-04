# -*- coding: utf-8 -*-
from odoo import api, fields, models, _
import logging

_logger = logging.getLogger(__name__)


class res_users(models.Model):
    _inherit = "res.users"

    pos_config_id = fields.Many2one("pos.config", "Assign to Point Of Sale")
    pos_login_direct = fields.Boolean(
        "POS Login Direct",
        help='When user login to Odoo, automatic forward to POS Screen')
    pos_logout_direct = fields.Boolean(
        "POS Logout Direct",
        help='When user close pos session, automatic logout Odoo and forward to Odoo login page')
    pos_pin = fields.Integer("Pin unlock POS screen")
    # pos_branch_id = fields.Many2one(
    #     'pos.branch',
    #     string='Main Branch',
    #     help='This is branch default for any records data create by this user'
    # )
    # pos_branch_ids = fields.Many2many(
    #     'pos.branch',
    #     'res_users_branch_rel',
    #     'user_id',
    #     'branch_id',
    #     string='Access to Branches'
    # )