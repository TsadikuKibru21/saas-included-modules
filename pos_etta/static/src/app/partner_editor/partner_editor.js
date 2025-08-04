/** @odoo-module */

import { _t } from "@web/core/l10n/translation";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { PartnerDetailsEdit } from "@point_of_sale/app/screens/partner_list/partner_editor/partner_editor";
import { patch } from "@web/core/utils/patch";

patch(PartnerDetailsEdit.prototype, {
    setup() {
        const res = super.setup(...arguments);
        this.changes.discount_customer = this.props.partner.discount_customer;
        return res;
    },
    saveChanges() {
        if (this.changes.discount_customer < 0 || this.changes.discount_customer > 99) {
            return this.popup.add(ErrorPopup, {
                title: _t("Missing Field"),
                body: _t("Invalid Customer Discount Value"),
            });
        }

        if (this.pos.hasAccess(this.pos.config['allow_price_change'])) {
            console.log("Access NOT Denied");
            this.pos.doAuthFirst('allow_price_change', 'price_change_pin_lock_enabled', 'price_change', async () => {
                return super.saveChanges(...arguments);
            });
        }
        else {
            console.log("Access Denied");
            return this.popup.add(ErrorPopup, {
                title: _t("Access Denied"),
                body: _t("You are not allowed to change customer data"),
            });
        }
    },
    get hasDiscountAccess(){
        return this.pos.hasAccess(this.pos.config['z_report_access_level']);
    }
});