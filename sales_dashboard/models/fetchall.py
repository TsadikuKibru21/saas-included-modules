from odoo import models, fields, api

class SaleOrder(models.Model):
    # Inherit from the existing sale.order model
    _inherit = "sale.order"

    @api.model
    def fetch_top_customers(self):
        """Retrieve the top 10 customers based on total sales amount."""
        
        # SQL query to fetch total sales per customer
        query = """
            SELECT so.partner_id, SUM(so.amount_total) as total_sales
            FROM sale_order so
            WHERE so.state IN ('sale', 'done')  -- Only consider confirmed sales
            GROUP BY so.partner_id  -- Group results by customer
            ORDER BY total_sales DESC  -- Order by total sales amount
            LIMIT 10  -- Limit the results to the top 10 customers
        """
        
        # Execute the query
        self._cr.execute(query)
        results = self._cr.fetchall()  # Fetch all results
        
        # Get partner records for the fetched customer IDs
        customers = self.env["res.partner"].browse([rec[0] for rec in results])
        
        # Prepare the return data with customer names and total sales
        return {
            "labels": [customer.name for customer in customers],  # Customer names
            "data": [rec[1] for rec in results],  # Total sales amounts
        }

    @api.model
    def fetch_top_quotations(self):
        """Retrieve the top 10 quotations based on quotation amount."""
        
        # SQL query to fetch top quotations
        query = """
            SELECT so.name, rp.name as customer, so.amount_total
            FROM sale_order so
            JOIN res_partner rp ON so.partner_id = rp.id  -- Join with the partner table
            WHERE so.state = 'draft'  -- Only consider draft quotations
            ORDER BY so.amount_total DESC  -- Order by total amount
            LIMIT 10  -- Limit to top 10 quotations
        """
        
        # Execute the query
        self._cr.execute(query)
        results = self._cr.fetchall()  # Fetch all results
        
        # Prepare the return data as a list of dictionaries
        return [
            {"quotation": rec[0], "customer": rec[1], "revenue": rec[2]}  # Map results to dictionary
            for rec in results
        ]

    @api.model
    def fetch_top_products(self):
        """Retrieve the top 10 products by total sales amount."""
        
        # SQL query to fetch total sales per product
        query = """
            SELECT sol.product_id, SUM(sol.price_total) as total_sales
            FROM sale_order_line sol
            JOIN sale_order so ON sol.order_id = so.id  -- Join with the sale order table
            WHERE so.state IN ('sale', 'done')  -- Only consider confirmed sales
            GROUP BY sol.product_id  -- Group results by product
            ORDER BY total_sales DESC  -- Order by total sales amount
            LIMIT 10  -- Limit to top 10 products
        """
        
        # Execute the query
        self._cr.execute(query)
        results = self._cr.fetchall()  # Fetch all results
        
        # Get product records for the fetched product IDs
        products = self.env["product.product"].browse([rec[0] for rec in results])
        
        # Prepare the return data with product names and total sales
        return {
            "labels": [product.name for product in products],  # Product names
            "data": [rec[1] for rec in results],  # Total sales amounts
        }

class PurchaseOrder(models.Model):
    # Inherit from the existing purchase.order model
    _inherit = "purchase.order"

    @api.model
    def fetch_top_vendors(self):
        """Retrieve the top 10 vendors based on total purchase amount."""
        
        # SQL query to fetch total purchases per vendor
        query = """
            SELECT po.partner_id, SUM(po.amount_total) as total_spent
            FROM purchase_order po
            WHERE po.state IN ('purchase', 'done')  -- Only consider confirmed purchases
            GROUP BY po.partner_id  -- Group results by vendor
            ORDER BY total_spent DESC  -- Order by total spent
            LIMIT 10  -- Limit to top 10 vendors
        """
        
        # Execute the query
        self._cr.execute(query)
        results = self._cr.fetchall()  # Fetch all results
        
        # Get partner records for the fetched vendor IDs
        vendors = self.env["res.partner"].browse([rec[0] for rec in results])
        
        # Prepare the return data with vendor names and total spent
        return {
            "labels": [vendor.name for vendor in vendors],  # Vendor names
            "data": [rec[1] for rec in results],  # Total spent amounts
        }

class CrmLead(models.Model):
    # Inherit from the existing crm.lead model
    _inherit = "crm.lead"

    @api.model
    def fetch_top_opportunities(self):
        """Retrieve the top 10 sales opportunities based on expected revenue."""
        
        # SQL query to fetch top opportunities
        query = """
            SELECT name, expected_revenue
            FROM crm_lead
            WHERE type = 'opportunity' AND active = True  -- Only consider active opportunities
            ORDER BY expected_revenue DESC  -- Order by expected revenue
            LIMIT 10  -- Limit to top 10 opportunities
        """
        
        # Execute the query
        self._cr.execute(query)
        results = self._cr.fetchall()  # Fetch all results
        
        # Prepare the return data with opportunity names and expected revenues
        return {
            "labels": [rec[0] for rec in results],  # Opportunity names
            "data": [rec[1] for rec in results],  # Expected revenues
        }