/** @odoo-module */

import { AbstractAwaitablePopup } from "@point_of_sale/app/popup/abstract_awaitable_popup";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";

export class InfoPopup extends AbstractAwaitablePopup {
    static template = "pos_etta.InfoPopup";

    setup() {
        super.setup();
        this.popup = useService("popup");
    }

}
