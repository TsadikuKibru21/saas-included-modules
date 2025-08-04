# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api, _
import random
from odoo.tools import float_is_zero
import json
from odoo.exceptions import UserError, ValidationError
from collections import defaultdict


class pos_config(models.Model):
    _inherit = 'pos.config'

    def _get_default_location(self):
        return self.env['stock.warehouse'].search([('company_id', '=', self.env.user.company_id.id)],
                                                  limit=1).lot_stock_id

    pos_display_stock = fields.Boolean(string='Display Stock in POS')
    pos_stock_type = fields.Selection(
        [('onhand', 'Qty on Hand'),('available', 'Qty Available')], default='onhand', string='Stock Type', help='Seller can display Different stock type in POS.')
    pos_allow_order = fields.Boolean(string='Allow POS Order When Product is Out of Stock')
    pos_deny_order = fields.Char(string='Deny POS Order When Product Qty is goes down to')
    stock_position = fields.Selection(
        [('top_right', 'Top Right'), ('top_left', 'Top Left'), ('bottom_right', 'Bottom Right')], default='top_left', string='Stock Position')

    show_stock_location = fields.Selection([
        ('all', 'All Warehouse'),
        ('specific', 'Current Session Warehouse'),
    ], string='Show Stock Of', default='all')

    stock_location_id = fields.Many2one(
        'stock.location', string='Stock Location',
        domain=[('usage', '=', 'internal')], required=True, default=_get_default_location)
    
    color_background = fields.Char(
        string='Color',)
    font_background = fields.Char(
        string='Font Color',)
    low_stock = fields.Float(
        string='Product Low Stock',default=0.00)

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    pos_display_stock = fields.Boolean(related="pos_config_id.pos_display_stock",readonly=False)
    pos_stock_type = fields.Selection(related="pos_config_id.pos_stock_type", readonly=False,string='Stock Type', help='Seller can display Different stock type in POS.')
    pos_allow_order = fields.Boolean(string='Allow POS Order When Product is Out of Stock',readonly=False,related="pos_config_id.pos_allow_order")
    pos_deny_order = fields.Char(string='Deny POS Order When Product Qty is goes down to',readonly=False,related="pos_config_id.pos_deny_order")

    show_stock_location = fields.Selection(string='Show Stock Of',readonly=False, related="pos_config_id.show_stock_location")

    stock_location_id = fields.Many2one(
        'stock.location', string='Stock Location',
        domain=[('usage', '=', 'internal')], related="pos_config_id.stock_location_id",readonly=False)
    stock_position = fields.Selection(related="pos_config_id.stock_position", readonly=False,string='Stock Position')
    color_background = fields.Char(string='Background Color',readonly=False,related="pos_config_id.color_background")
    font_background = fields.Char(string='Font Color',readonly=False,related="pos_config_id.font_background")
    low_stock = fields.Float(string='Product Low Stock',readonly=False,related="pos_config_id.low_stock")


class pos_order(models.Model):
    _inherit = 'pos.order'

    location_id = fields.Many2one(
        comodel_name='stock.location',
        related='config_id.stock_location_id',
        string="Location", store=True,
        readonly=True,
    )


class stock_quant(models.Model):
    _inherit = 'stock.move'

    @api.model
    def sync_product(self, prd_id):
        notifications = []
        ssn_obj = self.env['pos.session'].sudo()
        prod_fields = ssn_obj._loader_params_product_product()['search_params']['fields']
        prod_obj = self.env['product.product'].sudo()

        # Perform the search_read operation
        product = prod_obj.with_context(display_default_code=False).search_read([('id', '=', prd_id)], prod_fields)
        
        # Ensure that the product list is not empty
        if not product:
            return True  # Or handle the situation differently if needed

        product_id = prod_obj.search([('id', '=', prd_id)])
        
        # Compute the quantities
        res = product_id._compute_quantities_dict(
            self._context.get('lot_id'), 
            self._context.get('owner_id'), 
            self._context.get('package_id'), 
            self._context.get('from_date'), 
            self._context.get('to_date')
        )
        
        # Update qty_available based on the computed quantities
        if product_id.id in res:
            product[0]['qty_available'] = res[product_id.id]['qty_available']
        else:
            product[0]['qty_available'] = 0  # Default value

        # Further processing if product exists
        if product:
            categories = ssn_obj._get_pos_ui_product_category(ssn_obj._loader_params_product_category())
            product_category_by_id = {category['id']: category for category in categories}
            product[0]['categ'] = product_category_by_id[product[0]['categ_id'][0]]

            vals = {
                'id': [product[0].get('id')], 
                'product': product,
                'access': 'pos.sync.product',
            }
            notifications.append([self.env.user.partner_id, 'product.product/sync_data', vals])
        
        # Send notifications if there are any
        if notifications:
            self.env['bus.bus']._sendmany(notifications)
        
        return True

    @api.model
    def create(self, vals):
        res = super(stock_quant, self).create(vals)
        notifications = []
        for rec in res:
            rec.sync_product(rec.product_id.id)
        return res

    def write(self, vals):
        res = super(stock_quant, self).write(vals)
        notifications = []
        for rec in self:
            rec.sync_product(rec.product_id.id)
        return res


class ProductInherit(models.Model):
    _inherit = 'product.product'

    quant_text = fields.Text('Quant Qty', compute='_compute_avail_locations', store=True)


    def get_low_stock_products(self,low_stock):
        products=self.search([('detailed_type', '=' ,'product')]);
        product_list=[]
        for product in products:
            if product.qty_available <= low_stock:
                product_list.append(product.id)
        return product_list
    @api.depends('stock_quant_ids', 'stock_quant_ids.product_id', 'stock_quant_ids.location_id',
                 'stock_quant_ids.quantity','stock_quant_ids.available_quantity')
    def _compute_avail_locations(self):
        notifications = []
        for rec in self:
            final_data = {}
            rec.quant_text = json.dumps(final_data)
            if rec.type == 'product':
                quants = self.env['stock.quant'].sudo().search(
                    [('product_id', 'in', rec.ids), ('location_id.usage', '=', 'internal')])
                for quant in quants:
                    loc = quant.location_id.id
                    if loc in final_data:
                        last_qty = final_data[loc][0]
                        final_data[loc][0] = last_qty + quant.quantity
                    else:
                        final_data[loc] = [quant.quantity, 0, 0,quant.available_quantity]
                rec.quant_text = json.dumps(final_data)
        return True


class StockPicking(models.Model):
    _inherit = 'stock.picking'

    @api.model
    def _create_picking_from_pos_order_lines(self, location_dest_id, lines, picking_type, partner=False):
        """We'll create some picking based on order_lines"""

        pickings = self.env['stock.picking']
        stockable_lines = lines.filtered(
            lambda l: l.product_id.type in ['product', 'consu'] and not float_is_zero(l.qty,
                                                                                      precision_rounding=l.product_id.uom_id.rounding))
        if not stockable_lines:
            return pickings
        positive_lines = stockable_lines.filtered(lambda l: l.qty > 0)
        negative_lines = stockable_lines - positive_lines

        if positive_lines:
            pos_order = positive_lines[0].order_id
            location_id = pos_order.location_id.id
            vals = self._prepare_picking_vals(partner, picking_type, location_id, location_dest_id)
            positive_picking = self.env['stock.picking'].create(vals)
            positive_picking._create_move_from_pos_order_lines(positive_lines)
            try:
                with self.env.cr.savepoint():
                    positive_picking._action_done()
            except (UserError, ValidationError):
                pass

            pickings |= positive_picking
        if negative_lines:
            if picking_type.return_picking_type_id:
                return_picking_type = picking_type.return_picking_type_id
                return_location_id = return_picking_type.default_location_dest_id.id
            else:
                return_picking_type = picking_type
                return_location_id = picking_type.default_location_src_id.id

            vals = self._prepare_picking_vals(partner, return_picking_type, location_dest_id, return_location_id)
            negative_picking = self.env['stock.picking'].create(vals)
            negative_picking._create_move_from_pos_order_lines(negative_lines)
            try:
                with self.env.cr.savepoint():
                    negative_picking._action_done()
            except (UserError, ValidationError):
                pass
            pickings |= negative_picking
        return pickings
