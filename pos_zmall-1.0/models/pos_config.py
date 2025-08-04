from odoo import fields, models
from odoo import api, fields, models, _
import json, requests
import logging
import uuid
import random
import string
import base64
from odoo.exceptions import UserError

from odoo.http import Response, request

_logger = logging.getLogger(__name__)
# _logger.setLevel(logging.WARNING)



class PosConfig(models.Model):
    _inherit = 'pos.config'
    server_token = fields.Char('Server token', help='server token')
    store_id = fields.Char('store id', help='store id')
    main_floor_id = fields.Many2one('restaurant.floor', string='Main Floor', help='The main floor for this POS configuration.')
    # zmall_products_list = here I want to store zmall products list so that I CAN use it and access it from another place from another model
    # JSON-encoded text field
    # products_json = fields.Text(string="Products JSON",readonly = False)
    products_json = fields.Text(string="Products JSON", readonly=False, help='JSON-encoded list of products')
    odoo_products_json = fields.Text(string="Odoo Products JSON", readonly=False, help='JSON-encoded list of products')

    
    products_mapping = {}
    enabled_zmall = fields.Boolean('Enable Zmall Delivery', default=False)
    zmall_api_endpoint = fields.Char('API Endpoint', help='Zmall API Endpoint')
    zmall_username = fields.Char('Username', help='Your Zmall Username')
    zmall_password = fields.Char('Password', help='Your Zmall Password')

    @api.model
    def get_or_create_access_token(self,req):
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! get access token")
        pos_config_id = None
        if req:
            pos_config_id = self.env['pos.config'].search([('id','=', req)], limit=1)
        if not pos_config_id:
            pos_config_id = self.env['pos.config'].search([], limit=1)

        # send request to get the products from the zmall api
        requestData = {
            "config_id": pos_config_id.id,
            "server_token": pos_config_id['server_token'],
            "store_id": pos_config_id['store_id'],
        }
        try:
            zmall_product = self.env['pos.config'].get_zmall_products(requestData)
            if "success" in zmall_product and (not zmall_product["success"]):
                _logger.info("re authenticate")
                auth_resp = self.env["pos.config"].auth_zmall2(pos_config_id.id)
                if "server_token" in auth_resp:
                    print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! get access token new is generated")
                    return {
                            'server_token': pos_config_id['server_token'], 
                            'store_id': pos_config_id['store_id'],
                        }
                elif "error_code" in auth_resp:
                        return {
                            'error_code': auth_resp['error_code']
                        }
                else:
                        return {
                            'error': 'Unknown Error',
                            'msg': 'Failed',
                            'longMsg': "Couldn't connect with Zmall"
                        }

            print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! get access token prev is working")
  
            return {
                        'server_token': pos_config_id['server_token'], 
                        'store_id': pos_config_id['store_id'],
                    }
        except Exception as e:
            return {
                'error': e
            }



    @api.model
    def auth_zmall(self, data):
        headers = {'Content-Type': 'application/json'}
        pos_config = self.env['pos.config'].search([('id','=', data)], limit=1)
        request_data = {"email": pos_config.zmall_username, "password": pos_config.zmall_password}        
        auth_endpoint = pos_config.zmall_api_endpoint + 'api/store/login'


        try:
            response = requests.post(str(auth_endpoint), json=request_data, headers=headers)
            # _logger.info("response")
            # _logger.info(response.text)
        except:
            return {
                'msg': 'Failed',
                'longMsg': "Couldn't connect with Zmall"
            }

        response_json = json.loads(response.text)
        try:
            if 'store' not in response_json:
                return {
                    'error': 'No store key in response'
                }
            # return str(response_json['success'])
            if str(response_json['success']) == 'True':
                # pos_config.write({
                #     'server_token': response_json['store']['server_token'],
                #     'store_id': response_json['store']['_id']
                # })
                _logger.info(f"pos_config.server_toker{pos_config.server_token}")
                _logger.info(f"pos_config.store_id{pos_config.store_id}")
                # self.server_token = response_json['store']['server_token']
                # self.store_id = response_json['store']['_id']
                return {
                    'server_token': response_json['store']['server_token'], 
                    'store_id': response_json['store']['_id']
                }
            elif str(response_json['success']) == 'False':
                return {
                    'error_code': response_json['store']['server_token']
                }
            else:
                return {
                    'error': 'Unknown Error'
                }
        except Exception as e:
            return {"error":e}
        # return response_json

    # auth_zmall that saves credentials in database, I have used separate methods for javascript and python inorder to avoid concurrent database updates, because we are going to call auth_zmall from javascript many times.
    @api.model
    def auth_zmall2(self, data):
        headers = {'Content-Type': 'application/json'}
        pos_config = self.env['pos.config'].search([('id','=', data)], limit=1)
        request_data = {"email": pos_config.zmall_username, "password": pos_config.zmall_password}        
        auth_endpoint = pos_config.zmall_api_endpoint + 'api/store/login'


        try:
            response = requests.post(str(auth_endpoint), json=request_data, headers=headers)
            # _logger.info("response")
            # _logger.info(response.text)
        except:
            return {
                'success': False,
                'msg': 'Failed',
                'longMsg': "Couldn't connect with Zmall"
            }

        response_json = json.loads(response.text)
        try:
            if 'store' not in response_json:
                return {
                    'error': 'No store key in response'
                }
            # return str(response_json['success'])
            if str(response_json['success']) == 'True':
                pos_config.write({
                    'server_token': response_json['store']['server_token'],
                    'store_id': response_json['store']['_id']
                })
                _logger.info(f"pos_config.server_toker{pos_config.server_token}")
                _logger.info(f"pos_config.store_id{pos_config.store_id}")
                # self.server_token = response_json['store']['server_token']
                # self.store_id = response_json['store']['_id']
                return {
                    'server_token': response_json['store']['server_token'], 
                    'store_id': response_json['store']['_id']
                }
            elif str(response_json['success']) == 'False':
                return {
                    'success':False,
                    'error_code': response_json['store']['server_token']
                }
            else:
                return {
                    'success':False,
                    'error': 'Unknown Error'
                }
        except Exception as e:
            return {"error":e}
        # return response_json
    @api.model
    def logout_zmall(self, data):
        headers = {'Content-Type': 'application/json'}
        pos_config = self.env['pos.config'].search([('id','=', data)], limit=1)       
        auth_endpoint = pos_config.zmall_api_endpoint + 'api/store/login'


        try:
            response = requests.post(str(auth_endpoint),headers=headers)
        except:
            return {
                'msg': 'Failed',
                'longMsg': "Couldn't connect with Zmall"
            }

        response_json = json.loads(response.text)
        try:
            if 'store' not in response_json:
                return {
                    'error': 'No store key in response'
                }
            # return str(response_json['success'])
            if str(response_json['success']) == 'True':
                return {
                    'server_token': response_json['store']['server_token'], 
                    'store_id': response_json['store']['_id']
                }
            elif str(response_json['success']) == 'False':
                return {
                    'error_code': response_json['store']['server_token']
                }
            else:
                return {
                    'error': 'Unknown Error'
                }
        except Exception as e:
            return {"error":e}

    def get_zmall_orders(self, req):
        headers = {'Content-Type': 'application/json'}
        pos_config = self.env['pos.config'].search([('id','=', req['config_id'])], limit=1)
        request_data = {
            "store_id": req['store_id'],
            "server_token": req['server_token'],
            "payment_mode": "",
            "order_type": "",
            "pickup_type": "",
            "search_field": "user_detail.first_name",
            "search_value": "",
            "page": 1
        }
        if pos_config.zmall_api_endpoint:
            get_orders_endpoint = pos_config.zmall_api_endpoint + 'api/store/order_list_search_sort'
        else:
            get_orders_endpoint = pos_config.zmall_api_endpoint 


        try:
            response = requests.post(str(get_orders_endpoint), json=request_data, headers=headers)
        except:
            return {
                'msg': 'Failed',
                'longMsg': "Couldn't connect with Zmall"
            }

        response_json = json.loads(response.text)
        if str(response_json['success']) == 'True':
            orders_response = []
            for order in response_json['orders']:
                zmall_order_id = order['_id']
                store_id = order['store_id']
                unique_id = order['unique_id']
                created_at = order['created_at']
                order_status = order['order_status']
                customer_name = order['user_detail']['first_name']
                total_cart_price = order['cart_detail']['total_cart_price']
                cart_items = []

                for cart in order['cart_detail']['order_details']:
                    # cart_id = new_zmall_order_data.id

                    """

                        		
								"details": "",
								"unique_id": 112248,
								"image_url": [],
								"item_id": "6647653e5dd99f5d058d95bb",
								"item_name": "Milkshake Banana",
								"note_for_item": "",
								"item_price": 3.6,
								"item_tax": 0,
								"quantity": 4,
								"specifications": [],
								"tax": 0,
								"total_item_price": 14.4,
								"total_item_tax": 0,
								"total_specification_tax": 0,
								"total_price": 14.4,
								"total_specification_price": 0,
								"pos_id": "64",
								"total_tax": 0


                    """
                    category_name = cart['product_name']
                    for item in cart['items']:
                        if isinstance(item, dict):
                            _logger.error(f"!!!!!!!!!!!!!!!!!!item: {item}")
                            pos_id = item['pos_id'] if 'pos_id' in item else ''
                            item_unique_id = item['unique_id']
                            note_for_item = item['note_for_item']
                            full_product_name = item['item_name']
                            total_item_price = item['total_item_price']
                            max_item_quantity = item['max_item_quantity'] if 'max_item_quantity' in item else 0
                            details = item['details'] if 'details' in item else ''
                            image_url = item['image_url'] if 'image_url' in item else ''
                            item_id = item['item_id'] if 'item_id' in item else ''
                            item_name = item['item_name'] if 'item_name' in item else ''
                            item_price = item['item_price'] if 'item_price' in item else 0
                            item_tax = item['item_tax'] if 'item_tax' in item else 0
                            quantity = item['quantity'] if 'quantity' in item else 0
                            specifications = item['specifications'] if 'specifications' in item else ''
                            tax = item['tax'] if 'tax' in item else 0
                            total_item_tax = item['total_item_tax'] if 'total_item_tax' in item else 0
                            total_specification_tax = item['total_specification_tax'] if 'total_specification_tax' in item else 0
                            total_price = item['total_price'] if 'total_price' in item else 0
                            total_specification_price = item['total_specification_price'] if 'total_specification_price' in item else 0
                            total_tax = item['total_tax'] if 'total_tax' in item else 0




                        
                            cart_items.append({
                                # 'cart_id': cart_id,
                                'quantity': quantity,
                                'max_item_quantity': max_item_quantity,
                                'details': details,
                                'image_url': image_url,
                                'item_id': item_id,
                                'item_name': item_name,
                                'item_price': item_price,
                                'item_tax': item_tax,
                                'specifications': specifications,
                                'tax': tax,
                                'total_item_tax': total_item_tax,
                                'total_specification_tax': total_specification_tax,
                                'total_price': total_price,
                                'total_specification_price': total_specification_price,
                                'total_tax': total_tax,
                                'pos_id':pos_id,
                                'category_name': category_name,
                                'unique_id': item_unique_id,
                                'full_product_name': full_product_name,
                                'note_for_item': note_for_item,
                                'total_item_price': total_item_price,
                                'product_id': int(cart['pos_id']) if cart.get('pos_id') else False,
                                # 'quantity': float(quantity),
                                'price_unit': float(item_price),
                                'price_subtotal': float(total_item_price),
                                'price_subtotal_incl': float(total_price),
                                'discount': 0.0,
                                'tax_ids': [],  # Add appropriate tax mapping if needed
                                'product_uom_id': False,  # Add appropriate UOM mapping if needed
                                'full_product_name': full_product_name,
                                'note': 'order from zmall delivery app',
                            })
                        else:
                            _logger.error(f"!!!!!!!!!!!!!!!!!!Unexpected item structure: {item}")
                
                orders_response.append({
                    'zmall_order_id': zmall_order_id,
                    'store_id': store_id,
                    'unique_id': unique_id,
                    'created_at': created_at,
                    'order_status': order_status,
                    'customer_name': customer_name,
                    'total_cart_price': total_cart_price,
                    'cart_items': cart_items,
                    'partner_id': False,  # Add customer mapping if available
                    'pos_session_id': pos_config.current_session_id.id,
                    'amount_tax': sum(item.get('total_tax', 0.0) for item in cart_items),
                    'amount_total': float(order['cart_detail']['total_cart_price']),
                    'amount_paid': float(order['cart_detail']['total_cart_price']),
                    'state': 'draft',
                })

            return orders_response

        else:
            return response_json
        

    def add_item(self, req,config_id):
        _logger.info(f"config_id: {config_id}")
        if not config_id or config_id == 'null':
            return False
        headers = {'Content-Type': 'application/json'}
        pos_config = self.env['pos.config'].search([('id','=', config_id)], limit=1)
        if pos_config.zmall_api_endpoint:
            get_orders_endpoint = pos_config.zmall_api_endpoint + 'api/store/add_item'
        else:
            get_orders_endpoint = pos_config.zmall_api_endpoint

        try:
            response = requests.post(str(get_orders_endpoint), json=req, headers=headers)
            _logger.info(f"response of add item {response.text}")
            return response
            # self.products_mapping[pos_product_id] = json.loads(response.text)['item_id']
            # _logger.info(f"self.prouct_mapping: {self.prouct_mapping}")

        except:
            return {
                'msg': 'Failed',
                'longMsg': "Couldn't connect with Zmall"
            }

        response_json = json.loads(response.text)
        if str(response_json['success']) == 'True':
            return 'done'
        else:
            if response_json['error_code'] == 999:
                return 'reauth'
            return 'error'
        
    # /api/store/store_cancel_or_reject_order
    def cancel_or_reject_order(self,req):
        headers = {'Content-Type': 'application/json'}
        pos_config = self.env['pos.config'].search([('id','=', req['config_id'])], limit=1)
   
        request_data = {
            "cancel_reason": req['cancel_reason'],
            "order_id": req['order_id'],
            "order_status":req['order_status'],#order_status=104 for cancel 
            "server_token": req['server_token'],
            "store_id": req['store_id']
        }
        get_orders_endpoint = pos_config.zmall_api_endpoint + 'api/store/store_cancel_or_reject_order'

        try:
            response = requests.post(str(get_orders_endpoint), json=request_data, headers=headers)
            _logger.info(f"response of store cancel or reject {response.text}")
        except:
            return {
                'msg': 'Failed',
                'longMsg': "Couldn't connect with Zmall"
            }

        response_json = json.loads(response.text)
        if str(response_json['success']) == 'True':
            return 'done'
        else:
            return response_json
        

    def add_pos_order(self, req, products=[]):

        # Create initial order changes with proper structure
        initial_changes = {
            'orderlines': [],
            'new': True,
            'cancelled': False
        }

        def generate_pos_reference(session_id):
            return "000" + str(session_id) + "-"+"001" + ''.join(random.choices(string.digits + '-', k=14 - len("000" + str(session_id) + "-"+"001")))
        

        def generate_uuid():
            return str(uuid.uuid4())

        if 'products' in req:
            _logger.info(f"products in req {req['products']}")

        pos_config = self.env['pos.config'].search([('id', '=', req.get('config_id'))], limit=1)

        if not pos_config:
            return {'error': 'POS configuration not found'}

        pos_session = self.env['pos.session'].search([('config_id', '=', pos_config.id), ('state', '=', 'opened')], limit=1)
        # Search for the main_floor
        main_floor = self.env['restaurant.floor'].search([
            ('name', '=', pos_config.company_id.name),
            ('pos_config_ids', 'in', [pos_config.id])
        ], limit=1)

        # If main_floor does not exist, create it
        if not main_floor:
            main_floor = self.env['restaurant.floor'].create({
                'name': pos_config.company_id.name,
                'pos_config_ids': [(4, pos_config.id)],
            })

        # Now you have the main_floor, either found or created
        main_floor_id = main_floor.id
        pos_config.main_floor_id = main_floor.id
        if not pos_session:
            return {'error': 'No open POS session found for the given configuration'}
        table_id = req.get('table_id', 17)
        table = self.env['restaurant.table'].search([('id', '=', table_id)], limit=1)
        if table: 
            table_id = table.id
        if not table:
            table = self.env['restaurant.table'].create({
                'name': '17',
                'floor_id': main_floor.id,
                'seats': 1,
                'position_h': 100,
                'position_v': 100,
                'width': 100,
                'height': 100,
            })
            table_id = table.id

        order_lines = []
        for product in products:
            line_uuid = str(uuid.uuid4())
            product_id = product.get('id', '')
            if not product_id:
                _logger.error(f"!!!!!!!!!!!!!!!!!!product_id is not found {product}")
                continue
            prod = self.env['product.product'].search([('id', '=', product_id)], limit=1)
            # product = self.env['product.product'].browse(product_id)
            if not product:
                _logger.error(f"!!!!!!!!!!!!!!!!!!product is not found {product_id}")
                continue


            order_line = {
                'name': product.get('displayname', "OL/0001"),
                "full_product_name": product.get('displayname', "OL/0001"),
                # 'product_id': product['id'],
                'product_id': prod.id,
                'name': product.get('displayname', "OL/0001"),
                # 'product_tmpl_id': prod.product_tmpl_id.id,
                'price_unit': product.get('list_price', 0),
                'discount': product.get('discount', 0.0),
                'qty': float(product.get('quantity', 1.0)),
                'tax_ids': [(6, 0, product.get('tax_ids', []))],
                'price_subtotal': product.get('price_subtotal', 0),
                'price_subtotal_incl': product.get('price_subtotal_incl', 0),
                'note': product.get('note', ''),
                # 'uuid': line_uuid,  # Add UUID for each line
            }
            order_lines.append((0, 0, order_line))

            # # Add to preparation changes
            # initial_changes['orderlines'].append({
            #     'line_uuid': line_uuid,
            #     'note': product.get('note', ''),
            #     'state': 'new'
            # })

        pos_order_vals = {
            'name': self.env['ir.sequence'].next_by_code('pos.order'),
            'pos_reference': str("Order ") + generate_pos_reference(pos_session.id),
            'company_id': self.env.company.id,
            'session_id': pos_session.id,
            'user_id': self.env.uid,
            'table_id': req.get(table.id,17),
            'access_token': req.get('access_token', '13bd7a12-aa2d-4a20-85f9-0575a7eb4273'),
            'customer_count': req.get('customer_count', 1),
            'lines': order_lines,
            'amount_paid': req.get('amount_paid', 0),
            'amount_return': req.get('amount_return', 0.0),
            'delivery_order_id': req.get('order_id', ''),
            'amount_tax': req.get('amount_tax', 0),
            'amount_total': req.get('amount_total', 0),
            'state': 'draft',
            # 'last_order_preparation_change': json.dumps(initial_changes),
        }
        try:
                pos_order = self.env['pos.order'].create(pos_order_vals)
        
                # After creation, update the preparation display
                if pos_order:
                    pass
                        # pos_order._send_order()
                         # Trigger table count update
                        # self.env['bus.bus']._sendone(
                        #     self._get_bus_channel_name(),
                        #     'TABLE_ORDER_COUNT',
                        #     self.get_tables_order_count_and_printing_changes()
                        # )
                        
                return {'success': 'POS order created', 'order_id': pos_order.id}
        except Exception as e:
                _logger.error(f"Error creating POS order: {str(e)}")
                return {'error': f'Failed to create POS order: {str(e)}'}
            # return {'error': str(e)}

        # pos_order = self.env['pos.order'].create(pos_order_vals)
        
        # return {'success': 'POS order created', 'order_id': pos_order.id}

    def get_pos_orders(self):
        orders = self.env['pos.order'].search([])
        if not orders:
            return json.dumps({'orders': []}, default=str)

        _logger = logging.getLogger(__name__)
        _logger.info(orders)

        def order_to_dict(order):
            return {
                'id': order.id,
                'name': order.name,
                'pos_reference': order.pos_reference,
                'date_order': order.date_order,
                'session_id': order.session_id.id,
                'user_id': order.user_id.id,
                'delivery_order_id': order.delivery_order_id,
                'company_id': order.company_id.id,
                'amount_total': order.amount_total,
                'amount_tax': order.amount_tax,
                'amount_paid': order.amount_paid,
                'amount_return': order.amount_return,
                'lines': [{
                    'product_id': line.product_id.id,
                    'product_name': line.product_id.name,
                    'price_unit': line.price_unit,
                    'qty': line.qty,
                    'discount': line.discount,
                    'price_subtotal': line.price_subtotal,
                    'price_subtotal_incl': line.price_subtotal_incl,
                } for line in order.lines]
            }

        dict_order_list = [order_to_dict(order) for order in orders]
        # _logger.info(f"json.dumps(dict_order_list): {json.dumps(dict_order_list, default=str)}")
        # _logger.error("|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||")
        # _logger.error(json.dumps({'orders': dict_order_list}, default=str))

        return json.dumps({'orders': dict_order_list}, default=str)








    """
    access_token: "13bd7a12-aa2d-4a20-85f9-0575a7eb4273"
    amount_paid: 793.5
    amount_return: 0
    amount_tax: 103.5
    amount_total: 793.5
    date_order: "2024-05-21 11:21:35"
    fiscal_position_id: false
    is_tipped: false
    last_order_preparation_change: "{}"
    lines: [[0, 0,…], [0, 0,…], [0, 0,…]]
    name: "Order 00005-004-0002"
    partner_id: false
    pos_session_id: 5
    pricelist_id: false
    sequence_number: 2
    server_id: false
    shipping_date: false
    statement_ids: [[0, 0,…], [0, 0,…]]
    ticket_code: "21m5p"
    tip_amount: 0
    to_invoice: false
    uid: "00005-004-0002"
    user_id: 2

    """




    def set_zmall_order_status(self, req):
        _logger.info("==================== >>>>>>>>> req config id")
        _logger.info(req)
        _logger.info("==================== >>>>>>>>> req config id")
        headers = {'Content-Type': 'application/json'}
        _logger.info(f"==================== >>>>>>>>>{req['config_id']} configid is provided");
        pos_config = self.env['pos.config'].search([('id','=', req['config_id'])], limit=1)
        request_data = {
            "store_id": req['store_id'],
            "server_token": req['server_token'],
            "order_status": req['order_status'],
            "order_id": req['order_id']
        }
        get_orders_endpoint = pos_config.zmall_api_endpoint + 'api/store/set_order_status'

        try:
            response = requests.post(str(get_orders_endpoint), json=request_data, headers=headers)
            _logger.info(response.text)
            _logger.info(f"==================== >>>>>>>>>{response.text} response.text")
        except:
            return {
                'msg': 'Failed',
                'longMsg': "Couldn't connect with Zmall"
            }

        response_json = json.loads(response.text)
        _logger.info(f"response{response_json}")
        if str(response_json['success']) == 'True':
            return 'done'
        else:
            if response_json['error_code'] == 999:
                return 'reauth'
            return 'error'

    def get_store_info(self, req):
        headers = {'Content-Type': 'application/json'}
        pos_config = self.env['pos.config'].search([('id','=', req['config_id'])], limit=1)
        request_data = {
            "store_id": req['store_id'],
            "server_token": req['server_token'],
            "type": 2
        }
        get_orders_endpoint = pos_config.zmall_api_endpoint + 'api/store/get_store_data'

        try:
            response = requests.post(str(get_orders_endpoint), json=request_data, headers=headers)
        except:
            return {
                'msg': 'Failed',
                'longMsg': "Couldn't connect with Zmall"
            }

        response_json = json.loads(response.text)
        _logger.info("================== storedata adsfgfhgfdsadfggdwsfdgsfe")
        _logger.info(response_json)
        if str(response_json['success']) == 'True':
            storedata = {
                'store_name': response_json['store_detail']['name'],
                'is_visible': response_json['store_detail']['is_visible'],
                'is_business': response_json['store_detail']['is_business'],
                'admin_profit_value_on_delivery': response_json['store_detail']['city_details']['admin_profit_value_on_delivery'],
                'is_store_busy': response_json['store_detail']['is_store_busy'],
                'accept_only_cashless_payment': response_json['store_detail']['accept_only_cashless_payment'],
                'accept_scheduled_order_only': response_json['store_detail']['accept_scheduled_order_only']
            }
            return storedata
        else:
            if response_json['error_code'] == 999:
                return 'reauth'
            return 'error'

    def set_store_info(self, req):
        headers = {'Content-Type': 'application/json'}
        pos_config = self.env['pos.config'].search([('id','=', req['config_id'])], limit=1)
        request_data = {
            "store_id": req['store_id'],
            "server_token": req['server_token'],
            "order_status": req['order_status'],
            "order_id": req['order_id']
        }
        get_orders_endpoint = pos_config.zmall_api_endpoint + 'api/store/set_order_status'

        try:
            response = requests.post(str(get_orders_endpoint), json=request_data, headers=headers)
        except:
            return {
                'msg': 'Failed',
                'longMsg': "Couldn't connect with Zmall"
            }

        response_json = json.loads(response.text)
        if str(response_json['success']) == 'True':
            return 'done'
        else:
            if response_json['error_code'] == 999:
                return 'reauth'
            return 'error'

    def get_zmall_products(self, req):
        headers = {'Content-Type': 'application/json'}
        pos_config = self.env['pos.config'].search([('id','=', req['config_id'])], limit=1)
        request_data = {
            "store_id": req['store_id'],
            "server_token": req['server_token'],
            "type": 2
        }
        get_zmall_products_endpoint = pos_config.zmall_api_endpoint + 'api/store/get_item_list'

        try:
            response = requests.post(str(get_zmall_products_endpoint), json=request_data, headers=headers)
            _logger.info(response.text)
        except:
            return {
                'msg': 'Failed',
                'longMsg': "Couldn't connect with Zmall"
            }

        response_json = json.loads(response.text)

        if str(response_json['success']) == 'True':
            products_list = []
            for item in response_json['items']:
                item_id = item['_id']
                unique_id = item['unique_id']
                pos_id = item['pos_id']
                name = item['name']
                price = item['price']
                image_url = item['image_url']
                is_visible_in_store = item['is_visible_in_store']
                category_name = item['products_detail']['name']
                category_id = item['product_id']


                products_list.append({
                    'item_id': item_id,
                    'pos_id':pos_id,
                    'unique_id': unique_id,
                    'name': name,
                    'price': price,
                    'image_url': image_url,
                    'category_name': category_name,
                    'category_id': category_id,
                    'is_visible_in_store': is_visible_in_store
                })
            pos_config.write({
                'products_json': json.dumps(products_list),


            }) 
            pos_config.products_json = json.dumps(products_list)
            return products_list
        else:
            return response_json


    def create_pos_product(self,req):     
        print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        print(req['name'],req['price'])   
        product = self.env['product.product'].create({
            'name': req['name'],
            'available_in_pos': True,
            'list_price': req['price'],
        })
        return product



    def set_zmall_product_status(self, req):
        _logger.info("==================== >>>>>>>>> req config id")
        _logger.info(req)
        _logger.info("==================== >>>>>>>>> req config id")
        headers = {'Content-Type': 'application/json'}
        _logger.info(f"==================== >>>>>>>>>{req['config_id']} configid is provided");
        pos_config = self.env['pos.config'].search([('id','=', req['config_id'])], limit=1)
        request_data = {
            "name": req['name'],
            "store_id": req['store_id'],
            "server_token": req['server_token'],
            "is_item_in_stock":req["is_item_in_stock"],
            "is_visible_in_store": req['is_visible_in_store'],
            'item_id':req['item_id'],
            # "product_id": req['product_id'],
            # "details": req['details'],
            # "discount": False,
            # "name": req['name'],
            # "price": req['price'],
        }
        get_orders_endpoint = pos_config.zmall_api_endpoint + 'api/store/update_item'

        try:
            response = requests.post(str(get_orders_endpoint), json=request_data, headers=headers)
            _logger.info(response.text)
            _logger.info(f"==================== >>>>>>>>>{response.text} response.text")
        except:
            return {
                'msg': 'Failed',
                'longMsg': "Couldn't connect with Zmall"
            }

        response_json = json.loads(response.text)
        _logger.info(f"response{response_json}")
        if str(response_json['success']) == 'True':
          
            return 'done'
        else:
            if response_json['error_code'] == 999:
                return 'reauth'
            return 'error'
    def update_delivery_item_image(self, req):
        """
        Update the delivery item image.

        :param req: Dictionary containing 'item_id' and 'image_file' (base64 encoded)
        :return: Dictionary with success or fail message
        """
        # Extract item_id and image_file from req
        item_id = req.get('item_id')
        image_file = req.get('file')
        image_data = base64.b64decode(image_file)

        # Validate item_id
        if not item_id:
            return {'successful': False, 'message': _('Item ID is required.')}

        # Validate image_file
        if not image_file:
            return {'successful': False, 'message': _('Image file is required.')}
        
        # headers = {'Content-Type': 'multipart/form-data'}
        _logger.info(f"==================== >>>>>>>>>{req['config_id']} configid is provided");
        pos_config = self.env['pos.config'].search([('id','=', req['config_id'])], limit=1)
        request_data = {
            'file': image_data,
            'item_id':req['item_id'],
        }
        files = {
        'image_file': ('image.jpg', image_data, 'image/jpeg'),
        'item_id': (None, item_id)
            }
        get_orders_endpoint = pos_config.zmall_api_endpoint + 'api/store/upload_item_image'

        try:
            response = requests.post(str(get_orders_endpoint), files=files)
            print(response.text)
            print(f"==================== >>>>>>>>>{response.text} response.text")
            _logger.info(response.text)
            _logger.info(f"==================== >>>>>>>>>{response.text} response.text")
        except:
            return {
                'msg': 'Failed',
                'longMsg': "Couldn't connect with Zmall"
            }

        # response_json = json.loads(response.text)
        # _logger.info(f"response{response_json}")
        # if str(response_json['success']) == 'True':
        #     return 'done'
        # else:
        #     if response_json['error_code'] == 999:
        #         return 'reauth'
        #     return 'error'
        return
        

    def update_zmall_product(self, req):
        _logger.info("==================== >>>>>>>>> req config id")
        _logger.info(req)
        _logger.info("==================== >>>>>>>>> req config id")
        headers = {'Content-Type': 'application/json'}
        _logger.info(f"==================== >>>>>>>>>{req['config_id']} configid is provided");
        pos_config = self.env['pos.config'].search([('id','=', req['config_id'])], limit=1)
        request_data = {
            "name": req['name'],
            "store_id": req['store_id'],
            "server_token": req['server_token'],
            # "is_item_in_stock":req["is_item_in_stock"],
            "is_visible_in_store": req['is_visible_in_store'],
            'item_id':req['item_id'],
            "price": req['price'],
            # "product_id": req['product_id'],
            # "details": req['details'],
            # "discount": False,
            # "name": req['name'],
            
        }
        get_orders_endpoint = pos_config.zmall_api_endpoint + 'api/store/update_item'

        try:
            response = requests.post(str(get_orders_endpoint), json=request_data, headers=headers)
            _logger.info(response.text)
            _logger.info(f"==================== >>>>>>>>>{response.text} response.text")
        except:
            return {
                'msg': 'Failed',
                'longMsg': "Couldn't connect with Zmall"
            }

        response_json = json.loads(response.text)
        _logger.info(f"response{response_json}")
        if str(response_json['success']) == 'True':
            return 'done'
        else:
            if response_json['error_code'] == 999:
                return 'reauth'
            return 'error'
        return

    # @api.model
    def get_all_products(self,data={}):
        env = self.env
        _logger.info("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        # product_obj = env['product.product']
        product_obj = self.env['product.template']
        product_list = product_obj.search([])
        def product_to_dict(product):
            _logger.info(product)
            return {
                'id': product.id,
                'name': product.name,
                'purchase_ok':product.purchase_ok,
                'sale_ok':product.sale_ok,
                'list_price':product.list_price,
                'company_id':product.company_id.id,
                'active':product.active,
                'barcode':product.barcode,
                'default_code':product.default_code,
                'available_in_pos':product.available_in_pos,
                'to_weight':product.to_weight,
                'detailed_type':product.detailed_type,
            }
        dict_product_list = [product_to_dict(product) for product in product_list]
        # pos_config.odoo_products_json = json.dumps(dict_product_list)]
        _logger.info(f"1{json.dumps(dict_product_list)}")


        _logger.warning(f"json.dumps(dict_product_list){json.dumps(dict_product_list)}")

        
        for product in product_list:
            print(f"Product Name: {product.name}, Product ID: {product.id}")
        

        response_content = json.dumps(dict_product_list)
        # return Response(response_content, content_type='application/json', status=200)
        # return Response(response_content, content_type='application/json', status=200)
        
        return json.dumps(dict_product_list)
    

    
    @api.model
    def set_products(self, product_list):
        pass
        # Set the list of products, store as JSON
        # pos_config.products_json = json.dumps(product_list)

    def get_products(self):
        # Retrieve the list of products, loading from JSON
        return json.loads(self.products_json) if self.products_json else []


class PosOrderLine(models.Model):
    _inherit = "pos.order"
    delivery_order_id = fields.Char('Deliver Order ID', required=False)





class ZmallProduct(models.Model):
    _name = 'pos.zmall'
    _description = 'Zmall Product'

    """
       "name": req['name'],
            "store_id": req['store_id'],
            "server_token": req['server_token'],
            "is_item_in_stock":req["is_item_in_stock"],
            "is_visible_in_store": req['is_visible_in_store'],
            'item_id':req['item_id'],
            "price": req['price'],


    """

    item_id = fields.Char(string='Item ID', required=True)
    unique_id = fields.Char(string='Unique ID')
    pos_id = fields.Char(string='POS ID', required=True)
    name = fields.Char(string='Name')
    # fixmebini is item in sock update it
    # is_item_in_stock = fields.char(string='Is Item In Stock')
    price = fields.Float(string='Price')
    image_url = fields.Char(string='Image URL')
    category_name = fields.Char(string='Category Name')
    is_visible_in_store = fields.Boolean(string='Is Visible in Store')
    category_id = fields.Char(string='Category ID')




    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            is_restaurant = 'module_pos_restaurant' not in vals or vals['module_pos_restaurant']
            if is_restaurant and 'iface_splitbill' not in vals:
                vals['iface_splitbill'] = True
            if not is_restaurant or not vals.get('iface_tipproduct', False):
                vals['set_tip_after_payment'] = False
            vals["iface_orderline_notes"] = is_restaurant
        pos_configs = super().create(vals_list)
        for config in pos_configs:
            if config.module_pos_restaurant:
                self._setup_default_floor(config)
             
        return pos_configs
    def _setup_default_floor(self, pos_config):
        if not pos_config.floor_ids:
            main_floor = self.env['restaurant.floor'].create({
                'name': pos_config.company_id.name,
                'pos_config_ids': [(4, pos_config.id)],
            })
            self.env['restaurant.table'].create({
                'name': '1',
                'floor_id': main_floor.id,
                'seats': 1,
                'position_h': 100,
                'position_v': 100,
                'width': 100,
                'height': 100,
            })
            self.env['restaurant.table'].create({
                'name': '17',
                'floor_id': main_floor.id,
                'seats': 1,
                'position_h': 100,
                'position_v': 100,
                'width': 100,
                'height': 100,
            })
            pos_config.main_floor_id = main_floor.id
        self.env['restaurant.table'].create({
                'name': 'delivery',
                'floor_id': main_floor.id,
                'seats': 1,
                'position_h': 100,
                'position_v': 100,
                'width': 100,
                'height': 100,
            })
    def _setup_delivery_floor(self, pos_config):
            delivery_floor = self.env['restaurant.floor'].create({
                'name': 'Delivery',
                'pos_config_ids': [(4, pos_config.id)],
            })
            self.env['restaurant.table'].create({
                'name': '1',
                'floor_id': delivery_floor.id,
                'seats': 1,
                'position_h': 100,
                'position_v': 100,
                'width': 100,
                'height': 100,
            })
 



