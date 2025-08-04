/** @odoo-module */

import { Order } from "@point_of_sale/app/store/models";
import { Orderline } from "@point_of_sale/app/store/models";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { VoidReasonPopup } from "../void_reason_popup/void_reason_popup";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { ConfirmPopup } from "@point_of_sale/app/utils/confirm_popup/confirm_popup";
import { Payment } from "@point_of_sale/app/store/models";

patch(Order.prototype, {
    setup(_defaultObj, options) {
        super.setup(...arguments);
        if (this.pos.config.pos_customer_id) {
            var default_customer = this.pos.config.pos_customer_id[0];
            var partner = this.pos.db.get_partner_by_id(default_customer);
            this.set_partner(partner);
        }
        if (!options.json && this.pos.config.order_auto_invoice) {
            this.set_to_invoice(true)
        }
        this.is_refund = false;
        this.checked = false;
        this.waiter_name = "";
        this.fs_no = "";
        this.rf_no = "";
        this.ej_checksum = "";
        this.fiscal_mrc = "";
        this.payment_qr_code_str = "";
        this.plate_no = "";
        this.chassis_no = "";
        this.job_card_no = "";
        this.brand = "";
        this.model = "";
        if (options.json) {
            this.set_is_refund_order(options.json.is_refund);
            this.set_checked(options.json.checked);
            this.set_waiter_name(options.json.waiter_name);
            this.set_fs_no(options.json.fs_no);
            this.set_rf_no(options.json.rf_no);
            this.set_ej_checksum(options.json.ej_checksum);
            this.set_fiscal_mrc(options.json.fiscal_mrc);
            this.set_payment_qr_code(options.payment_qr_code_str);
            if (options.json.partner_id) {
                var partner = this.pos.db.get_partner_by_id(options.json.partner_id);
                this.set_partner(partner);
            }
        }
    },
    init_from_JSON(json) {
        super.init_from_JSON(json);
        this.set_is_refund_order(json.is_refund);
        this.set_checked(json.checked);
        this.set_waiter_name(json.waiter_name);
        this.set_fs_no(json.fs_no);
        this.set_rf_no(json.rf_no);
        this.set_ej_checksum(json.ej_checksum);
        this.set_fiscal_mrc(json.fiscal_mrc);
        this.set_payment_qr_code(json.payment_qr_code_str);
    },
    export_as_JSON() {
        const jsonResult = super.export_as_JSON();
        jsonResult.is_refund = this.is_refund;
        jsonResult.checked = this.checked;
        jsonResult.waiter_name = this.waiter_name;
        jsonResult.fs_no = this.fs_no;
        jsonResult.rf_no = this.rf_no;
        jsonResult.ej_checksum = this.ej_checksum;
        jsonResult.fiscal_mrc = this.fiscal_mrc;
        jsonResult.payment_qr_code_str = this.payment_qr_code_str;
        return jsonResult;
    },
    get_data_to_store() {
        let changes = Object.values(this.pos.get_order().changesToOrder());
        let orderedQty = 1;
        if (this.pos.config.module_pos_restaurant) {
            if (changes.length != 0) {
                for (let i = 0; i < changes.length; i++) {
                    const change = changes[i];
                    for (let j = 0; j < change.length; j++) {
                        const element = change[j];
                        if (element.product_id == this.pos.get_order().get_selected_orderline().get_product().id) {
                            orderedQty = element.quantity;
                            break;
                        }
                    }
                }
            }
        }

        const id = this.pos.get_order().get_selected_orderline().product.id;
        const productName = this.pos.get_order().get_selected_orderline().product.display_name;
        const unitPrice = this.pos.get_order().get_selected_orderline().product.lst_price;
        const quantity = orderedQty
        const pluCode = this.pos.get_order().get_selected_orderline().product.default_code ? this.pos.get_order().get_selected_orderline().product.default_code : "00007"

        const taxRate = this.pos.get_order().get_selected_orderline().product.taxes_id === undefined ? 0 : this.pos.get_order().get_selected_orderline().product.taxes_id.length > 0 ? this.pos.taxes_by_id[this.pos.get_order().get_selected_orderline().product.taxes_id[0]].amount : 0
        const name = this.pos.get_order().name
        const discountAmount = this.pos.get_order().get_selected_orderline().product.discount;
        const serviceChargeAmount = this.pos.get_order().get_selected_orderline().product.service_charge;
        const productDescription = this.pos.get_order().get_selected_orderline().product.description ? this.pos.get_order().get_selected_orderline().product.description : this.pos.get_order().get_selected_orderline().product.display_name + " Description"

        const dataToStore = {
            name: name,
            id: id,
            pluCode: pluCode,
            productName: productName,
            productDescription: productDescription,
            quantity: quantity,
            unitName: "",
            unitPrice: unitPrice,
            taxRate: taxRate,
            discountAmount: discountAmount,
            discountType: "percentage",
            serviceChargeAmount: serviceChargeAmount,
            serviceChargeType: "percentage"
        };

        return dataToStore;
    },
    generate_unique_id() {
        var unique_id = super.generate_unique_id();
        return unique_id + "9";
    },
    isFiscalPrinted() {
        if (this.pos.get_order().is_refund && this.pos.get_order().rf_no !== "") {
            return true;
        }

        if (!this.pos.get_order().is_refund && this.pos.get_order().fs_no !== "") {
            return true;
        }

        return false;
    },
    async removeOrderline(line) {
        if (this.pos.get_order().rf_no !== "" || this.pos.get_order().fs_no !== "") {
            this.env.services.notification.add("Not allowed to modify a order with a printed fiscal receipt", {
                type: 'danger',
                sticky: false,
                timeout: 10000,
            });
            return;
        }
        if (this.pos.config.module_pos_restaurant) {
            let found = false;
            let orderedQty = 0;

            let kitchedDisplayData = Object.values(this.pos.get_order().lastOrderPrepaChange);
            console.log("=== kitchedDisplayData ===");
            console.dir(kitchedDisplayData);
            if (kitchedDisplayData.length != 0) {
                kitchedDisplayData.forEach(ktoItem => {
                    if (ktoItem.product_id == this.pos.get_order().get_selected_orderline().get_product().id) {
                        orderedQty = ktoItem.quantity;
                        found = true;
                    }
                });
            }

            if (found) {
                await this.pos.doAuthFirstWithReturn('allow_remove_orderline', 'allow_remove_orderline_pin_lock_enabled', 'remove_orderline', async (success) => {
                    console.log("Authentication success:", success);

                    if (success) {
                        console.log("Authentication succeeded, showing VoidReasonPopup...");

                        const popupResult = await this.env.services.popup.add(VoidReasonPopup, {
                            title: _t("Void Orderline"),
                            orderedQty: 1
                        });

                        console.log("Popup result:", popupResult);

                        if (popupResult.confirmed) {
                            console.log("Void confirmed by user. Removing order line...");
                            super.removeOrderline(line);
                        } else {
                            console.log("Void was not confirmed by the user.");
                        }
                    } else {
                        console.log("Authentication failed. Showing ErrorPopup...");

                        this.pos.env.services.popup.add(ErrorPopup, {
                            title: _t('Access Denied'),
                            body: _t('You do not have access to change price!'),
                        });
                    }
                });

                // if (this.pos.hasAccess(this.pos.config['allow_remove_orderline'])) {
                //     const popupResult = await this.env.services.popup.add(VoidReasonPopup, {
                //         title: _t("Void Orderline"),
                //         orderedQty: orderedQty
                //     });

                //     // let all_data = []
                //     // var jsonString = JSON.stringify(this.get_data_to_store());
                //     // var existingData = localStorage.getItem('VOIDED_ORDERS');
                //     // if (existingData) {
                //     //     let parsedData = JSON.parse(existingData);
                //     //     all_data.push(...parsedData)
                //     // }
                //     // all_data.push(JSON.parse(jsonString))
                //     // localStorage.setItem('VOIDED_ORDERS', JSON.stringify(all_data));

                //     if (popupResult.confirmed) {
                //         super.removeOrderline(line);
                //     }
                //     else if (popupResult.error) {
                //         this.env.services.notification.add(popupResult.error, {
                //             type: 'danger',
                //             sticky: false,
                //             timeout: 10000,
                //         });
                //     }
                // }
                // else {
                //     this.pos.env.services.popup.add(ErrorPopup, {
                //         title: _t('Access Denied'),
                //         body: _t('You do not have access to void orderline'),
                //     });
                // }
            } else {
                super.removeOrderline(line);
            }
        }
        else {
            await this.pos.doAuthFirstWithReturn('allow_remove_orderline', 'allow_remove_orderline_pin_lock_enabled', 'remove_orderline', async (success) => {
                console.log("Authentication success:", success);

                if (success) {
                    console.log("Authentication succeeded, showing VoidReasonPopup...");

                    const popupResult = await this.env.services.popup.add(VoidReasonPopup, {
                        title: _t("Void Orderline"),
                        orderedQty: 1
                    });

                    console.log("Popup result:", popupResult);

                    if (popupResult.confirmed) {
                        console.log("Void confirmed by user. Removing order line...");
                        super.removeOrderline(line);
                    } else {
                        console.log("Void was not confirmed by the user.");
                    }
                } else {
                    console.log("Authentication failed. Showing ErrorPopup...");

                    this.pos.env.services.popup.add(ErrorPopup, {
                        title: _t('Access Denied'),
                        body: _t('You do not have access to change price!'),
                    });
                }
            });


            // if (this.pos.hasAccess(this.pos.config['allow_remove_orderline'])) {
            //     const popupResult = await this.env.services.popup.add(VoidReasonPopup, {
            //         title: _t("Void Orderline"),
            //         orderedQty: 1
            //     });

            //     // let all_data = []
            //     // var jsonString = JSON.stringify(this.get_data_to_store());
            //     // var existingData = localStorage.getItem('VOIDED_ORDERS');
            //     // if (existingData) {
            //     //     let parsedData = JSON.parse(existingData);
            //     //     all_data.push(...parsedData)
            //     // }
            //     // all_data.push(JSON.parse(jsonString))
            //     // localStorage.setItem('VOIDED_ORDERS', JSON.stringify(all_data));

            //     if (popupResult.confirmed) {
            //         super.removeOrderline(line);
            //     }
            // }
            // else {
            //     this.pos.env.services.popup.add(ErrorPopup, {
            //         title: _t('Access Denied'),
            //         body: _t('You do not have access to change price!'),
            //     });
            // }

        }
    },
    async printChanges(cancelled) {
        const orderChange = this.changesToOrder(cancelled);
        let isPrintSuccessful = true;
        const d = new Date();
        let hours = "" + d.getHours();
        hours = hours.length < 2 ? "0" + hours : hours;
        let minutes = "" + d.getMinutes();
        minutes = minutes.length < 2 ? "0" + minutes : minutes;
        for (const printer of this.pos.unwatched.printers) {
            const changes = this._getPrintingCategoriesChanges(
                printer.config.product_categories_ids,
                orderChange
            );

            let today = new Date();
            let formattedDate = today.getDate().toString().padStart(2, '0') + '/'
                + (today.getMonth() + 1).toString().padStart(2, '0') + '/' // Months are 0-indexed
                + today.getFullYear();

            if (changes["new"].length > 0 || changes["cancelled"].length > 0) {
                const printingChanges = {
                    new: changes["new"],
                    cancelled: changes["cancelled"],
                    table_name: this.pos.config.module_pos_restaurant
                        ? this.getTable().name
                        : false,
                    floor_name: this.pos.config.module_pos_restaurant
                        ? this.getTable().floor.name
                        : false,
                    name: this.name || "unknown order",
                    cashier: this.cashier.name,
                    time: {
                        hours,
                        minutes,
                    },
                    date: formattedDate,
                    printing_type: this.pos.config.order_printing_type
                };

                const result = await printer.printReceipt(printingChanges, printer.config);
                if (!result.successful) {
                    isPrintSuccessful = false;
                }
            }
        }

        return isPrintSuccessful;
    },
    isValidArray(array) {
        // Check if the input is an array
        if (!Array.isArray(array)) {
            return false;
        }

        // Initialize variables to track positive and negative values
        let hasPositive = false;
        let hasNegative = false;

        // Iterate through the array and check the "priceWithTax" property
        for (const obj of array) {
            // Check if the object has the "priceWithTax" property
            if (typeof obj === 'number') {
                if (obj > 0) {
                    hasPositive = true;
                } else if (obj < 0) {
                    hasNegative = true;
                }
            }

            // If both positive and negative values are found, return false
            if (hasPositive && hasNegative) {
                return false;
            }
        }

        // If only positive or negative values are found, return true
        return true;
    },
    isSaleOrder(array) {
        // Check if the input is an array
        if (!Array.isArray(array)) {
            return false; // Return false if it's not an array
        }

        // Initialize a variable to track the sign of the first encountered number
        let initialSign = null;

        // Iterate through the array
        for (const obj of array) {
            // Check if the object has the "priceWithTax" property and it's a number
            if (typeof obj === 'number') {
                // Determine the sign of the first encountered number
                if (initialSign === null) {
                    initialSign = Math.sign(obj);
                } else if (Math.sign(obj) !== initialSign) {
                    // If a different sign is encountered, return false
                    return false;
                }
            }
        }

        // If the loop completes without returning false, check the sign of the encountered numbers
        // Return true if all are positive, false otherwise (including all negative or no numbers at all)
        return initialSign === 1;
    },
    async pay() {
        let self = this;
        let order = this.pos.get_order();
        let lines = order.get_orderlines();
        let pos_config = self.pos.config;
        let allow_order = pos_config.pos_allow_order;
        let deny_order = pos_config.pos_deny_order || 0;
        let call_super = true;
        let restrict_order = false;
        let product_names = '';
        const quantitys = lines.map(element => element.get_quantity());

        if (this.pos.hasAccess(this.pos.config['payment_access_level'])) {
            this.pos.doAuthFirst('payment_access_level', 'payment_pin_lock_enabled', 'payment', async () => {

                if (this.pos.config.module_pos_restaurant) {
                    if (order.get_waiter_name() === "" || order.get_waiter_name() === undefined || !order.get_waiter_name()) {
                        console.log("set_waiter_name at pay");
                        order.set_waiter_name(order.cashier.name);
                    }
                }

                // Stock check logic
                if (pos_config.pos_display_stock) {
                    let prod_used_qty = {};
                    $.each(lines, function (i, line) {
                        let prd = line.product;
                        if (prd.type == 'product') {
                            if (pos_config.pos_stock_type == 'onhand') {
                                if (prd.id in prod_used_qty) {
                                    let old_qty = prod_used_qty[prd.id][1];
                                    prod_used_qty[prd.id] = [prd.bi_on_hand, line.quantity + old_qty]
                                } else {
                                    prod_used_qty[prd.id] = [prd.bi_on_hand, line.quantity]
                                }
                            }
                            if (pos_config.pos_stock_type == 'available') {
                                if (prd.id in prod_used_qty) {
                                    let old_qty = prod_used_qty[prd.id][1];
                                    prod_used_qty[prd.id] = [prd.bi_available, line.quantity + old_qty]
                                } else {
                                    prod_used_qty[prd.id] = [prd.bi_available, line.quantity]
                                }
                            }
                        }
                    });

                    $.each(prod_used_qty, await function (i, pq) {
                        let product = self.pos.db.get_product_by_id(i);
                        if (allow_order == false && pq[0] < pq[1]) {
                            call_super = false;
                            self.pos.popup.add(ErrorPopup, {
                                title: _t('Deny Order'),
                                body: _t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                            });
                        }
                        let check = pq[0] - pq[1];
                        if (allow_order == true && check < deny_order) {
                            call_super = false;
                            self.pos.popup.add(ErrorPopup, {
                                title: _t('Deny Order'),
                                body: _t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                            });
                        }
                    });
                }

                // Check for zero price
                if (this.isValidArray(quantitys)) {
                    if (order && lines.length > 0) {
                        lines.forEach(function (line) {
                            if (line.get_display_price() == 0.00 || line.price < 0.00) {
                                restrict_order = true;
                                product_names += '-' + line.product.display_name + "\n"
                            }
                        });
                    } else {
                        restrict_order = true;
                    }

                    if (restrict_order) {
                        if (product_names) {
                            self.env.services.popup.add(ErrorPopup, {
                                'title': _t("Product With 0 Price"),
                                'body': _t('You are not allowed to have the zero prices on the order line.\n %s', product_names),
                            });
                        } else {
                            self.env.services.popup.add(ErrorPopup, {
                                'title': _t("Empty Order"),
                                'body': _t('There must be at least one product in your order before it can be validated.'),
                            });
                        }
                    } else {
                        // Check if the sale/refund state matches the POS mode
                        let isSale = this.isSaleOrder(quantitys);
                        if (isSale !== !this.pos.is_refund_order()) {
                            self.env.services.popup.add(ErrorPopup, {
                                'title': _t("Order Mode Conflict"),
                                'body': _t('The order type does not match the POS mode. Ensure all items are appropriate for a sale or refund.'),
                            });
                        } else {
                            if (call_super) {
                                super.pay();
                            }
                        }
                    }
                } else {
                    this.env.services.notification.add("Access Denied", {
                        type: 'danger',
                        sticky: false,
                        timeout: 10000,
                    });
                }
            });
        }
        else {
            this.env.services.notification.add(_t("Access Denied"), {
                type: 'danger',
                sticky: false,
                timeout: 10000,
            });
        }
    },
    set_orderline_options(orderline, options) {
        super.set_orderline_options(orderline, options);
        if (this.pos.config.pos_module_pos_service_charge) {
            let self = this;
            this.pos.get_order().orderlines.forEach(function (line) {
                line.set_service_charge(self.pos.config.global_service_charge[0]);
            });
        }
        else {
            if (orderline.product.service_charge) {
                orderline.set_service_charge(orderline.product.service_charge[0]);
            }
        }
    },
    is_checked() {
        return this.checked;
    },
    set_checked(value) {
        this.checked = value;
    },
    get_waiter_name() {
        return this.waiter_name;
    },
    set_waiter_name(value) {
        this.waiter_name = value;
    },
    is_refund_order() {
        return this.is_refund;
    },
    set_is_refund_order(value) {
        this.is_refund = value;
    },
    get_fs_no() {
        return this.fs_no;
    },
    set_fs_no(value) {
        this.fs_no = value;
    },
    set_rf_no(value) {
        this.rf_no = value;
    },
    get_rf_no() {
        return this.rf_no;
    },
    set_ej_checksum(value) {
        this.ej_checksum = value;
    },
    get_ej_checksum() {
        return this.ej_checksum;
    },
    set_fiscal_mrc(value) {
        this.fiscal_mrc = value;
    },
    get_fiscal_mrc_no() {
        return this.fiscal_mrc;
    },
    get_payment_qr_code() {
        return this.payment_qr_code_str;
    },
    set_payment_qr_code(qr_code_str) {
        this.payment_qr_code_str = qr_code_str;
    },

    // getTaxIdNotServiceCharge(orderline) {
    //     // console.log("Function getTaxIdNotServiceCharge called with orderline:", orderline);

    //     if (this.pos.config.pos_module_pos_service_charge) {
    //         // console.log("Service charge module is enabled.");
    //         var serviceChargeTaxId = this.pos.config.global_service_charge[0];
    //         // console.log("Global service charge ID:", serviceChargeTaxId);

    //         var taxAmount = 0;
    //         if (orderline.product.taxes_id !== undefined || orderline.product.taxes_id !== false) {
    //             // console.log("Product has taxes_id:", orderline.product.taxes_id);
    //             var filteredTaxs = orderline.product.taxes_id.filter(taxId => serviceChargeTaxId !== taxId);
    //             // console.log("Filtered taxes (excluding service charge tax):", filteredTaxs);

    //             if (filteredTaxs.length > 0) {
    //                 taxAmount = this.pos.taxes_by_id[filteredTaxs[0]].amount;
    //                 // console.log("Tax amount for filtered tax:", taxAmount);
    //             } else {
    //                 // console.log("No taxes available after filtering.");
    //                 taxAmount = 0;
    //             }
    //         } else {
    //             // console.log("No taxes defined for the product.");
    //             taxAmount = 0;
    //         }
    //         // console.log(taxAmount);
    //         return taxAmount;
    //     } else {
    //         // console.log("Service charge module is not enabled.");
    //         var serviceChargeTaxId = undefined;
    //         var taxAmount = 0;

    //         if (orderline.product.service_charge !== undefined || orderline.product.service_charge !== false) {
    //             // console.log("Service charge defined for product:", orderline.product.service_charge);
    //             serviceChargeTaxId = orderline.product.service_charge[0];
    //         } else {
    //             // console.log("No service charge or it is undefined/false.");
    //         }

    //         if (serviceChargeTaxId !== undefined) {
    //             // console.log("Service charge ID:", serviceChargeTaxId);
    //             var filteredTaxs = orderline.product.taxes_id.filter(taxId => serviceChargeTaxId !== taxId);
    //             // console.log("Filtered taxes (excluding service charge tax):", filteredTaxs);

    //             if (filteredTaxs.length > 0) {
    //                 taxAmount = this.pos.taxes_by_id[filteredTaxs[0]].amount;
    //                 // console.log("Tax amount for filtered tax:", taxAmount);
    //             } else {
    //                 // console.log("No taxes available after filtering.");
    //                 taxAmount = 0;
    //             }
    //         } else {
    //             // console.log("Service charge ID is undefined.");
    //             // console.log(orderline.product.taxes_id !== undefined);
    //             // console.log(orderline.product.taxes_id !== false);

    //             if (orderline.product.taxes_id !== undefined || orderline.product.taxes_id !== false) {
    //                 // console.log("inside this");
    //                 taxAmount = this.pos.taxes_by_id[orderline.product.taxes_id[0]].amount;

    //             }
    //         }
    //         // console.log(taxAmount);
    //         return taxAmount;
    //     }
    // },
    //TOWOOOO
    // getTaxIdNotServiceCharge(orderline) {
    //     console.log("Function getTaxIdNotServiceCharge called with orderline:", orderline);

    //     if (this.pos.config.pos_module_pos_service_charge) {
    //         console.log("Service charge module is enabled.");
    //         var serviceChargeTaxId = this.pos.config.global_service_charge[0];
    //         console.log("Global service charge ID:", serviceChargeTaxId);

    //         var taxAmount = 0;
    //         if (orderline.product.taxes_id !== undefined || orderline.product.taxes_id !== false) {
    //             console.log("Product has taxes_id:", orderline.product.taxes_id);
    //             var filteredTaxs = orderline.product.taxes_id.filter(taxId => serviceChargeTaxId !== taxId);
    //             console.log("Filtered taxes (excluding service charge tax):", filteredTaxs);

    //             if (filteredTaxs.length > 0) {
    //                 taxAmount = this.pos.taxes_by_id[filteredTaxs[0]].amount;
    //                 console.log("Tax amount for filtered tax:", taxAmount);
    //             } else {
    //                 console.log("No taxes available after filtering.");
    //                 taxAmount = 0;
    //             }
    //         } else {
    //             console.log("No taxes defined for the product.");
    //             taxAmount = 0;
    //         }
    //         return taxAmount;
    //     } else {
    //         console.log("Service charge module is not enabled.");
    //         var serviceChargeTaxId = undefined;
    //         var taxAmount = 0;

    //         if (orderline.product.service_charge !== undefined && orderline.product.service_charge) {
    //             console.log("Service charge defined for product:", orderline.product.service_charge);
    //             serviceChargeTaxId = orderline.product.service_charge[0];
    //         } else {
    //             console.log("No service charge or it is undefined/false.");
    //         }

    //         if (serviceChargeTaxId !== undefined) {
    //             console.log("Service charge ID:", serviceChargeTaxId);
    //             var filteredTaxs = orderline.product.taxes_id.filter(taxId => serviceChargeTaxId !== taxId);
    //             console.log("Filtered taxes (excluding service charge tax):", filteredTaxs);

    //             if (filteredTaxs.length > 0) {
    //                 taxAmount = this.pos.taxes_by_id[filteredTaxs[0]].amount;
    //                 console.log("Tax amount for filtered tax:", taxAmount);
    //             } else {
    //                 console.log("No taxes available after filtering.");
    //                 taxAmount = 0;
    //             }
    //         } else {
    //             console.log("Service charge ID is undefined.");
    //         }

    //         return taxAmount;
    //     }
    // },
    getTaxIdNotServiceCharge(orderline) {
        // console.log("Function getTaxIdNotServiceCharge called with orderline:", orderline);

        if (this.pos.config.pos_module_pos_service_charge) {
            // console.log("Service charge module is enabled.");
            var serviceChargeTaxId = this.pos.config.global_service_charge[0];
            // console.log("Global service charge ID:", serviceChargeTaxId);

            var taxAmount = 0;
            if (orderline.product.taxes_id !== undefined || orderline.product.taxes_id !== false) {
                // console.log("Product has taxes_id:", orderline.product.taxes_id);
                var filteredTaxs = orderline.product.taxes_id.filter(taxId => serviceChargeTaxId !== taxId);
                // console.log("Filtered taxes (excluding service charge tax):", filteredTaxs);

                if (filteredTaxs.length > 0) {
                    taxAmount = this.pos.taxes_by_id[filteredTaxs[0]].amount;
                    // console.log("Tax amount for filtered tax:", taxAmount);
                } else {
                    // console.log("No taxes available after filtering.");
                    taxAmount = 0;
                }
            } else {
                // console.log("No taxes defined for the product.");
                taxAmount = 0;
            }
            // console.log(taxAmount);
            return taxAmount;
        } else {
            console.log("Service charge module is not enabled.");
            var serviceChargeTaxId = undefined;
            var taxAmount = 0;

            if (orderline.product.service_charge !== undefined && orderline.product.service_charge !== false) {
                console.log("Service charge defined for product:", orderline.product.service_charge);
                serviceChargeTaxId = orderline.product.service_charge[0];
            } else {
                console.log("No service charge or it is undefined/false.");
            }

            if (serviceChargeTaxId !== undefined) {
                console.log("Service charge ID:", serviceChargeTaxId);
                var filteredTaxs = orderline.product.taxes_id.filter(taxId => serviceChargeTaxId !== taxId);
                console.log("Filtered taxes (excluding service charge tax):", filteredTaxs);

                if (filteredTaxs.length > 0) {
                    taxAmount = this.pos.taxes_by_id[filteredTaxs[0]].amount;
                    console.log("Tax amount for filtered tax:", taxAmount);
                } else {
                    console.log("No taxes available after filtering.");
                    taxAmount = 0;
                }
            } else {
                console.log("Service charge ID is undefined.");
                console.dir(orderline)
                console.log(orderline.product.taxes_id !== undefined);
                console.log(orderline.product.taxes_id !== false);

                if (orderline.product.taxes_id && orderline.product.taxes_id.length > 0) {
                    console.log("inside this");
                    taxAmount = this.pos.taxes_by_id[orderline.product.taxes_id[0]].amount;
                }
            }
            console.log("=== taxAmount ===");
            console.log(taxAmount);
            return taxAmount;
        }
    },
    splitAndPadText(text, lineLength) {
        let lines = [];
        while (text.length > lineLength) {
            lines.push(text.slice(0, lineLength));
            text = text.slice(lineLength);
        }
        // Add the last part, padded if necessary
        lines.push(text.padEnd(lineLength, ' '));
        return lines;
    },
    truncateText(text, length) {
        if (text.length > length) {
            return text.slice(0, length);
        }
        return text.padEnd(length, ' ');
    },
    async printFiscalReceipt() {
        if (!await this.pos.correctTimeConfig()) {
            return;
        }

        var receiptData = this.export_for_printing();
        console.dir("=========receiptData");
        console.dir(this);
        receiptData.tenant = "odoo17";
        receiptData.client = this.get_partner();

        //var einvoice_qrcode = this.pos.base_url + "/pos/ticket/validate?access_token=" + this.access_token;

        let customer = {};

        if (receiptData.client != null) {
            customer.customerName = receiptData.client.name ? receiptData.client.name : "";
            customer.customerTradeName = "";
            customer.customerTIN = receiptData.client.vat ? receiptData.client.vat : "";
            customer.customerPhoneNo = receiptData.client.phone ? receiptData.client.phone : "";
        }

        let orderlinesFromOrder = this.orderlines;
        let isRefundOrder = this.pos.is_refund_order();
        this.set_is_refund_order(isRefundOrder);

        // this.set_payment_qr_code("This is a place for Payment QR code only");

        let extractedOrderlines = orderlinesFromOrder.map(orderline => {

            return {
                id: orderline.product.id,
                pluCode: orderline.product.default_code ? orderline.product.default_code : "0000",
                productName: orderline.product.display_name,
                productDescription: orderline.product.description ? orderline.product.description : orderline.product.display_name + " Description",
                quantity: orderline.quantity,
                unitName: "PC",
                unitPrice: orderline.price,
                // taxRate: orderline.product.taxes_id === undefined ? 0 : orderline.product.taxes_id.length > 0 ? this.pos.taxes_by_id[orderline.product.taxes_id[0]].amount : 0,
                taxRate: this.getTaxIdNotServiceCharge(orderline),
                discountAmount: orderline.discount,
                discountType: "percentage",
                serviceChargeAmount: !orderline.product.service_charge ? 0 : this.pos.taxes_by_id[orderline.product.service_charge[0]].amount,
                serviceChargeType: "percentage"
            };
        });

        // var local_data = localStorage.getItem('VOIDED_ORDERS');
        // var voided_filtered_data = [];
        // if (local_data) {
        //     var parsedData = JSON.parse(local_data);
        //     voided_filtered_data = parsedData.filter(item => item.name === this.name);
        // }

        // Get customer discount
        let customerDiscount = 0;
        if (this.get_partner() != undefined) {
            customerDiscount = this.get_partner().discount_customer;
        }
        let globalDiscountAmount = 0;
        if (this.pos.config.module_pos_discount) {
            globalDiscountAmount = this.pos.config.discount_pc;
        }

        if (globalDiscountAmount > customerDiscount) {
            globalDiscountAmount = globalDiscountAmount;
        } else {
            globalDiscountAmount = customerDiscount;
        }

        var headerText = receiptData.headerData.header !== false ? receiptData.headerData.header : "";

        // Ensure headerText lines do not exceed 31 characters
        var headerLines = this.splitAndPadText(headerText, 31);

        // Check if additional text needs to be appended
        if (this.pos.config.show_waiter_table_on_fiscal_receipt && this.pos.config.module_pos_restaurant) {
            var waiterText = "Waiter : " + this.get_waiter_name();
            var tableText = "Table : " + this.pos.tables_by_id[this.tableId].name;

            // Truncate and pad waiterText and tableText to fit 31 characters each
            waiterText = this.truncateText(waiterText, 31);
            tableText = this.truncateText(tableText, 31);

            // Add the waiter and table text as new lines
            headerLines.push(waiterText, tableText);
        }

        // Join all lines ensuring proper formatting
        headerText = headerLines.join('');
		const hasReprintReceipt = this.paymentlines.some(paymentline => paymentline.payment_method.reprint_receipt === true);
        var forSunmi = {
            orderlines: extractedOrderlines,
            // voidedOrderLines: voided_filtered_data,
            voidedOrderLines: [],
            customer: customer,
            paymentType: (receiptData.paymentlines && receiptData.paymentlines.length > 0) ? receiptData.paymentlines[0].name : "CASH",
            paidAmount: receiptData.total_paid,
            qrCode: this.get_payment_qr_code(),
            change: receiptData.change,
            headerText: headerText,
            footerText: receiptData.footer !== false ? receiptData.footer : "",
            cashier: receiptData.cashier,
            ref: receiptData.name,
            globalServiceChargeType: "Percentage",
            globalServiceChargeAmount: this.pos.config.pos_module_pos_service_charge ? this.pos.taxes_by_id[this.pos.config.global_service_charge[0]].amount : 0,
            globalDiscountType: "Percentage",
            globalDiscountAmount: globalDiscountAmount,
            commercialLogo: this.pos.config.receipt_image,
            printCopy: hasReprintReceipt
        };

        if (window.Android != undefined) {
            if (window.Android.isAndroidPOS()) {

                var result;
                if (isRefundOrder) {
                    result = await window.Android.printRefundInvoice(JSON.stringify(forSunmi));
                    this.pos.makeLogEntry("Printing Refund Invoice Request => " + JSON.stringify(forSunmi));
                }
                else {
                    result = await window.Android.printSalesInvoice(JSON.stringify(forSunmi));
                    this.pos.makeLogEntry("Printing Sales Invoice Request => " + JSON.stringify(forSunmi));
                }

                var responseObject = JSON.parse(result);
                if (responseObject.success) {
                    this.set_ej_checksum(responseObject.checkSum);
                    this.set_fiscal_mrc(responseObject.mrc);

                    if (this.is_refund) {
                        this.date_order = luxon.DateTime.fromFormat(responseObject.date + " " + responseObject.time, 'dd/MM/yyyy HH:mm', { zone: 'Africa/Addis_Ababa' });
                        // this.env.services.notification.add(responseObject.date + " " + responseObject.time, {
                        //     type: 'danger',
                        //     sticky: false,
                        //     timeout: 10000,
                        // });
                        this.set_rf_no(responseObject.rfdNo);
                    }
                    else {
                        this.date_order = luxon.DateTime.fromFormat(responseObject.date + " " + responseObject.time, 'dd/MM/yyyy HH:mm', { zone: 'Africa/Addis_Ababa' });
                        // this.env.services.notification.add(responseObject.date + " " + responseObject.time, {
                        //     type: 'danger',
                        //     sticky: false,
                        //     timeout: 10000,
                        // });
                        this.set_fs_no(responseObject.fsNo);
                    }
                    this._printed = true;

                    this.pos.makeLogEntry("Fiscal Receipt Printing Successfully");

                    var get_existing_data = localStorage.getItem('VOIDED_ORDERS');
                    if (get_existing_data) {
                        var parsedData = JSON.parse(get_existing_data);
                        var updatedData = parsedData.filter(item => item.name !== this.name);
                        localStorage.setItem('VOIDED_ORDERS', JSON.stringify(updatedData));
                    }

                    return true;
                } else {
                    if (responseObject.printedInvoice) {
                        if (this.pos.hasAccess(this.pos.config['ej_copy_access_level'])) {
                            const { confirmed } = await this.env.services.popup.add(ConfirmPopup, {
                                title: _t("Printed Invoice"),
                                body: _t("%s has been printed before. Do you want a non-fiscal reprint?", forSunmi.ref),
                            });
                            if (confirmed) {
                                await this.pos.doAuthFirst('ej_copy_access_level', 'ej_copy_pin_lock_enabled', 'ej_copy', async () => {
                                    if (this.is_refund) {
                                        result = window.Android.rePrintRefundInvoice(forSunmi.ref);
                                        this.pos.makeLogEntry("RePrint Refund Invoice Request => " + forSunmi.ref);
                                    }
                                    else {
                                        result = window.Android.rePrintSalesInvoice(forSunmi.ref);
                                        this.pos.makeLogEntry("RePrint Sales Invoice Request => " + forSunmi.ref);
                                    }
                                    return true;
                                });
                            }
                        }
                        return true;
                    }

                    this._printed = false;

                    this.env.services.notification.add(responseObject.message, {
                        type: 'danger',
                        sticky: false,
                        timeout: 10000,
                    });

                    this.pos.makeLogEntry("Fiscal Receipt Printing Failed");
                    return false;
                }
            }
            else {
                return false;
            }
        }
        else {
            this.env.services.notification.add("Invalid Device", {
                type: 'danger',
                sticky: false,
                timeout: 10000,
            });
            return false;
        }
    },

    product_total() {
        let order = this.pos.get_order();
        var orderlines = order.get_orderlines();
        return orderlines.length;
    },

    set_interval(interval) {
        this.interval = interval;
    },
});

patch(Orderline.prototype, {
    setup(_defaultObj, options) {
        super.setup(...arguments);
        this.pos = options.pos;
        this.service_charge = 0;
        this.service_chargeStr = "";
        if (options.json) {
            this.init_from_JSON(options.json);
        }
    },
    init_from_JSON(json) {
        super.init_from_JSON(json);
        // this.set_service_charge(json.service_charge);
    },
    export_as_JSON() {
        const jsonResult = super.export_as_JSON();
        jsonResult.service_charge = this.service_charge;
        return jsonResult;
    },
    clone() {
        const orderlineClone = super.clone();
        orderlineClone.service_charge = this.service_charge;
        return orderlineClone;
    },
    set_service_charge(service_charge_tax_id) {
        var taxes_ids = this.tax_ids || this.get_product().taxes_id;

        // Add the new tax ID at the beginning
        var new_tax_id = service_charge_tax_id; // Replace with your actual tax ID
        if (!taxes_ids.includes(new_tax_id)) {
            taxes_ids.unshift(new_tax_id);
        }

        this.tax_ids = taxes_ids;
        // console.dir("==== AFTER SERVICE CHARGE IS ADDED ====");
        // console.dir(this.tax_ids);
    },
    get_all_prices(qty = this.get_quantity()) {
        var self = this;
        if (!this.order.is_refund && (this.order.state != 'done' || this.order.state != 'paid')) {
            if (this.order.pos.config.module_pos_discount) {
                this.order.orderlines.forEach(function (line) {
                    line.set_discount(self.order.pos.config.discount_pc);
                });
            }
            if (this.order.get_partner() != undefined && this.order.pos.config.module_pos_discount) {
                if (self.order.pos.config.discount_pc > self.order.get_partner().discount_customer) {
                    this.order.orderlines.forEach(function (line) {
                        line.set_discount(self.order.pos.config.discount_pc);
                    });
                }
                else {
                    this.order.orderlines.forEach(function (line) {
                        line.set_discount(self.order.get_partner().discount_customer);
                    });
                }
            }
            else if (this.order.get_partner() != undefined) {
                this.order.orderlines.forEach(function (line) {
                    line.set_discount(self.order.get_partner().discount_customer);
                });
            }
        }

        var price_unit = this.get_unit_price() * (1.0 - this.get_discount() / 100.0);
        var taxtotal = 0;

        var product = this.get_product();
        var taxes_ids = this.tax_ids || product.taxes_id;
        taxes_ids = taxes_ids.filter((t) => t in this.pos.taxes_by_id);
        var taxdetail = {};
        var product_taxes = this.pos.get_taxes_after_fp(taxes_ids, this.order.fiscal_position);

        var all_taxes = this.compute_all(
            product_taxes,
            price_unit,
            qty,
            this.pos.currency.rounding
        );
        var all_taxes_before_discount = this.compute_all(
            product_taxes,
            this.get_unit_price(),
            qty,
            this.pos.currency.rounding
        );
        all_taxes.taxes.forEach(function (tax) {
            taxtotal += tax.amount;
            taxdetail[tax.id] = {
                amount: tax.amount,
                base: tax.base,
            };
        });

        return {
            priceWithTax: all_taxes.total_included,
            priceWithoutTax: all_taxes.total_excluded,
            priceWithTaxBeforeDiscount: all_taxes_before_discount.total_included,
            priceWithoutTaxBeforeDiscount: all_taxes_before_discount.total_excluded,
            tax: taxtotal,
            taxDetails: taxdetail,
        };
    },
    get_service_charge() {
        return this.service_charge;
    },
    get_service_chargeStr() {
        return this.service_chargeStr;
    },
    getDisplayData() {
        const displayData = super.getDisplayData();
        displayData.service_charge = this.service_charge;
        displayData.order = this.order;
        displayData.orderline = this; 
        displayData.pos = this.pos; 
        return displayData;
    },
    removeClicked(line){
        console.log("==== removeClicked ====");
        console.dir(removeClicked);
    }
});

patch(Payment.prototype, {
    get_short_name(name) {
        return name ? name.substring(0, 5) : '';
    }
});