/** @odoo-module */

import { AbstractAwaitablePopup } from "@point_of_sale/app/popup/abstract_awaitable_popup";
import { _t } from "@web/core/l10n/translation";
import { useState } from "@odoo/owl";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { jsonrpc } from "@web/core/network/rpc_service";

export class VoidReasonPopup extends AbstractAwaitablePopup {
    static template = "pos_etta.VoidReasonPopup";
    static defaultProps = {
        closePopup: _t("Cancel"),
        confirmText: _t("Void"),
        title: _t("Void Orderline"),
    };

    constructor() {
        super(...arguments);
        this.state = useState({
            selectedReason: null,
            saved: false
        });
    }

    getPayload() {
        return this.state.saved;
    }

    setup() {
        super.setup();
        this.pos = usePos();
        this.props.reasons = this.pos.void_reasons || [];
        if (this.props.reasons.length > 0) {
            this.state.selectedReason = this.props.reasons[0].reason;
        }
    }

    async done() {
        const void_items = this.props.void_items;
        if (void_items) {
            console.log("=== void_items ===");
            console.log(void_items);
            this.confirm();
            try {
                let self = this;
                await jsonrpc(`/create_multi_void_reason`, {
                    data: void_items
                }).then(
                    function (data) {
                        self.state.saved = data;
                        self.confirm();
                    }
                );
            } catch (error) {
                console.error('Error occurred while sending data:', error);
            }
        }
        else {
            const order_id = this.pos.get_order().get_selected_orderline().order.uid;
            const cashier = this.pos.get_cashier().name;
            const product = this.pos.get_order().get_selected_orderline().product.display_name;
            const unit_price = this.pos.get_order().get_selected_orderline().product.lst_price;
            const quantity = this.props.orderedQty;

            try {
                let self = this;
                await jsonrpc(`/create_void_reason`, {
                    order_id: order_id,
                    cashier: cashier,
                    product: product,
                    unit_price: unit_price,
                    quantity: quantity,
                    reason_id: self.state.selectedReason,
                }).then(
                    function (data) {
                        self.state.saved = data;
                        self.confirm();
                    }
                );
            } catch (error) {
                console.error('Error occurred while sending data:', error);
            }
        }
    }

}