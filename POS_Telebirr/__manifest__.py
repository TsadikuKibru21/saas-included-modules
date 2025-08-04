# -*- coding: utf-8 -*-
# Copyright (C) 2023 Konos and MercadoPago S.A.
# Licensed under the GPL-3.0 License or later.

{
    "name": "POS Telebirr Payment",

    "summary": """
        Telebirr USSD payment with POS
    """,

    "author": "Konos Soluciones & Servicios",
    "website": "https://www.konos.cl",

    "category": "Sales/Point of Sale",
    "version": "17.0.0.1",

    "depends": [
        "point_of_sale","base"
    ],
# "qweb":[
#         "views/PaymentScreenPaymentLines.xml",

# ],

    "data": [
        "security/ir.model.access.csv",
        # "wizard/payment_status.xml",
        "views/pos_payment_method_views.xml",
        'views/telebirr_report.xml',


    ],
    "assets": {
        "point_of_sale._assets_pos": [
            "/POS_Telebirr/static/**/*",
            "/POS_Telebirr/static/src/**/*",
            'POS_Telebirr/static/src/app/*',
            "POS_Telebirr/static/src/overrides/components/payment_screen/payment_screen_payment_lines/test"

            # "/pos_redelcom1/views/pos_payment_method_views.xml"
        ],
    },

    "installable": True,
    "license": "GPL-3",
}
