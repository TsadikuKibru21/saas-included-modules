
from odoo import fields, models
from odoo import fields, models
from odoo import api, fields, models, _
import json, requests
import logging

_logger = logging.getLogger(__name__)

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'
    enabled_zmall = fields.Boolean(related='pos_config_id.enabled_zmall', readonly=False)
    zmall_api_endpoint = fields.Char(related='pos_config_id.zmall_api_endpoint', readonly=False)
    zmall_username = fields.Char(related='pos_config_id.zmall_username', readonly=False)
    zmall_password = fields.Char(related='pos_config_id.zmall_password', readonly=False)

    @api.onchange('enabled_zmall', 'zmall_api_endpoint', 'zmall_username', 'zmall_password')
    def _onchange_zmall_fields(self):
        if self.enabled_zmall and self.zmall_api_endpoint and self.zmall_username and self.zmall_password:
            _logger.info("************************************************************************************")
            self.auth_zmall()

    @api.model
    def auth_zmall(self):
        headers = {'Content-Type': 'application/json'}
        # pos_config = self.env['pos.config'].search([('id','=', data)], limit=1)
        request_data = {"email": self.zmall_username, "password": self.zmall_password}        
        auth_endpoint = self.zmall_api_endpoint + 'api/store/login'
        _logger.info("****************************************************")
        _logger.info("**********************************************************")
        _logger.info("********************************************************")
        
        try:
            response = requests.post(str(auth_endpoint), json=request_data, headers=headers)
            _logger.info("**************************************response********************")
            _logger.info(response.text)
        except:
            return {
                'msg': 'Failed',
                'longMsg': "Couldn't connect with Zmall"
            }

        response_json = json.loads(response.text)
        # return str(response_json['success'])
        if str(response_json['success']) == 'True':
            return {
                'server_token': response_json['store']['server_token'], 
                'store_id': response_json['store']['_id']
            }
        elif str(response_json['success']) == 'False':
            return {
                'error_code': response_json['store']['error_code']
            }
        else:
            return {
                'error': 'Unknown Error'
            }
        # return response_json

