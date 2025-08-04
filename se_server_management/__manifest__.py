{
    "name": "Server Management",
    "version": "17.0",
    "category": "Tools",
    'summary': """Panel the Control
    Server administrator in Odoo
    Run custom commands in the server
    Install an ftp on the server with just one click. It also allows you to configure the users and the access folder
We have many servers sometimes it becomes chaos, this app allowed us to restart, upload files, know the resources, execute commands and install an ftp server with a single click.

By having this integrated with Odoo, we can use it in other apps and automate processes, copies, backups, among others.""",
    'description': """
    Panel the Control
Server administrator in Odoo
Server
FTP
POS

Run custom commands in the server
Install an ftp on the server with just one click. It also allows you to configure the users and the access folder
We have many servers sometimes it becomes chaos, this app allowed us to restart, upload files, know the resources, execute commands and install an ftp server with a single click.

By having this integrated with Odoo, we can use it in other apps and automate processes, copies, backups, among others.
You can install an ftp on the server with just one click. It also allows you to configure the users and the access folder
To configure the ssh key, you can choose username or password or upload the key file
  """,
    "author": "David Montero Crespo",
    "depends": ["base", "mail"],
    "data": [
        "security/ir.model.access.csv",
        "view/command_view.xml",
        "view/server_view.xml",
        "wizard/se_ssh_auth_view.xml",
        "wizard/install_odoo.xml",
        "data/ir_parameters.xml",
        "data/data.xml",
        # 'data/server_configuration_command.csv',
    ],
    "installable": True,
    "images": ['static/description/server.png'],
    'price': 40,
    'currency': 'EUR',
    'license': 'AGPL-3',
}
