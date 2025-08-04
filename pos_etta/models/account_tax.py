import logging
from odoo import api, models, _
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

class AccountTax(models.Model):
    _inherit = 'account.tax'

    @api.model
    def write(self, vals):
        # Get all pos.config and product.template models that reference this tax
        pos_configs = self.env['pos.config'].search([('global_service_charge', 'in', self.ids)])
        products = self.env['product.template'].search([('service_charge', 'in', self.ids)])

        for tax in self:
            # Check if this tax is the global_service_charge or service_charge in any record
            if tax in pos_configs.mapped('global_service_charge') or tax in products.mapped('service_charge'):
                # Ensure the sequence is the lowest
                other_taxes = self.search([('id', '!=', tax.id), ('type_tax_use', '=', 'sale')])
                min_sequence = min(other_taxes.mapped('sequence')) if other_taxes else 1

                if 'sequence' in vals and vals['sequence'] >= min_sequence:
                    raise UserError(_('The selected tax cannot have a sequence lower than other taxes when it is used as a global service charge on a Point of Sale configuratons or set as service charge for a Product.'))
                
                # If sequence not in vals, set the sequence to be the lowest
                if tax.sequence >= min_sequence:
                    tax.sequence = min_sequence - 1

        return super(AccountTax, self).write(vals)