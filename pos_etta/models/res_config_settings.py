from odoo import fields, models

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    global_service_charge = fields.Many2one(
        'account.tax', 
        string='Global Service Charge', 
        related='pos_config_id.global_service_charge', 
        readonly=False, 
        domain=[('type_tax_use', '=', 'sale'), ('include_base_amount', '=', True)],
        help='Reference to the global service charge tax'
    )
    # global_service_charge =  fields.Float(related='pos_config_id.global_service_charge', readonly=False)
    pos_module_pos_service_charge = fields.Boolean(related='pos_config_id.pos_module_pos_service_charge', readonly=False)
    serial_number = fields.Char(related='pos_config_id.serial_number',readonly=False)
    fiscal_mrc = fields.Char(related='pos_config_id.fiscal_mrc',readonly=False)
    pos_customer_id = fields.Many2one('res.partner', related='pos_config_id.pos_customer_id', readonly=False)
    receipt_image = fields.Image(related="pos_config_id.receipt_image", readonly=False)
    receipt_image_name = fields.Char(related="pos_config_id.receipt_image_name", readonly=False)
    
    allow_quantity_change_and_remove_orderline = fields.Selection(related='pos_config_id.allow_quantity_change_and_remove_orderline', readonly=False)
    allow_quantity_change_and_remove_orderline_pin_lock_enabled = fields.Boolean(related='pos_config_id.allow_quantity_change_and_remove_orderline_pin_lock_enabled', readonly=False)
    allow_quantity_change_and_remove_orderline_pin_code = fields.Char(related='pos_config_id.allow_quantity_change_and_remove_orderline_pin_code', readonly=False)

    allow_remove_orderline = fields.Selection(related='pos_config_id.allow_remove_orderline', readonly=False)
    allow_remove_orderline_pin_lock_enabled = fields.Boolean(related='pos_config_id.allow_remove_orderline_pin_lock_enabled', readonly=False)
    allow_remove_orderline_pin_code = fields.Char(related='pos_config_id.allow_remove_orderline_pin_code', readonly=False)

    allow_price_change = fields.Selection(related='pos_config_id.allow_price_change', readonly=False)
    price_change_pin_lock_enabled = fields.Boolean(related='pos_config_id.price_change_pin_lock_enabled', readonly=False)
    price_change_pin_code = fields.Char(related='pos_config_id.price_change_pin_code', readonly=False)

    z_report_access_level = fields.Selection(related='pos_config_id.z_report_access_level', readonly=False)
    z_report_pin_lock_enabled = fields.Boolean(related='pos_config_id.z_report_pin_lock_enabled', readonly=False)
    z_report_pin_code = fields.Char(related='pos_config_id.z_report_pin_code', readonly=False)

    x_report_access_level = fields.Selection(related='pos_config_id.x_report_access_level', readonly=False)
    x_report_pin_lock_enabled = fields.Boolean(related='pos_config_id.x_report_pin_lock_enabled', readonly=False)
    x_report_pin_code = fields.Char(related='pos_config_id.x_report_pin_code', readonly=False)

    fr_pin_access_level = fields.Selection(related='pos_config_id.fr_pin_access_level', readonly=False)
    fr_pin_lock_enabled = fields.Boolean(related='pos_config_id.fr_pin_lock_enabled', readonly=False)
    fr_pin_code = fields.Char(related='pos_config_id.fr_pin_code', readonly=False)

    ej_read_access_level = fields.Selection(related='pos_config_id.ej_read_access_level', readonly=False)
    ej_read_pin_lock_enabled = fields.Boolean(related='pos_config_id.ej_read_pin_lock_enabled', readonly=False)
    ej_read_pin_code = fields.Char(related='pos_config_id.ej_read_pin_code', readonly=False)

    ej_copy_access_level = fields.Selection(related='pos_config_id.ej_copy_access_level', readonly=False)
    ej_copy_pin_lock_enabled = fields.Boolean(related='pos_config_id.ej_copy_pin_lock_enabled', readonly=False)
    ej_copy_pin_code = fields.Char(related='pos_config_id.ej_copy_pin_code', readonly=False)

    all_plu_access_level = fields.Selection(related='pos_config_id.all_plu_access_level', readonly=False)
    all_plu_pin_lock_enabled = fields.Boolean(related='pos_config_id.all_plu_pin_lock_enabled', readonly=False)
    all_plu_pin_code = fields.Char(related='pos_config_id.all_plu_pin_code', readonly=False)

    all_tax_access_level = fields.Selection(related='pos_config_id.all_tax_access_level', readonly=False)
    all_tax_pin_lock_enabled = fields.Boolean(related='pos_config_id.all_tax_pin_lock_enabled', readonly=False)
    all_tax_pin_code = fields.Char(related='pos_config_id.all_tax_pin_code', readonly=False)

    sync_fp_pin_access_level = fields.Selection(related='pos_config_id.sync_fp_pin_access_level', readonly=False)
    sync_fp_pin_lock_enabled = fields.Boolean(related='pos_config_id.sync_fp_pin_lock_enabled', readonly=False)
    sync_fp_pin_code = fields.Char(related='pos_config_id.sync_fp_pin_code', readonly=False)

    gprs_upload_access_level = fields.Selection(related='pos_config_id.gprs_upload_access_level', readonly=False)
    gprs_upload_pin_lock_enabled = fields.Boolean(related='pos_config_id.gprs_upload_pin_lock_enabled', readonly=False)
    gprs_upload_pin_code = fields.Char(related='pos_config_id.gprs_upload_pin_code', readonly=False)

    payment_access_level = fields.Selection(related='pos_config_id.payment_access_level', readonly=False)
    payment_pin_lock_enabled = fields.Boolean(related='pos_config_id.payment_pin_lock_enabled', readonly=False)
    payment_pin_code = fields.Char(related='pos_config_id.payment_pin_code', readonly=False)

    discount_access_level = fields.Selection(related='pos_config_id.discount_access_level', readonly=False)

    order_printing_type = fields.Selection(related='pos_config_id.order_printing_type', readonly=False)
    create_mrp_order = fields.Boolean(related='pos_config_id.create_mrp_order', readonly=False)
    is_done = fields.Boolean(related='pos_config_id.is_done', readonly=False)  
    show_waiter_table_on_fiscal_receipt = fields.Boolean(related='pos_config_id.show_waiter_table_on_fiscal_receipt', readonly=False)
    order_auto_invoice = fields.Boolean(related='pos_config_id.order_auto_invoice', readonly=False)
    z_on_closing = fields.Boolean(related='pos_config_id.z_on_closing', readonly=False)