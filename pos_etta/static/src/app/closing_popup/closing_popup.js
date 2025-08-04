/** @odoo-module */

import { ClosePosPopup } from "@point_of_sale/app/navbar/closing_popup/closing_popup";
import { InvoiceButton } from "@point_of_sale/app/screens/ticket_screen/invoice_button/invoice_button";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";

patch(ClosePosPopup.prototype, {
    async closeSession() {
        if (this.pos.config.z_on_closing) {
            if (window.Android != undefined) {
                if (this.pos.hasAccess(this.pos.config['z_report_access_level'])) {
                    this.pos.doAuthFirst('z_report_access_level', 'z_report_pin_lock_enabled', 'z_report', async () => {
                        await super.closeSession()
                        if (this.pos.user.pos_logout_direct) {
                            await this.pos.printZReportWithoutAuth();
                            return window.location = '/web/session/logout'
                        }
                        await this.pos.printZReportWithoutAuth();
                    });
                }
                else {
                    this.env.services.notification.add(_t("Access Denied"), {
                        type: 'danger',
                        sticky: false,
                        timeout: 10000,
                    });
                }
            }
            else {
                this.env.services.notification.add(_t("Invalid Device"), {
                    type: 'danger',
                    sticky: false,
                    timeout: 10000,
                });
            }
        }
        else {
            await super.closeSession()
            if (this.pos.user.pos_logout_direct) {
                return window.location = '/web/session/logout'
            }
        }
    }
})

patch(InvoiceButton.prototype, {
    get commandName() {
        if (!this.props.order) {
            return _t("Attachment");
        } else {
            return this.isAlreadyInvoiced ? _t("Reprint Attachment") : _t("Attachment");
        }
    }
})