/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { SaleOrderManagementControlPanel } from "@pos_sale/app/order_management_screen/sale_order_management_control_panel/sale_order_management_control_panel";

patch(SaleOrderManagementControlPanel.prototype, {
    _computeDomain() {
        let domain = [
            ["state", "!=", "cancel"],
            ["state", "!=", "draft"],
            ["state", "!=", "sent"],
            ["invoice_status", "!=", "invoiced"],
        ];
        const input = this.pos.orderManagement.searchString.trim();
        if (!input) {
            return domain;
        }

        const searchConditions = this.pos.orderManagement.searchString.split(/[,&]\s*/);
        if (searchConditions.length === 1) {
            const cond = searchConditions[0].split(/:\s*/);
            if (cond.length === 1) {
                domain = domain.concat(Array(this.searchFields.length - 1).fill("|"));
                domain = domain.concat(
                    this.searchFields.map((field) => [field, "ilike", `%${cond[0]}%`])
                );
                return domain;
            }
        }

        for (const cond of searchConditions) {
            const [tag, value] = cond.split(/:\s*/);
            if (!this.validSearchTags.has(tag)) {
                continue;
            }
            domain.push([this.fieldMap[tag], "ilike", `%${value}%`]);
        }
        return domain;
    }
});