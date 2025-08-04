{
    'name': 'mrp_report',
    'version': '1.0',
    'summary': 'Manage employee mrp_report',
    'description': """
        mrp_report Management
        ==================
        This module provides features to manage employee mrp_report including salary computation, payslip generation, and tax calculation.
    """,
    'author': 'Nuredin Muhamed',
    'website': 'http://www.yourcompany.com',
     'category': 'mrp production',

    'depends': ['base', 'mrp'],
    'data': [
        # 'security/ir.model.access.csv',
        # 'views/mrp_report_view.xml',
        # 'views/res_config_settings_views.xml',
        'report/report.xml',
        'report/report_template.xml',
    ],
    'demo': [
        # 'demo/demo.xml',
    ],
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'LGPL-3',
}
