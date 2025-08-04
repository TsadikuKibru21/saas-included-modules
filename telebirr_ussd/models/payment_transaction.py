import logging
from werkzeug import urls
from odoo import _, api, fields, models
from odoo.exceptions import ValidationError
from odoo.addons.payment import utils as payment_utils
from ..controllers.telebirr import TelebirrPaymentController
import requests

_logger = logging.getLogger(__name__)
class ResPartner(models.Model):
    _inherit = 'res.partner'
    telebirr_ussd_phone_number=fields.Char(string='Telebirr Ussd Phone')

class PaymentTransaction(models.Model):
    _inherit = 'payment.transaction'

    telebirr_ussd_type = fields.Char(string="Telebirr Transaction Type")

    def _get_specific_rendering_values(self, processing_values):
        """ Override of payment to return Telebirr-specific rendering values. """
        _logger.info("Starting _get_specific_rendering_values for transaction: %s", self.reference)
        res = super()._get_specific_rendering_values(processing_values)
        if self.provider_code != 'telebirr_ussd':
            return res
        _logger.info("########################### process value ###########")
        _logger.info(processing_values)
        fresh_partner = self.env['res.partner'].browse(self.partner_id.id)

        base_url = self.provider_id._telebirr_ussd_get_api_url()

        # webhook_url = urls.url_join(base_url, f'{TelebirrPaymentController._webhook_url}/{self.reference}')
        # _logger.info("Telebirr webhook URL: %s", webhook_url)
        _logger.info("====================================================")
        _logger.info(self.partner_id)
        telebirr_payload = {
            'phone': '251'+self.partner_id.telebirr_ussd_phone_number,
            'traceNo': self.reference,
            'amount': self.amount,
            'appId': self.provider_id.telebirr_ussd_app_id,
            'apiKey': self.provider_id.telebirr_ussd_api_key,
            "payerId":self.provider_id.telebirr_ussd_payer_id,
        }

        try:
            payment_response = self.provider_id._telebirr_ussd_make_request(payload=telebirr_payload)
            _logger.info("Telebirr payment response: %s", payment_response)
        except Exception as e:
            _logger.error("Error while making request to Telebirr: %s", str(e), exc_info=True)
            raise
        # return telebirr_payload

    def _get_tx_from_notification_data(self, provider_code, notification_data):
        """ Override to find the transaction based on Telebirr data. """
        _logger.info("Processing notification data for provider: %s", provider_code)
        tx = super()._get_tx_from_notification_data(provider_code, notification_data)
        if provider_code != 'telebirr_ussd' or len(tx) == 1:
            _logger.info("Returning transaction: %s", tx)
            return tx

        reference = notification_data.get('traceNo')
        _logger.info("Looking for transaction with reference: %s", reference)
        tx = self.search([('reference', '=', reference), ('provider_code', '=', 'telebirr_ussd')])
        if not tx:
            _logger.warning("No transaction found matching reference: %s", reference)
            raise ValidationError(
                "Telebirr: " + _("No transaction found matching reference %s.", reference)
            )
        _logger.info("Transaction found: %s", tx)
        return tx

    def _process_notification_data(self, notification_data):
        """ Override to process transaction based on Telebirr data. """
        _logger.info("Starting _process_notification_data for transaction: %s", self.reference)
        _logger.info("Notification data received: %s", notification_data)

        super()._process_notification_data(notification_data)
        if self.provider_code != 'telebirr_ussd':
            _logger.info("Provider code is not 'telebirr', skipping processing.")
            return

        if not notification_data:
            _logger.warning("Notification data is empty, marking transaction as canceled.")
            self._set_canceled(state_message=_("The customer left the payment page."))
            return

        amount = notification_data.get('amount')
        currency_code = self.currency_id.name
        _logger.info("Amount: %s, Currency: %s", amount, currency_code)

        if not amount:
            _logger.error("Missing amount in notification data.")
            raise ValidationError('Telebirr: missing amount')
        if self.currency_id.compare_amounts(float(amount), self.amount) != 0:
            _logger.error("Amount mismatch: expected %s, received %s", self.amount, amount)
            raise ValidationError('Telebirr: mismatching amounts')

        trace_no = notification_data.get('traceNo')
        if not trace_no:
            _logger.error("Missing traceNo in notification data.")
            raise ValidationError("Telebirr: " + _("Missing value for traceNo."))
        _logger.info("Trace number: %s", trace_no)
        self.provider_reference = trace_no

        self.payment_method_id = self.env['payment.method'].search(
            [('code', '=', 'telebirr_ussd')], limit=1
        ) or self.payment_method_id
        _logger.info("Payment method set to: %s", self.payment_method_id)

        payment_status = notification_data.get('payment_status')
        _logger.info("Payment status received: %s", payment_status)

        if payment_status == 'PENDING':
            self._set_pending(state_message=notification_data.get('reason', ''))
        elif payment_status == 'COMPLETED':
            self._set_done()
        elif payment_status == 'CANCELLED':
            self._set_canceled()
        else:
            _logger.warning("Invalid payment status (%s) for transaction: %s", payment_status, self.reference)
            self._set_error(
                "Telebirr: " + _("Received data with invalid payment status: %s", payment_status)
            )
