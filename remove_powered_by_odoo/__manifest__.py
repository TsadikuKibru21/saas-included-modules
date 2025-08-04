# -*- coding: utf-8 -*-
{
    'name': 'Hide Powered By Odoo',
    'summary': "Hide Powered By Odoo in login screen",
    'description': "Hide Powered By Odoo in login screen.",

    'version': '17.0.0.0.1',
    'license': 'OPL-1',
    'sequence': 1,
    
    'author': 'BENCHEHIDA .K',
    'website': 'https://fr.fiverr.com/kamelbenchehida',
    'price': 0.0,
    'currency': 'EUR',

    'depends': ['web','mail'],

    'images': [
        'static/description/banner.gif'     
    ],
    
    'data': [
        'views/login_templates.xml',
    ],

    'installable': True,
    'application': True,
    'auto_install': False,
}
