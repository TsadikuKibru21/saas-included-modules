/** @odoo-module **/

import paymentForm from '@payment/js/payment_form';
import paymentButton from '@payment/js/payment_button';
import { _t } from '@web/core/l10n/translation';
import { RPCError } from "@web/core/network/rpc_service";
import { jsonrpc } from "@web/core/network/rpc_service";

console.log("Custom payment form script loaded.");

paymentForm.include({
    async start() {
        console.log("### paymentForm start() called");
        const submitButton = document.querySelector('[name="o_payment_submit_button"]');
        if (submitButton) {
            console.log("### Submit button found, attaching event listener");
            if (!submitButton.dataset.customListener) {
                submitButton.addEventListener('click', ev => this._submitForm(ev));
                submitButton.dataset.customListener = "true"; // Prevent duplicate listeners
            }
        } else {
            console.log("### Submit button not found in this context");
        }
        return await this._super(...arguments);
    },

    async _submitForm(ev) {
        console.log("### _submitForm called with paymentContext:", this.paymentContext);
        console.log(ev);
        ev.stopPropagation();
        ev.preventDefault();

        const checkedRadio = this.el.querySelector('input[name="o_payment_radio"]:checked');
        if (!checkedRadio) {
            console.log("### No payment method selected");
            alert("Please select a payment method.");
            return;
        }

        const paymentMethodCode = this._getPaymentMethodCode(checkedRadio);
        console.log("########################## paymentMethodCode #######", paymentMethodCode);
        console.log("### paymentOptionId:", this.paymentContext.paymentOptionId);
        console.log("### checkedRadio:", checkedRadio);

        var customerPhoneNumber = $('#telebirr_phone').val();
        console.log("### customerPhoneNumber:", customerPhoneNumber);
        const phoneNumberRegex = /^9\d{8}$/; // Matches a 9-digit number starting with '9'

        if (paymentMethodCode === "telebirr_ussd") {
            if (!customerPhoneNumber) {
                alert("Please Enter Phone number");
                return;
            } else if (!phoneNumberRegex.test(customerPhoneNumber)) {
                alert("Phone number must be 9 digits and start with 9.");
                return;
            }
            const result = await jsonrpc('/payment/telebirr_ussd/update_phone', {
                'phone_number': customerPhoneNumber
            });
            console.log("### RPC result:", result);
        }

        this._disableButton(true);
        const flow = this.paymentContext.flow = this._getPaymentFlow(checkedRadio);
        const paymentOptionId = this.paymentContext.paymentOptionId = this._getPaymentOptionId(checkedRadio);
        console.log("######################## paymentOptionId ##########", paymentOptionId);

        if (flow === 'token' && this.paymentContext['assignTokenRoute']) {
            await this._assignToken(paymentOptionId);
            this._enableButton();
        } else {
            const providerCode = this.paymentContext.providerCode = this._getProviderCode(checkedRadio);
            this.paymentContext.paymentMethodCode = paymentMethodCode;
            this.paymentContext.providerId = this._getProviderId(checkedRadio);
            if (this._getPaymentOptionType(checkedRadio) === 'token') {
                this.paymentContext.tokenId = paymentOptionId;
            } else {
                this.paymentContext.paymentMethodId = paymentOptionId;
            }
            const inlineForm = this._getInlineForm(checkedRadio);
            this.paymentContext.tokenizationRequested = inlineForm?.querySelector(
                '[name="o_payment_tokenize_checkbox"]'
            )?.checked ?? this.paymentContext['mode'] === 'validation';
            await this._initiatePaymentFlow(providerCode, paymentOptionId, paymentMethodCode, flow);
        }
    },

    async _initiatePaymentFlow(providerCode, paymentOptionId, paymentMethodCode, flow) {
        console.log("### _initiatePaymentFlow:", { providerCode, paymentOptionId, paymentMethodCode, flow });
        console.log("############################# custom _initiatePaymentFlow ############");

        this.rpc(this.paymentContext['transactionRoute'], this._prepareTransactionRouteParams())
            .then(processingValues => {
                console.log("### Processing values:", processingValues);
                if (flow === 'redirect') {
                    this._processRedirectFlow(providerCode, paymentOptionId, paymentMethodCode, processingValues);
                    if (paymentMethodCode === 'telebirr_ussd') {
                        console.log("### Redirecting to custom status for telebirr_ussd (redirect flow)");
                        window.location.href = '/payment/custom_status';
                    }
                } else if (flow === 'direct') {
                    this._processDirectFlow(providerCode, paymentOptionId, paymentMethodCode, processingValues);
                    if (paymentMethodCode === 'telebirr_ussd') {
                        console.log("### Redirecting to custom status for telebirr_ussd (direct flow)");
                        window.location.href = '/payment/custom_status';
                    }
                } else if (flow === 'token') {
                    this._processTokenFlow(providerCode, paymentOptionId, paymentMethodCode, processingValues);
                    if (paymentMethodCode === 'telebirr_ussd') {
                        console.log("### Redirecting to custom status for telebirr_ussd (token flow)");
                        window.location.href = '/payment/custom_status';
                    }
                }
            }).catch(error => {
                if (error instanceof RPCError) {
                    this._displayErrorDialog(_t("Payment processing failed"), error.data.message);
                    this._enableButton();
                } else {
                    return Promise.reject(error);
                }
            });
    },
});

paymentButton.include({
    _canSubmit() {
        console.log("### paymentButton _canSubmit called");
        return this._super(...arguments);
    },
});