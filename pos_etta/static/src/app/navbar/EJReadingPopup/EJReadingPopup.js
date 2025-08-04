/** @odoo-module */

import { useService } from "@web/core/utils/hooks";
import { useState } from "@odoo/owl";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { AbstractAwaitablePopup } from "@point_of_sale/app/popup/abstract_awaitable_popup";
import { _t } from "@web/core/l10n/translation";

export class EJReadingPopup extends AbstractAwaitablePopup {
    static template = "pos_etta.EJReadingPopup";

    setup() {
        this.env.services.notification = useService('notification');
        this.popup = useService("popup");
        this.pos = usePos();
        this.state = useState({
            byDateRange: true,
            showNumberFields: false,
            showDateFields: true, // Show date fields by default
            fromDate: this.formatDate(new Date()), // Assuming formatDate is a method you've defined
            toDate: this.formatDate(new Date()),
            fromNo: 0,
            toNo: 0,
            payment_summary: false,
            sales: false,
            refund: false,
        });
    }

    formatDate(date) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
        const year = date.getFullYear();
        return `${day}/${month}/${year}`; // Format as YYYY-MM-DD for input[type="date"]
    }

    // Method to handle changes in the "By Date Range" checkbox
    onDateRangeChange() {
        this.state.byDateRange = !this.state.byDateRange;
        this.toggleFieldVisibility();
    }

    // Method to toggle the visibility of the date and number fields
    toggleFieldVisibility() {
        if (this.state.byDateRange) {
            this.state.showDateFields = true;
            this.state.showNumberFields = false;
        } else {
            this.state.showDateFields = false;
            this.state.showNumberFields = true;
        }
    }

    // Method to validate the input before printing
    validateInputBeforePrint() {
        if (!this.state.byDateRange && (this.state.fromNo > this.state.toNo)) {
            this.state.errorMessage = "Invalid Input \"From No\" cannot be greater than \"To No\"";
            return false;
        } else if (this.state.byDateRange && (new Date(this.state.fromDate) > new Date(this.state.toDate))) {
            this.state.errorMessage = "Invalid Input \"From Date\" cannot be greater than \"To Date\"";
            return false;
        }

        if (!this.state.sales && !this.state.refund && !this.state.payment_summary) {
            this.state.errorMessage = "Please select atleast one type of report";
            return false;
        }

        this.state.errorMessage = null;
        return true;
    }

    // Method to display the error message
    showErrorMessage() {
        if (this.state.errorMessage) {
            // Replace `notification` with the actual name of the notification service in your Odoo environment
            this.env.services.notification.add(this.state.errorMessage, {
                type: 'danger', // Error notification
                sticky: false, // The notification will disappear after the timeout
                timeout: 10000,
            });
        }
    }

    async onPrintButtonClick() {
        await this.pos.doAuthFirst('ej_read_access_level', 'ej_read_pin_lock_enabled', 'ej_read', async () => {
            if (this.validateInputBeforePrint()) {
                // If there's no validation error, create a JSON object
                const output = {
                    by_date_range: this.state.byDateRange,
                    from_date: this.state.fromDate,
                    to_date: this.state.toDate,
                    from_no: this.state.fromNo,
                    to_no: this.state.toNo,
                    sales: this.state.sales,
                    refund: this.state.refund,
                    payment: this.state.payment_summary,
                };
    
                try {
                    await this.printElectronicJournalReports(output);
                    super.cancel();
                } catch (error) {
                    // console.error("Error during printing:", error);
                }
    
            } else {
                this.showErrorMessage();
            }
        });
    }

    async printElectronicJournalReports(result) {
        var check = await this.pos.correctTimeConfig();
        if (!await this.pos.correctTimeConfig()) {
            return;
        }
        
        const _t = this.env && this.env._t ? this.env._t : (key) => key;

        if (window.Android !== undefined && window.Android.isAndroidPOS()) {
            try {
                const posResult = await window.Android.printEJReport(JSON.stringify(result));
                console.log("posResult => ");
                console.log(posResult);

                this.pos.makeLogEntry("EJ Report Printing Request => " + JSON.stringify(result));

                const responseObject = JSON.parse(posResult);
                responseObject.forEach(element => {
                    if (element.success) {
                        this.env.services.notification.add(element.message, {
                            type: 'info',
                            sticky: false,
                            timeout: 10000,
                        });

                        this.pos.makeLogEntry(element.message);

                    } else {
                        this.env.services.notification.add("ERROR : " + element.message, {
                            type: 'danger',
                            sticky: false,
                            timeout: 10000,
                        });

                        this.pos.makeLogEntry("EJ Report Printing Failed");
                    }
                });

                // return responseObject;
            } catch (error) {
                this.pos.makeLogEntry("EJ Report Printing Failed");
                // console.error('EJ Report Error : An error occurred while printing fiscal reports:', error);
                this.env.services.notification.add("Error occured during fiscal report printing", {
                    type: 'danger',
                    sticky: false,
                    timeout: 10000,
                });
                throw error;
            }
        } else {
            this.env.services.notification.add("Invalid device", {
                type: 'danger',
                sticky: false,
                timeout: 10000,
            });
        }
    }
}