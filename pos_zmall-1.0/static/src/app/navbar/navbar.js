/** @odoo-module */
/* global Sha1 */

import { Navbar } from "@point_of_sale/app/navbar/navbar";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";


patch(Navbar.prototype, {
    setup() {
        super.setup();
    },
    
    onZmallClicked() {
        this.pos.showTempScreen("DeliveryOrdersScreen");
    },
    
});

