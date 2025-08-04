# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import api, fields, models, _
from odoo.exceptions import UserError
from itertools import groupby
import logging
import base64
from operator import itemgetter
from datetime import date

import json

_logger = logging.getLogger(__name__)
# _logger.setLevel(logging.WARNING)

class ProductTemplate(models.Model):
    _inherit = 'product.template'
    is_in_stock = fields.Boolean(compute='_compute_is_in_stock', store=False)
    zmall_product_id = fields.Char(string='Zmall Product ID', help='Dynamic product ID for Zmall integration',required=True)



    @api.depends('qty_available')
    def _compute_is_in_stock(self):
        """Determine if product is in stock based on inventory levels"""
        for product in self:
            product.is_in_stock = product.qty_available > 0
    
    # Add a scheduled action to update availability based on stock
    @api.model
    def _update_pos_availability_based_on_stock(self):
        """Scheduled method to update available_in_pos based on stock levels"""
        out_of_stock_products = self.search([
            ('qty_available', '<=', 0),
            ('available_in_pos', '=', True)
        ])
        
        if out_of_stock_products:
            # Update all out of stock products to not be available in POS
            out_of_stock_products.write({'available_in_pos': False})
            _logger.info(f"Updated {len(out_of_stock_products)} products to not be available in POS due to stock level")
            
            # Sync these changes to Zmall
            self._sync_availability_changes_to_zmall(out_of_stock_products.ids)
    
    def _sync_availability_changes_to_zmall(self, product_ids):
        """Sync availability changes to Zmall"""
        if not product_ids:
            return
            
        pos_config_id = self.env['pos.config'].search([], limit=1)
        if not pos_config_id or not pos_config_id.enabled_zmall:
            return
            
        # Check if we need to authenticate
        request_data = {
            "config_id": pos_config_id.id,
            "server_token": pos_config_id.server_token,
            "store_id": pos_config_id.store_id,
        }
        
        try:
            # Verify connection to Zmall
            zmall_product = self.env['pos.config'].get_zmall_products(request_data)
            if "success" in zmall_product and (not zmall_product["success"]):
                auth_zmall = self.env["pos.config"].auth_zmall2(pos_config_id.id)
                _logger.info(f"Re-authenticated with Zmall: {auth_zmall}")
                
            # Update each product in Zmall
            if pos_config_id.products_json:
                zmall_products = json.loads(pos_config_id.products_json)
                for product_id in product_ids:
                    for product_json in zmall_products:
                        if str(product_json.get('pos_id')) == str(product_id):
                            update_data = {
                                "config_id": pos_config_id.id,
                                "store_id": pos_config_id.store_id,
                                "server_token": pos_config_id.server_token,
                                "item_id": product_json['item_id'],
                                "is_visible_in_store": False,
                                "is_item_in_stock": False
                            }
                            
                            # Update in Zmall
                            self.env['pos.config'].update_zmall_product(update_data)
                            _logger.info(f"Updated product {product_id} availability in Zmall")
                            
        except Exception as e:
            _logger.error(f"Error syncing availability to Zmall: {e}")
    
    # Override the stock.move's _action_done to update POS availability when stock changes
    @api.model
    def _update_pos_availability_on_stock_move(self, move_ids):
        """Called from stock.move to update available_in_pos when stock moves"""
        if not move_ids:
            return
            
        products = self.env['product.product'].browse(move_ids).mapped('product_tmpl_id')
        out_of_stock_products = products.filtered(lambda p: p.qty_available <= 0 and p.available_in_pos)
        
        if out_of_stock_products:
            out_of_stock_products.write({'available_in_pos': False})
            self._sync_availability_changes_to_zmall(out_of_stock_products.ids)

    @api.model_create_multi
    def create(self, vals):
        _logger.info(f"*****************************inside pos_zmall create item**********************************************{vals}*********")
        # first check if the app is properly logged in
        pos_config_id = self.env['pos.config'].search([], limit=1)
        # send request to get the products from the zmall api
        requestData = {

            "config_id": pos_config_id.id,
            "server_token": pos_config_id['server_token'],
            "store_id": pos_config_id['store_id'],
        }
        zmall_product = self.env['pos.config'].get_zmall_products(requestData)
        _logger.info(zmall_product)
        if "success" in zmall_product and (not zmall_product["success"]):
            _logger.info("re authenticate")
            auth_zmall = self.env["pos.config"].auth_zmall2(pos_config_id.id)
            _logger.info("auth_zmall")
            _logger.info(auth_zmall)
            



        print("inside pos_zmall create item")

        product = super().create(vals)
        _logger.info(product)
        if product:
            pos_id = product.id
            _logger.info(f"pos_id `{pos_id}`")
            pos_config_id = self.env['pos.config'].search([], limit=1)
            data = {
                "deal_of_the_day": False,
                "details": "",
                "discount": False,
                "expiry_date": None,
                "is_available": False,
                "is_item_in_stock": True,
                "is_most_popular": False,
                "is_visible_in_store": False,
                "name": vals[0]['name'],
                "new_price": 0,
                "other_id": None,
                "price": vals[0]['list_price'],
                "product_id":  product.zmall_product_id, 
                "sequence_number": 18,
                "server_token": pos_config_id['server_token'],
                "store_id": pos_config_id['store_id'],
                "tax": 0,
                "pos_id": pos_id,
                "total_quantity": 0,
                "use_stock_management": False
                }
            if "available_in_pos" in vals[0]:
                data["is_visible_in_store"] = vals[0]["available_in_pos"]
            
            _logger.info(data)
            _logger.info("taxes_id" in vals[0])
            _logger.info(vals[0])
            # if "taxes_id" in vals[0]:

            #         taxes = self.env['account.tax'].browse(vals[0]["taxes_id"][0][0])
            #         for tax in taxes:
            #             _logger.info(f"Tax Name: {tax.name}, Tax Amount: {tax.amount}")
            if "description_self_order" in vals[0]:
                data["details"] = vals[0]["description_self_order"]
            zmall_product = self.env['pos.config'].add_item(data,pos_config_id.id)
            _logger.info(zmall_product)
        # in order to update the products_json in the pos_config_id call the following function
        data["config_id"] = pos_config_id['id']
        self.env['pos.config'].get_zmall_products(data)

            





        return product
    
    def write(self, vals):
        # get pos session id is pos_session id the same with pos_config_id?
        # pos_session = request.env['pos.session'].sudo().search(domain, limit=1)
        image_data = None
        _logger.info(f"*****************************inside pos_zmall write item**********************************************{vals}*********")
        if "image_1920" in vals:
            _logger.info("image is found")
            image_data = vals['image_1920']
        
            
        #TODO: Bini, find pos_config by id it should accept it as a parameter the user should choose which pos config to use on the settings
        # _logger.info(f"self {self.id}")
        pos_config_id = self.env['pos.config'].search([], limit=1)
        # send request to get the products from the zmall api
        requestData = {
            "config_id": pos_config_id.id,
            "server_token": pos_config_id['server_token'],
            "store_id": pos_config_id['store_id'],
        }
        zmall_product = self.env['pos.config'].get_zmall_products(requestData)
        _logger.info(zmall_product)
        if "success" in zmall_product and (not zmall_product["success"]):
            _logger.info("re authenticate")
            auth_zmall = self.env["pos.config"].auth_zmall2(pos_config_id.id)
            _logger.info("auth_zmall")
            _logger.info(auth_zmall)
        # pos_config_id = None
        pos_session = self.env['pos.session'].search([('state', '=', 'opened'), ('user_id', '=', self.env.uid)], limit=1)

            
        # Check if a session was found
        pos_config_id = self.env['pos.config'].search([], limit=1)
        request_data = {
                        "config_id": pos_config_id['id'],
                        "store_id": pos_config_id['store_id'],
                        "server_token": pos_config_id['server_token'],
                        # "is_item_in_stock":product_json['is_item_in_stock'],
                     
                        
                    }
        self.env['pos.config'].get_zmall_products(request_data)
        
        
        items_with_no_pos_id = []
        if pos_config_id and pos_config_id.products_json:
            _logger.info("pos_config_id is found and products_json is found")
            zmall_products = json.loads(pos_config_id.products_json)
            for product_json in zmall_products:
                _logger.info("inside zmall_products")
                _logger.info(self.id)
                _logger.info(product_json['pos_id'])
                if not product_json['pos_id']:
                    items_with_no_pos_id.append(product_json)
                if str(product_json['pos_id']) == str(self.id):
                    _logger.info("update item")
                    # find the product from odoo
                    odoo_product = self.env['product.product'].search([('product_tmpl_id', '=', self.id)], limit=1)
                    request_data = {
                        "config_id": pos_config_id['id'],
                        "name": product_json['name'],
                        "store_id": pos_config_id['store_id'],
                        "server_token": pos_config_id['server_token'],
                        # "is_item_in_stock":product_json['is_item_in_stock'],
                        "is_visible_in_store": product_json['is_visible_in_store'],
                        'item_id':product_json['item_id'],
                        "price": product_json['price'],
                        
                    }
                    print(f"*****************item_id********************{product_json['item_id']}****************")
                    image_update_data = {
                        "config_id": pos_config_id['id'],
                        "store_id": pos_config_id['store_id'],
                        "server_token": pos_config_id['server_token'],
                        "item_id": product_json['item_id'],
                        "file": image_data
                    }
                    # _logger.info("item is found")
                    if 'available_in_pos' in vals:
                        request_data['is_visible_in_store'] = vals['available_in_pos']
                    if 'name' in vals:
                        request_data['name'] = vals['name']
                    if 'list_price' in vals:
                        request_data['price'] = vals['list_price']
                    if 'zmall_product_id' in vals:
                        request_data['product_id'] = vals['zmall_product_id']
                        _logger.info(f"zmall_product_id {vals['zmall_product_id']}")
                    # in order to update the products_json in the pos_config_id call the following function
                    self.env['pos.config'].get_zmall_products(request_data)
                    _logger.info(request_data)
                    updated_product = self.env['pos.config'].update_zmall_product(request_data)
                    # update product image
                    if image_data:
                        res = self.env['pos.config'].update_delivery_item_image(image_update_data)
                        print(f"********************res {res}****************")
                    if "success" in updated_product and (not updated_product["success"]):
                        _logger.info("re authenticate")
                        auth_zmall = self.env["pos.config"].auth_zmall2(pos_config_id.id)
                        return {"error": "the product is not updated successfully"}
                       


                    # _logger.info(updated_product)
                        

                    # _logger.info(product_json)

                    
                    # add only things which are in vals, add them to the request data in the above format and send the request 
                    # add another 
                    break

        # strategy 1: get the product from the zmall api and get the product of the current being updated item
        # match them by pos_id and update the product in the zmall api


            
        

        # _logger.info(f"*****************************inside pos_zmall update item**********************************************{vals}*********")
        # _logger.info(pos_config_id.enabled_zmall)
        # _logger.info(pos_config_id.zmall_api_endpoint)
        # _logger.info(pos_config_id.zmall_username)
        # _logger.info(pos_config_id.zmall_password)
        # json format of pos_config_id.products_json
        # _logger.info("products json of the pos_config")
        # _logger.info(pos_config_id.products_json)
        # _logger.info(f"pos_zmall config_id  {pos_config_id.server_token}")
        # _logger.info(f"pos_zmall poszmallconfig {pos_config_id.store_id}")



        # in order to update the products_json in the pos_config_id call the following function
        _logger.info(f"items with no pos id{items_with_no_pos_id}")
        self.env['pos.config'].get_zmall_products(request_data)
        return super().write(vals)





    
    # def write(self, vals):
    #     self._sanitize_vals(vals)
    #     if 'uom_id' in vals or 'uom_po_id' in vals:
    #         uom_id = self.env['uom.uom'].browse(vals.get('uom_id')) or self.uom_id
    #         uom_po_id = self.env['uom.uom'].browse(vals.get('uom_po_id')) or self.uom_po_id
    #         if uom_id and uom_po_id and uom_id.category_id != uom_po_id.category_id:
    #             vals['uom_po_id'] = uom_id.id
    #     res = super(ProductTemplate, self).write(vals)
    #     if self._context.get("create_product_product", True) and 'attribute_line_ids' in vals or (vals.get('active') and len(self.product_variant_ids) == 0):
    #         self._create_variant_ids()
    #     if 'active' in vals and not vals.get('active'):
    #         self.with_context(active_test=False).mapped('product_variant_ids').write({'active': vals.get('active')})
    #     if 'image_1920' in vals:
    #         self.env['product.product'].invalidate_model([
    #             'image_1920',
    #             'image_1024',
    #             'image_512',
    #             'image_256',
    #             'image_128',
    #             'can_image_1024_be_zoomed',
    #         ])
    #     return res


    # @api.model_create_multi
    # def create(self, vals_list):
    #     ''' Store the initial standard price in order to be able to retrieve the cost of a product template for a given date'''
    #     for vals in vals_list:
    #         self._sanitize_vals(vals)
    #     templates = super(ProductTemplate, self).create(vals_list)
    #     if self._context.get("create_product_product", True):
    #         templates._create_variant_ids()

    #     # This is needed to set given values to first variant after creation
    #     for template, vals in zip(templates, vals_list):
    #         related_vals = {}
    #         for field_name in self._get_related_fields_variant_template():
    #             if vals.get(field_name):
    #                 related_vals[field_name] = vals[field_name]
    #         if related_vals:
    #             template.write(related_vals)

    #     return templates
    

    # available_in_pos = fields.Boolean(string='Available in POS', help='Check if you want this product to appear in the Point of Sale.', default=False)
    # to_weight = fields.Boolean(string='To Weigh With Scale', help="Check if the product should be weighted using the hardware scale integration.")
    # pos_categ_ids = fields.Many2many(
    #     'pos.category', string='Point of Sale Category',
    #     help="Category used in the Point of Sale.")
    # combo_ids = fields.Many2many('pos.combo', string='Combinations')
    # detailed_type = fields.Selection(selection_add=[
    #     ('combo', 'Combo')
    # ], ondelete={'combo': 'set consu'})
    # type = fields.Selection(selection_add=[
    #     ('combo', 'Combo')
    # ], ondelete={'combo': 'set consu'})

    # @api.ondelete(at_uninstall=False)
    # def _unlink_except_open_session(self):
    #     product_ctx = dict(self.env.context or {}, active_test=False)
    #     if self.with_context(product_ctx).search_count([('id', 'in', self.ids), ('available_in_pos', '=', True)]):
    #         if self.env['pos.session'].sudo().search_count([('state', '!=', 'closed')]):
    #             raise UserError(_("To delete a product, make sure all point of sale sessions are closed.\n\n"
    #                 "Deleting a product available in a session would be like attempting to snatch a"
    #                 "hamburger from a customer’s hand mid-bite; chaos will ensue as ketchup and mayo go flying everywhere!"))

    # @api.onchange('sale_ok')
    # def _onchange_sale_ok(self):
    #     if not self.sale_ok:
    #         self.available_in_pos = False

    # @api.constrains('available_in_pos')
    # def _check_combo_inclusions(self):
    #     for product in self:
    #         if not product.available_in_pos:
    #             combo_name = self.env['pos.combo.line'].search([('product_id', 'in', product.product_variant_ids.ids)], limit=1).combo_id.name
    #             if combo_name:
    #                 raise UserError(_('You must first remove this product from the %s combo', combo_name))

# class ProductProduct(models.Model):
#     _inherit = 'product.product'

#     @api.ondelete(at_uninstall=False)
#     def _unlink_except_active_pos_session(self):
#         product_ctx = dict(self.env.context or {}, active_test=False)
#         if self.env['pos.session'].sudo().search_count([('state', '!=', 'closed')]):
#             if self.with_context(product_ctx).search_count([('id', 'in', self.ids), ('product_tmpl_id.available_in_pos', '=', True)]):
#                 raise UserError(_("To delete a product, make sure all point of sale sessions are closed.\n\n"
#                     "Deleting a product available in a session would be like attempting to snatch a"
#                     "hamburger from a customer’s hand mid-bite; chaos will ensue as ketchup and mayo go flying everywhere!"))

#     def get_product_info_pos(self, price, quantity, pos_config_id):
#         self.ensure_one()
#         config = self.env['pos.config'].browse(pos_config_id)

#         # Tax related
#         taxes = self.taxes_id.compute_all(price, config.currency_id, quantity, self)
#         grouped_taxes = {}
#         for tax in taxes['taxes']:
#             if tax['id'] in grouped_taxes:
#                 grouped_taxes[tax['id']]['amount'] += tax['amount']/quantity if quantity else 0
#             else:
#                 grouped_taxes[tax['id']] = {
#                     'name': tax['name'],
#                     'amount': tax['amount']/quantity if quantity else 0
#                 }

#         all_prices = {
#             'price_without_tax': taxes['total_excluded']/quantity if quantity else 0,
#             'price_with_tax': taxes['total_included']/quantity if quantity else 0,
#             'tax_details': list(grouped_taxes.values()),
#         }

#         # Pricelists
#         if config.use_pricelist:
#             pricelists = config.available_pricelist_ids
#         else:
#             pricelists = config.pricelist_id
#         price_per_pricelist_id = pricelists._price_get(self, quantity) if pricelists else False
#         pricelist_list = [{'name': pl.name, 'price': price_per_pricelist_id[pl.id]} for pl in pricelists]

#         # Warehouses
#         warehouse_list = [
#             {'name': w.name,
#             'available_quantity': self.with_context({'warehouse': w.id}).qty_available,
#             'forecasted_quantity': self.with_context({'warehouse': w.id}).virtual_available,
#             'uom': self.uom_name}
#             for w in self.env['stock.warehouse'].search([])]

#         # Suppliers
#         key = itemgetter('partner_id')
#         supplier_list = []
#         for key, group in groupby(sorted(self.seller_ids, key=key), key=key):
#             for s in list(group):
#                 if not((s.date_start and s.date_start > date.today()) or (s.date_end and s.date_end < date.today()) or (s.min_qty > quantity)):
#                     supplier_list.append({
#                         'name': s.partner_id.name,
#                         'delay': s.delay,
#                         'price': s.price
#                     })
#                     break

#         # Variants
#         variant_list = [{'name': attribute_line.attribute_id.name,
#                          'values': list(map(lambda attr_name: {'name': attr_name, 'search': '%s %s' % (self.name, attr_name)}, attribute_line.value_ids.mapped('name')))}
#                         for attribute_line in self.attribute_line_ids]

#         return {
#             'all_prices': all_prices,
#             'pricelists': pricelist_list,
#             'warehouses': warehouse_list,
#             'suppliers': supplier_list,
#             'variants': variant_list
#         }

# class ProductAttributeCustomValue(models.Model):
#     _inherit = "product.attribute.custom.value"

#     pos_order_line_id = fields.Many2one('pos.order.line', string="PoS Order Line", ondelete='cascade')

# class UomCateg(models.Model):
#     _inherit = 'uom.category'

#     is_pos_groupable = fields.Boolean(string='Group Products in POS',
#         help="Check if you want to group products of this category in point of sale orders")


# class Uom(models.Model):
#     _inherit = 'uom.uom'

#     is_pos_groupable = fields.Boolean(related='category_id.is_pos_groupable', readonly=False)
