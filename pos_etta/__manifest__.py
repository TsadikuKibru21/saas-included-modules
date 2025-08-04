# -*- coding: utf-8 -*-
{
    "name": "Zoorya POS",
    "summary": "Module for handeling fiscal printing with SUNMI devices",
    "author": "Melkam Zeyede",
    "version": "1.0",
    "depends": ['base', 'mrp', 'point_of_sale', 'hr', 'account', 'sale', 'web', 'sale_management', 'stock', 'pos_restaurant'],
    'data': [
        'views/res_config_settings_views.xml',
        'views/pos_order_view.xml',
        'views/product_template_view_extension.xml',
        'views/pos_order_report_view.xml',
        'views/hr_employee_view.xml',
        "views/pos_log.xml",
        'views/res_users.xml',
        'wizard/pos_log_range.xml',
        'views/res_partner.xml',
        'views/account_invoice_template_inherit.xml',
        'views/pos_payment_method_views.xml',
        'security/ir.model.access.csv',
    ],
    "assets": {
        'point_of_sale._assets_pos': [
            'pos_etta/static/src/css/stock.css',
            'pos_etta/static/src/app/**/*',
            'pos_etta/static/lib/qrcode.js',

            'pos_etta/static/src/app/product_card/product_card.xml',
            'pos_etta/static/src/app/product_card/product_card.js',
            
            'pos_etta/static/src/app/product_list/product_list.js',

            'pos_etta/static/src/app/product_low_stock_screen/product_low_stock_screen.js',
            'pos_etta/static/src/app/product_low_stock_screen/product_low_stock_screen.xml',

            'pos_etta/static/src/app/product_low_stock_screen/low_stock_line/low_stock_line.js',
            'pos_etta/static/src/app/product_low_stock_screen/low_stock_line/low_stock_line.xml'
        ],
        'point_of_sale.assets': [
            'pos_etta/static/src/app/control_button/*',
            'pos_etta/static/src/app/generic_components/order_widget/*',
            'pos_etta/static/lib/qrcode.js',
            'pos_etta/static/src/css/**/*'
        ],
        'web.report_assets_pdf': [
            'pos_etta/static/css/report_invoice.css',
        ],
        'web.assets_common': [
            'pos_etta/static/lib/qrcode.js'
        ]
    },
    'installable': True,
    'application': True,
    # 'post_init_hook': 'post_install_hook'
}