from odoo import http
from odoo.http import request
import logging
import json

_logger = logging.getLogger(__name__)

class ReceiptController(http.Controller):
    @http.route("/getReceiptData", type="json", auth="none", csrf=False, methods=['POST'])
    def getReceiptByFs(self, **kwargs):
        raw_data = request.httprequest.data.decode('utf-8')
        data = json.loads(raw_data)
        _logger.info("Decoded JSON data: %s", data)

        try:
            mrc_code = data.get('mrc_code', '')
            ej_checksum = data.get('ej_checksum', '')

            if not mrc_code:
                _logger.error("Invalid MRC Code provided: %s", mrc_code)
                return {"error": "Invalid MRC Code"}
            
            record = request.env["pos.order"].sudo().search([("fiscal_mrc", "=", mrc_code), ("ej_checksum", "=", ej_checksum)], limit=1)

            if record:
                # Read additional fields from related models
                customer_name = record.partner_id.name if record.partner_id else ''
                phone_number = record.partner_id.phone if record.partner_id else ''
                tax_id = record.partner_id.vat if record.partner_id else ''
                trade_name = record.partner_id.company_name if record.partner_id else ''

                # Initialize variables to store totals
                subtotal = 0.0
                taxes = 0.0
                total = 0.0

                # Initialize an empty list to store POS order line data
                order_lines = []

                # Loop through each POS order line
                for line in record.lines:
                    # Read fields from POS order line
                    line_data = {
                        'product_id': line.product_id.name,
                        'price_unit': line.price_unit,
                        'quantity': line.qty,
                        'subtotal': line.price_subtotal,
                    }
                    order_lines.append(line_data)

                    # Calculate subtotal
                    subtotal += line.price_subtotal
                    # Accumulate taxes
                    for tax in line.tax_ids:
                        taxes += tax.amount * line.price_subtotal

                # Calculate total amount
                total = subtotal + taxes

                # Construct a dictionary containing POS order and order line data
                order_data = {
                    'order_id': record.id,
                    'customer_name': customer_name,
                    'phone_number': phone_number,
                    'tax_id': tax_id,
                    'trade_name': trade_name,
                    'subtotal': subtotal,
                    'taxes': taxes,
                    'total': total,
                    'order_lines': order_lines,
                }
            else:
                return {"error": "No Receipt Found"}

        except Exception as e:
            _logger.error("Error processing request: %s", e)
            return {"error": str(e)}, 500

        _logger.info("Data fetched successfully")
        return {"data": order_data}