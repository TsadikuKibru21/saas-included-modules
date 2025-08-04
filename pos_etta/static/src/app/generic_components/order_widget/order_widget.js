/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { OrderWidget } from "@point_of_sale/app/generic_components/order_widget/order_widget";
import { usePos } from "@point_of_sale/app/store/pos_hook";

patch(OrderWidget.prototype, {

    setup() {
        super.setup();
        this.pos = usePos();
    },
    getVoidedItems() {
        return [];
    }
    // getVoidedItems() {
    //     var result = [];
    //     var VOIDED_ORDERS = localStorage.getItem('VOIDED_ORDERS');
    //     if (VOIDED_ORDERS) {
    //         try {
    //             var parsedData = JSON.parse(VOIDED_ORDERS);
    //         } catch (e) {
    //             console.error("Failed to parse VOIDED_ORDERS from localStorage", e);
    //             return result;
    //         }

    //         if (Array.isArray(this.props.lines)) {
    //             this.props.lines.forEach(line => {
    //                 if (line && line.order && line.order.name) {
    //                     var filteredVoidedLines = parsedData.filter(order => order.name === line.order.name);
    //                     filteredVoidedLines.forEach(order => {
    //                         if (order.name && order.productName && order.unitPrice !== undefined && order.quantity !== undefined) {
    //                             const dataToStore = {
    //                                 name: order.name,
    //                                 productName: order.productName,
    //                                 unitPrice: order.unitPrice,
    //                                 quantity: order.quantity,
    //                             };
    //                             result.push(dataToStore);
    //                         }
    //                     });
    //                 }
    //             });
    //         } else {
    //             console.error("this.props.lines is not an array");
    //         }
    //     } else {
    //         console.warn("VOIDED_ORDERS is undefined or null in localStorage");
    //     }

    //     return result;
    // }
});