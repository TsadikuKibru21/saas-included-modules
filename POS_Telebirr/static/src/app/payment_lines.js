/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { PaymentScreenPaymentLines } from "@point_of_sale/app/screens/payment_screen/payment_lines/payment_lines";
import { jsonrpc } from "@web/core/network/rpc_service";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { useService } from "@web/core/utils/hooks";
import { Component, useState } from "@odoo/owl";

patch(PaymentScreenPaymentLines.prototype, {

    setup() {
        super.setup(...arguments);

        this.ui = useState(useService("ui"));
        this.popup = useService("popup");
        this.pos = usePos();

        this.currentOrder = this.pos.get_order();
        this.orderUiState = this.currentOrder.uiState.PaymentScreen
        this.orderUiState.Phone = this.orderUiState.Phone

    }





});