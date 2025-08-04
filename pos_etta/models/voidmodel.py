from odoo import models, fields, api

class VoidReason(models.Model):
    _name = 'void.reason'
    _description = 'Void Reason'
    reason = fields.Char(string='Reason')

    @api.model
    def get_reasons(self):
        """
        Method to fetch all reasons from the 'void.reason' model.
        :return: List of reasons
        """
        reasons = self.search([])
        return reasons.mapped('reason')

class VoidedOrders(models.Model):
    _name = 'voided.orders'
    _description = 'Voided Orders'

    order_id = fields.Char(string='Order ID')
    date = fields.Datetime(string='Date', default=lambda self: fields.Datetime.now())
    cashier = fields.Char(string='Cashier')
    product = fields.Char(string='Product')
    unit_price = fields.Float(string='Unit Price')
    quantity = fields.Float(string='Quantity')
    reason_id = fields.Char(string='Reason')
    waiter_name = fields.Char(string='Waiter Name')
    def unlink(self):
        return False
    def write(self, vals):
        return {}