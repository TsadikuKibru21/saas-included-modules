from odoo import models, fields

class PosPaymentMethod(models.Model):
    _inherit = 'pos.payment.method'
    
    reprint_receipt = fields.Boolean(string = 'Reprint Fiscal Receipt', default=False)