# -*- coding: utf-8 -*-
# Copyright (C) 2023 Konos and MercadoPago S.A.
# Licensed under the GPL-3.0 License or later.
from odoo import http

import logging
import time
import hmac
import base64
import json
import hashlib
import requests
from odoo import api, fields, models, _
from odoo.exceptions import ValidationError, UserError
_logger = logging.getLogger(__name__)
import json

_logger = logging.getLogger(__name__)
class PosPaymentMethod(models.Model):
    _inherit = 'pos.payment.method'
    check_url = fields.Char('Payment Confirm URL')
    
    def _get_payment_terminal_selection(self):
        return super(PosPaymentMethod, self)._get_payment_terminal_selection() + [('telebirr', 'Telebirr')]

    name = fields.Char(string="Payment Method", required=True, translate=True)
    receivable_account_id = fields.Many2one('account.account',
        string='Intermediary Account',
        required=True,
        domain=[('reconcile', '=', True), ('user_type_id.type', '=', 'receivable')],
        default=lambda self: self.env.company.account_default_pos_receivable_account_id,
        ondelete='restrict',
        help='Account used as counterpart of the income account in the accounting entry representing the pos sales.')
    is_cash_count = fields.Boolean(string='Cash')
    cash_journal_id = fields.Many2one('account.journal',
        string='Cash Journal',
        ondelete='restrict',
        help='The payment method is of type cash. A cash statement will be automatically generated.')
    split_transactions = fields.Boolean(
        string='Split Transactions',
        default=False,
        help='If ticked, each payment will generate a separated journal item. Ticking that option will slow the closing of the PoS.')
    open_session_ids = fields.Many2many('pos.session', string='Pos Sessions', compute='_compute_open_session_ids', help='Open PoS sessions that are using this payment method.')
    config_ids = fields.Many2many('pos.config', string='Point of Sale Configurations')
    company_id = fields.Many2one('res.company', string='Company', default=lambda self: self.env.company)
    use_payment_terminal = fields.Selection(selection=lambda self: self._get_payment_terminal_selection(), string='Use a Payment Terminal', help='Record payments with a terminal on this journal.')
    hide_use_payment_terminal = fields.Boolean(compute='_compute_hide_use_payment_terminal', help='Technical field which is used to '
                                               'hide use_payment_terminal when no payment interfaces are installed.')

    active = fields.Boolean(default=True)
    telebirr_api_key = fields.Char('API Key')
    telebirr_app_id = fields.Char('APP ID')
    telebirr_trace_no = fields.Char('Trace No')
    telebirr_payment = fields.Many2one('telebirr.payment', string='Telebirr payment')
    telebirr_url = fields.Char('URL')

    @api.onchange('use_payment_terminal')
    def onchange_payment_terminal_telebirr(self):
        if self.use_payment_terminal == 'telebirr':
            telebirr_pay = self.env['telebirr.payment'].search([], limit=1)
            if telebirr_pay:
                self.telebirr_payment = telebirr_pay.id
            else:
                tele_created = self.env['telebirr.payment'].create({
                    'name': 'Telebirr'
                })
                self.telebirr_payment = tele_created.id

    @api.depends('is_cash_count')
    def _compute_hide_use_payment_terminal(self):
        no_terminals = not bool(self._fields['use_payment_terminal'].selection(self))
        for payment_method in self:
            payment_method.hide_use_payment_terminal = no_terminals or payment_method.is_cash_count

    @api.onchange('use_payment_terminal')
    def _onchange_use_payment_terminal(self):
        """Used by inheriting model to unset the value of the field related to the unselected payment terminal."""
        pass

    @api.depends('config_ids')
    def _compute_open_session_ids(self):
        for payment_method in self:
            payment_method.open_session_ids = self.env['pos.session'].search([('config_id', 'in', payment_method.config_ids.ids), ('state', '!=', 'closed')])

    @api.onchange('is_cash_count')
    def _onchange_is_cash_count(self):
        if not self.is_cash_count:
            self.cash_journal_id = False
        else:
            self.use_payment_terminal = False

    def _is_write_forbidden(self, fields):
        return bool(fields and self.open_session_ids)

    def write(self, vals):
        if self._is_write_forbidden(set(vals.keys())):
            raise UserError('Please close and validate the following open PoS Sessions before modifying this payment method.\n'
                            'Open sessions: %s' % (' '.join(self.open_session_ids.mapped('name')),))
        return super(PosPaymentMethod, self).write(vals)
    
 
    def send_request_telebirr(self, data):
        _logger.info(data)
        self.sudo().telebirr_payment.trace_no = ' '
        pay_config = self.env['pos.config'].sudo().search([('id', '=', data['pos_session'])])
        pay_search = self.env['telebirr.payment'].sudo().search([('id', '=', pay_config.telebirr_payment.id)])
        pay_online_search = self.env['pos.online.payment'].sudo().search([('name', '=', data['traceNo'])])
        if not pay_online_search:
            pay_online = self.env['pos.online.payment'].sudo().create({
                'name': data['traceNo'],
                'pay_method': 'Telebirr',
                'price': data['amount'],
                'payer_id': data['payerId'],
                'pos_config': pay_config.id
            })
        res = {
           'trace_no': data['traceNo'],
            'pay_confirmed': 'progress'
        }
        pay_search.sudo().write(res)
        data['apiKey'] = self.telebirr_api_key
        data['payerId']=data['payerId']
        headers = {'Content-Type': 'application/json'}
        _logger.info("DATAAAAAAAAAAAAAAA")
        _logger.info(data)
        _logger.info(self.telebirr_url)
        response = requests.post(self.telebirr_url, json=data, headers=headers)
        self.sudo().telebirr_payment.trace_no = data['traceNo']
        lod_json = json.loads(response.text)

        print("LOAD JSOM")
        print(lod_json['result'])
        if lod_json['result'] == 'USSD Sent Successfully':
            msg = 'Success'
        else: msg = 'Failure'
        return {
            'response': lod_json['result'],
            'msg': msg,
            'trace_no': data['traceNo'],
            'status_code': response.status_code
        }