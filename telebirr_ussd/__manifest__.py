{
    'name': "Telebirr Payment",
    'version': '17.0',
    'sequence': 350,
    'summary': "Telebirr Payment",
    'author': 'Tsadiku/ETTA',
    'depends': ['payment','website_sale','queue_job'],
    'data': [
        'views/payment_telebirr_templates.xml',
        'views/payment_provider_views.xml',
		# 'data/payment_method_data.xml',
        'data/payment_provider_data.xml',
    ],
       'assets': {
        'web.assets_frontend': [
            # 'payment_telebirr_ussd/static/src/js/telebirr_request_action.js',
            'telebirr_ussd/static/src/js/telebirr_request_action.js',
            # 'payment_telebirr_ussd/static/src/js/tele.js',

            # 'payment_telebirr_ussd/static/src/css/style.scss',
            

            # 'payment_telebirr_ussd/static/src/xml/telebirr_request.xml',
            
        ], 
        'web.assets_qweb': [
            
        ],
     
    },
    
    # 'images': ['images/main_screenshot.png'],
    'application': True,
    'installable': True,
    'post_init_hook': 'post_init_hook',
    'uninstall_hook': 'uninstall_hook',
    'license': 'LGPL-3',
}
