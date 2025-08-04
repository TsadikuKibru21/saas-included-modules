from odoo.http import request

from odoo import http, _
import json

import logging
import os
_logger = logging.getLogger(__name__)

class ClientLogger(http.Controller):
    @http.route('/pos/logger',auth='public', type='json', methods=['POST'], csrf=False)
    def logger_callBack(self,**kw):
        responseObject = {}
        _logger.info(kw)
        jsondata = json.loads(request.httprequest.data)
        log_data = jsondata.get('log_data')
        action = jsondata.get('action')
        model_name = jsondata.get('model_name')

        # Create a new log entry in the logging.event.model
        log_entry = request.env['logging.event.model'].sudo().create({
            'log': log_data,
            'action_type': action,
            'model_name': model_name
        })
        _logger.info(log_entry)
        if(log_entry):
            responseObject["status"] = 201
            responseObject['message'] = "log created"
            return responseObject
        return 'alive'
    
    @http.route('/download/logfile', type='http', auth="public")
    def download_logfile(self, filepath, **kw):
        _logger.info("calling controller")
        with open(filepath, 'rb') as file:
            content = file.read()
        return request.make_response(content,
                                     headers=[('Content-Type', 'application/octet-stream'),
                                              ('Content-Disposition', f'attachment; filename={os.path.basename(filepath)}')])