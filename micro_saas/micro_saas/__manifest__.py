{
    "name": "Odoo Docker Instance Management",
    "category": "Tools",
    "summary": "Manage Odoo instances using docker compose",
    "description": """
        This module allows you to manage Odoo instances using docker compose.
    """,
    "author": "David Montero Crespo",
    "website": "https://github.com/davidmonterocrespo24/odoo_micro_saas",
    "license": "AGPL-3",
    "version": "17.0.1.2",
    "depends": ["base","web","website","mail","queue_job"],
    "data": [
        "views/menu.xml",
        "security/ir.model.access.csv",
        "views/odoo_docker_instance.xml",
        "views/repository_repo.xml",
        "views/docker_compose_template.xml",
        "views/docker_backup_cridential.xml",
        "views/tenant_server.xml",
        "data/data.xml",
        "data/mail_templates.xml",
        'data/cron_job.xml',
        "wizard/add_resource.xml",
        "wizard/renew_expiration_date.xml",
       
    ],
    "images": ["static/icon.png"],
    "demo": [],
    "installable": True,
    "application": True,
    "auto_install": False,

}
