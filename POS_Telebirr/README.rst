==============
POS Redelcom
==============

Integrate your POS with a Redelcom payment terminal.

Configuration
=============

Setting Up Payment Method
-------------------------

- Navigate to *Point of Sale > Configuration > Payment Methods*.
- Create a new payment method.
- Select *Redelcom* from the list of available payment terminals.
- Enter your Redelcom credentials.
- Save the payment method and verify that the *Redelcom Terminal Code* field is automatically populated.

.. image:: https://raw.githubusercontent.com/KonosCL/odoo-apps/17.0/pos_redelcom/static/description/image_01.png
   :alt: image_01.png
   :width: 700px

Note: Set *Redelcom Mode* as demo if you only want to make payments in the test environment.

Enabling the Payment Method
---------------------------

- Access *Point of Sale > Configuration > Settings*.
- Activate the Redelcom payment method for each point of sale where it will be utilized.

.. image:: https://raw.githubusercontent.com/KonosCL/odoo-apps/17.0/pos_redelcom/static/description/image_02.png
   :alt: image_02.png
   :width: 700px

Usage
=====

Using the Redelcom Payment Method
---------------------------------

- At the point of sale interface, select the items for purchase.
- When ready to make a payment, choose the Redelcom payment method.
- A button will appear allowing you to send the transaction to the Redelcom payment terminal.
- Complete the transaction on the Redelcom terminal as necessary.

.. image:: https://raw.githubusercontent.com/KonosCL/odoo-apps/17.0/pos_redelcom/static/description/image_03.png
   :alt: image_03.png
   :width: 700px

Verifying Transaction Status
----------------------------

- Access *Point of Sale > Orders > Payment Status*.
- Select the payment method associated with the Redelcom terminal.
- Consult the transaction number to verify the status of a transaction.

.. image:: https://raw.githubusercontent.com/KonosCL/odoo-apps/17.0/pos_redelcom/static/description/image_04.png
   :alt: image_04.png
   :width: 700px

Note: This menu is enabled only for users with a point of sale administrator profile.

Known issues
=============

This module has been tested exclusively with the Redelcom A910 payment terminal.

For more information about compatible devices and troubleshooting, please refer to the following
`link <https://www.mercadopago.cl/herramientas-para-vender/lectores-point/point-smart?device=101&code=POINT_POM>`__.

Credits
=======

Authors
-------
* Konos Soluciones & Servicios

Contributors
------------
* Alexander Olivares <<aolivares@konos.cl>>
