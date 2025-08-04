# -*- coding: utf-8 -*
from odoo.http import request
from odoo import http, _
from odoo.osv.expression import AND
from odoo.addons.portal.controllers.web import Home
from odoo.addons.point_of_sale.controllers.main import PosController

import logging

_logger = logging.getLogger(__name__)

class PosHome(Home):

    @http.route()
    def web_login(self, *args, **kw):
        response = super(PosHome, self).web_login(*args, **kw)
        if request.session.uid:
            _logger.info('web_login ......................')
            user = request.env['res.users'].sudo().browse(request.session.uid)
            pos_config = user.pos_config_id
            if pos_config and user.pos_login_direct:
                return request.redirect('/pos/ui?config_id=%s' % pos_config.id)
        return response