from odoo import fields, models

class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

    uuid = fields.Char('UUID', readonly=True)
    note = fields.Char('Internal Note added by the waiter.')
    # pos_categ_id = fields.Many2one('pos.category', string='POS Category', readonly=True)