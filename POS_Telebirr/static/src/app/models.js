
/** @odoo-module */

import { Order } from "@point_of_sale/app/store/models";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
// var models = require('point_of_sale.models');

patch(Order.prototype, {

// models.Order =  models.Order.extend({
    setup(_defaultObj, options) {
        super.setup(...arguments);
        this.uiState = {
            ReceiptScreen: {
                inputEmail: "",
                // if null: not yet tried to send
                // if false/true: tried sending email
                emailSuccessful: null,
                emailNotice: "",
            },
            // TODO: This should be in pos_restaurant.
            TipScreen: {
                inputTipAmount: "",
            },
            PaymentScreen:{
                Phone:"",
            }
        }}

    });

// });