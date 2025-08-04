/** @odoo-module */

import { BasePrinter } from "@point_of_sale/app/printer/base_printer";
import { patch } from "@web/core/utils/patch";
import { jsonrpc } from "@web/core/network/rpc_service";

patch(BasePrinter.prototype, {
    setup(params) {
        super.setup(...arguments);
    },
    async printReceipt(receipt, printer) {
        if (receipt) {
            this.receiptQueue.push(receipt);
        }

        let isPrintSuccessful = true;

        while (this.receiptQueue.length > 0) {
            receipt = this.receiptQueue.shift();

            try {

                if (receipt.printing_type == 'server') {
                    await jsonrpc('/orderpinter/printorder', {
                        receipt: receipt,
                        orderp: printer
                    }).then(
                        function (data) {
                            isPrintSuccessful = data;
                        }
                    );
                }

                if (receipt.printing_type == 'android') {
                    let escposReceipt = this.generateKitchenOrderReceipt(receipt, printer);
                    let merged = {
                        printer: printer,
                        receipt: escposReceipt
                    };

                    if (window.Android.isAndroidPOS()) {
                        // Call the Android interface method and parse the result
                        var result = window.Android.printTcp(JSON.stringify(merged));

                        // Parse the result as a JSON object
                        var responseObject = JSON.parse(result);

                        // console.log(responseObject);

                        // Check the success flag in the responseObject
                        if (!responseObject.success) {
                            isPrintSuccessful = false;  // Update the success flag if the print failed
                        }
                    } else {
                        this.env.services.notification.add("Invalid Device", {
                            type: 'danger',
                            sticky: false,
                            timeout: 10000,
                        });

                        isPrintSuccessful = false;
                    }
                }

            } catch (error) {
                // Error in communicating to the IoT box or Android interface
                console.error(error); // Log the error for debugging
                this.receiptQueue.length = 0;
                return { successful: false };  // Return an error response
            }

            // If printing failed, exit and return the failure response
            if (!isPrintSuccessful) {
                this.receiptQueue.length = 0;
                return { successful: false };
            }
        }

        return { successful: true };  // Return success if all receipts were printed successfully
    },
    // sendPrintingOrder(receipt, printer) {
    //     return this.rpc(`${this.url}/orderpinter/printorder`, { receipt, printer });
    // },
    generateKitchenOrderReceipt(orderData, printer) {
        let receiptText = "\x1B\x40";
        receiptText += "\x1B\x21\x1C"; // Set font size to double width and double height
        receiptText += "[C]" + printer.name + "\n";
        receiptText += "\x1B\x21\x00"; // Reset font size
        receiptText += "------------------------------------------------\n";

        receiptText += "[L]<b>Table:</b> " + orderData.table_name + "\n";
        receiptText += "[L]<b>Floor:</b> " + orderData.floor_name + "\n";
        receiptText += "[L]<b>Order Number:</b> " + orderData.name + "\n";
        receiptText += "[L]<b>Cashier:</b> " + orderData.cashier + "\n";
        receiptText += "[L]<b>Date:</b> " + orderData.date + "\n";
        receiptText += "[L]<b>Time:</b> " + orderData.time.hours + ":" + orderData.time.minutes + "\n";

        if (orderData.new != undefined && orderData.new && orderData.new.length > 0) {
            receiptText += "------------------------------------------------\n";
            receiptText += "[L]<b>NEW ITEMS:</b>\n";
            orderData.new.forEach(item => {
                receiptText += "[L]" + item.name + " x " + item.quantity + "\n";
            });
        }

        if (orderData.cancelled != undefined && orderData.cancelled && orderData.cancelled.length > 0) {
            receiptText += "------------------------------------------------\n";
            receiptText += "[L]<b>CANCELLED ITEMS:</b>\n";
            orderData.cancelled.forEach(item => {
                receiptText += "[L]" + item.name + " x " + item.quantity + "\n";
            });
        }

        receiptText += "\n\n\n";
        receiptText += "[L]\n";
        receiptText += "[L]\n";

        return receiptText;
    }
});
