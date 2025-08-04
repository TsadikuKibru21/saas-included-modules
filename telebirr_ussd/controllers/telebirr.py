from odoo import http
import json
import logging
from werkzeug.utils import redirect
from odoo.http import request

_logger = logging.getLogger(__name__)

class TelebirrPaymentController(http.Controller):
    _return_url = '/api/telebirr_ussd/payment'

    @http.route('/api/telebirr_ussd/payment', type='http', auth='public', methods=['POST'], csrf=False)
    def process_payment(self, **payload):
        try:
            _logger.info("################################## Telebirr Callback Triggered ##################")
            jsondata = json.loads(http.request.httprequest.data)
            _logger.info("Callback Data Received: %s", jsondata)

            trace_no = jsondata.get('trace_no')
            msg = jsondata.get('msg')

            transaction = http.request.env['payment.transaction'].sudo().search([
                ('reference', '=', trace_no)  # Search using reference
            ], limit=1)

            if not transaction:
                _logger.warning("Transaction not found for reference: %s", trace_no)
                return {'status': 'error', 'message': 'Transaction not found'}

            if msg == 'Confirmed':
                _logger.info("Message Confirmed. Updating transaction state to 'done' for %s", trace_no)
                transaction.sudo().write({'state': 'done'})
                
                sale_order = transaction.sale_order_ids[:1] if transaction.sale_order_ids else False
                if not sale_order:
                    _logger.warning("No sale order found for transaction %s", trace_no)
                    return redirect('/payment/status?status=success')

                _logger.info("Found sale order %s (ID: %d) for transaction %s", 
                             sale_order.name, sale_order.id, trace_no)

                # Schedule a delayed job to process the sale order after 5 seconds
                _logger.info("Scheduling delayed job for sale order %s", sale_order.name)
                sale_order.with_delay().process_subscription_after_payment()
                
                _logger.info("################################### plplplp")
                
                # Call the processing logic asynchronously after redirecting
                # self.with_delay()._process_transaction_done(transaction)
                
                _logger.info("Custom logic triggered asynchronously for transaction %s", trace_no)
                
                return redirect('/payment/status?status=success')

            elif msg == 'Failed':
                _logger.info("Message Failed. Updating transaction state to 'cancel' for %s", trace_no)
                transaction.sudo().write({'state': 'cancel'})
                return redirect('/payment/status?status=failed')
                
            _logger.warning("Message status not recognized: %s", msg)
            return {'status': 'error', 'message': 'Unrecognized status'}

        except Exception as e:
            _logger.error("Error processing payment: %s", str(e), exc_info=True)
            return {'status': 'error', 'message': str(e)}

    def _process_transaction_done(self, transaction):
        """Process custom instance creation logic when transaction is done, tied to sale orders."""
        _logger.info("Starting _process_transaction_done for transaction %s", transaction.reference)
        
        # Get related sale orders directly from the transaction
        sale_orders = transaction.sale_order_ids
        _logger.info("Found %d related sale orders for transaction %s: %s", 
                        len(sale_orders), transaction.reference, sale_orders.mapped('name'))

        if not sale_orders:
            _logger.warning("No sale orders linked to transaction %s", transaction.reference)
            return

        for order in sale_orders:
            _logger.info("------------------------------------------------")
            _logger.info("Evaluating sale order: %s (ID: %d)", order.name, order.id)
            _logger.info("Subscription state: %s", order.subscription_state)
            _logger.info("Is renewing: %s", order.is_renewing)
            _logger.info("Is subscription: %s", order.is_subscription)
            _logger.info("Partner: %s (ID: %d)", order.partner_id.name, order.partner_id.id)

            # Get the docker template
            try:
                template = order._get_docker_template_from_products()
                _logger.info("Retrieved template: %s (ID: %d)", template.name, template.id)
            except Exception as e:
                _logger.error("Failed to get docker template for %s: %s", order.name, str(e))
                continue  # Skip this order if template retrieval fails

            instance_name = (order.partner_id.parent_id.name if order.partner_id.parent_id 
                            else order.partner_id.name or "default_customer").lower().replace(" ", "_").replace("/", "_")
            _logger.info("Generated instance name: %s", instance_name)

            # Check for existing instance
            existing_instance = request.env['odoo.docker.instance'].sudo().search([
                ('customer', '=', order.partner_id.id),
                ('name', '=', instance_name),
                ('template_id', '=', template.id),
            ], limit=1)
            _logger.info("Existing instance: %s (ID: %d)", 
                        existing_instance.name if existing_instance else "None", 
                        existing_instance.id if existing_instance else 0)

            if order.is_subscription:
                if existing_instance:
                    _logger.info("Assigning existing instance %s to %s", existing_instance.name, order.name)
                    order.instance_id = existing_instance
                    if order.is_renewing:
                        _logger.info("Renewing %s - Updating expiration", order.name)
                        try:
                            order.update_expiration_date()
                            _logger.info("Expiration date updated for %s", order.name)
                        except Exception as e:
                            _logger.error("Failed to update expiration for %s: %s", order.name, str(e))
                    if not order.is_instance_created:
                        order.is_instance_created = True
                        _logger.info("Set is_instance_created for %s", order.name)
                else:
                    _logger.info("No instance found for %s", order.name)
                    if not order.is_instance_created:
                        _logger.info("Creating new instance for %s", order.name)
                        try:
                            order.action_create_instance()
                            _logger.info("Created new instance for %s", order.name)
                        except Exception as e:
                            _logger.error("Failed to create instance for %s: %s", order.name, str(e))
            else:
                _logger.info("%s is not a subscription", order.name)

        _logger.info("Completed _process_transaction_done for %s", transaction.reference)




class PaymentStatusController(http.Controller):
    @http.route('/payment/custom_status', type='http',methods=['GET'],auth='public', website=True)
    def payment_status(self):
        _logger.info("############################# called 0000000000000000000 ")
        # _logger.info(self)
        # if reference:
        #     # Fetch the transaction using the reference
        #     _logger.info("############################# called")
        #     transaction = http.request.env['payment.transaction'].sudo().search([
        #         ('reference', '=', reference)
        #     ], limit=1)
            
        #     if transaction:
        #         if transaction.state == 'done':
        #             return redirect('/payment/status?status=success')
        #         elif transaction.state == 'cancel':
        #             return redirect('/payment/status?status=failed')
        
        # Default fallback
        return redirect('/payment/status')

class PaymentTelebirrController(http.Controller):

    @http.route('/payment/telebirr_ussd/update_phone', type='json', auth='user')
    def update_telebirr_phone(self, phone_number):
        # Get the current user (partner)
        user = request.env.user
        partner = user.partner_id
        if partner:
              partner.write({'telebirr_ussd_phone_number': phone_number})
              request.env.cr.commit()  # Explicitly commit the transaction
              request.env.cr.flush()  # Ensure changes are reflected

              _logger.info("########## telebirr_phone_number updated ############")
              _logger.info(phone_number)
              return {"status":"success"}


        # Update the telebirr_phone_number field with the phone number
     
