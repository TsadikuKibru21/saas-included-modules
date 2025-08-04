from odoo import models, fields

import logging


class PaymentStatus(models.Model):
    _name = 'telebirr.payment.status'

    price = fields.Float(string='Price')
    trace_number = fields.Char(string='Trace Number')
    phone = fields.Char(string='phone')
    status = fields.Char(string='status')
    date = fields.Datetime(string='Date', default=lambda self: fields.Datetime.now())

    def find_pay_confirmed_telebirr(self,trace_number):

        payment_status = self.env['telebirr.payment.status'].sudo().search([('trace_number', '=', trace_number)])
        if payment_status:
            if payment_status.status=="Confirmed":
                return  {
                            'msg': 'Success'
                        }
            elif payment_status.status=="Failed":
                return   {
                            'msg': 'Failed'
                         }
        
        else:
            return {
                        'msg': 'Failed'
                        }




