# -*- coding: utf-8 -*-
{
    'name': "Zoorya Website Customization",
    'summary': "This is a custom module for customizing the website of Zoorya",
    'description': """
        This module is used to customize the website of Zoorya
    """,
    'author': "Melkam Zeyede",
    'website': "https://www.odooethiopia.com",
    'category': 'Uncategorized',
    'version': '0.1',
    'depends': ['base', 'product', 'sale_subscription', 'website', 'website_sale'],
    'data': [
        'data/ir_model_fields.xml',
        'security/ir.model.access.csv',
        'views/saas_product_view.xml',
        'views/product_category_inherit.xml',
        'views/get_started.xml',
        'views/website_sale_templates.xml',
        'views/home_page.xml',
        'views/auth_signup_inherit.xml',
        'views/res_partner.xml',
        'views/header.xml',
        'views/footer.xml',
        'views/menu.xml',
        'views/shop.xml',
    ],
    'demo': [
        'demo/demo.xml',
    ],
    'assets': {
        'web.assets_frontend': [
            'zoorya_website_front/static/src/css/footer.css',
            'zoorya_website_front/static/src/css/get_started.css',
            'zoorya_website_front/static/src/css/home.css',
            'zoorya_website_front/static/src/css/product.css',
            'zoorya_website_front/static/src/css/categories.css',
            'zoorya_website_front/static/src/css/style.css',
            'zoorya_website_front/static/src/js/script.js',
            'zoorya_website_front/static/src/js/get_started.js',
            'zoorya_website_front/static/src/js/address.js',
            'zoorya_website_front/static/src/js/extra_info.js',
        ]
    }
}