/** @odoo-module **/

import {patch} from "@web/core/utils/patch";
import {PosBus} from "@point_of_sale/app/bus/pos_bus_service";
import { ConnectionLostError } from "@web/core/network/rpc_service";

// patch(PosStore.prototype, {
//     /**
//      * @override
//      */
//     async setup() {
//         await super.setup(...arguments)
//
//         this.env.services['bus_service'].addEventListener('notification', this._handleNotifications);
//         this.env.services['bus_service'].start();
//     },
//
//     async _handleNotifications({detail: notifications}) {
//         const channelsLeft = new Set(notifications
//             .filter(notification => notification.type === 'mail.channel/leave')
//             .map(notification => notification.payload.id))
//         notifications = notifications.filter(message => typeof message === 'object' && message.type == 'pos_retail.event')
//         if (notifications.length > 0) {
//             for (let i = 0; i < notifications.length; i++) {
//                 let n = notifications[i]
//                 let event_value = n['payload']
//                 let model = event_value['model']
//                 let id = event_value['id']
//                 // console.log('--------------------')
//                 // console.log('auto update: ' + model + ' with id : ' + id)
//
//             }
//         }
//     }
// })

patch(PosBus.prototype, {
    // Override
    dispatch(message) {
        super.dispatch(...arguments);
        
        if (message.type === "pos_retail.event") {
            this.ws_sync_backend(message.payload);
        }
        if (message.type === "pos_retail.pos.session.management") {
            this.ws_closing_session(message.payload);
        }
    },

    async ws_sync_backend(event_value) {
        let model = event_value['model']
        let id = event_value['id']
        // console.log('--------------------')
        // console.log('auto update: ' + model + ' with id : ' + id)
        if (model == 'res.partner' && this.pos.config.sync_customer) {
            let partners = await this.pos.orm.call("pos.session", "get_pos_ui_res_partner_by_params", [odoo.pos_session_id, {domain: [['id', '=', id]]}],);
            this.pos.partners = this.pos.partners.filter((p) => p.id != id)
            let partner = partners[0]
            delete this.pos.db.partner_by_id[partner.id]
            this.pos.db.partner_sorted = this.pos.db.partner_sorted.filter(p_id => p_id != id)
            this.pos.partners.push(partner)
            this.pos.addPartners(partners)
        }
        if (model == 'product.product' && this.pos.config.sync_product) {
            let data = await this.pos.orm.call("pos.session", "get_pos_ui_product_product_by_params", [odoo.pos_session_id, {domain: [['id', '=', id]]}],)
            if (data.length && data[0]['available_in_pos']) {
                let product = data[0]
                let categ_id = product.pos_categ_id ? product.pos_categ_id[0] : this.pos.db.root_category_id;
                let new_product_ids = this.pos.db.product_by_category_id[categ_id]
                new_product_ids = new_product_ids.filter(product_id => product_id != id)
                this.pos.db.product_by_category_id[categ_id] = new_product_ids
                let ancestors = this.pos.db.get_category_ancestors_ids(categ_id) || [];
                for (let j = 0, jlen = ancestors.length; j < jlen; j++) {
                    var ancestor = ancestors[j];
                    this.pos.db.product_by_category_id[ancestor] = this.pos.db.product_by_category_id[ancestor].filter(product_id => product_id != id)
                }
                delete this.pos.db.product_by_id[id]
                this.pos._loadProductProduct(data)
            }
        }
        if (model == 'product.pricelist' && (this.pos.config.pricelist_id[0] == id || this.pos.config.available_pricelist_ids.indexOf(id) != -1) && this.pos.config.sync_pricelist) {
            let pricelists_update = await this.pos.orm.call("pos.session", "get_pos_ui_product_pricelists_by_ids", [[odoo.pos_session_id], [id]]);
            if (pricelists_update) {
                this.pos.pricelists = this.pos.pricelists.filter((p) => p.id != id)
                this.pos.pricelists.push(pricelists_update[0])

                // todo: update pricelist items to each product
                for (const pricelist of this.pos.pricelists) {
                    for (const pricelistItem of pricelist.items) {
                        if (pricelistItem.product_id) {
                            const product_id = pricelistItem.product_id[0];
                            const correspondingProduct = this.pos.db.product_by_id[product_id];
                            if (correspondingProduct && correspondingProduct.applicablePricelistItems && correspondingProduct.applicablePricelistItems[pricelist.id]) {
                                correspondingProduct.applicablePricelistItems[pricelist.id] = correspondingProduct.applicablePricelistItems[pricelist.id].filter(i => i.id != pricelistItem.id)
                            }
                            if (correspondingProduct) {
                                this.pos._assignApplicableItems(pricelist, correspondingProduct, pricelistItem);
                            }
                        } else if (pricelistItem.product_tmpl_id) {
                            const product_tmpl_id = pricelistItem.product_tmpl_id[0];
                            const correspondingProducts = this.pos.db.products_by_product_tmpl_id[product_tmpl_id] || [];
                            for (const correspondingProduct of correspondingProducts || []) {
                                if (correspondingProduct && correspondingProduct.applicablePricelistItems && correspondingProduct.applicablePricelistItems[pricelist.id]) {
                                    correspondingProduct.applicablePricelistItems[pricelist.id] = correspondingProduct.applicablePricelistItems[pricelist.id].filter(i => i.id != pricelistItem.id)
                                }
                                this.pos._assignApplicableItems(pricelist, correspondingProduct, pricelistItem);
                            }
                        }
                    }
                }

                let selected_order = this.pos.get_order()
                if (selected_order.pricelist && selected_order.pricelist.id == pricelists_update[0].id) {
                    let lines_to_recompute = selected_order.get_orderlines().filter((line) => line.price_type === "original");
                    if (lines_to_recompute) {
                        selected_order.set_pricelist(pricelists_update[0])
                    }
                }
            }
        }
    },

    async ws_closing_session(event_value) {
        let login_number = event_value['login_number']
        let session_id = event_value['session_id']
        // console.log("Event Firring skrra")
        if (parseInt(login_number) == this.pos.pos_session.login_number && parseInt(session_id) == this.pos.pos_session.id) {
            try {
                const response = await this.orm.call("pos.session", "close_session_from_ui", [
                    this.pos.pos_session.id,
                    null,
                ]);
                await this.pos.closePos()
            } catch (error) {
                if (error instanceof ConnectionLostError) {
                    throw error;
                } else {
                    await this.pos.closePos()
                }
            }
        }
    }
});
