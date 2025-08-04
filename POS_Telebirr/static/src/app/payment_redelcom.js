/** @odoo-module */

import { PaymentInterface } from "@point_of_sale/app/payment/payment_interface";
import { jsonrpc } from "@web/core/network/rpc_service";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";
import { usePos } from "@point_of_sale/app/store/pos_hook";


export class PaymentTelebirr extends PaymentInterface {

    setup() {
        super.setup(...arguments);
    }

    async _telebirr_pay() {
        const phone = this.pos.get_order().uiState.PaymentScreen.Phone
        var self = this;
        var order = this.pos.get_order();
        if (order.selected_paymentline.amount < 0) {
            this._show_error(_t('Cannot process transactions with negative amount.'));
        }
        var uid = order.uid.replace(/-/g, '')
        var random_val = Math.floor(Math.random() * 10000);
        var trace_no = random_val.toString().concat("_", uid);
        var data = {
            "payerId": this.payment_method.telebirr_app_id,
            "pos_session": this.pos.pos_session.config_id[0],
            "traceNo": trace_no,
            "amount": order.selected_paymentline.amount,
            "phone": phone
        }

        document.getElementById('trace_number').value = trace_no;

        let info_data = await this._call_telebirr(data);

        if (info_data.msg == "Success") {
            try {
                await jsonrpc(`/create_payment`, {
                    price: order.selected_paymentline.amount,
                    payer_id: this.payment_method.telebirr_app_id,
                    trace_number: trace_no,
                    phone: phone
                }).then(
                    function (data) {

                    }
                );
            } catch (error) {
                console.error('Error occurred while sending data:', error);
            }
            return self._telebirr_handle_response(info_data);
        }
    }
    send_payment_request(cid) {
        this._super.apply(this, arguments);
        this._reset_state();
        return this._telebirr_pay();
    }
    async send_payment_cancel(order, cid) {
        super.send_payment_cancel(...arguments);
        return true;
    }
    close() {
        this._super.apply(this, arguments);
    }
    async _call_telebirr(data1, operation) {
        const amount = 3;
        const data = await this.env.services.orm.silent.call(
            'pos.payment.method',
            'send_request_telebirr',
            [[this.payment_method.id], data1],

        );
        if (data?.error) {
            throw data.error;
        }
        return data;
    }
    send_payment_request(cid) {
        console.log("@@@!!!!")
        console.log(this.payment_method)
        super.send_payment_request(cid);
        return this._telebirr_pay(cid);
    }
    _reset_state() {
        this.was_cancelled = false;
        this.last_diagnosis_service_id = false;
        this.remaining_polls = 4;
        clearTimeout(this.polling);
    }
    _telebirr_handle_response(response) {
        var line = this.pos.get_order().selected_paymentline;

        line.set_payment_status('waitingCard');
        if (response.status_code == 401) {
            this._show_error(_t('Authentication failed. Please check your Telebirr credentials.'));
            line.set_payment_status('force_done');
            return Promise.resolve();
        }
        else {
            var self = this;
            var res = new Promise(function (resolve, reject) {

                clearTimeout(self.polling);

                self.polling = setInterval(function () {
                    self._poll_for_response(resolve, reject);

                }, 3000);
            });
            // make sure to stop polling when we're done
            res.finally(function () {
                self._reset_state();
            });
            return res;
        }
    }
    _telebirr_cancel(ignore_error) {
        this._reset_state();
        var order = this.pos.get_order();
        var line = order.selected_paymentline;
        console.log(line, '_telebirr_cancel');
        if (line) {
            line.set_payment_status('retry');
        }
        return Promise.reject();
    }
    _poll_for_response(resolve, reject) {
        var self = this;
        var line = this.pos.get_order().selected_paymentline;
 
        // Check if `line` exists before accessing its properties
        if (!line) {
            console.log("Payment line does not exist. Resolving the promise.");
            resolve(false); // Resolve the promise if `line` is undefined
            return Promise.resolve();
        }

        console.log("STATUS : " + line.get_payment_status());

        // Proceed only if the payment status is 'waitingCard'
        if (line.get_payment_status() !== 'waitingCard') {
            resolve(false);
            return Promise.resolve();
        }

        var trace_id = this.payment_method.telebirr_payment;

        // Define a function to make the ORM call
        function makeOrmCall() {
            return self.env.services.orm.silent.call(
                'telebirr.payment.status',
                'find_pay_confirmed_telebirr',

                [[self.payment_method.id], document.getElementById('trace_number').value]
            );
        }

        // Create a promise that resolves when either the ORM call resolves or the timeout is reached
        var timeoutPromise = new Promise(function (resolve, reject) {
            setTimeout(function () {
                reject(new Error('ORM call timed out'));
            }, 5000); // Set timeout to 3000 milliseconds
        });

        return Promise.race([makeOrmCall(), timeoutPromise])

            // return Promise.race([makeOrmCall()])
            .then(function (status) {
                if (status) {
                    var notification = status.trace_no;
                    var order = self.pos.get_order();
                    var line = order.selected_paymentline;
                    if (status.msg !== '') {
                        if (status.msg == 'Success') {
                            return resolve(true);
                        }
                        else {
                            // self._show_error(_.str.sprintf(_t('Message from Telebirr: %s'), status.msg));
                            // This means the transaction was canceled by pressing the cancel button on the device
                            line.set_payment_status('retry');
                            reject();
                            // return resolve(false);
                        }
                    } else if (status.msg == '') {
                        self._show_error(_t('The connection to your payment terminal failed. Please check if it is still connected to the internet.'));
                        self._telebirr_cancel();
                        resolve(false);
                    }
                }
            })
            .catch(function (error) {
                if (self.remaining_polls != 0) {
                    self.remaining_polls--;
                } else {
                    reject();
                    self.poll_error_order = self.pos.get_order();
                    return self._handle_odoo_connection_failure(error);
                }
                // Ensure the promise is rejected if an error occurs
                throw error;
            });
    }
    _telebirr_cancel(ignore_error) {
        this._reset_state();
        var order = this.pos.get_order();
        var line = order.selected_paymentline;
        console.log(line, '_telebirr_cancel');
        if (line) {
            line.set_payment_status('retry');
        }
        return Promise.reject();
    }
    _show_error(msg, title) {
        if (!title) {
            title = _t('Telebirr Error');
        }
        Gui.showPopup('ErrorPopup', {
            'title': title,
            'body': msg,
        });
    }
    async pay() {
        this.set_payment_status("waiting");
        return this.handle_payment_response(
            await this.send_payment_request(this.cid)
        );
    }
}