from odoo import fields, models, api, _


class TelebirrPayment(models.Model):
    _name = 'telebirr.payment'
    _inherit = 'mail.thread'
    name = fields.Char('Name')
    trace_no = fields.Char('Trace Number')
    pay_confirmed = fields.Char('Payment Confirm')



