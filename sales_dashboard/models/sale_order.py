from odoo import models, fields, api

class SaleOrder(models.Model):
    _inherit = "sale.order"

    from odoo import models, api

class SaleOrder(models.Model):
    _inherit = "sale.order"

    @api.model
    def get_top_customers_chart(self):
        """Returns data formatted for Chart.js (Top 10 Customers by Sales)."""
        query = """
            SELECT partner_id, SUM(amount_total) as total_sales
            FROM sale_order
            WHERE state IN ('sale', 'done')  -- Consider only confirmed orders
            GROUP BY partner_id
            ORDER BY total_sales DESC
            LIMIT 10
        """
        self._cr.execute(query)
        results = self._cr.fetchall()

        customers = self.env["res.partner"].browse([rec[0] for rec in results])

        return {
            "labels": [customer.name for customer in customers],
            "data": [rec[1] for rec in results],
        }

    @api.model
    def get_top_customers_chart_new(self):
        """Returns top 10 customers by total sales."""
        query = """
            SELECT partner_id, SUM(amount_total) as total_sales
            FROM sale_order
            WHERE state IN ('sale', 'done')  -- Consider only confirmed orders
            GROUP BY partner_id
            ORDER BY total_sales DESC
            LIMIT 10
        """
        self._cr.execute(query)
        results = self._cr.fetchall()

        # Fetch customer names
        customers = self.env["res.partner"].browse([rec[0] for rec in results])

        return [
            {
                "customer": customer.name,  # Customer name
                "total_sales": rec[1],  # Total sales amount
            }
            for rec, customer in zip(results, customers)
        ]


    @api.model
    def get_top_vendors_chart_new(self):
        """Returns top 10 vendors by total sales."""
        query = """
            SELECT partner_id, SUM(amount_total) as total_sales
            FROM sale_order
            WHERE state IN ('sale', 'done')  -- Only confirmed orders
            GROUP BY partner_id
            ORDER BY total_sales DESC
            LIMIT 10
        """
        self._cr.execute(query)
        results = self._cr.fetchall()

        # Fetch vendor names (assuming vendors are also stored in the 'res.partner' model)
        vendors = self.env["res.partner"].browse([rec[0] for rec in results])

        return [
            {
                "vendor": vendor.name,  # Vendor name
                "total_sales": rec[1],  # Total sales amount
            }
            for rec, vendor in zip(results, vendors)
        ]


        from datetime import datetime, timedelta

    @api.model
    def get_monthly_sales_chart(self):
        """Returns total sales per month for the last 12 months."""
        query = """
            SELECT TO_CHAR(date_order, 'YYYY-MM') AS month, SUM(amount_total) as total_sales
            FROM sale_order
            WHERE state IN ('sale', 'done')  -- Only confirmed orders
            AND date_order >= (CURRENT_DATE - INTERVAL '12 months')
            GROUP BY month
            ORDER BY month ASC
        """
        self._cr.execute(query)
        results = self._cr.fetchall()

        return {
            "labels": [rec[0] for rec in results],  # Month-Year format (e.g., "2024-01")
            "data": [rec[1] for rec in results],  # Total sales for each month
        }



    @api.model
    def get_top_products_chart(self):
        """Returns top 10 products by sales amount."""
        query = """
            SELECT sol.product_id, SUM(sol.price_total) as total_sales
            FROM sale_order_line sol
            JOIN sale_order so ON sol.order_id = so.id
            WHERE so.state IN ('sale', 'done')  -- Only confirmed orders
            GROUP BY sol.product_id
            ORDER BY total_sales DESC
            LIMIT 10
        """
        self._cr.execute(query)
        results = self._cr.fetchall()

        return [
            {
                "product": self.env["product.product"].browse(rec[0]).name,  # Product name
                "sales_amount": rec[1],  # Total sales amount
            }
            for rec in results
        ]



    @api.model
    def get_top_quotations_chart(self):
        """Returns top 10 quotations by revenue."""
        query = """
            SELECT so.id, so.name, so.amount_total
            FROM sale_order so
            WHERE so.state = 'draft'  -- Only quotations
            ORDER BY so.amount_total DESC
            LIMIT 10
        """
        self._cr.execute(query)
        results = self._cr.fetchall()

        return [
            {
                "quotation": rec[1],  # Quotation number (e.g., S00023)
                "revenue": rec[2],  # Quotation total amount
            }
            for rec in results
        ]

    @api.model
    def get_top_customers_chart(self):
        """Returns top 10 customers by total sales amount."""
        query = """
            SELECT so.partner_id, SUM(so.amount_total) as total_sales
            FROM sale_order so
            WHERE so.state IN ('sale', 'done')  -- Only confirmed orders
            GROUP BY so.partner_id
            ORDER BY total_sales DESC
            LIMIT 10
        """
        self._cr.execute(query)
        results = self._cr.fetchall()

        customers = self.env["res.partner"].browse([rec[0] for rec in results])

        return {
            "labels": [customer.name for customer in customers],
            "data": [rec[1] for rec in results],
        }


    @api.model
    def get_top_rfq_chart(self):
        """Returns top 10 RFQs (Requests for Quotation) by amount."""
        query = """
            SELECT id, name, amount_total
            FROM purchase_order
            WHERE state = 'draft'  -- Only RFQs
            ORDER BY amount_total DESC
            LIMIT 10
        """
        self._cr.execute(query)
        results = self._cr.fetchall()

        return [
            {
                "rfq": rec[1],  # RFQ Number (e.g., PO00012)
                "revenue": rec[2],  # RFQ total amount
            }
            for rec in results
        ]

    @api.model
    def get_top_orders_chart(self):
        """Returns top 10 purchase orders by total amount."""
        query = """
            SELECT id, name, amount_total
            FROM purchase_order
            WHERE state IN ('purchase', 'done')  -- Only confirmed orders
            ORDER BY amount_total DESC
            LIMIT 10
        """
        self._cr.execute(query)
        results = self._cr.fetchall()

        return [
            {
                "order": rec[1],  # Purchase Order Number (e.g., PO00023)
                "revenue": rec[2],  # Order total amount
            }
            for rec in results
        ]

    @api.model
    def get_top_vendors_chart(self):
        """Returns top 10 vendors by total purchase amount."""
        query = """
            SELECT partner_id, SUM(amount_total) as total_spent
            FROM purchase_order
            WHERE state IN ('purchase', 'done')  -- Only confirmed orders
            GROUP BY partner_id
            ORDER BY total_spent DESC
            LIMIT 10
        """
        self._cr.execute(query)
        results = self._cr.fetchall()

        vendors = self.env["res.partner"].browse([rec[0] for rec in results])

        return {
            "labels": [vendor.name for vendor in vendors],
            "data": [rec[1] for rec in results],
        }



    @api.model
    def get_top_sales_orders_chart(self):
        """Returns top 10 sales orders by revenue."""
        query = """
            SELECT so.id, so.name, so.amount_total
            FROM sale_order so
            WHERE so.state IN ('sale', 'done')  -- Only confirmed orders
            ORDER BY so.amount_total DESC
            LIMIT 10
        """
        self._cr.execute(query)
        results = self._cr.fetchall()

        return [
            {
                "order": rec[1],  # Sales order number (e.g., SO0001)
                "revenue": rec[2],  # Sales order total amount
            }
            for rec in results
        ]

