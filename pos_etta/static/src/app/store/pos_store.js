/** @odoo-module */
import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/store/pos_store";
import { LocalDisplay } from "@point_of_sale/app/customer_display/customer_display_service";
import { NumberPopup } from "@point_of_sale/app/utils/input_popups/number_popup";
import { _t } from "@web/core/l10n/translation";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { serializeDateTime } from "@web/core/l10n/dates";

patch(PosStore.prototype, {
    async setup() {
        this.is_refund = false;
        await super.setup(...arguments);
    },
    is_refund_order() {
        return this.is_refund;
    },
    set_is_refund_order(value) {
        this.is_refund = value;
    },
    getFormattedDate() {
        // Get today's date
        var today = new Date();

        // Get day, month, and year components
        var day = today.getDate();
        var month = today.getMonth() + 1; // Month is zero-based, so add 1
        var year = today.getFullYear();

        // Pad day and month with leading zeros if needed
        if (day < 10) {
            day = '0' + day;
        }
        if (month < 10) {
            month = '0' + month;
        }

        // Format the date as dd/mm/yyyy
        var formattedDate = day + '/' + month + '/' + year;

        return formattedDate;
    },
    async checkPin(pin_type) {
        var pinText = "Enter PIN";
        switch (pin_type) {
            case 'z_report':
                pinText = "Enter Z Report PIN";
                break;
            case 'x_report':
                pinText = "Enter X Report PIN";
                break;
            case 'ej_read':
                pinText = "Enter EJ Read PIN";
                break;
            case 'ej_copy':
                pinText = "Enter EJ Copy PIN";
                break;
            case 'fiscal_read':
                pinText = "Enter Fiscal Reading PIN";
                break;
            case 'all_plu':
                pinText = "Enter All PLU PIN";
                break;
            case 'all_tax':
                pinText = "Enter All Tax PIN";
                break;
            case 'sync_fp':
                pinText = "Enter Sync FP PIN";
                break;
            case 'gprs_upload':
                pinText = "Enter GPRS Upload PIN";
                break;
            case 'price_change':
                pinText = "Enter Price Change PIN";
                break;
            case 'quantity_change_and_remove':
                pinText = "Enter Qunatity Change or Remove Orderline PIN";
                break;
            case 'remove_orderline':
                pinText = "Enter Remove Orderline PIN";
                break;
            case 'payment':
                pinText = "Enter Payment Access PIN";
                break;
            default:
                pinText = "Enter PIN";
                break;
        }
        const { confirmed, payload: inputPin } = await this.popup.add(NumberPopup, {
            isPassword: true,
            title: _t(pinText),
        });

        if (!confirmed) {
            return false;
        }

        var correctPin = false;

        switch (pin_type) {
            case 'z_report':
                correctPin = this.config.z_report_pin_code === inputPin;
                break;
            case 'x_report':
                correctPin = this.config.x_report_pin_code === inputPin;
                break;
            case 'ej_read':
                correctPin = this.config.ej_read_pin_code === inputPin;
                break;
            case 'ej_copy':
                correctPin = this.config.ej_copy_pin_code === inputPin;
                break;
            case 'fiscal_read':
                correctPin = this.config.fr_pin_code === inputPin;
                break;
            case 'all_plu':
                correctPin = this.config.all_plu_pin_code === inputPin;
                break;
            case 'all_tax':
                correctPin = this.config.all_tax_pin_code === inputPin;
                break;
            case 'close_session':
                correctPin = this.config.close_session_pin_code === inputPin;
                break;
            case 'sync_fp':
                correctPin = this.config.sync_fp_pin_code === inputPin;
                break;
            case 'gprs_upload':
                correctPin = this.config.gprs_upload_pin_code === inputPin;
                break;
            case 'price_change':
                correctPin = this.config.price_change_pin_code === inputPin;
                break;
            case 'quantity_change_and_remove':
                correctPin = this.config.allow_quantity_change_and_remove_orderline_pin_code === inputPin;
                break;
            case 'remove_orderline':
                correctPin = this.config.allow_remove_orderline_pin_code === inputPin;
                break;
            case 'payment':
                correctPin = this.config.payment_pin_code === inputPin;
                break;
            default:
                correctPin = false;
                break;
        }

        if (!correctPin) {
            await this.popup.add(ErrorPopup, {
                title: _t("Incorrect Password"),
                body: _t("Please try again."),
            });
            return false;
        }

        return true;
    },
    hasAccess(access_level) {
        if (access_level === 'both') {
            return true;
        } else if (access_level === 'basic') {
            return this.get_cashier().role !== 'manager';
        } else if (access_level === 'advanced') {
            return this.get_cashier().role === 'manager';
        }
        return false;
    },
    async doAuthFirst(config_access_level, config_pin_lock_enabled, pin_type, callback) {
        if (this.hasAccess(this.config[config_access_level])) {
            if (this.config[config_pin_lock_enabled]) {
                const pinVerified = await this.checkPin(pin_type);
                if (pinVerified) {
                    callback();
                }
            } else {
                callback();
            }
        }
    },
    async doAuthFirstWithReturn(config_access_level, config_pin_lock_enabled, pin_type, callback) {
        if (this.hasAccess(this.config[config_access_level])) {
            if (this.config[config_pin_lock_enabled]) {
                const pinVerified = await this.checkPin(pin_type);
                if (pinVerified) {
                    callback(true);  // Authentication succeeded
                } else {
                    callback(false); // Authentication failed
                }
            } else {
                callback(true);  // No pin lock required, authentication succeeded
            }
        } else {
            callback(false); // Access denied
        }
    },
    async printZReport() {
        this.doAuthFirst('z_report_access_level', 'z_report_pin_lock_enabled', 'z_report', () => {
            // Your logic for Print Z-Report
            if (!this.correctTimeConfig()) {
                this.env.services.notification.add("Time mismatch between server and fiscal printer", {
                    type: 'danger',
                    sticky: false,
                    timeout: 10000,
                });
                return;
            }
            if (window.Android != undefined) {
                if (window.Android.isAndroidPOS()) {
                    var result = window.Android.printZReport();

                    this.makeLogEntry("Z Report Printed Request");

                    var responseObject = JSON.parse(result);

                    if (responseObject.success) {

                        this.env.services.notification.add("Z Report Printed", {
                            type: 'info',
                            sticky: false,
                            timeout: 10000,
                        });

                        this.makeLogEntry("Z Report Printed");

                        this.uploadTodayEj();
                    }
                    else {

                        this.env.services.notification.add(responseObject.message, {
                            type: 'danger',
                            sticky: false,
                            timeout: 10000,
                        });

                        this.makeLogEntry("Z Report Printing Failed");
                    }

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
    },
    async printZReportWithoutAuth() {
        if (!this.correctTimeConfig()) {
            this.env.services.notification.add("Time mismatch between server and fiscal printer", {
                type: 'danger',
                sticky: false,
                timeout: 10000,
            });
            return;
        }
        if (window.Android != undefined) {
            if (window.Android.isAndroidPOS()) {
                var result = window.Android.printZReport();

                this.makeLogEntry("Z Report Printed Request");

                var responseObject = JSON.parse(result);

                if (responseObject.success) {

                    this.env.services.notification.add("Z Report Printed", {
                        type: 'info',
                        sticky: false,
                        timeout: 10000,
                    });

                    this.makeLogEntry("Z Report Printed");

                    this.uploadTodayEj();
                }
                else {

                    this.env.services.notification.add(responseObject.message, {
                        type: 'danger',
                        sticky: false,
                        timeout: 10000,
                    });

                    this.makeLogEntry("Z Report Printing Failed");
                }

            }
        }
        else {
            this.env.services.notification.add("Invalid Device", {
                type: 'danger',
                sticky: false,
                timeout: 10000,
            });
        }
    },
    async printXReport() {
        this.doAuthFirst('x_report_access_level', 'x_report_pin_lock_enabled', 'x_report', () => {
            if (!this.correctTimeConfig()) {
                return;
            }
            if (window.Android != undefined) {
                if (window.Android.isAndroidPOS()) {
                    var log_data;
                    var result = window.Android.printXReport();

                    this.makeLogEntry("X Report Printing Request");

                    var responseObject = JSON.parse(result);

                    if (responseObject.success) {
                        this.env.services.notification.add("X Report Printed", {
                            type: 'info',
                            sticky: false,
                            timeout: 10000,
                        });

                        this.makeLogEntry("X Report Printed");
                    }
                    else {
                        this.env.services.notification.add("X Report Printing Failed", {
                            type: 'danger',
                            sticky: false,
                            timeout: 10000,
                        });
                        this.makeLogEntry("X Report Printing Failed");
                    }
                }
            }
        });
    },
    async correctTimeConfig() {
        const serverTime = await this.getServerTime();

        // If there was a network error, serverTime would be true, and we skip comparison
        if (serverTime === true) {
            // console.log("Network error encountered, skipping time comparison.");
            return true;
        }

        const serverDate = new Date(serverTime);
        const deviceDate = new Date();
        const timeDiff = Math.abs(serverDate - deviceDate);
        const timeDiffInMinutes = timeDiff / 60000;

        // console.log("Time Difference (minutes):", timeDiffInMinutes);

        // Define your acceptable threshold in minutes (e.g., 5 minutes)
        const thresholdMinutes = 5;

        // Check if the time difference is within the acceptable range
        if (timeDiffInMinutes > thresholdMinutes) {
            // // console.warn("Significant time difference detected.");

            this.env.services.notification.add("TIME MISMATCH \n Server : " + serverDate + "\n Device : " + deviceDate + " Diff : " + timeDiffInMinutes, {
                type: 'danger',
                sticky: true
            });

            return false;
        } else {
            // // console.log("Time difference is within acceptable range.");
            return true;
        }
    },
    async syncPosOrderWithFP() {
        // console.dir("luxon date");
        // console.dir(luxon.DateTime.now());
        this.doAuthFirst('sync_fp_pin_access_level', 'sync_fp_pin_lock_enabled', 'sync_fp', async () => {
            // Display syncing notification
            this.env.services.notification.add('Syncing POS Orders Started...', {
                type: 'info',
                sticky: false,
                timeout: 10000,
            });

            let result, resObj, serial, fiscalInfo, tinNo, mrc;

            try {
                result = await window.Android.getMachineData();
                resObj = JSON.parse(result);
                serial = resObj["serialNo"];
                fiscalInfo = resObj["fiscalInfo"];
                tinNo = fiscalInfo.split(",")[0];
                mrc = fiscalInfo.split(",")[1];
            } catch (error) {
                console.error("Failed to get machine data or parse the response.", error);
                this.env.services.notification.add("Error: Failed to get machine data.", {
                    type: 'danger',
                    sticky: false,
                    timeout: 10000,
                });

                return;
            }

            if (!mrc) {
                console.error("Invalid MRC value:", mrc);
                this.env.services.notification.add("Error: Invalid MRC value.", {
                    type: 'danger',
                    sticky: false,
                    timeout: 10000,
                });

                return;
            }

            let fsNoRef, rfNoRef;
            try {
                fsNoRef = await this.orm.call("pos.order", "get_orders_without_fs_no", [mrc]);
                rfNoRef = await this.orm.call("pos.order", "get_orders_without_rf_no", [mrc]);
            } catch (error) {
                this.env.services.notification.add("Error: Failed to retrieve orders from Odoo.", {
                    type: 'danger',
                    sticky: false,
                    timeout: 10000,
                });
                console.error("Failed to retrieve orders from Odoo.", error);

                return;
            }

            if (fsNoRef.length == 0 && rfNoRef.length == 0) {
                this.env.services.notification.add("Already Synced", {
                    type: 'info',
                    sticky: false,
                    timeout: 10000,
                });

                return;
            }

            let successfullySyncedFs = [];
            let successfullySyncedRf = [];

            if (window.Android != undefined) {
                if (window.Android.isAndroidPOS()) {
                    if (fsNoRef.length > 0) {
                        var fsNoRes = await window.Android.getSalesEJCopyDataByRef(JSON.stringify(fsNoRef));
                        var responseFsNos = JSON.parse(fsNoRes);

                        // Process successful responses
                        for (let i = 0; i < responseFsNos.length; i++) {
                            const fsNoData = responseFsNos[i];
                            const dateParts = fsNoData.date.split('/');
                            const day = dateParts[0];
                            const month = dateParts[1];
                            const year = dateParts[2];
                            const time = fsNoData.time;

                            const dateTimeString = `${year}-${month}-${day} ${time}:00`;
                            const dateTime = new Date(dateTimeString);
                            dateTime.setHours(dateTime.getHours() + 3);

                            const datetimeString = serializeDateTime(luxon.DateTime.fromFormat(fsNoData.date + " " + fsNoData.time, 'dd/MM/yyyy HH:mm', { zone: 'Africa/Addis_Ababa' }));
                            const globalServiceCharge = fsNoData.globalServiceCharge;
                            const globalDiscount = fsNoData.globalDiscount;

                            const posReference = fsNoData.refNo; // Assuming refNo is the pos_reference value
                            const posOrderIds = await this.orm.search('pos.order', [['pos_reference', '=', posReference]]);

                            if (posOrderIds.length > 0) {
                                const paddedFsNo = fsNoData.fsNo.toString().padStart(8, '0');
                                await this.orm.write('pos.order', posOrderIds, {
                                    fs_no: paddedFsNo,
                                    ej_checksum: fsNoData.checksum,
                                    fiscal_mrc: fsNoData.fiscal_mrc,
                                    date_order: datetimeString,
                                    is_refund: false
                                });

                                // Update order lines if globalServiceCharge or globalDiscount are greater than 0
                                // if (globalServiceCharge > 0 || globalDiscount > 0) {
                                //     const posOrderLineIds = await this.orm.search('pos.order.line', [['order_id', 'in', posOrderIds]]);
                                //     for (const lineId of posOrderLineIds) {
                                //         await this.orm.write('pos.order.line', [lineId], {
                                //             service_charge: globalServiceCharge > 0 ? globalServiceCharge : 0,
                                //             discount: globalDiscount > 0 ? globalDiscount : 0
                                //         });
                                //     }
                                // }

                                console.log(`Updated pos.order record with pos_reference ${posReference} successfully.`);
                            } else {
                                console.log(`No pos.order record found with pos_reference ${posReference}.`);
                            }
                            successfullySyncedFs.push({ posReference, fiscal_mrc: fsNoData.fiscal_mrc });
                        }

                        // Process missing entries
                        const responseFsNosRefs = responseFsNos.map(data => data.refNo);
                        const missingFsRefs = fsNoRef.filter(ref => !responseFsNosRefs.includes(ref));

                        for (let i = 0; i < missingFsRefs.length; i++) {
                            successfullySyncedFs.push({ posReference: missingFsRefs[i], fiscal_mrc: mrc });  // Use mrc or a specific placeholder
                        }
                    }

                    if (rfNoRef.length > 0) {
                        var rfNoRes = await window.Android.getRefundsEJCopyDataByRef(JSON.stringify(rfNoRef));
                        var responseRfNos = JSON.parse(rfNoRes);

                        // Process successful responses
                        for (let i = 0; i < responseRfNos.length; i++) {
                            const rfNoData = responseRfNos[i];
                            const dateParts = rfNoData.date.split('/');
                            const day = dateParts[0];
                            const month = dateParts[1];
                            const year = dateParts[2];
                            const time = rfNoData.time;
                            const dateTimeString = `${year}-${month}-${day} ${time}:00`;
                            const dateTime = new Date(dateTimeString);

                            const datetimeString = serializeDateTime(luxon.DateTime.fromFormat(rfNoData.date + " " + rfNoData.time, 'dd/MM/yyyy HH:mm', { zone: 'Africa/Addis_Ababa' }));

                            const globalServiceCharge = rfNoData.globalServiceCharge;
                            const globalDiscount = rfNoData.globalDiscount;

                            const posReference = rfNoData.refNo;
                            const posOrderIds = await this.orm.search('pos.order', [['pos_reference', '=', posReference]]);

                            if (posOrderIds.length > 0) {
                                const paddedRfNo = rfNoData.rfNo.toString().padStart(8, '0');
                                await this.orm.write('pos.order', posOrderIds, {
                                    rf_no: paddedRfNo,
                                    ej_checksum: rfNoData.checksum,
                                    fiscal_mrc: rfNoData.fiscal_mrc,
                                    date_order: datetimeString,
                                    is_refund: true
                                });

                                // if (globalServiceCharge > 0 || globalDiscount > 0) {
                                //     const posOrderLineIds = await this.orm.search('pos.order.line', [['order_id', 'in', posOrderIds]]);
                                //     for (const lineId of posOrderLineIds) {
                                //         await this.orm.write('pos.order.line', [lineId], {
                                //             service_charge: globalServiceCharge > 0 ? globalServiceCharge : 0,
                                //             discount: globalDiscount > 0 ? globalDiscount : 0
                                //         });
                                //     }
                                // }

                                console.log(`Updated pos.order record with pos_reference ${posReference} successfully.`);
                            } else {
                                console.log(`No pos.order record found with pos_reference ${posReference}.`);
                            }
                            successfullySyncedRf.push({ posReference, fiscal_mrc: rfNoData.fiscal_mrc });
                        }

                        // Process missing entries
                        const responseRfNosRefs = responseRfNos.map(data => data.refNo);
                        const missingRfRefs = rfNoRef.filter(ref => !responseRfNosRefs.includes(ref));

                        for (let i = 0; i < missingRfRefs.length; i++) {
                            successfullySyncedRf.push({ posReference: missingRfRefs[i], fiscal_mrc: mrc });  // Use mrc or a specific placeholder
                        }
                    }

                    // Update synced_mrc after all updates are done
                    for (let i = 0; i < successfullySyncedFs.length; i++) {
                        const { posReference, fiscal_mrc } = successfullySyncedFs[i];
                        if (fiscal_mrc) {  // Ensure fiscal_mrc is not null
                            await this.orm.call('pos.order', 'add_to_synced_mrc', [posReference, fiscal_mrc]);
                        }
                    }

                    for (let i = 0; i < successfullySyncedRf.length; i++) {
                        const { posReference, fiscal_mrc } = successfullySyncedRf[i];
                        if (fiscal_mrc) {  // Ensure fiscal_mrc is not null
                            await this.orm.call('pos.order', 'add_to_synced_mrc', [posReference, fiscal_mrc]);
                        }
                    }

                    this.env.services.notification.add('Sync completed successfully.', {
                        type: 'success',
                        sticky: false,
                        timeout: 10000
                    });

                } else {
                    this.env.services.notification.add("Invalid Device", {
                        type: 'danger',
                        sticky: false,
                        timeout: 10000,
                    });
                    window.history.back();
                }
            } else {
                this.env.services.notification.add("Invalid Device", {
                    type: 'danger',
                    sticky: false,
                    timeout: 10000,
                });
                window.history.back();
            }
        });
    },
    async getServerTime() {
        try {
            const response = await this.orm.call("pos.session", "get_server_time", []);
            console.log(response);
            return response;
        } catch (error) {
            console.error("Failed to get server time:", error);
            return true;
        }
        return true;
    },
    uploadTodayEj() {
        if (window.Android != undefined) {
            if (window.Android.isAndroidPOS()) {
                var fromDate = this.getFormattedDate();
                var toDate = this.getFormattedDate();
                var formatedData = {
                    from_date: fromDate,
                    to_date: toDate
                }
                this.makeLogEntry("EJ Upload Request Data -> " + JSON.stringify(formatedData));
                window.Android.uploadEJ(JSON.stringify(formatedData));
            }
        }
    },
    makeLogEntry(message) {
        var data = {
            "log_data": message,
            "action_type": 'create',
            "model_name": "POS Log"
        }

        fetch('/pos/logger', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        }).then(response => {
            if (!response.ok) {

            }
            return response.json();
        }).then(data => {
            // Handle successful response data
        }).catch(error => {
            // Handle errors
        });
    },
    async _processData(loadedData) {
        await super._processData(...arguments);
        this.void_reasons = loadedData["void.reason"];
        this.taxes = loadedData["account.tax"];
        this.custom_stock_locations = loadedData['stock.location'] || [];

        // if (window.Android != undefined) {
        //     if (window.Android.isAndroidPOS()) {
        //         var result = await window.Android.getMachineData();
        //         var resObj = JSON.parse(result);

        //         var serial = resObj["serialNo"];
        //         var fiscalInfo = resObj["fiscalInfo"];
        //         var tinNo = fiscalInfo.split(",")[0];
        //         var mrc = fiscalInfo.split(",")[1];

        //         if (this.config.serial_number !== serial || this.config.fiscal_mrc !== mrc) {
        //             alert("Error: Invalid POS - Device Configuration");
        //             window.history.back();
        //             return;
        //         }
        //     }
        //     else {
        //         alert("Error: Invalid Device");
        //         window.history.back();
        //         return;
        //     }
        // } else {
        //     alert("Error: Invalid Device");
        //     window.history.back();
        //     return;
        // }
    },
    async addProductToCurrentOrder(product, options = {}) {
        let self = this;
        let pos_config = self.config;
        let allow_order = pos_config.pos_allow_order;
        let deny_order = pos_config.pos_deny_order || 0;
        let call_super = true;

        if (pos_config.pos_display_stock && product.type == 'product') {
            if (allow_order == false) {
                if (pos_config.pos_stock_type == 'onhand') {
                    if (product.bi_on_hand <= 0) {
                        call_super = false;
                        self.popup.add(ErrorPopup, {
                            title: _t('Deny Order'),
                            body: _t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                        });
                    }
                }
                if (pos_config.pos_stock_type == 'available') {
                    if (product.bi_available <= 0) {
                        call_super = false;
                        self.popup.add(ErrorPopup, {
                            title: _t('Deny Order'),
                            body: _t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                        });
                    }
                }
            } else {
                if (pos_config.pos_stock_type == 'onhand') {
                    if (product.bi_on_hand <= deny_order) {
                        call_super = false;
                        self.popup.add(ErrorPopup, {
                            title: _t('Deny Order'),
                            body: _t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                        });
                    }
                }
                if (pos_config.pos_stock_type == 'available') {
                    if (product.bi_available <= deny_order) {
                        call_super = false;
                        self.popup.add(ErrorPopup, {
                            title: _t('Deny Order'),
                            body: _t("Deny Order" + "(" + product.display_name + ")" + " is Out of Stock."),
                        });
                    }
                }
            }
        }
        if (call_super) {
            super.addProductToCurrentOrder(product, options = {});
        }
    },
    _loadProductProduct(products) {
        var processProducts = [];
        if (this.config.pos_module_pos_service_charge) {
            processProducts = products
                .filter(product => product.taxes_id.length == 1 || product.taxes_id.length == 0)
                .map(product => {
                    var taxes_ids = product.taxes_id;
                    var new_tax_id = this.config.global_service_charge[0];
                    if (!taxes_ids.includes(new_tax_id)) {
                        taxes_ids.unshift(new_tax_id);
                    }

                    product.taxes_id = taxes_ids;

                    return product;
                });
        }
        else {
            processProducts = products
                .filter(product => product.taxes_id.length == 1 || product.taxes_id.length == 0)
                .map(product => {
                    if (product.service_charge) {
                        var taxes_ids = product.taxes_id;
                        var new_tax_id = product.service_charge[0];
                        if (!taxes_ids.includes(new_tax_id)) {
                            taxes_ids.unshift(new_tax_id);
                        }

                        product.taxes_id = taxes_ids;
                    }

                    return product;
                });
        }
        super._loadProductProduct(processProducts);
    },
    async customerDisplayHTML(closeUI = false) {
        // Call the original customerDisplayHTML method (super call)
        const htmlContent = await super.customerDisplayHTML(closeUI);

        // Send the HTML to the Android customer display via the JavaScript interface
        if (window.Android != undefined) {
            if (window.Android.isAndroidPOS()) {
                await window.Android.loadCustomerDisplay(htmlContent, this.base_url);
            }
        }
    
        // Return the HTML content (if needed)
        return htmlContent;
    }
});

patch(LocalDisplay.prototype, {
    async connect() {
        if (this.popupWindow && !this.popupWindow.closed) {
            return;
        }

        // Because there is no way to know if the popup is already opened, PopupWindowLastStatus
        // localStorage boolean is used to know if the popup was opened.
        // This allows to get the already opened popup, and prevents to open the customer display
        // automatically by default (most web browsers forbid to open popup windows without an user
        // interaction, like a button click).
        // window.open will get the already opened popup or otherwise open one
        this.popupWindow = window.open("", "Customer Display", "height=720,width=1600");
        if (this.popupWindow && !this.popupWindow.closed) {
            this.popupWindow.document.body.style.padding = "0";
            this.popupWindow.document.body.style.background = "black"; // or any background of your choice
            this.popupWindow.document.body.style.margin = "0"; // remove margin if any
        
            // Optional: Remove any other unwanted styles
            this.popupWindow.document.body.style.boxShadow = "none";
            
            this.setPopupWindowLastStatus(true);
            this.popupWindow.addEventListener("beforeunload", () => {
                this.setPopupWindowLastStatus(false);
            });
            this.update({ refreshResources: true });
        } else {
            this.setPopupWindowLastStatus(false);
        }
    },
    async update({ refreshResources = false, closeUI = false } = {}) {
        if (!this.popupWindow || this.popupWindow.closed) {
            if (this.isPopupWindowLastStatusOpen()) {
                this.connect();
            }
            return;
        }
        // TODO: this could probably be improved by loading owl in the popup window,
        // making it render the customer display, and simply sending messages to
        // update the state, instead of sending HTML which causes jankiness with
        // animations.
        const { body: displayBody, head: displayHead } = this.popupWindow.document;
        const container = document.createElement("div");
        container.innerHTML = await this.pos.customerDisplayHTML(closeUI);
    
        if (!container.innerHTML || container.innerHTML === "undefined") {
            displayBody.textContent = "";
            return;
        }
    
        if (displayHead.innerHTML.trim().length === 0 || refreshResources) {
            displayHead.textContent = "";
            displayHead.appendChild(container.querySelector(".resources"));
            // The scripts must be evaluated because adding an element containing
            // a script block doesn't make it evaluated.
            const scriptElement = container.querySelector("script#old_browser_fix_auto_scroll");
            if (scriptElement) {
                this.popupWindow.eval(scriptElement.innerHTML);
            }
        }
    
        displayBody.textContent = "";
        displayBody.appendChild(container.querySelector(".pos-customer_facing_display"));
    
        // Safely call fixScrollingIfNecessary if it exists and is a function
        setTimeout(() => {
            if (typeof this.popupWindow.fixScrollingIfNecessary === "function") {
                this.popupWindow.fixScrollingIfNecessary();
            } else {
                console.warn("fixScrollingIfNecessary is not a function on popupWindow.");
            }
        }, 0);
    }    
});