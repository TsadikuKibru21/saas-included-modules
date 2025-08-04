/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";

patch(PaymentScreen.prototype, {
    setup() {
        super.setup(...arguments);
        this.orm = useService("orm");
        this.report = useService("report");

        // Add a boolean flag for toggling
        this.to_a5_invoice = false;
        console.log("################################# toggleIsToInvoiceA5")
        // Bind the method to this context
        this.toggleIsToInvoiceA5 = this.toggleIsToInvoiceA5.bind(this);
        this.is_to_a5_invoice = this.is_to_a5_invoice.bind(this);
    },

    toggleIsToInvoiceA5() {
        console.log("88888 called")
        this.to_a5_invoice = !this.is_to_a5_invoice();
        // this.printA5Attachment = !this.printA5Attachment;
        console.log("A5 Print Attachment Toggled:", this.to_a5_invoice);
    },
    is_to_a5_invoice(){
        return this.to_a5_invoice;
    },

    async _finalizeValidation() {
        const order = this.pos.get_order();
        if (!order) {
            return super._finalizeValidation(...arguments);
        }

        if (this.to_a5_invoice) {
            console.log("======== this",this)
            console.log("********** order",order)
            console.log(">>> Printing A5 Invoice for Order ID:", order.id);
                await this.report.doAction("pos_attachment_a5.report_pos_invoice_a5", {
                    active_ids: [order.id],
                    context: {
                        active_model: "pos.order",
                        active_ids: [order.id],
                    },
                });
            
           
        }

        return super._finalizeValidation(...arguments);
    },
});
