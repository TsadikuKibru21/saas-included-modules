-- Copyright (C) 2023 Konos and MercadoPago S.A.
-- Licensed under the GPL-3.0 License or later.

-- Disable redelcom payment method
-- This is useful only for instances hosted in odoo.sh
UPDATE pos_payment_method
SET redelcom_secret = NULL,
    redelcom_terminal_serial = NULL,
    redelcom_terminal_code = NULL
WHERE redelcom_mode IS NOT NULL;
