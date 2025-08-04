from odoo import models

class PosSession(models.Model):
    """Model inherited to add additional functionality"""
    _inherit = 'pos.session'

    def _loader_params_pos_payment_method(self):
        res = super()._loader_params_pos_payment_method()
        add_list = ["telebirr_app_id"]
        res['search_params']['fields'].extend(add_list)
        return res