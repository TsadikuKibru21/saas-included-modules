from odoo import api, models

class StockMove(models.Model):
    _inherit = 'stock.move'
    
    def _action_done(self, cancel_backorder=False):
        result = super()._action_done(cancel_backorder=cancel_backorder)
        
        # Get product IDs that were moved
        product_ids = self.mapped('product_id.id')
        
        # Update POS availability based on new stock levels
        if product_ids:
            self.env['product.template']._update_pos_availability_on_stock_move(product_ids)
            
        return result