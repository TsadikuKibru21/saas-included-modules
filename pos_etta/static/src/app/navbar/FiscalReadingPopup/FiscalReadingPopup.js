/** @odoo-module */

import { useService } from "@web/core/utils/hooks";
import { useState } from "@odoo/owl";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { AbstractAwaitablePopup } from "@point_of_sale/app/popup/abstract_awaitable_popup";
import { _t } from "@web/core/l10n/translation";

export class FiscalReadingPopup extends AbstractAwaitablePopup {
    static template = "pos_etta.FiscalReadingPopup";

    setup() {
        super.setup();
        this.env.services.notification = useService('notification');
        this.popup = useService("popup");
        this.pos = usePos();
        this.state = useState({
            byDateRange: true,
            showNumberFields: false,
            showDateFields: true, // Show date fields by default
            fromDate: this.formatDate(new Date()), // Assuming formatDate is a method you've defined
            toDate: this.formatDate(new Date()),
            fromZno: 0,
            toZno: 0,
            summary: false
        });
    }

    // Helper function to format the date as a string
    formatDate(date) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
        const year = date.getFullYear();
        return `${year}-${month}-${day}`; // Format as YYYY-MM-DD for input[type="date"]
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
        if (!this.state.byDateRange && (this.state.fromZno > this.state.toZno)) {
            this.state.errorMessage = "Invalid Input \"From Z No\" cannot be greater than \"To Z No\"";
            return false;
        } else if (this.state.byDateRange && (new Date(this.state.fromDate) > new Date(this.state.toDate))) {
            this.state.errorMessage = "Invalid Input \"From Date\" cannot be greater than \"To Date\"";
            return false;
        }
        this.state.errorMessage = null;
        return true;
    }

    // This method is called when the Print button is clicked
    async onPrintButtonClick() {
        await this.pos.doAuthFirst('fr_pin_access_level', 'fr_pin_lock_enabled', 'fiscal_read', async () => {
            if (this.validateInputBeforePrint()) {
                // If there's no validation error, create a JSON object
                const output = {
                    by_date_range: this.state.byDateRange,
                    from_date: this.state.fromDate,
                    to_date: this.state.toDate,
                    from_zno: this.state.fromZno,
                    to_zno: this.state.toZno,
                    detailed: this.state.summary
                };

                try {
                    await this.printFiscalReports(output);
                    super.cancel()
                } catch (error) {
                    this.env.services.notification.add(error, {
                        type: 'success',
                        sticky: false,
                        timeout: 10000,

                    });
                }
            } else {
                this.showErrorMessage();
            }
        });
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

    async printFiscalReports(result) {
        var check = await this.pos.correctTimeConfig();
        if (!await this.pos.correctTimeConfig()) {
            return;
        }

        const _t = this.env && this.env._t ? this.env._t : (key) => key;

        if (window.Android !== undefined && window.Android.isAndroidPOS()) {
            try {
                const posResult = await window.Android.printFiscalReports(JSON.stringify(result));

                this.pos.makeLogEntry("Fiscal Report Printing Request => " + JSON.stringify(result));

                const responseObject = JSON.parse(posResult);
                if (responseObject.success) {
                    this.env.services.notification.add("Fiscal Report Printed", {
                        type: 'info',
                        sticky: false,
                        timeout: 10000,
                    });

                    this.pos.makeLogEntry("Fiscal Report Printed");

                } else {
                    this.env.services.notification.add("Fiscal Report Printing Failed", {
                        type: 'danger',
                        sticky: false,
                        timeout: 10000,
                    });

                    this.pos.makeLogEntry("Fiscal Report Printing Failed");
                }
                return responseObject;
            } catch (error) {
                this.pos.makeLogEntry("Fiscal Report Printing Failed");
                // console.error('An error occurred while printing fiscal reports:', error);
                this.env.services.notification.add("Error occured during fiscal report printing", {
                    type: 'danger',
                    sticky: false,
                    timeout: 10000,
                });
                throw error;

            }
        } else {
            // console.log('Invalid device');
            this.env.services.notification.add("Invalid device", {
                type: 'danger',
                sticky: false,
                timeout: 10000,
            });
        }
    }

}
