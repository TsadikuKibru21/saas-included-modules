/** @odoo-module */

import { ReprintReceiptScreen } from "@point_of_sale/app/screens/receipt_screen/reprint_receipt_screen";
import { ReceiptScreen } from "@point_of_sale/app/screens/receipt_screen/receipt_screen";
import { patch } from "@web/core/utils/patch";
import { ConfirmPopup } from "@point_of_sale/app/utils/confirm_popup/confirm_popup";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";

patch(ReceiptScreen.prototype, {
    setup() {
        super.setup();
        this.popup = useService("popup");
    },
    async printReceipt() {
        this.pos.get_order().printFiscalReceipt();
    }
});

patch(ReprintReceiptScreen.prototype, {
    async tryReprint() {
        if (this.pos.hasAccess(this.pos.config['ej_copy_access_level'])) {
            await this.pos.doAuthFirst('ej_copy_access_level', 'ej_copy_pin_lock_enabled', 'ej_copy', async () => {
                if (window.Android != undefined) {
                    if (window.Android.isAndroidPOS()) {
                        if (this.props.order.is_refund) {
                            if (this.props.order.fs_no == "" || this.props.order.fs_no == false) {
                                await this.props.order.printFiscalReceipt()
                            }

                            var result = window.Android.rePrintRefundInvoice(this.props.order.name);
                            this.pos.makeLogEntry("RePrint Sales Invoice Request => " + this.props.order.name);
                        }
                        else {
                            if (this.props.order.fs_no == "" || this.props.order.fs_no == false) {
                                await this.props.order.printFiscalReceipt()
                            }

                            var result = window.Android.rePrintSalesInvoice(this.props.order.name);
                            this.pos.makeLogEntry("RePrint Sales Invoice Request => " + this.props.order.name);
                        }
                    }
                    else {
                        this.env.services.notification.add("Invalid Device", {
                            type: 'danger',
                            sticky: false,
                            timeout: 10000,
                        });
                    }
                }
                else {
                    this.env.services.notification.add("Invalid Device", {
                        type: 'danger',
                        sticky: false,
                        timeout: 10000,
                    });
                }
            });
        }
        else {
            this.env.services.notification.add("Access Denied", {
                type: 'danger',
                sticky: false,
                timeout: 10000,
            });
        }
    }
});