from odoo import models, fields, api, _
from odoo.exceptions import ValidationError
import logging

_logger = logging.getLogger(__name__)

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    service_charge = fields.Many2one('account.tax', string='Service Charge', domain=[('type_tax_use', '=', 'sale'), ('include_base_amount', '=', True)], help='Reference to the service charge tax')
    # service_charge = fields.Float(string='Service Charge')

    product_count = fields.Integer(
        string="Available Quantity",
        help="Number of products that can be made using available BOMs."
    )
    check_quant = fields.Boolean(
        string="Check Quantity",
        help="Indicates if there are insufficient quantities for production."
    )

    def _compute_product_count(self):
        """
        Computes the maximum number of finished products that can be produced
        based on the available quantities of BOM components.
        """
        _logger.info("Starting _compute_product_count for product templates...")

        for product_template in self:
            _logger.info("Processing product template: %s", product_template.name)
            max_producible = float('inf')  # Start with an infinitely large number
            insufficient_quantity = False  # Flag to track any component with zero availability

            # Get all BOMs associated with this product template
            boms = self.env['mrp.bom'].search([('product_tmpl_id', '=', product_template.id)])
            _logger.info("Found %d BOM(s) for product template: %s", len(boms), product_template.name)

            if not boms:
                # If there are no BOMs, product_count should be 0
                _logger.info("No BOMs found for product template: %s, setting product_count to 0", product_template.name)
                product_template.product_count = 0
                product_template.check_quant = True
                continue

            for bom in boms:
                _logger.info("Processing BOM: %s for product template: %s", bom.product_id.name, product_template.name)
                for line in bom.bom_line_ids:
                    required_qty = line.product_qty
                    available_qty = line.product_id.qty_available

                    _logger.info(
                        "BOM line product: %s, required quantity: %f, available quantity: %f",
                        line.product_id.name, required_qty, available_qty
                    )

                    if required_qty == 0:
                        _logger.info("Required quantity is zero for product: %s, skipping", line.product_id.name)
                        continue  # Avoid division by zero

                    producible_units = available_qty / required_qty
                    _logger.info("Producible units based on available quantity: %f", producible_units)

                    if available_qty <= 0 or producible_units < 1:
                        insufficient_quantity = True  # Component is insufficient for even one unit
                        _logger.info("Insufficient quantity for product: %s", line.product_id.name)

                    max_producible = min(max_producible, producible_units)

            if max_producible == float('inf'):
                _logger.info("No valid BOM lines found for product template: %s, setting product_count to 0", product_template.name)
                product_template.product_count = 0
            else:
                product_template.product_count = int(max_producible)
                _logger.info("Set product_count to %d for product template: %s", product_template.product_count, product_template.name)

            product_template.check_quant = insufficient_quantity
            if insufficient_quantity:
                _logger.info("Check_quant set to True due to insufficient quantities for product template: %s", product_template.name)
            else:
                _logger.info("Check_quant set to False for product template: %s", product_template.name)

        _logger.info("Finished _compute_product_count for all product templates.")
    
    # @api.constrains('taxes_id')
    # def _check_taxes_id(self):
    #     for record in self:
    #         if len(record.taxes_id) > 1:
    #             raise ValidationError(_("You can only select one tax per product."))
    
    def write(self, values):
        if 'name' in values:
            for product in self:
                pos_order_lines = self.env['pos.order.line'].search([('product_id.product_tmpl_id', '=', product.id)], limit=1)
                if pos_order_lines:
                    raise ValidationError(_("You cannot change the name of a product that has transaction history in the POS."))

        # if 'taxes_id' in values:
        #     open_pos_sessions = self.env['pos.session'].search([('state', '=', 'opened')])
        #     if open_pos_sessions:
        #         raise ValidationError(_("You cannot change taxes while there is an open POS session. Please close all sessions and try again."))

        return super(ProductTemplate, self).write(values)