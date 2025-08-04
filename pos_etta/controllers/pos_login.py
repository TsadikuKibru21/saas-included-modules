# -*- coding: utf-8 -*
from odoo.http import request
from odoo.addons.point_of_sale.controllers.main import PosController
import json
from odoo import http, _
import odoo
from odoo.osv.expression import AND

from passlib.context import CryptContext

crypt_context = CryptContext(schemes=['pbkdf2_sha512', 'plaintext'], deprecated=['plaintext'])

from datetime import datetime
import timeit
import os
import jinja2
import string
import random

path = os.path.realpath(os.path.join(os.path.dirname(__file__), '../views'))
loader = jinja2.FileSystemLoader(path)

jinja_env = jinja2.Environment(loader=loader, autoescape=True)
jinja_env.filters["json"] = json.dumps


version_info = odoo.release.version_info[0]

datetime.strptime('2012-01-01', '%Y-%m-%d')

import logging

_logger = logging.getLogger(__name__)

class pos_controller(PosController):

    @http.route(['/pos/web', '/pos/ui'], type='http', auth='user')
    def pos_web(self, config_id=False, **k):
        response = super().pos_web(config_id=config_id, **k)
        # TODO: core method
        is_internal_user = request.env.user.has_group('base.group_user')
        if not is_internal_user:
            return request.not_found()
        domain = [
            ('state', 'in', ['opening_control', 'opened']),
            ('user_id', '=', request.session.uid),
            ('rescue', '=', False)
        ]
        if config_id:
            domain = AND([domain, [('config_id', '=', int(config_id))]])
            pos_config = request.env['pos.config'].sudo().browse(int(config_id))
        pos_session = request.env['pos.session'].sudo().search(domain, limit=1)

        # The same POS session can be opened by a different user => search without restricting to
        # current user. Note: the config must be explicitly given to avoid fallbacking on a random
        # session.
        if not pos_session and config_id:
            domain = [
                ('state', 'in', ['opening_control', 'opened']),
                ('rescue', '=', False),
                ('config_id', '=', int(config_id)),
            ]
            pos_session = request.env['pos.session'].sudo().search(domain, limit=1)
        if not pos_session and config_id:
            pos_session = request.env['pos.session'].create({'user_id': request.env.user.id, 'config_id': int(config_id)})
        if not pos_session or config_id and not pos_config.active:
            return request.redirect('/web#action=point_of_sale.action_client_pos_menu')
        # The POS only work in one company, so we enforce the one of the session in the context
        company = pos_session.company_id
        session_info = request.env['ir.http'].session_info()
        session_info['user_context']['allowed_company_ids'] = company.ids
        session_info['user_companies'] = {'current_company': company.id, 'allowed_companies': {
            company.id: session_info['user_companies']['allowed_companies'][company.id]}}
        session_info['nomenclature_id'] = pos_session.company_id.nomenclature_id.id
        session_info['fallback_nomenclature_id'] = pos_session._get_pos_fallback_nomenclature_id()
        # ----------------------------------------
        # todo: custom method
        # ----------------------------------------
        _logger.info("begin pos_web()")
        start = timeit.default_timer()
        session_info['model_ids'] = {
            'product.product': {
                'min_id': 0,
                'max_id': 0,
            },
            'res.partner': {
                'min_id': 0,
                'max_id': 0
            },
        }
        request.env.cr.execute("select max(id) from product_product")
        product_max_ids = request.env.cr.fetchall()
        request.env.cr.execute("select count(id) from product_product")
        count_products = request.env.cr.fetchall()
        session_info['model_ids']['product.product']['max_id'] = product_max_ids[0][0] if len(
            product_max_ids) == 1 else 1
        session_info['model_ids']['product.product']['count'] = count_products[0][0] if len(
            count_products) == 1 else None
        request.env.cr.execute("select max(id) from res_partner")
        partner_max_ids = request.env.cr.fetchall()
        session_info['model_ids']['res.partner']['max_id'] = partner_max_ids[0][0] if len(partner_max_ids) == 1 else 10
        request.env.cr.execute("select count(id) from res_partner")
        count_partners = request.env.cr.fetchall()
        session_info['model_ids']['res.partner']['count'] = count_partners[0][0] if len(count_partners) == 1 else None
        _logger.info("Danger ZOne")
        session_info['config'] = pos_session.config_id.read(['index_db'])[0]
        context = {
            'session_info': session_info,
            'login_number': pos_session.login_number,
            'pos_session_id': pos_session.id,
        }
        response = request.render('point_of_sale.index', context)
        response.headers['Cache-Control'] = 'no-store'
        _logger.info(
            'Opened Session with times:  %s ' % (timeit.default_timer() - start))
        _logger.info("End pos_web()")
        return response
