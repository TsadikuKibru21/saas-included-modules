# Part of Odoo. See LICENSE file for full copyright and licensing details.

import logging
import pprint
import json
import hmac
import hashlib


import requests
from werkzeug import urls

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


_logger = logging.getLogger(__name__)

class AccountPaymentMethod(models.Model):
    _inherit = 'account.payment.method'

    @api.model
    def _get_payment_method_information(self):
        res = super()._get_payment_method_information()
        res['telebirr_ussd'] = {'mode': 'unique', 'domain': [('type', '=', 'bank')]}
        return res

class Paymentprovider(models.Model):
    _inherit = 'payment.provider'

    code = fields.Selection(
        selection_add=[('telebirr_ussd', "Telebirr Payment Gateway")], ondelete={'telebirr_ussd': 'set default'}
    )

    telebirr_ussd_api_key = fields.Char(
        string="API Key", 
        required_if_provider='telebirr_ussd')
    
    
    telebirr_ussd_app_id = fields.Char(
        string="APP ID",
        required_if_provider='telebirr_ussd',
        groups='base.group_system')
    telebirr_ussd_url=fields.Char(
        string="URL",
        required_if_provider='telebirr_ussd',
    )
    telebirr_ussd_payer_id=fields.Char(
        string="Payer ID",
        required_if_provider='telebirr_ussd',
    )

    # def _get_supported_currencies(self):
    #     """ Override of `payment` to return the supported currencies. """
    #     supported_currencies = super()._get_supported_currencies()
    #     if self.code == 'telebirr':
    #         supported_currencies = supported_currencies.filtered(
    #             lambda c: c.name in const.SUPPORTED_CURRENCIES
    #         )
    #     return supported_currencies

    def _telebirr_ussd_get_api_url(self):
        """ Return the API URL according to the provider state.

        Note: self.ensure_one()

        :return: The API URL
        :rtype: str
        """
        self.ensure_one()
        if self.state == 'enabled':
            return self.telebirr_ussd_url
     
    def _telebirr_ussd_make_request(self, payload=None, method='POST'):
           
            _logger.info("#################### came to _telebirr_make_request #####################")
            self.ensure_one()

            url = self._telebirr_ussd_get_api_url()
            try:
                if method == 'GET':
                    response = requests.get(url, params=payload, timeout=5)
                else:
                    _logger.info("##################### the payload")
                
                   


                    response = requests.post(url, json=payload, timeout=5)
                    _logger.info(
                         pprint.pformat(payload),
                    )
                    try:
                        response.raise_for_status()
                                
                    except requests.exceptions.HTTPError:
                        _logger.exception(
                            "Invalid API request at %s with data:\n%s", url, pprint.pformat(payload),
                        )
                        response_content = response.json()
                        error_code = response_content.get('error')
                        error_message = response_content.get('message')
                        raise ValidationError("Telebirr: " + _(
                            "The communication with the API failed. Telebirr Payment Gateway gave us the following "
                            "information: '%s' (code %s)", error_message, error_code
                        ))
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
                _logger.exception("Unable to reach endpoint at %s", url)
                raise ValidationError(
                    "Telebirr: " + _("Could not establish the connection to the API.")
                )
            

            return response.json()