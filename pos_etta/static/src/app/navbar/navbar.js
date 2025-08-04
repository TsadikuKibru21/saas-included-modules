/** @odoo-module */
/* global Sha1 */

import { NumberPopup } from "@point_of_sale/app/utils/input_popups/number_popup";
import { Navbar } from "@point_of_sale/app/navbar/navbar";
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { FiscalReadingPopup } from "./FiscalReadingPopup/FiscalReadingPopup";
import { InfoPopup } from "./InfoPopup/InfoPopup"
import { EJReadingPopup } from "./EJReadingPopup/EJReadingPopup";
import { SelectionPopup } from "@point_of_sale/app/utils/input_popups/selection_popup";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { useService } from "@web/core/utils/hooks";

patch(Navbar.prototype, {
    setup() {
        super.setup(...arguments);
        this.pos = usePos();
        this.orm = useService("orm");
        this.popup = useService("popup");
    },
    get isRefund() {
        return this.pos.is_refund_order();
    },
    isPosRefundMode() {
        return this.pos.is_refund_order();
    },
    async showInfoPopup() {
        await this.popup.add(InfoPopup, {
            title: _t("Info"),
            body: _t("Info"),
        });
    },
    get isAdvancedUserAccess() {
        return this.pos.get_cashier().role === 'manager';
    },
    async togglePosMode() {
        if (this.pos.is_refund_order()) {
            this.pos.set_is_refund_order(false);
        }
        else {
            //Show PinCodePopup Dialog and confirm
            let selectedApprover = await this.selectApproverCashier();
            if (selectedApprover) {
                this.pos.set_is_refund_order(true);
            }
        }
    },
    async onFiscalReadingClick() {
        await this.popup.add(FiscalReadingPopup, {
            title: _t("Fiscal Reading"),
            body: _t("Fiscal Reading"),
        });
    },
    async onEJReadClick() {
        await this.popup.add(EJReadingPopup, {
            title: _t("EJ Reading"),
            body: _t("EJ Read"),
        });
    },
    onSyncFPClicked() {
        console.log("onFeatchClicked clicked");
        this.pos.syncPosOrderWithFP();
    },
    async onLowStockClick() {
        var self = this;
        let low_stock = self.pos.config.low_stock
        await this.orm.call(
            "product.product",
            "get_low_stock_products",
            [0, low_stock],
        ).then(function (data) {
            self.pos.low_stock_products = [];
            for (var k = 0; k < data.length; k++) {
                let product = self.pos.db.get_product_by_id(data[k]);
                if (product) {
                    self.pos.low_stock_products.push(product);
                }
            }
            self.pos.showTempScreen('LowStockProducts');
        }
        );
    },
    async onGPRSUploadClicked() {
        await this.pos.doAuthFirst('gprs_upload_access_level', 'gprs_upload_pin_lock_enabled', 'gprs_upload', async () => {
            if (window.Android != undefined) {
                if (window.Android.isAndroidPOS()) {
                    window.Android.triggerGprsUpload();
                }
                else {
                    this.env.services.notification.add("Invalid device", {
                        type: 'danger',
                        sticky: false,
                        timeout: 10000,
                    });
                }
            }
            else {
                this.env.services.notification.add("Invalid device", {
                    type: 'danger',
                    sticky: false,
                    timeout: 10000,
                });
            }
        });
    },
    async onPrintAllPlusClick() {
        await this.pos.doAuthFirst('all_plu_access_level', 'all_plu_pin_lock_enabled', 'all_plu', async () => {
            var check = await this.pos.correctTimeConfig();
            if (!await this.pos.correctTimeConfig()) {
                return;
            }

            let productDetails = [];
            for (let product of Object.values(this.pos.db.product_by_id)) {
                productDetails.push({
                    'pluCode': !product.default_code ? "N/A" : product.default_code,
                    'productName': product.display_name,
                    'taxRate': product.taxes_id === undefined ? 0 : product.taxes_id.length > 0 ? this.pos.taxes_by_id[product.taxes_id[0]].amount : 0,
                    'unitPrice': product.lst_price
                });
            }
            let jsonProductDetails = JSON.stringify(productDetails);

            if (window.Android != undefined) {
                if (window.Android.isAndroidPOS()) {
                    var result = window.Android.printAllPOSPlus(jsonProductDetails);
                    console.log("printAllPOSPlus => " + jsonProductDetails);

                    this.pos.makeLogEntry("Print ALL POS PLU's Requested => " + jsonProductDetails);

                    var responseObject = JSON.parse(result);
                    if (responseObject.success) {
                        this.env.services.notification.add("Printing All PLUs Successfull", {
                            type: 'info',
                            sticky: false,
                            timeout: 10000,
                        });

                        this.pos.makeLogEntry("Printing All PLUs Successfull");
                    }
                    else {
                        this.env.services.notification.add("ERROR : " + responseObject.message, {
                            type: 'danger',
                            sticky: false,
                            timeout: 10000,
                        });
                        this.pos.makeLogEntry("All PLUs Printing Failed");
                    }
                }
            } else {
                this.env.services.notification.add("Invalid device", {
                    type: 'danger',
                    sticky: false,
                    timeout: 10000,
                });
            }
            return jsonProductDetails;
        });
    },
    async onCloseSessionClick() {
        const info = await this.pos.getClosePosInfo();
        this.popup.add(ClosePosPopup, { ...info, keepBehind: true });
    },
    async onPrintAllTaxRates() {
        await this.pos.doAuthFirst('all_tax_access_level', 'all_tax_pin_lock_enabled', 'all_tax', async () => {
            var check = await this.pos.correctTimeConfig();
            if (!await this.pos.correctTimeConfig()) {
                return;
            }

            let taxesList = [];
            for (let tax of Object.values(this.pos.taxes)) {
                if (tax.type_tax_use === 'sale') {
                    let taxInfo = {
                        'name': tax.name,
                        'amount': tax.amount,
                    };
                    taxesList.push(taxInfo);
                }
            }

            let jsonTaxes = JSON.stringify(taxesList);
            if (window.Android != undefined) {
                if (window.Android.isAndroidPOS()) {
                    var log_data;
                    var result = window.Android.printPOSTaxRates(jsonTaxes);

                    log_data = "Printing all Tax Rates Request to onPrintAllTaxRates"
                    this.pos.makeLogEntry("Printing all Tax Rates Requested => " + jsonTaxes);

                    var responseObject = JSON.parse(result);
                    if (responseObject.success) {
                        this.env.services.notification.add("Printing all Tax Rates Successfull", {
                            type: 'info',
                            sticky: false,
                            timeout: 10000,
                        });

                        this.pos.makeLogEntry("Printing all Tax Rates Successfull");
                    }
                    else {
                        this.env.services.notification.add("All Tax Rates Printing Failed", {
                            type: 'danger',
                            sticky: false,
                            timeout: 10000,
                        });

                        this.pos.makeLogEntry("Printing all Tax Rates Failed");
                    }

                }
            }

            return jsonTaxes;
        });
    },
    async onZReportClick() {
        this.pos.printZReport();
    },
    async onXReportClick() {
        this.pos.printXReport();
    },
    async checkPin(employee) {
        const { confirmed, payload: inputPin } = await this.popup.add(NumberPopup, {
            isPassword: true,
            title: _t("Password?"),
        });

        if (!confirmed) {
            return false;
        }

        if (employee.pin !== Sha1.hash(inputPin)) {
            await this.popup.add(ErrorPopup, {
                title: _t("Incorrect Password"),
                body: _t("Please try again."),
            });
            return false;
        }
        return true;
    },
    async selectApproverCashier() {
        if (this.pos.config.module_pos_hr) {
            const employeesList = this.pos.employees
                .filter((employee) => employee.role === 'manager')
                .map((employee) => {
                    return {
                        id: employee.id,
                        item: employee,
                        label: employee.name,
                        isSelected: false,
                    };
                });
            if (!employeesList.length) {
                this.env.services.notification.add("Not Configured for Refund Mode", {
                    type: 'info',
                    sticky: false,
                    timeout: 10000,
                });
                return undefined;
            }
            const { confirmed, payload: employee } = await this.popup.add(SelectionPopup, {
                title: _t("Select Refund Approver"),
                list: employeesList,
            });

            if (!confirmed || !employee || (employee.pin && !(await this.checkPin(employee)))) {
                return false;
            }

            return true;
        }
        else {
            this.env.services.notification.add("Not Configured for Refund Mode", {
                type: 'info',
                sticky: false,
                timeout: 10000,
            });
        }
    }
});

