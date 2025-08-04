from odoo import fields, models, _

class ResPartnerInherit(models.Model):
    _inherit = 'res.partner'
    
    discount_customer = fields.Float(string="Customer Discount")