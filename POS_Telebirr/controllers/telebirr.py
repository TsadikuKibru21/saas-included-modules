from odoo.http import request

from odoo import http, _
import json

import logging

_logger = logging.getLogger(__name__)

class TeleBirr(http.Controller):
    @http.route('/payment/telebirr',auth='public', type='json', methods=['POST'], csrf=False)
    def tele_callback(self,**k):
        jsondata = json.loads(request.httprequest.data)
        logging.info(jsondata)

        logging.info("Traace_nooooo")

        trace_no=jsondata.get('trace_no')
        logging.info(trace_no)

        payment_status = http.request.env['telebirr.payment.status'].sudo().search([('trace_number', '=', trace_no)])
        logging.info("statussssss")

        logging.info(jsondata.get('msg'))
        if jsondata.get('msg')=='Confirmed':
            if payment_status:
                
                logging.info("Confirmedddddd")

                payment_status.write({'status': "Confirmed"})
        elif jsondata.get('msg')=='Failed':
            logging.info("FALED222222222222222")

            payment_status.write({'status': "Failed"})
      
    @http.route('/create_payment', type='json', auth='public', csrf=False)
    def create_resource_endpoint(self, **kw):
        try:
            payment_status = request.env['telebirr.payment.status'].create({
                'price': kw.get("price"),
                'trace_number': kw.get("trace_number"),
                'phone': kw.get("phone"),
            })
            logging.info("Statusssssssssssssssssssss")

            _logger.info(payment_status)

            return True
        except Exception as e:
            _logger.error("Error occurred while creating payment status: %s", e)
            return False










