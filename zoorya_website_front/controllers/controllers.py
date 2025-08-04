import json
import logging
from odoo import http, _
from odoo.http import request, Response
from odoo.addons.website_sale.controllers.main import WebsiteSale, PaymentPortal
from odoo.exceptions import UserError
from odoo.addons.auth_signup.controllers.main import AuthSignupHome
from odoo.addons.web.controllers.home import Home, SIGN_UP_REQUEST_PARAMS
import base64


import werkzeug.utils

_logger = logging.getLogger(__name__)

class WebsiteCustomController(http.Controller):

    @http.route('/home_page', type='http', auth='public', website=True)
    def custom_page(self, **kwargs):
        return request.render('zoorya_website_front.zoorya_home_page')
    
    @http.route('/get_started', type='http', auth="public", website=True)
    def get_started(self):
        order_data = request.session.get('order_data')
        _logger.info("Order Data: %s", order_data)
        return request.render("zoorya_website_front.get_started_template", {
            'order_data': order_data
        })
    
    @http.route('/saas/product/<int:product_id>', type='http', auth="public", website=True)
    def saas_product_detail(self, product_id, **kwargs):
        product = request.env['saas.product'].sudo().browse(product_id)

        if not product.exists():
            return request.render('zoorya_website_front.404_template')

        # Log the product details
        _logger.info(f"Fetching details for SaaS product: {product.name} (ID: {product_id})")

        # Fetch detailed hardware product information
        software_product_id = product.software_product_id.id
        hardware_products = product.hardware_product_ids.sudo()
        _logger.info(f"Found {len(hardware_products)} hardware products associated with the SaaS product.")

        # Prepare accessories as a separate object
        accessories = []
        for hardware in hardware_products:
            hardware_accessories = hardware.accessory_product_ids.sudo()
            _logger.info(f"Found {len(hardware_accessories)} accessories for hardware product: {hardware.name}")
            accessories.extend(hardware_accessories)

        _logger.info(f"Total number of accessories found: {len(accessories)}")

        # Fetch plan IDs from product_subscription_pricing_ids
        pricing_records = product.software_product_id.product_subscription_pricing_ids.sudo()
        plan_ids = pricing_records.mapped('plan_id.id')  # Extract the plan IDs
        _logger.info(f"Found plan IDs: {plan_ids}")

        # Fetch full sale.subscription.plan records
        plans = request.env['sale.subscription.plan'].sudo().browse(plan_ids)
        _logger.info(f"Loaded {len(plans)} subscription plans.")

        # Link pricing data to each plan
        plan_details = []
        for plan in plans:
            # Get the corresponding pricing record
            pricing = pricing_records.filtered(lambda p: p.plan_id == plan)

            # Extract the price from the pricing record
            price = pricing and pricing[0].price or 0.0  # Fallback to 0 if no price found

            # Store plan details along with price and other details
            plan_data = {
                'plan_id': plan.id,
                'name': plan.name,
                'price': price,
                'billing_period_display_sentence': plan.billing_period_display_sentence,
                'plan_id': plan.id,  # Add plan_id for reference
            }

            # Log plan data
            # _logger.info(f"Plan ID {plan.id} details: {plan_data}")

            # Append to plan details
            plan_details.append(plan_data)

        _logger.info(f"Fount {len(plan_details)} details {plan_details}")
        _logger.info(f"Fount {len(accessories)} details {accessories}")

        values = {
            'saas_product_id': software_product_id,
            'product': product,
            'hardware_products': hardware_products,
            'accessories': accessories,
            'plans': plan_details,  # Pass modified plans with price to the view
        }
        return request.render('zoorya_website_front.get_started_template', values)

    @http.route('/store_order_data', type='http', auth="public", website=True, methods=['POST'], csrf=False)
    def store_order_data(self, **post):
        """Stores order data in the session."""
        try:
            # Manually parse the JSON request body
            data = json.loads(request.httprequest.data.decode('utf-8'))
            _logger.info(f"Received Order Data: {data}")  # Log the received data
        except json.JSONDecodeError as e:
            _logger.error(f"Error decoding JSON: {str(e)}")
            return Response(
                json.dumps({"status": "error", "message": "Invalid JSON format"}),
                content_type='application/json',
                status=400
            )

        if not data:
            return Response(
                json.dumps({"status": "error", "message": "No data received"}),
                content_type='application/json',
                status=400
            )

        request.session['order_data'] = data  # Store data in session
        _logger.info(f"✅ Order Data stored in session: {request.session.get('order_data')}")

        return Response(
            json.dumps({"status": "success"}),
            content_type='application/json',
            status=200
        )
    
    @http.route('/submit_checkout', type='json', auth="public", methods=['POST'], website=True, csrf=False)
    def submit_checkout(self, **post):
        """Handles checkout by adding products to the cart."""
        try:
            # Decode JSON data
            data = json.loads(request.httprequest.data.decode('utf-8'))
            _logger.info("🚀 [submit_checkout] Function called with data: %s", data)

            # Extract data properly
            saas_product_id = int(data.get('saas_product_id', 0))
            plan_id = int(data.get('plan_id', 0))
            hardware_quantities = data.get('hardware_quantities', {})
            accessory_quantities = data.get('accessory_quantities', {})

            _logger.info("📌 Extracted Data - SaaS Product ID: %s, Plan ID: %s", saas_product_id, plan_id)
            _logger.info("🛠️ Hardware Quantities: %s", hardware_quantities)
            _logger.info("🎒 Accessory Quantities: %s", accessory_quantities)

            # Fetch or create the current sale order (cart)
            order = request.website.sale_get_order(force_create=True)
            if not order:
                _logger.warning("⚠️ Sale order could not be fetched or created.")
                return {'status': 'error', 'message': 'Could not retrieve or create a sale order.'}

            _logger.info("🛒 Sale order fetched successfully - Order ID: %s", order.id)

            # Set the partner_id (user or guest)
            order.partner_id = request.env.user.partner_id or order.partner_id
            _logger.info("👤 Partner ID set to: %s", order.partner_id)

            # Clear existing cart before adding new products
            order.order_line = [(5, 0, 0)]
            _logger.info("🧹 Cleared existing cart before adding new products.")

            # Log the current plan_id of the existing order before clearing it
            _logger.info("📊 Existing Plan ID in the order: %s", order.plan_id)

            # Set the new plan_id for the order
            if plan_id:
                order.plan_id = plan_id
                _logger.info("🔄 Set new Plan ID in the order: %s", order.plan_id)
                
            if saas_product_id and plan_id:
                saas_product = request.env['product.product'].sudo().browse(saas_product_id)
                plan = request.env['sale.subscription.plan'].sudo().browse(plan_id)
                _logger.info("✅ Adding SaaS Product: %s (Plan: %s)", saas_product.name, plan.name)
                _logger.info("✅ Product ID: %s (Plan ID: %s)", saas_product_id, plan_id)
                order._cart_update(product_id=saas_product_id, set_qty=1)
                
            if plan_id:
                order.plan_id = plan_id
                _logger.info("🔄 Set new Plan ID in the order: %s", order.plan_id)

            # Add Hardware Products to cart
            for product_id, quantity in hardware_quantities.items():
                product_id = int(product_id)
                quantity = int(quantity)

                product = request.env['product.product'].sudo().browse(product_id)
                if product.exists() and quantity > 0:
                    _logger.info("🛠️ Adding Hardware Product: %s (Quantity: %s)", product.name, quantity)
                    order._cart_update(product_id=product.id, add_qty=quantity, set_qty=quantity)
                else:
                    _logger.warning("⚠️ Hardware Product with ID %s does not exist or has invalid quantity!", product_id)

            # Add Accessories to cart
            for product_id, quantity in accessory_quantities.items():
                product_id = int(product_id)
                quantity = int(quantity)

                product = request.env['product.product'].sudo().browse(product_id)
                if product.exists() and quantity > 0:
                    _logger.info("🎒 Adding Accessory Product: %s (Quantity: %s)", product.name, quantity)
                    order._cart_update(product_id=product.id, add_qty=quantity, set_qty=quantity)
                else:
                    _logger.warning("⚠️ Accessory Product with ID %s does not exist or has invalid quantity!", product_id)

            # Debugging final order lines
            order_lines = order.order_line.sudo().mapped(lambda l: {'product': l.product_id.name, 'quantity': l.product_uom_qty})
            _logger.info("🛒 Final Cart Items: %s", order_lines)

            # Return success response
            _logger.info("🎯 Checkout process completed successfully.")
            return {'status': 'success', 'message': 'Products added to cart successfully.', 'redirect_url': '/shop/cart'}

        except Exception as e:
            _logger.error("❌ Error in checkout process: %s", str(e), exc_info=True)
            return {'status': 'error', 'message': 'Something went wrong. Please try again.'}
        
    @http.route('/get_saas_products', type='json', auth='public', methods=['POST'])
    def get_saas_products(self):
        try:
            products = request.env['product.product'].sudo().search([('saas_product', '=', True)], limit=10)

            product_data = [{
                "id": product.id,
                "name": product.name,
                "image_url": f"/web/image/product.product/{product.id}/image_1024"
            } for product in products]

            return {"status": "success", "products": product_data}
        except Exception as e:
            return {"status": "error", "message": str(e)}

class WebsiteSale(PaymentPortal):
    @http.route('/shop', type='http', auth="public", website=True)
    def shop(self, page=0, category=None, search='', min_price=0.0, max_price=0.0, ppg=False, **post):
        """
        Override the /shop route to include additional data for SaaS products and categories.
        """
        saas_products = request.env['saas.product'].search([('is_available', '=', True)])
        categories = request.env['product.category'].search([('is_saas_category', '=', True)])

        # Get the default shop page response
        response = super().shop(page=page, category=category, search=search, min_price=min_price, max_price=max_price, ppg=ppg, **post)

        # Add custom data to the qcontext dictionary
        response.qcontext.update({
            'saas_products': saas_products,
            'categories': categories
        })

        # Render the custom template with the updated context
        return request.render("zoorya_website_front.shop_template", response.qcontext)
    
    @http.route(['/shop/extra_info'], type='http', auth="public", website=True, sitemap=False)
    def extra_info(self, **post):
        # Call the parent method to get the initial response
        response = super(WebsiteSale, self).extra_info(**post)

        # Get the context (values) from the response
        values = response.qcontext

        # Get the current order
        order = request.website.sale_get_order()

        # Prepare the custom fields data
        custom_fields = {
            'tin_number': order.partner_id.tin_number if order.partner_id else '',
            'specific_location': order.partner_id.specific_location if order.partner_id else '',
            'tin_certificate': order.partner_id.tin_certificate if order.partner_id else '',
            'business_license': order.partner_id.business_license if order.partner_id else '',
            'business_registration': order.partner_id.business_registration if order.partner_id else '',
            'vat_certificate': order.partner_id.vat_certificate if order.partner_id else '',
            'national_id': order.partner_id.national_id if order.partner_id else '',
            'delegation_letter': order.partner_id.delegation_letter if order.partner_id else ''
        }

        # Add custom fields to the values
        values['custom_fields'] = custom_fields

        # Update the response's qcontext with the custom fields
        response.qcontext = values

        # Return the updated response
        return response
    
class CustomCheckoutController(WebsiteSale):

    @http.route('/website/submit_custom_checkout', type='http', auth='user', website=True, csrf=False)
    def submit_custom_checkout(self, **post):
        _logger.info("=== submit_custom_checkout STARTED ===")
        
        # Log incoming POST data (excluding files for security reasons)
        _logger.info("POST data received: %s", {k: v for k, v in post.items() if k not in [
            'tin_certificate', 'business_license', 'business_registration', 
            'vat_certificate', 'national_id', 'delegation_letter'
        ]})
        
        # Get the current user (partner)
        partner = request.env.user.partner_id
        _logger.info("Current partner: %s (ID: %d)", partner.name, partner.id)

        # Handle document fields
        tin_number = post.get('tin_number')
        specific_location = post.get('specific_location')
        tin_certificate = post.get('tin_certificate')
        business_license = post.get('business_license')
        business_registration = post.get('business_registration')
        vat_certificate = post.get('vat_certificate')
        national_id = post.get('national_id')
        delegation_letter = post.get('delegation_letter')

        _logger.info("Received files: %s", {
            "tin_certificate": bool(tin_certificate),
            "business_license": bool(business_license),
            "business_registration": bool(business_registration),
            "vat_certificate": bool(vat_certificate),
            "national_id": bool(national_id),
            "delegation_letter": bool(delegation_letter),
        })

        # Upload and save the documents (binary fields)
        if tin_number:
            _logger.info("Saving tin_certificate for partner ID %d", partner.id)
            partner.write({'tin_number': tin_number})

        if specific_location:
            _logger.info("Saving specific_location for partner ID %d", partner.id)
            partner.write({'specific_location': specific_location})

        if tin_certificate:
            _logger.info("Saving tin_certificate for partner ID %d", partner.id)
            partner.write({'tin_certificate': base64.b64encode(tin_certificate.read())})
        
        if business_license:
            _logger.info("Saving business_license for partner ID %d", partner.id)
            partner.write({'business_license': base64.b64encode(business_license.read())})
        
        if business_registration:
            _logger.info("Saving business_registration for partner ID %d", partner.id)
            partner.write({'business_registration': base64.b64encode(business_registration.read())})
        
        if vat_certificate:
            _logger.info("Saving vat_certificate for partner ID %d", partner.id)
            partner.write({'vat_certificate': base64.b64encode(vat_certificate.read())})
        
        if national_id:
            _logger.info("Saving national_id for partner ID %d", partner.id)
            partner.write({'national_id': base64.b64encode(national_id.read())})
        
        if delegation_letter:
            _logger.info("Saving delegation_letter for partner ID %d", partner.id)
            partner.write({'delegation_letter': base64.b64encode(delegation_letter.read())})

        _logger.info("=== submit_custom_checkout COMPLETED === Redirecting to /shop/payment")
        
        # Redirect to the next step in checkout
        return request.redirect('/shop/payment')
    
class AuthSignupCustom(AuthSignupHome):

    # Extend SIGN_UP_REQUEST_PARAMS to include 'company_name'
    SIGN_UP_REQUEST_PARAMS = SIGN_UP_REQUEST_PARAMS | {'company_name'}

    def get_auth_signup_qcontext(self):
        """ Extend signup context to include company_name """
        qcontext = {k: v for (k, v) in request.params.items() if k in self.SIGN_UP_REQUEST_PARAMS}
        qcontext.update(self.get_auth_signup_config())

        if not qcontext.get('token') and request.session.get('auth_signup_token'):
            qcontext['token'] = request.session.get('auth_signup_token')

        if qcontext.get('token'):
            try:
                token_infos = request.env['res.partner'].sudo().signup_retrieve_info(qcontext.get('token'))
                for k, v in token_infos.items():
                    qcontext.setdefault(k, v)
            except:
                qcontext['error'] = _("Invalid signup token")
                qcontext['invalid_token'] = True

        # Debugging: Log the received signup data
        _logger.info("Signup Form Data: %s", qcontext)

        return qcontext

    def _prepare_signup_values(self, qcontext):
        """ Extend the signup values with the company_name """
        values = super()._prepare_signup_values(qcontext)
        values['company_name'] = qcontext.get('company_name')
        
        # Debugging Log
        _logger.info("Received qcontext: %s", qcontext)

        if not values['company_name']:
            raise UserError(_("Company Name is required."))

        return values

    def _signup_with_values(self, token, values):
        """ Create the user with the company_name and assign it to the partner """
        login, password = request.env['res.users'].sudo().signup(values, token)
        request.env.cr.commit()

        # Fetch the created user
        user = request.env['res.users'].sudo().search([('login', '=', login)], limit=1)

        if user and values.get('company_name'):
            user.partner_id.sudo().write({'company_name': values.get('company_name')})

        pre_uid = request.session.authenticate(request.db, login, password)
        if not pre_uid:
            raise werkzeug.exceptions.Forbidden(_("Authentication Failed."))