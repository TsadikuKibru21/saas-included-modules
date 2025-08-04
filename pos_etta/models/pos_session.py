from odoo import models, api, _
from datetime import datetime
import pytz
from odoo.exceptions import UserError

class PosSession(models.Model):
    """Model inherited to add additional functionality"""
    _inherit = 'pos.session'

    # @api.model
    # def get_server_time(device_timezone):
    #     # Get current UTC time with timezone awareness
    #     utc_now = datetime.now(pytz.utc)
    #     # Convert to device's timezone
    #     device_tz = pytz.timezone(device_timezone)
    #     server_time_device_tz = utc_now.astimezone(device_tz)
    #     return server_time_device_tz.isoformat()

    @api.model
    def get_server_time(self):
        ethiopia_tz = pytz.timezone('Africa/Addis_Ababa')
        utc_now = datetime.now(ethiopia_tz)
        return utc_now.isoformat()
    
    def _pos_ui_models_to_load(self):
        """Used to super the _pos_ui_models_to_load"""
        result = super()._pos_ui_models_to_load()
        result += [
            'void.reason'
        ]
        return result

    def _loader_params_void_reason(self):
        """Used to override the default settings for loading fields"""
        return {
            'search_params': {
                'fields': ['reason'],
            },
        }

    def _get_pos_ui_void_reason(self, params):
        """Used to get the parameters"""
        return self.env['void.reason'].search_read(
            **params['search_params'])

    def _loader_params_product_product(self):
        params = super()._loader_params_product_product()
        # this is usefull to evaluate reward domain in frontend
        params['search_params']['fields'].append('service_charge')
        params['search_params']['fields'].append('product_count')
        params['search_params']['fields'].append('bom_ids')
        return params
    def _loader_params_res_users(self):
        params = super()._loader_params_res_users()
        params["search_params"]["fields"].extend(["pos_login_direct", "pos_logout_direct", "pos_pin"])
        return params
    def _loader_params_account_tax(self):
        params = super()._loader_params_account_tax()
        params['search_params']['fields'].append('type_tax_use')
        return params
    def _loader_params_res_partner(self):
        vals = super()._loader_params_res_partner()
        vals["search_params"]["fields"] += ["discount_customer"]
        return vals
    def _loader_params_pos_payment_method(self):
        vals = super()._loader_params_pos_payment_method()
        vals["search_params"]["fields"] += ["reprint_receipt"]
        return vals