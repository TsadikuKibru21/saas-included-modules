# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
import secrets
from collections import defaultdict
from datetime import timedelta
from itertools import groupby
from markupsafe import Markup, escape
import requests
from urllib.parse import urljoin
from odoo.exceptions import UserError
from odoo import _


import logging


from odoo import api, fields, models, _, Command
from odoo.exceptions import AccessError, UserError, ValidationError
from odoo.tools import float_is_zero, float_compare, convert
from odoo.service.common import exp_version
from odoo.osv.expression import AND

_logger  = logging.getLogger(__name__)

class PosSession(models.Model):
    _inherit = 'pos.session'


    def post_closing_cash_details(self, counted_cash):
        """
        Calling this method will try store the cash details during the session closing.

        :param counted_cash: float, the total cash the user counted from its cash register
        If successful, it returns {'successful': True}
        Otherwise, it returns {'successful': False, 'message': str, 'redirect': bool}.
        'redirect' is a boolean used to know whether we redirect the user to the back end or not.
        When necessary, error (i.e. UserError, AccessError) is raised which should redirect the user to the back end.
        """
        self.ensure_one()
        check_closing_session = self._cannot_close_session()
        if check_closing_session:
            return check_closing_session

        if not self.cash_journal_id:
            # The user is blocked anyway, this user error is mostly for developers that try to call this function
            raise UserError(_("There is no cash register in this session."))

        self.cash_register_balance_end_real = counted_cash



        # Fetch zmall_api_endpoint and store_id from pos.config
        pos_config = self.config_id
        print("*(*(*(*(*(*(*( closing restaurant")
        if  pos_config.zmall_api_endpoint or not pos_config.store_id:
                # Prepare the data to be sent
                data = {
                    'store_id': pos_config.store_id,
                    'store_open': False
                }

                # Send the request
                try:
                    

                    response = requests.post(urljoin(pos_config.zmall_api_endpoint, 'update_store_open_time'), json=data)
                    # response = requests.post(pos_config.zmall_api_endpoint + 'update_store_open_time', json=data)
                    _logger.info(f"response {response}")    
                    _logger.info(f"response.status_code {response.status_code}")
                    _logger.info(f"response.text {response.text}")
                    response.raise_for_status()
                except requests.exceptions.RequestException as e:
                    _logger.info('successful',False, 'message', {e}, 'redirect',True)

        return {'successful': True}
    
    def set_cashbox_pos(self, cashbox_value: int, notes: str):
        self.state = 'opened'
        self.opening_notes = notes
        difference = cashbox_value - self.cash_register_balance_start
        self.cash_register_balance_start = cashbox_value
        self.sudo()._post_statement_difference(difference, True)
        self._post_cash_details_message('Opening', difference, notes)

        # Fetch zmall_api_endpoint and store_id from pos.config
        pos_config = self.config_id
        print("*(*(*(*(*(*(*(opening restaurant pos session pos_config=, pos_confi")
        if  pos_config.zmall_api_endpoint or not pos_config.store_id:
                # Prepare the data to be sent
                data = {
                    'store_id': pos_config.store_id,
                    'store_open': True
                }

                # Send the request
                try:
                    _logger.info(f"zmall_api_endpoint {pos_config.zmall_api_endpoint}")
                    response = requests.post(urljoin(pos_config.zmall_api_endpoint, 'update_store_open_time'), json=data)
                    # response = requests.post(pos_config.zmall_api_endpoint + 'update_store_open_time', json=data)
                    response.raise_for_status()
                    _logger.info(f"response {response}")
                except requests.exceptions.RequestException as e:
                    _logger.info('successful',False, 'message', {e}, 'redirect',True)

