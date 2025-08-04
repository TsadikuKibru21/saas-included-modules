from odoo.http import request
from odoo import http
# from escpos.printer import Network
# from tabulate import tabulate

import logging

_logger = logging.getLogger(__name__)

class OrderPrinterController(http.Controller):
    @http.route('/create_void_reason', type='json', auth='public', csrf=False)
    def create_resource_endpoint(self, **kw):
        try:
            request.env['voided.orders'].create({
                'order_id': kw.get("order_id"),
                'cashier': kw.get("cashier"),
                'product': kw.get("product"),
                'unit_price': kw.get("unit_price"),
                'quantity': kw.get("quantity"),
                'reason_id': kw.get("reason_id"),
            })
            return True
        except Exception as e:
            # Optionally log the exception here
            _logger.info(e)
            return False
        
    @http.route('/create_multi_void_reason', type='json', auth='public', csrf=False)
    def create_multi_void_endpoint(self, **kw):
        try:
            # Ensure we have multiple entries
            data_entries = kw.get("data", [])
            
            if isinstance(data_entries, list):
                for entry in data_entries:
                    # Create a record for each entry in the data array
                    request.env['voided.orders'].create({
                        'order_id': entry.get("order_id"),
                        'cashier': entry.get("cashier"),
                        'product': entry.get("product"),
                        'unit_price': entry.get("unit_price"),
                        'quantity': entry.get("voided_quantity"),
                        'reason_id': entry.get("reason_id"),
                        'waiter_name': entry.get("waiter_name"),
                    })
            return True
        except Exception as e:
            _logger.info("Error creating voided order records: %s", e)
            return False
        
    # @http.route('/orderpinter/printorder', type='json', auth='none', cors='*')
    # def print_(self, receipt=None, orderp=None):
    #     try:
    #         _logger.info(receipt)
    #         _logger.info(orderp)
    #         printer_config = orderp
    #         printer = Network(printer_config["epson_printer_ip"])
    #         printer.set(align='center', bold=True, smooth=True)
    #         # Prepare the header information
    #         info_data = [
    #             ['==== COMPANY NAME P.L.C. ===='],
    #             ['======== NONE FISCAL ========='], 
    #             [printer_config['name']], 
    #             [receipt['name']], 
    #             [f"Date: {receipt['date']}"],
    #             [f"Time: {receipt['time']['hours']}:{receipt['time']['minutes']}"],
    #             [f"Table : {receipt['table_name']} | Floor : {receipt['floor_name']}"], 
    #             [f"Cashier : {receipt['cashier']}"]
    #         ]
    #         new_order_data = []
    #         cancelled_order_data = []
    #         # Process new orders
    #         if len(receipt['new']) > 0:
    #             for order in receipt['new']:
    #                 new_order_data.append([str(order['quantity']), order['name']])
    #                 if order.get('note'):
    #                     new_order_data.append(["NOTE => ", order['note']])

    #         # Process cancelled orders
    #         if len(receipt['cancelled']) > 0:
    #             for order in receipt['cancelled']:
    #                 cancelled_order_data.append([str(order['quantity']), order['name']])
    #                 if order.get('note'):
    #                     cancelled_order_data.append(["NOTE => ", order['note']])
            
    #         # Print the header
    #         printer.text(tabulate(info_data, tablefmt="pretty"))
    #         # Print new orders if any
    #         if len(new_order_data) > 0:
    #             printer.textln("\n")
    #             printer.textln("==> NEW ORDER")
    #             printer.textln(tabulate(new_order_data, headers=["Qty", "Name"], tablefmt="pretty"))
    #         # Print cancelled orders if any
    #         if len(cancelled_order_data) > 0:
    #             printer.textln("\n")
    #             printer.textln("==> CANCELLED ORDER")
    #             printer.textln(tabulate(cancelled_order_data, headers=["Qty", "Name"], tablefmt="pretty"))
    #         printer.cut()
    #         return True
    #     except ConnectionRefusedError:
    #         _logger.info("Connection error")
    #         return False
    #     except Exception as e:
    #         _logger.info(e)
    #         _logger.info("Printing error")
    #         return False
        