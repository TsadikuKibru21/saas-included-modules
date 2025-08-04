from odoo import fields, models, api, _

from odoo.exceptions import ValidationError, UserError
from odoo.tools import float_repr, float_compare
import json
import logging
from datetime import datetime, timedelta
from odoo.tools import (float_compare, float_repr, formatLang)

_logger = logging.getLogger(__name__)

class AccountMove(models.Model):
    _inherit = 'account.move'
    
    pos_order_id = fields.Many2one('pos.order', string='POS Order', help='Reference to the POS order')
    # service_charge = fields.Float(string='Service Charge')
    service_charge = fields.Many2one('account.tax', string='Service Charge', help='Reference to the service charge tax')
    is_refund = fields.Boolean(string="Is Refund", help="Is a Refund Order")
    fs_no = fields.Char('FS No')
    rf_no = fields.Char('RF No')
    fiscal_mrc = fields.Char('MRC')
    payment_qr_code_str = fields.Char('Payment QR Code')
    
    plate_no = fields.Char('Plate No')
    chassis_no = fields.Char('Chassis No')
    job_card_no = fields.Char('Job Card No')
    brand = fields.Char('Brand')
    model = fields.Char('Model')

class PosOrderInherit(models.Model):
    _inherit = 'pos.order'

    fiscal_date = fields.Datetime(string='FP Date Time')
    is_refund = fields.Boolean(string="Is Refund", help="Is a Refund Order")
    checked = fields.Boolean(string="Checked Cash", help="Cash received from waiter")
    waiter_name = fields.Char('Waiter Name')
    fs_no = fields.Char('FS No')
    rf_no = fields.Char('RF No')
    ej_checksum = fields.Char('EJ Checksum')
    fiscal_mrc = fields.Char('MRC')
    payment_qr_code_str = fields.Char('Payment QR Code')
    
    plate_no = fields.Char('Plate No')
    chassis_no = fields.Char('Chassis No')
    job_card_no = fields.Char('Job Card No')
    brand = fields.Char('Brand')
    model = fields.Char('Model')
    
    # service_charge_amount = fields.Monetary(string='Service Charge', readonly=True, compute='_compute_service_charge_amount', group_operator='sum')
    synced_mrc = fields.Text(string='Synced MRC')
    synced_mrc_list = fields.Char(compute='_convert_synced_mrc_to_list', inverse='_convert_synced_mrc_to_text')

    @api.model
    def set_order_checked(self, order_id):
        order = self.search([('pos_reference', '=', order_id)], limit=1)
        if order:
            order.update({
                'checked': True
            })
            return True
        return False
            
    @api.model
    def get_orders_without_fs_no(self, search_string):
        orders = self.search([
            '|', '|', '|',
                ('fs_no', '=', False),
                ('fiscal_mrc', '=', False),
                ('ej_checksum', '=', False),
                ('synced_mrc', '=', False),
            ("amount_total", ">", 0)
        ])
        def string_not_in_synced_mrc(order):
            synced_mrc_list = json.loads(order.synced_mrc or '[]')
            return search_string not in synced_mrc_list
        
        filtered_orders = orders.filtered(string_not_in_synced_mrc)
        
        return filtered_orders.mapped('pos_reference')

    @api.model
    def get_orders_without_rf_no(self, search_string):
        orders = self.search([
            '|', '|', '|',
                ('rf_no', '=', False),
                ('fiscal_mrc', '=', False),
                ('ej_checksum', '=', False),
                ('synced_mrc', '=', False),
            ("amount_total", ">", 0)
        ])
        def string_not_in_synced_mrc(order):
            synced_mrc_list = json.loads(order.synced_mrc or '[]')
            return search_string not in synced_mrc_list
        
        filtered_orders = orders.filtered(string_not_in_synced_mrc)
        
        return filtered_orders.mapped('pos_reference')
    
    @api.model
    def add_to_synced_mrc(self, pos_reference, fiscal_mrc):
        orders = self.search([('pos_reference', '=', pos_reference)])
        for order in orders:
            synced_mrc_list = json.loads(order.synced_mrc or '[]')
            if fiscal_mrc not in synced_mrc_list:
                synced_mrc_list.append(fiscal_mrc)
                order.synced_mrc = json.dumps(synced_mrc_list)

    @api.model
    def _convert_synced_mrc_to_list(self):
        for order in self:
            if order.synced_mrc:
                order.synced_mrc_list = json.loads(order.synced_mrc)

    @api.model
    def _convert_synced_mrc_to_text(self):
        for order in self:
            if order.synced_mrc_list:
                order.synced_mrc = json.dumps(order.synced_mrc_list)

    @api.model
    def _process_order(self, order, draft, existing_order):
        result = super(PosOrderInherit, self)._process_order(order, draft, existing_order)
        pos_order = self.search([('id', '=', result)])
        mrp_order = self.env['mrp.production']
        # Check if the pos_order.is_refund field exists and if it exists, only proceed if it is False
        if pos_order.config_id.create_mrp_order and draft == False:
            for line in pos_order.lines:
                route_ids = line.product_id.route_ids.mapped('name')
                if 'Manufacture' in route_ids:
                    if line.product_id.bom_ids and line.qty > 0:
                        mrp_order = mrp_order.create({
                            'product_id': line.product_id.id,
                            'product_qty': line.qty,
                            'date_start': datetime.now(),
                            'user_id': self.env.user.id,
                            'company_id': self.env.company.id,
                            'origin': pos_order.pos_reference
                        })
                        mrp_order.action_confirm()
                        if pos_order.config_id.is_done:
                            mrp_order.write({
                                'qty_producing': line.qty,
                            })
                            for move_line in mrp_order.move_raw_ids:
                                move_line.write({'quantity': move_line.product_uom_qty, 'picked': True})
                                mrp_order.button_mark_done()
        return result
            
    @api.model
    def _order_fields(self, ui_order):
        vals = super(PosOrderInherit, self)._order_fields(ui_order)
        vals.update({
            'is_refund': ui_order.get('is_refund', False),
            'checked': ui_order.get('checked', False),
            'fs_no': ui_order.get('fs_no', ''),
            'rf_no': ui_order.get('rf_no', ''),
            'ej_checksum': ui_order.get('ej_checksum', ''),
            'fiscal_mrc': ui_order.get('fiscal_mrc', ''),
            'payment_qr_code_str': ui_order.get('payment_qr_code_str', ''),
            'plate_no': ui_order.get('plate_no', ''),
            'chassis_no': ui_order.get('chassis_no', ''),
            'job_card_no': ui_order.get('job_card_no', ''),
            'brand': ui_order.get('brand', ''),
            'model': ui_order.get('model', ''),
        })
        
        # Check if 'date_order' is in the received ui_order and update it
        if 'date_order' in vals:
            # Parse the datetime string to a datetime object
            date_order = fields.Datetime.from_string(vals['date_order'])
            # Add 3 hours to the date_order
            date_order += timedelta(hours=3)
            # Convert back to string if necessary, depends on Odoo version
            vals['fiscal_date'] = fields.Datetime.to_string(date_order)

        return vals
    
    def _prepare_refund_values(self, current_session):
        vals = super(PosOrderInherit, self)._prepare_refund_values(current_session)
        vals.update({'is_refund': True})
        return vals

    def _prepare_invoice_vals(self):
        result = super(PosOrderInherit, self)._prepare_invoice_vals()
        result.update({
            'pos_order_id': self.id,
            'invoice_date' : self.date_order,
            'ref': self.pos_reference,
            'fs_no':self.fs_no,
            'is_refund': self.is_refund,
            'rf_no':self.rf_no,
            'fiscal_mrc':self.fiscal_mrc,
            'payment_qr_code_str': self.payment_qr_code_str,
            'plate_no': self.plate_no,
            'chassis_no': self.chassis_no,
            'job_card_no': self.job_card_no,
            'brand': self.brand,
            'model': self.model,
        })
        return result

    def _export_for_ui(self, order):
        result = super(PosOrderInherit, self)._export_for_ui(order)
        result.update({
            'is_refund': order.is_refund,
            'checked': order.checked,
            'fs_no': order.fs_no,
            'rf_no': order.rf_no,
            'ej_checksum': order.ej_checksum,
            'fiscal_mrc': order.fiscal_mrc,
            'payment_qr_code_str': order.payment_qr_code_str,
        })
        return result

class PosOrderLineInherit(models.Model):
    _inherit = 'pos.order.line'

    service_charge = fields.Many2one('account.tax', string='Service Charge', domain=[('type_tax_use', '=', 'sale'), ('include_base_amount', '=', True)], help='Reference to the service charge tax')
    
    def _export_for_ui(self, orderline):
        return {
            'id': orderline.id,
            'qty': orderline.qty,
            'attribute_value_ids': orderline.attribute_value_ids.ids,
            'custom_attribute_value_ids': orderline.custom_attribute_value_ids.read(['id', 'name', 'custom_product_template_attribute_value_id', 'custom_value'], load=False),
            'price_unit': orderline.price_unit,
            'skip_change': orderline.skip_change,
            'uuid': orderline.uuid,
            'price_subtotal': orderline.price_subtotal,
            'price_subtotal_incl': orderline.price_subtotal_incl,
            'product_id': orderline.product_id.id,
            'discount': orderline.discount,
            'tax_ids': [[6, False, orderline.tax_ids.mapped(lambda tax: tax.id)]],
            'pack_lot_ids': [[0, 0, lot] for lot in orderline.pack_lot_ids.export_for_ui()],
            'customer_note': orderline.customer_note,
            'refunded_qty': orderline.refunded_qty,
            'price_extra': orderline.price_extra,
            'full_product_name': orderline.full_product_name,
            'refunded_orderline_id': orderline.refunded_orderline_id.id,
            'combo_parent_id': orderline.combo_parent_id.id,
            'combo_line_ids': orderline.combo_line_ids.mapped('id'),
            'service_charge': orderline.service_charge,  # Add the service charge here
        }