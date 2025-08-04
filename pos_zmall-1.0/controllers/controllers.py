# -*- coding: utf-8 -*-
# from odoo import http


# class PosZmall(http.Controller):
#     @http.route('/pos_zmall/pos_zmall', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/pos_zmall/pos_zmall/objects', auth='public')
#     def list(self, **kw):
#         return http.request.render('pos_zmall.listing', {
#             'root': '/pos_zmall/pos_zmall',
#             'objects': http.request.env['pos_zmall.pos_zmall'].search([]),
#         })

#     @http.route('/pos_zmall/pos_zmall/objects/<model("pos_zmall.pos_zmall"):obj>', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('pos_zmall.object', {
#             'object': obj
#         })

