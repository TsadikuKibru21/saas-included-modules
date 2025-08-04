from odoo import fields, models, api, _
from odoo.exceptions import UserError, ValidationError

import logging

_logger = logging.getLogger(__name__)

class PosConfig(models.Model):
    _inherit = 'pos.config'

    index_db = fields.Boolean("Indexed Database")
    log_start_date = fields.Datetime(
        string='Start Date',
        default=fields.Datetime.now,
        required=True
        )
    log_start_date = fields.Datetime(
        string='End Date',
        default=fields.Datetime.now,
        required=True
        )
    global_service_charge = fields.Many2one('account.tax', string='Global Service Charge', domain=[('type_tax_use', '=', 'sale'), ('include_base_amount', '=', True)], help='Reference to the global service charge tax')
    pos_module_pos_service_charge = fields.Boolean("Global Service charge")
    serial_number = fields.Char("Fiscal Printer Serial Number")
    fiscal_mrc = fields.Char("Fiscal Printer MRC")
    pos_customer_id = fields.Many2one('res.partner', string='Default Customer')
    pos_module_pos_service_charge = fields.Boolean("Global Service charge")
    receipt_image = fields.Image(
        string="Receipt Image",
        help="Image to display on the fiscal receipt",
        max_width=1200,
        max_height=250,
    )
    receipt_image_name = fields.Char(
        string="Receipt Image Name",
        help="Receipt Image Name",
    )
    
    allow_quantity_change_and_remove_orderline = fields.Selection([
        ('none', 'None'),
        ('basic', 'Basic Users'),
        ('advanced', 'Advanced Users'),
        ('both', 'Both')
    ], string='Allow Quantity Change & Remove Orderline', default='none')
    allow_quantity_change_and_remove_orderline_pin_lock_enabled = fields.Boolean(string='Enable PIN Locking for Quantity Change & Remove Orderline', default=False)
    allow_quantity_change_and_remove_orderline_pin_code = fields.Char(string='PIN Code', widget='password')

    allow_remove_orderline = fields.Selection([
        ('none', 'None'),
        ('basic', 'Basic Users'),
        ('advanced', 'Advanced Users'),
        ('both', 'Both')
    ], string='Allow Remove Orderline', default='none')
    allow_remove_orderline_pin_lock_enabled = fields.Boolean(string='Enable PIN Locking for Remove Orderline', default=False)
    allow_remove_orderline_pin_code = fields.Char(string='PIN Code', widget='password')

    allow_price_change = fields.Selection([
        ('none', 'None'),
        ('basic', 'Basic Users'),
        ('advanced', 'Advanced Users'),
        ('both', 'Both')
    ], string='Allow Price Change', default='none')
    price_change_pin_lock_enabled = fields.Boolean(string='Enable PIN Locking for Price Change', default=False)
    price_change_pin_code = fields.Char(string='PIN Code', widget='password')
    
    z_report_access_level = fields.Selection([
        ('none', 'None'),
        ('basic', 'Basic Users'),
        ('advanced', 'Advanced Users'),
        ('both', 'Both')
    ], string='Access Level', default='none')
    z_report_pin_lock_enabled = fields.Boolean(string='Enable PIN Locking', default=False)
    z_report_pin_code = fields.Char(string='PIN Code')

    x_report_access_level = fields.Selection([
        ('none', 'None'),
        ('basic', 'Basic Users'),
        ('advanced', 'Advanced Users'),
        ('both', 'Both')
    ], string='Access Level', default='none')
    x_report_pin_lock_enabled = fields.Boolean(string='Enable PIN Locking', default=False)
    x_report_pin_code = fields.Char(string='PIN Code')

    fr_pin_access_level = fields.Selection([
        ('none', 'None'),
        ('basic', 'Basic Users'),
        ('advanced', 'Advanced Users'),
        ('both', 'Both')
    ], string='Access Level', default='none')
    fr_pin_lock_enabled = fields.Boolean(string='Enable PIN Locking', default=False)
    fr_pin_code = fields.Char(string='PIN Code')

    ej_read_access_level = fields.Selection([
        ('none', 'None'),
        ('basic', 'Basic Users'),
        ('advanced', 'Advanced Users'),
        ('both', 'Both')
    ], string='Access Level', default='none')
    ej_read_pin_lock_enabled = fields.Boolean(string='Enable PIN Locking', default=False)
    ej_read_pin_code = fields.Char(string='PIN Code')

    ej_copy_access_level = fields.Selection([
        ('none', 'None'),
        ('basic', 'Basic Users'),
        ('advanced', 'Advanced Users'),
        ('both', 'Both')
    ], string='Access Level', default='none')
    ej_copy_pin_lock_enabled = fields.Boolean(string='Enable PIN Locking', default=False)
    ej_copy_pin_code = fields.Char(string='PIN Code')

    all_plu_access_level = fields.Selection([
        ('none', 'None'),
        ('basic', 'Basic Users'),
        ('advanced', 'Advanced Users'),
        ('both', 'Both')
    ], string='Access Level', default='none')
    all_plu_pin_lock_enabled = fields.Boolean(string='Enable PIN Locking', default=False)
    all_plu_pin_code = fields.Char(string='PIN Code')

    all_tax_access_level = fields.Selection([
        ('none', 'None'),
        ('basic', 'Basic Users'),
        ('advanced', 'Advanced Users'),
        ('both', 'Both')
    ], string='Access Level', default='none')
    all_tax_pin_lock_enabled = fields.Boolean(string='Enable PIN Locking', default=False)
    all_tax_pin_code = fields.Char(string='PIN Code')

    sync_fp_pin_access_level = fields.Selection([
        ('none', 'None'),
        ('basic', 'Basic Users'),
        ('advanced', 'Advanced Users'),
        ('both', 'Both')
    ], string='Access Level', default='none')
    sync_fp_pin_lock_enabled = fields.Boolean(string='Enable PIN Locking', default=False)
    sync_fp_pin_code = fields.Char(string='PIN Code')
    
    gprs_upload_access_level = fields.Selection([
        ('none', 'None'),
        ('basic', 'Basic Users'),
        ('advanced', 'Advanced Users'),
        ('both', 'Both')
    ], string='Access Level', default='none')
    gprs_upload_pin_lock_enabled = fields.Boolean(string='Enable PIN Locking', default=False)
    gprs_upload_pin_code = fields.Char(string='PIN Code')

    payment_access_level = fields.Selection([
        ('none', 'None'),
        ('basic', 'Basic Users'),
        ('advanced', 'Advanced Users'),
        ('both', 'Both')
    ], string='Access Level', default='none')
    payment_pin_lock_enabled = fields.Boolean(string='Enable PIN Locking', default=False)
    payment_pin_code = fields.Char(string='PIN Code')

    discount_access_level = fields.Selection([
        ('none', 'None'),
        ('basic', 'Basic Users'),
        ('advanced', 'Advanced Users'),
        ('both', 'Both')
    ], string='Access Level', default='none')

    create_mrp_order = fields.Boolean("Create MRP Order", help="Allow to create MRP Order in POS", default=True)
    is_done = fields.Boolean("Done MRP Order", help="Allow to Done MRP Order in POS", default=True)    
    show_waiter_table_on_fiscal_receipt = fields.Boolean("Show Waiter and Table on Fiscal Receipt", default=False, domain="[('module_pos_restaurant', '=', True)]")
    order_printing_type = fields.Selection([
        ('android', 'via Android'),
        ('server', 'via Server')
    ], string='Order Printing Type', default='android')
    order_auto_invoice = fields.Boolean("Order Auto Invoice")
    z_on_closing = fields.Boolean("Print Z Report upon session closing", default=True)

    @api.constrains('payment_pin_code', 'discount_pin_code', 'sync_fp_pin_code', 'close_session_pin_code', 'all_tax_pin_code', 'all_plu_pin_code', 'ej_copy_pin_code', 'ej_read_pin_code', 'fr_pin_code', 'x_report_pin_code', 'z_report_pin_code', 'gprs_upload_pin_code')
    def _check_pin_code(self):
        pin_fields = [
            ('sync_fp_pin_lock_enabled', 'sync_fp_pin_code', 'Sync FP PIN'),
            ('all_tax_pin_lock_enabled', 'all_tax_pin_code', 'All Tax PIN'),
            ('all_plu_pin_lock_enabled', 'all_plu_pin_code', 'All PLU PIN'),
            ('ej_copy_pin_lock_enabled', 'ej_copy_pin_code', 'EJ Copy PIN'),
            ('ej_read_pin_lock_enabled', 'ej_read_pin_code', 'EJ Read PIN'),
            ('fr_pin_lock_enabled', 'fr_pin_code', 'FR PIN'),
            ('x_report_pin_lock_enabled', 'x_report_pin_code', 'X Report PIN'),
            ('z_report_pin_lock_enabled', 'z_report_pin_code', 'Z Report PIN'),
            ('gprs_upload_pin_lock_enabled', 'gprs_upload_pin_code', 'GPRS Upload PIN'),
            ('payment_pin_lock_enabled', 'payment_pin_code', 'Payment PIN'),
        ]

        for lock_enabled_field, pin_code_field, pin_name in pin_fields:
            lock_enabled = getattr(self, lock_enabled_field)
            pin_code = getattr(self, pin_code_field)
            if lock_enabled and (not pin_code or not pin_code.isdigit() or len(pin_code) != 4):
                raise ValidationError(_("Please set a valid 4-digit {0} if {0} locking is enabled.").format(pin_name))
            
    @api.model
    def create(self, vals):
        if 'global_service_charge' in vals:
            tax = self.env['account.tax'].browse(vals['global_service_charge'])
            self._ensure_lower_sequence(tax)
        return super(PosConfig, self).create(vals)

    def write(self, vals):
        if 'global_service_charge' in vals:
            tax = self.env['account.tax'].browse(vals['global_service_charge'])
            self._ensure_lower_sequence(tax)
        return super(PosConfig, self).write(vals)

    def _ensure_lower_sequence(self, tax):
        other_taxes = self.env['account.tax'].search([('type_tax_use', '=', 'sale'), ('id', '!=', tax.id)])
        min_sequence = min(other_taxes.mapped('sequence')) if other_taxes else 1

        # Check if the selected tax sequence is already lower or can be set lower
        if tax.sequence >= min_sequence:
            if tax.sequence == 1:
                raise UserError(_('The selected global service charge tax cannot have a sequence lower than other taxes.'))
            tax.sequence = min_sequence - 1