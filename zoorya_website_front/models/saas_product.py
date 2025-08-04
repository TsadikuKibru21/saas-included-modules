from odoo import fields, models, _, api
from odoo.exceptions import ValidationError

class ProductCategory(models.Model):
    _inherit = 'product.category'

    is_saas_category = fields.Boolean(string='Is SaaS Category', default=False)


class SaaSProduct(models.Model):
    _name = 'saas.product'
    _description = 'SaaS Product'

    name = fields.Char(string='Name', required=True)
    hardware_product_ids = fields.Many2many(
        'product.product', string='Hardware Products'
    )
    software_product_id = fields.Many2one(
        'product.product', string='Software Product', required=True,
        domain=[('recurring_invoice', '=', True)]  # Restrict to subscription products
    )
    category_id = fields.Many2one(
        'product.category', string='Category',
        domain=[('is_saas_category', '=', True)]
    )
    features = fields.Char(string='Features', help='List of features separated by commas')
    image = fields.Image(string='Product Image')
    product_desc = fields.Text(string='Product Description')

    # New field to indicate availability of the product
    is_available = fields.Boolean(string='Is Available', default=True)

    @api.constrains('software_product_id')
    def _check_subscription_product(self):
        """Ensure that the selected software product is a subscription product."""
        for record in self:
            if record.software_product_id and not record.software_product_id.recurring_invoice:
                raise ValidationError(_('The selected software product must be a subscription product.'))