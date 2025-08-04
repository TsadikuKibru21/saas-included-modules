/** @odoo-module **/
/** @odoo-module */ 
import { registry } from "@web/core/registry";
import { Component, useState, onMounted, useExternalListener,onWillStart,useListener ,onWillUnmount, useRef} from "@odoo/owl";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";
import { jsonrpc } from "@web/core/network/rpc_service";
import { ConfirmPopup } from "@point_of_sale/app/utils/confirm_popup/confirm_popup";
import { SelectionPopup } from "@point_of_sale/app/utils/input_popups/selection_popup";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { debounce } from "@web/core/utils/timing";
import { useAsyncLockedMethod } from "@point_of_sale/app/utils/hooks";
import { session } from "@web/session";
import { DeliveryOrderLine } from "./DeliveryOrderLine";



export class DeliveryOrdersScreen extends Component {
    static template = "pos_etta.DeliveryOrdersScreen";
    static components = {DeliveryOrderLine };
    constructor() {
        super(...arguments);
        // this.clickOrderLineEtta = this.clickOrderLineEtta.bind(this);
        this.state = {
            zmallorders : {},
            moves :this.env.services.pos.db,
            queryOrder:null,
            query: null,
            selectedMove: this.props.move,
            detailIsShown: false,
            productSyncPageIsShown: false,
            isEditMode: false,
            loading: false,
        };
        this.updateOrderList = debounce(this.updateOrderList, 70);
        this.loading = false;
        this.state.zmallorders = {}
    }


    setup() {
        let self = this;
        super.setup();
        
        this.ui = useState(useService("ui"));
        this.state.zmallorders = {}
        this.saveChanges = useAsyncLockedMethod(this.saveChanges);
        this.orderEditor = {};
        this.env.services.notification = useService('notification');
        this.popup = useService("popup");
        this.pos = usePos();
        this.rpc = useService('rpc');
        const posBus = useService('pos_bus');
        this.getOdooProducts();
        this.state = useState({
            query: null,
            selectedOrder : this.props.order,
            detailIsShown: this.props.editModeProps ? true : false,
            editModeProps: {
                order : this.props.editModeProps ? this.props.order : null,
                missingFields: this.props.missingFields ? this.props.missingFields : null,
            },
            previousQuery: "",
            currentOffset: 0,
        });
        if (this.pollingInterval){
            this.stopPolling();
            clearInterval(this.pollingInterval);
        }
        // onWillUnmount(this.stopPolling());
        // this.startPolling();
        
   
    self.authZmall();

   

    if (this.polling) {
        clearInterval(this.polling);
    }
    this.res = {};
    this.res = this.pollForOrders();
    

    this.polling = setInterval(() => {
            this.res = this.pollForOrders();
            this.res.then(function(value) {
                console.log("Resolved value: ", value);
            }).catch(function(error) {
                console.log("Error: ", error);
            });
        }, 4500);
    
    this.polling = null;

    
};
    willUnmount() {
        clearInterval(this.polling);
    }

 

    setLoading(loading) {
        this.state.loading = loading;
    }
    setZmallOrders(values){
       
        this.state.zmallorders = values;
       
        
    }
    getZmallorders(){
        
        return this.state.zmallorders;
        

    }


    

    async authZmall() {
        let self = this;
        
        await jsonrpc('/web/dataset/call_kw/pos.config/get_or_create_access_token/',{
                model: 'pos.config',
                method: 'get_or_create_access_token',
                args: [this.pos.config.id],
                kwargs: {
                    context: {
                        pos: true
                    }
                }
            
        }).then(function (values) {
            
           
            window.localStorage.setItem("server_token", values.server_token);
            window.localStorage.setItem("store_id", values.store_id);
           
            return values;
        }, function (err) {
            
          
            return err;
        });
    }

    async  pollForOrders() {
    
        if (this.was_cancelled) {
            // console.log('was_cancelled');
            return false;
        }
    
        try {
            let status = await this.getOrdersFromBackEnd();
            // console.log("ROSOLVED");
            this.render();
            return true;
        } catch (data) {
            if (this.remaining_polls != 0) {
                this.remaining_polls--;
            } else {
                // this._handle_odoo_connection_failure(data);
                throw data;
            }
        }
    }


    async getOrdersData() {
        let self = this;
        
        let storeId = window.localStorage.getItem("store_id");
        let serverToken = window.localStorage.getItem("server_token");
        // console.log("storeId" + storeId);
        // console.log("serverToken" + serverToken);
        let requestData = {
            "config_id": this.pos.config.id,
            "store_id": storeId,
            "server_token": serverToken
        }
        
        
        await jsonrpc('/web/dataset/call_kw/pos.config/get_zmall_orders/',{
            model: 'pos.config',
            method: 'get_zmall_orders',
            args: [[], requestData],
            kwargs: {
                context: {
                    pos: true
                }
            }

        }).then( (values) =>{
           
            let self = this;
            // console.log("ZMALL ORDERS RESPOSNSE");
            // console.log("live data: " + JSON.stringify(values));
            // console.log("values.error_code"+values.error_code);
            // console.log("values.error_message"+values.error_code == 652);
            if (values.error_code == 652) {
                console.log("no order");
                self.setZmallOrders({});
                window.localStorage.setItem("livedata", JSON.stringify({}));
                // getOrdersFromBackEnd();
                
            }
    
            else if ('error_code' in values && values['error_code'] == 999) {
                // console.log("authenticate again");
                // setTimeout(this.authzmall, 600200); 
                this.authZmall();
            }

            
            // console.log(values);
            window.localStorage.setItem("zmallorders", JSON.stringify(values));
            window.localStorage.setItem("livedata", JSON.stringify(values));
            // this.state.zmallorders = values;
            self.setZmallOrders(values);
            return values;

        }, function (err) {
            
            // console.log("=========err=========");
            console.log(err);
            return err;
        });
    }


    async cancel_order() {
        let self = this;
    
        let storeId = window.localStorage.getItem("store_id");
        let serverToken = window.localStorage.getItem("server_token");
        // console.log("storeId" + storeId);
        // console.log("serverToken" + serverToken);

        // "cancel_reason": req['cancel_reason'],
        // "order_id": req['order_id'],
        // "order_status":req['order_status'],#order_status=104 for cancel 
        // "server_token": req['server_token'],
        // "store_id": req['store_id']
        let requestData = {
            "order_id":"",
            "cancel_reason":"",
            "order_status":104,
            "config_id": this.pos.config.id,
            "store_id": storeId,
            "server_token": serverToken,

        }
        
        
        await jsonrpc('/web/dataset/call_kw/pos.config/get_zmall_orders/',{
            model: 'pos.config',
            method: 'get_zmall_orders',
            args: [[], requestData],
            kwargs: {
                context: {
                    pos: true
                }
            }

        }).then( (values)=> {
            
            // console.log("ZMALL ORDERS RESPOSNSE");
            // console.log("live data: " + JSON.stringify(values));
            // console.log("values.errors: " + values.error_code);
            if (values.error_code == 652) {
                // console.log("no order");
                self.setZmallOrders({});
                // window.localStorage.setItem("zmallorders", JSON.stringify({}));
                window.localStorage.setItem("livedata", JSON.stringify({}));
                // getOrdersFromBackEnd();
                console.log("there is no order")
                this.popup.add(ErrorPopup, {
                    title: _t('empty order'),
                    body: _t('there is no order')
                });

                
            }
            else if ('error_code' in values && values['error_code'] == 999) {
                console.log("authenticate again");
                this.authZmall();
                // setTimeout(this.authzmall, 6002); 
            }
            
            // console.log(values);
            window.localStorage.setItem("zmallorders", JSON.stringify(values));
            window.localStorage.setItem("livedata", JSON.stringify(values));
            // this.state.zmallorders = values;
            self.setZmallOrders(values);
            return values;

        }, function (err) {
            
            // console.log("=========err=========");
            // console.log(err);
            return err;
        });
    }


    // updated
    async setOrdersStatus(data) {
        try {
            let self = this;
           
            // console.log("======================= setOrdersStatus data =======================")
            // console.log(data)
            // console.log("======================= setOrdersStatus data =======================")
            const value = await jsonrpc('/web/dataset/call_kw/pos.config/set_zmall_order_status/', {
                model: 'pos.config',
                method: 'set_zmall_order_status',
                args: [[], data],
                context: {
                    pos: true
                },
                kwargs: {}
            });
            
            // console.log("======================= setOrdersStatus value =======================")
            // console.log(value)
            // console.log("======================= setOrdersStatus value =======================")
            if (value === "reauth") {
                //auth
                await self.authZmall();
                let newstoreId = window.localStorage.getItem("store_id");
                let newserverToken = window.localStorage.getItem("server_token");
                let newdata = {
                    "order_id": data["order_id"],
                    "order_status": data["order_status"],
                    "server_token": newserverToken,
                    "store_id": newstoreId
                }
                await this.getPosOrders();
                return await self.setOrdersStatus(newdata);
            }
    
            if (value === "done") {
                //refrease or show done message
                // console.log("value => " + value);
                await self.getOrdersFromBackEnd();
                return true;
            }
    
            if (value === "error") {
                //unknown error message
                // console.log("value => " + value);
                await self.getOrdersFromBackEnd();
                return false;
            }
            return value;
        } catch (err) {
            // console.log("=========err=========");
            console.log("the error is " + err)
            console.log(err);
            throw err;
        }
    }



    async cancelOrder(data) {
        try {
            let self = this;
            
            console.log("======================= cancel order data =======================")
            // console.log(data)
            // console.log("======================= setOrdersStatus data =======================")
            const value = await jsonrpc('/web/dataset/call_kw/pos.config/cancel_or_reject_order/', {
                model: 'pos.config',
                method: 'cancel_or_reject_order',
                args: [[], data],
                context: {
                    pos: true
                },
                kwargs: {}
            });
            // console.log(" value after inside cancelorder" + value)
            
            // console.log("======================= setOrdersStatus value =======================")
            // console.log(value)
            // console.log("======================= setOrdersStatus value =======================")
            if (value === "reauth") {
                //auth
                let self = this;
                await self.authZmall();
                let newstoreId = window.localStorage.getItem("store_id");
                let newserverToken = window.localStorage.getItem("server_token");
                let newdata = {
                    "order_id": data["order_id"],
                    "order_status": data["order_status"],
                    "server_token": newserverToken,
                    "store_id": newstoreId,
                    "order_status":104,
                }

                
                return await self.setOrdersStatus(newdata);
            }
    
            if (value === "done") {
                //refrease or show done message
                // console.log("value => " + value);
                await self.getOrdersFromBackEnd();
                return true;
            }
    
            if (value === "error") {
                //unknown error message
                // console.log("value => " + value);
                await self.getOrdersFromBackEnd();
                return false;
            }
            return value;
        } catch (err) {
            // console.log("=========err=========");
            console.log("the error is " + err)
            console.log(err);
            throw err;
        }
    }

    // async setOrdersStatus(data) {
    //     let self = this;
    //     self.setLoading(true);
    //     console.log("======================= setOrdersStatus data =======================")
    //     console.log(data)
    //     console.log("======================= setOrdersStatus data =======================")
    //     // await this.rpc({
    //     await jsonrpc('/web/dataset/call_kw/pos.config/set_zmall_order_status/',{
    //         model: 'pos.config',
    //         method: 'set_zmall_order_status',
    //         args: [[], data],
    //         context: {
    //             pos: true
    //         },
    //         kwargs: {}
    //     }).then(async function (value) {
    //         console.log( " value after inside setOrderStatus"+value)
    //         self.setLoading(false);
    //         console.log("======================= setOrdersStatus value =======================")
    //         console.log(value)
    //         console.log("======================= setOrdersStatus value =======================")
    //         if (value === "reauth") {
    //             //auth
    //             await self.authZmall();
    //             let newstoreId = window.localStorage.getItem("store_id");
    //             let newserverToken = window.localStorage.getItem("server_token");
    //             let newdata = {
    //                 "order_id": data["order_id"],
    //                 "order_status": data["order_status"],
    //                 "server_token": newserverToken,
    //                 "store_id": newstoreId
    //             }
    //             return await self.setOrdersStatus(newdata);
    //         }

    //         if (value === "done") {
    //             //refrease or show done message
    //             // console.log("value => " + value);
    //             await self.getOrdersFromBackEnd();
    //             return true;
    //         }

    //         if (value === "error") {
    //             //unknown error message
    //             // console.log("value => " + value);
    //             await self.getOrdersFromBackEnd();
    //             return false;
    //         }
    //         return value;
    //     }, function (err) {
    //         self.setLoading(false);
    //         console.log("=========err=========");
    //         console.log("the error is "+err)
    //         console.log(err);
    //         return err;
    //     });
    // }


  


    willUnmount() {
        super.willUnmount()
    }

    async getOrdersFromBackEnd() {
        await this.getOrdersData()
        await this.getPosOrders();
        await this.getOrdersData();
        await this.combineOrders();
        
        this.render()
    }

    async handleaddposorder (event) {
        let self = this;
        console.log("========================");
        // console.log("odoo products");
        let odoo_products = window.localStorage.getItem("odoo_products");
        odoo_products = JSON.parse(odoo_products);
        odoo_products = odoo_products.map(product => {
            product.displayname = "";
            product.delivery_order_id = "";
            product.quantity = 1;
            product.price_subtotal=0;
            product.price_subtotal_incl=0;
            return product;
        });
        console.log("/././././././././")
        console.log(event.cart_items.length)
        console.log(event.cart_items);
        console.log(odoo_products);
        var ordered_odoo_products = []
        for (let i=0;i<event.cart_items.length;i++){
            console.log(event.cart_items[i]);

        }
        var quantity = 1;
        for(let zmall_prod of event.cart_items){
            // console.log(zmall_prod);
            // console.log(zmall_prod.pos_id);
           
            console.log(zmall_prod["pos_id"]);
            quantity = zmall_prod['quantity'];
            
            for (let odoo_prod of odoo_products){
                
                // console.log(odoo_prod['id']);
                // console.log(odoo_prod);
                // console.log(JSON.parse(odoo_prod).id);
                // console.log(odoo_prod.id);
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
                console.log(odoo_prod.product_id);
                console.log("product id")
                console.log(odoo_prod.id);

                if (odoo_prod.id.toString() == zmall_prod.pos_id.toString()){
                    odoo_prod['displayname'] = zmall_prod.full_product_name;
                    odoo_prod['delivery_order_id'] = zmall_prod.order_id;
                    odoo_prod['quantity'] = quantity;
                    odoo_prod['price_subtotal'] = zmall_prod.total_item_price;
                    odoo_prod['price_subtotal_incl'] = zmall_prod.total_item_price;
                    ordered_odoo_products.push(odoo_prod);
                    break;

                }
            }
        }
        // console.log("ordered_odoo_products"+ordered_odoo_products);
        // console.log(ordered_odoo_products);
        // console.log(event);
        let order_status_code = event.order_status;
        let order_code = 104;
        // console.log(order_status_code);
        // console.log("show popup");
        if (order_status_code==1){
            order_code = 103;
        }
        else if(order_status_code!=1){
            order_code = 104;
        };
        await this.popup.add(SelectionPopup, {
            title: _t('Change Order Status'),
            list: [
                {
                    id: order_code,
                    item: order_code,
                    label: _t("add to pos order"),
                    isSelected: this.isItemSelected(1, event.order_status)
                    
                }
            ]
        }).then( async (selectedstatus) => {
            
            
            // console.log(selectedstatus)
            // console.log("order status code:"+ order_status_code)
            if (selectedstatus) {
                if (selectedstatus.payload <= order_status_code) {
                     this.popup.add(ErrorPopup, {
                        title: _t('Invalid Action'),
                        body: _t('Can not revert back to status that has been passed')
                    });
                } else {
                    
                   let {confirmed} =  await this.popup.add(ConfirmPopup, {
                        title: _t('Confirmation'),
                        body: _t('Please double check because this step can not be reversed?')
                    });
                    console.log("after confirmation:" + confirmed);
                    
    
                    // if (confirmed) {
                    if (confirmed){
                        let storeId = window.localStorage.getItem("store_id");
                        let serverToken = window.localStorage.getItem("server_token");
                        // let mapps = windos.localStorage.getItem("mapping");
                        let mapping = JSON.parse(localStorage.getItem("mapping") || "{}");
                        let product_id = mapping[event.cart_items[0].full_product_name];


                        
                        console.log("inside true");
                        console.log("CHANGE ORDER STATUS");
                        console.log("Order ID => " + event.zmall_order_id + " TO Status => " + selectedstatus.payload);
                        console.log({
                            "product_id":product_id,
                            "order_id": event.zmall_order_id,
                            "order_status": selectedstatus.payload,
                            "server_token": serverToken,
                            "store_id": storeId,
                            "zmall_order_id":event.zmall_order_id
                        });
                        // cancel_reason: "Enter Your Reason"
                        // order_id: "663382be520143486dd79706"
                        // order_status: 104
                        // server_token: "CYvJ34StRftU0w9UgKP5mhq7h7FzIDXo"

                        // store_id: "6527e54f447f424c612e9910"
                        let data = {
                            "cancel_reason":"",
                            "config_id": this.pos.config.id,
                            "order_id": event.zmall_order_id,
                            "order_status": selectedstatus.payload,
                            "server_token": serverToken,
                            "store_id": storeId,
                            "product_id":product_id
                        };
                        console.log("!!!!!!!!!!!!!!!!!"+this.pos)
                        console.log("!!!!!!!!!!!!!!!!!"+this.pos.config)
                        console.log("!!!!!!!!!!!!!!!!!"+JSON.stringify(this.pos.config.current_session_id))
                        

                        console.log("data"+data);


                        this.addposorder(data,ordered_odoo_products)
                        .then(cancelorder => {
                            console.log("===================== cancelorder result =====================");
                            console.log(cancelorder);
                            console.log("===================== cancelorder result =====================");
                    
                            if (cancelorder) {
                                console.log("status changed successfully");
                                this.env.services.notification.add("Status Changed Successfully", {
                                    type: 'info',
                                    sticky: false,
                                    timeout: 10000,
                                });
                            } else {
                                console.log("error occurred, status not changed");
                                this.env.services.notification.add("Error Occurred, Status Not Changed", {
                                    type: 'danger',
                                    sticky: false,
                                    timeout: 10000,
                                });
                            }
                        })
                        .catch(error => {
                            console.error("An error occurred:", error);
                            this.env.services.notification.add("An error occurred", {
                                type: 'danger',
                                sticky: false,
                                timeout: 10000,
                            });
                        });
    
                    }
                }
            }
        });
        await this.getOrdersData();
    }

    async handleaddposorder_auto (event) {
        let self = this;
        // console.log("========================");
        // console.log("odoo products");
        let odoo_products = window.localStorage.getItem("odoo_products");
        odoo_products = JSON.parse(odoo_products);
        odoo_products = odoo_products.map(product => {
            product.displayname = "";
            product.delivery_order_id = "";
            product.quantity = 1;
            product.price_subtotal=0;
            product.price_subtotal_incl=0;
            return product;
        });
        console.log("/././././././././")
        // console.log(event.cart_items.length)
        // console.log(event.cart_items);
        // console.log(odoo_products);
        var ordered_odoo_products = []
        // for (let i=0;i<event.cart_items.length;i++){
        //     console.log(event.cart_items[i]);

        // }
        var quantity = 1;
        for(let zmall_prod of event.cart_items){
            // console.log(zmall_prod);
            // console.log(zmall_prod.pos_id);
           
            // console.log(zmall_prod["pos_id"]);
            quantity = zmall_prod['quantity'];
            
            for (let odoo_prod of odoo_products){
                
                // console.log(odoo_prod['id']);/
                // console.log(odoo_prod);
                // console.log(JSON.parse(odoo_prod).id);
                // console.log(odoo_prod.id);
                if (odoo_prod.id.toString() == zmall_prod.pos_id.toString()){
                    odoo_prod['displayname'] = zmall_prod.full_product_name;
                    odoo_prod['delivery_order_id'] = zmall_prod.order_id;
                    odoo_prod['quantity'] = quantity;
                    odoo_prod['price_subtotal'] = zmall_prod.total_item_price;
                    odoo_prod['price_subtotal_incl'] = zmall_prod.total_item_price;
                    odoo_prod['id'] = zmall_prod.pos_id;
                    odoo_prod['quantity'] = zmall_prod.quantity;
                    odoo_prod['price_unit'] = zmall_prod.price_unit;
                    odoo_prod['list_price'] = zmall_prod.item_price;
                    odoo_prod['discount'] = zmall_prod.discount || 0.0;
                    odoo_prod['price_subtotal'] = zmall_prod.total_item_price;
                    odoo_prod['price_subtotal_incl'] = zmall_prod.total_item_price;
                    odoo_prod['displayname'] = zmall_prod.full_product_name;
                    odoo_prod['note'] = zmall_prod.note;
                    ordered_odoo_products.push(odoo_prod);
                    break;

                }
            }
        }
                    
        let storeId = window.localStorage.getItem("store_id");
        let serverToken = window.localStorage.getItem("server_token");
        // let mapping = JSON.parse(localStorage.getItem("mapping") || "{}");
        // let product_id = mapping[event.cart_items[0].full_product_name];


                        
        console.log("inside true");
        console.log("CHANGE ORDER STATUS");
        console.log("Order ID => " + event.zmall_order_id);
        console.log({
                            // "product_id":product_id,
                            "order_id": event.zmall_order_id,
                            "server_token": serverToken,
                            "store_id": storeId,
                            "zmall_order_id":event.zmall_order_id
                        });

        let data = {
                            "cancel_reason":"",
                            "config_id": this.pos.config.id,
                            "order_id": event.zmall_order_id,
                            "server_token": serverToken,
                            "store_id": storeId,
                            "amount_paid": 0,
                            "amount_total": event.total_cart_price || 111,
                            "amount_tax": 0,  // Add tax calculation if needed
                            "amount_return": 0,
                            "customer_count": 1
                            // "product_id":product_id
                        };

        console.log("!!!!!!!!!!!!!!!!!"+this.pos)
        console.log("!!!!!!!!!!!!!!!!!"+this.pos.config)
        console.log("!!!!!!!!!!!!!!!!!"+JSON.stringify(this.pos.config.current_session_id))
        console.log("data"+data);
        console.log("ordered zmall product")
        console.log(event.cart_items)
        console.log("!!!!!!!!!ordered odoo products!!!!!!!!!!!!!!!!")
        
        console.log(ordered_odoo_products);
                        

        console.log("data"+data);


        self.addposorder(data,ordered_odoo_products)
                        .then(newordercreated => {
                            console.log("===================== newordercreated result =====================");
                            console.log(newordercreated);
                            console.log("===================== newordercreated result =====================");
                    
                            if (newordercreated) {
                                console.log("status changed successfully");
                                this.env.services.notification.add("Order Created Successfully", {
                                    type: 'info',
                                    sticky: false,
                                    timeout: 10000,
                                });
                            } else {
                                console.log("error occurred, status not changed");
                                this.env.services.notification.add("Error Occurred, Order Not Changed", {
                                    type: 'danger',
                                    sticky: false,
                                    timeout: 10000,
                                });
                            }
                        })
                        .catch(error => {
                            console.error("An error occurred:", error);
                            this.env.services.notification.add("An error occurred", {
                                type: 'danger',
                                sticky: false,
                                timeout: 10000,
                            });
                        });

                        
                        await this.getPosOrders();
                        await this.getOrdersData();
    
                    
                
            
        
    }




    get getMoves() {
        
        return JSON.parse(window.localStorage.getItem("livedata"));
    }

   
    updateOrderList(event) {
        this.state.query = event.target.value;
      
    }

    isItemSelected(status_code, order_status_code) {
        if (order_status_code >= status_code) {
            return true;
        }
        else {
            return false;
        }
    }




    async CancelOrderButton(event) {
        let self = this;
        console.log("============CANCEL=ORDER============");
        console.log(event);
        let order_status_code = event.order_status;
        let order_code = 104;
        console.log(order_status_code);
        console.log("show popup");
        if (order_status_code==1){
            order_code = 103;
        }
        else if(order_status_code!=1){
            order_code = 104;
        };
        await this.popup.add(SelectionPopup, {
            title: _t('Change Order Status'),
            list: [
                {
                    id: order_code,
                    item: order_code,
                    label: _t("CANCEL"),
                    isSelected: this.isItemSelected(1, event.order_status)
                    
                }
            ]
        }).then( async (selectedstatus) => {
            
            
            console.log(selectedstatus)
            console.log("order status code:"+ order_status_code)
            if (selectedstatus) {
                if (selectedstatus.payload <= order_status_code) {
                     this.popup.add(ErrorPopup, {
                        title: _t('Invalid Action'),
                        body: _t('Can not revert back to status that has been passed')
                    });
                } else {
                    
                   let {confirmed} =  await this.popup.add(ConfirmPopup, {
                        title: _t('Confirmation'),
                        body: _t('Please double check because this step can not be reversed?')
                    });
                    console.log("after confirmation:" + confirmed);
                    
    
                    // if (confirmed) {
                    if (confirmed){
                        let storeId = window.localStorage.getItem("store_id");
                        let serverToken = window.localStorage.getItem("server_token");
                        console.log("inside true");
                        console.log("CHANGE ORDER STATUS");
                        console.log("Order ID => " + event.zmall_order_id + " TO Status => " + selectedstatus.payload);
                        console.log({
                            "order_id": event.zmall_order_id,
                            "order_status": selectedstatus.payload,
                            "server_token": serverToken,
                            "store_id": storeId
                        });
                        // cancel_reason: "Enter Your Reason"
                        // order_id: "663382be520143486dd79706"
                        // order_status: 104
                        // server_token: "CYvJ34StRftU0w9UgKP5mhq7h7FzIDXo"

                        // store_id: "6527e54f447f424c612e9910"
                        let data = {
                            "cancel_reason":"",
                            "config_id": this.pos.config.id,
                            "order_id": event.zmall_order_id,
                            "order_status": selectedstatus.payload,
                            "server_token": serverToken,
                            "store_id": storeId
                        };
                        console.log("data"+data);


                        self.cancelOrder(data)
                        .then(cancelorder => {
                            console.log("===================== cancelorder result =====================");
                            console.log(cancelorder);
                            console.log("===================== cancelorder result =====================");
                    
                            if (cancelorder) {
                                console.log("status changed successfully");
                                this.env.services.notification.add("Status Changed Successfully", {
                                    type: 'info',
                                    sticky: false,
                                    timeout: 10000,
                                });
                            } else {
                                console.log("error occurred, status not changed");
                                this.env.services.notification.add("Error Occurred, Status Not Changed", {
                                    type: 'danger',
                                    sticky: false,
                                    timeout: 10000,
                                });
                            }
                        })
                        .catch(error => {
                            console.error("An error occurred:", error);
                            this.env.services.notification.add("An error occurred", {
                                type: 'danger',
                                sticky: false,
                                timeout: 10000,
                            });
                        });
    
                    }
                }
            }
        });
    }


    async addposorder(data,ordered_odoo_products) {
        try {
            let self = this;
            
            
            console.log("======================= cancel order data =======================")
            console.log(data)
            console.log("======================= setOrdersStatus data =======================")
            const value = await jsonrpc('/web/dataset/call_kw/pos.config/add_pos_order/', {
                model: 'pos.config',
                method: 'add_pos_order',
                args: [[], data,ordered_odoo_products],
                context: {
                    pos: true
                },
                kwargs: {}
            });
            console.log(" value after inside cancelorder" + value)
            
            console.log("======================= setOrdersStatus value =======================")
            console.log(value)
            console.log("======================= setOrdersStatus value =======================")
            if (value === "reauth") {
                //auth
                let self = this;
                await self.authZmall();
                let newstoreId = window.localStorage.getItem("store_id");
                let newserverToken = window.localStorage.getItem("server_token");
                let newdata = {
                    "order_id": data["order_id"],
                    "order_status": data["order_status"],
                    "server_token": newserverToken,
                    "store_id": newstoreId,
                    "order_status":104,
                }

                await this.getPosOrders();
                return await self.setOrdersStatus(newdata);
            }
    
            if (value === "done") {
                //refrease or show done message
                // console.log("value => " + value);
                await self.getOrdersFromBackEnd();
                return true;
            }
    
            if (value === "error") {
                //unknown error message
                // console.log("value => " + value);
                await self.getOrdersFromBackEnd();
                return false;
            }
            return value;
        } catch (err) {
            console.log("=========err=========");
            console.log("the error is " + err)
            console.log(err);
            throw err;
        }
        
    }
    

    clickCartButton(event) {
        console.log(event);
        let list = [];
        

        for (let index = 0; index < event.cart_items.length; index++) {
            let customer_name = event['customer_name']
            const item = event.cart_items[index];
            let category_name = item['category_name'];
            let itemname = item['full_product_name'];
            let unique_id = item['unique_id'];
            let note_for_item = item['note_for_item'];
            let full_product_name = item['full_product_name']
            let total_item_price = item['total_item_price']

            let text = "[" + category_name + "] " + itemname;
            if(note_for_item != ""){
                text = text + " Note => " + note_for_item;
            }
            list.push(
                {
                    'id': unique_id,
                    'name': text,
                    'item': index,
                    'category_name': category_name,
                    'itemname': itemname,
                    'note': note_for_item,
                    'full_product_name': full_product_name,
                    'total_item_price': total_item_price,
                    'customer_name': customer_name


                }
            );

            
        }
        
      

        const orderList = list.map((item) => {
            return {
            id: item.id,
            item: item.name,
            label: item.full_product_name,
            isSelected: false,
            };
            });
            
            this.popup.add(SelectionPopup, {
            title: _t("Order Items List"),
            list: orderList,
            });

    }

 

   async clickOrderLineEtta(event) {
        let self = this;
        console.log("============ORDER_CLICK============");
        console.log(event);
        let order_status_code = event.order_status;
        console.log(order_status_code);
        console.log("show popup");
        await this.popup.add(SelectionPopup, {
            title: _t('Change Order Status'),
            list: [
                {
                    id: 1,
                    item: 1,
                    label: _t("New"),
                    imageUrl: "/pos_etta/static/description/created.png",
                    isSelected: this.isItemSelected(1, event.order_status)
                    
                },
                {
                    id: 3,
                    item: 3,
                    label: "Accepted",
                    imageUrl: "/pos_etta/static/description/accepted.png",
                    isSelected: this.isItemSelected(3, event.order_status)
                },
                {
                    id: 5,
                    item: 5,
                    label: "Prepared",
                    imageUrl: "/pos_etta/static/description/prepared.png",
                    isSelected: this.isItemSelected(5, event.order_status)
                },
                {
                    id: 7,
                    item: 7,
                    label: "Ready",
                    imageUrl: "/pos_etta/static/description/ready.png",
                    isSelected: this.isItemSelected(7, event.order_status)
                }
            ]
        }).then( async (selectedstatus) => {
            
            
            console.log(selectedstatus)
            console.log("order status code:"+ order_status_code)
            if (selectedstatus) {
                if (selectedstatus.payload <= order_status_code) {
                     this.popup.add(ErrorPopup, {
                        title: _t('Invalid Action'),
                        body: _t('Can not revert back to status that has been passed')
                    });
                } else {
                    
                   let {confirmed} =  await this.popup.add(ConfirmPopup, {
                        title: _t('Confirmation'),
                        body: _t('Please double check because this step can not be reversed?')
                    });
                    console.log("after confirmation:" + confirmed);
                    
    
                    // if (confirmed) {
                    if (confirmed){
                        let storeId = window.localStorage.getItem("store_id");
                        let serverToken = window.localStorage.getItem("server_token");
                        console.log("inside true");
                        console.log("CHANGE ORDER STATUS");
                        console.log("Order ID => " + event.zmall_order_id + " TO Status => " + selectedstatus.payload);
                        console.log({
                            "order_id": event.zmall_order_id,
                            "order_status": selectedstatus.payload,
                            "server_token": serverToken,
                            "store_id": storeId
                        });
                        let data = {
                            "config_id": this.pos.config.id,
                            "order_id": event.zmall_order_id,
                            "order_status": selectedstatus.payload,
                            "server_token": serverToken,
                            "store_id": storeId
                        };
                        console.log("data"+data);


                        self.setOrdersStatus(data)
                        .then(changestatresult => {
                            console.log("===================== setOrdersStatus result =====================");
                            console.log(changestatresult);
                            console.log("===================== setOrdersStatus result =====================");
                    
                            if (changestatresult) {
                                console.log("status changed successfully");
                                this.env.services.notification.add("Status Changed Successfully", {
                                    type: 'info',
                                    sticky: false,
                                    timeout: 10000,
                                });
                            } else {
                                console.log("error occurred, status not changed");
                                this.env.services.notification.add("Error Occurred, Status Not Changed", {
                                    type: 'danger',
                                    sticky: false,
                                    timeout: 10000,
                                });
                            }
                        })
                        .catch(error => {
                            console.error("An error occurred:", error);
                            this.env.services.notification.add("An error occurred", {
                                type: 'danger',
                                sticky: false,
                                timeout: 10000,
                            });
                        });
    
                        // let changestatresult =  self.setOrdersStatus(data);

    
                        // console.log("===================== setOrdersStatus result =====================");
                        // console.log(changestatresult);
                        // console.log("===================== setOrdersStatus result =====================");
    
                        // if (changestatresult) {
                        //     console.log("status changed successfully");
                        //     this.env.services.notification.add("Status Changed Successfully", {
                        //         type: 'info',
                        //         sticky: false,
                        //         timeout: 10000,
                        //     });
                          
                        // } else {
                        //     console.log("error occured stauts not changed");
                        //     this.env.services.notification.add("Error Occured Stauts Not Changed", {
                        //         type: 'danger',
                        //         sticky: false,
                        //         timeout: 10000,
                        //     });
                            
                        // }
                    }
                }
            }
        });
    }

   

    async loadZmallProduct() {
        await jsonrpc('/pos_zmall/load_zmall_data');
        
    }



    // ------------------------------------------------------------------------------------------------------

    back(force = false) {
        console.log("back ===========================+++++>>>>>>>>>  back is clicked");
        
        this.pos.closeTempScreen();
            if (this.state.detailIsShown && !force) {
                this.state.detailIsShown = false;
            } else {
                
                this.pos.closeTempScreen();
            }
        }
    
        goToOrders() {
            this.back(true);
            const order = this.state.editModeProps.order;
            const ui = {
                searchDetails: {
                    fieldName: "ORDER",
                    searchTerm: order.unique_id,
                },
                filter: partnerHasActiveOrders ? "" : "SYNCED",
            };
            this.pos.showScreen("TicketScreen", { ui });
        }

        
        confirm() {  
            
        }
        showDeliveryProductScreen() {
            this.pos.showTempScreen("DeliveryProductScreen");
        }
        showDeliveryProductSync(){
            this.pos.showTempScreen("DeliveryProductSync");
        }

        

        clickOrder(order) {
            if (this.state.selectedOrder && this.state.selectedOrder.unique_id === order.unique_id) {
                this.state.selectedOrder = null;
            } else {
                this.state.selectedOrder = order;
            }
            this.confirm();
        }



        // ____________________________________________________________________________
        // order from zmall to odoo

        // this method is called in the setup method
        stopPolling() {
            if (this.pollingInterval) {
                clearInterval(this.pollingInterval);
            }
        }

        startPolling() {
            this.pollingInterval = setInterval(() => {
                this.checkOrders();
            }, 10 * 60 * 1000); // 10 minutes interval
        }
        async  getOdooProducts() {
            try {
                await jsonrpc('/web/dataset/call_kw/pos.config/get_all_products/',{
                    model: 'pos.config',
                    method: 'get_all_products',
                    args: [[]],
                    kwargs: {
                        context: {
                            pos: true
                        }
                    }
        
                }).then( (values)=> {
                    // console.log("list of all odoo products : ", values); // conversion is not needed since it is already a json object
                    window.localStorage.setItem("odoo_products", values);
                    var odoo_products = window.localStorage.getItem("odoo_products");
    
                    console.log("odoo products : ", odoo_products);
                });
        
            } catch (error) {
                console.error(" odoo_products Error fetching Odoo products:", error.message);
                // Optionally, you can handle specific actions on error, like retry logic or user notifications.
            }
        }        
        checkOrders() {
            this.getOdooProducts();
            this.getPosOrders();
            this.getOrdersData();
            this.combineOrders();
        }

        async getPosOrders() {
            let self = this;
           
    
            await jsonrpc('/web/dataset/call_kw/pos.config/get_pos_orders/', {
                model: 'pos.config',
                method: 'get_pos_orders',
                args: [[]],
                kwargs: {
                    context: {
                        pos: true
                    }
                }
            }).then(function(orders) {
               
                console.log("POS Orders: ", orders);
                let posorder= window.localStorage.setItem("pos_orders", orders);
                console.log(posorder);
                return orders;
            }, function(err) {
              
                console.log("=========err=========");
                console.log(err);
                return err;
            });
        }
    
        async combineOrders() {
            let posOrders = window.localStorage.getItem("pos_orders");
            let zmallOrders = window.localStorage.getItem("zmallorders");

            try {
                posOrders = JSON.parse(posOrders) || [];
            } catch (e) {
                console.error("Failed to parse POS Orders JSON: ", e);
            }
        
            try {
                zmallOrders = JSON.parse(zmallOrders) || [];
            } catch (e) {
                console.error("Failed to parse ZMALL Orders JSON: ", e);
            }
            console.log("POS Orders 2: ", posOrders);
            console.log("ZMALL Orders 2: ", zmallOrders);
    
            let matchedOrders = [];
            let unmatchedOrders = [];
            console.log(posOrders['orders']);
            for (let z_order of zmallOrders){
                let flag = false;
                for (let o_order of posOrders['orders']){
                    console.log("odoo order id ", o_order.id);
                    console.log("odoo order delivery id ", o_order.delivery_order_id);
                    console.log("z_order.zmall_order_id ", z_order.zmall_order_id);
                    console.log("z_order ", z_order);
                    console.log("o_order ", o_order);
                    if (String(z_order.zmall_order_id) == String(o_order.delivery_order_id)){
                        matchedOrders.push(z_order);
                        flag = true;
                        break;

                    }
                    

                }
                if (!flag){
                    unmatchedOrders.push(z_order);
                }
            }
            
            
            // zmallOrders.forEach(zmallOrder => {
            //     let matched = posOrders.find(posOrder => String(posOrder.delivery_order_id) == String(zmallOrder.zmall_order_id));
            //     if (matched) {
            //         matchedOrders.push(zmallOrder);
            //     } else {
            //         unmatchedOrders.push(zmallOrder);
            //     }
            // });
    
            console.log("Matched Orders: ", matchedOrders);
            console.log("Unmatched Orders: ", unmatchedOrders);
            this.getPosOrders();
            if (unmatchedOrders.length > 0) {
                await this.handleMultipleAddPosOrders(unmatchedOrders);
            }
    
            // for (let zmallOrder of unmatchedOrders) {
            //     console.log(zmallOrder);
            //     await this.handleMultipleAddPosOrders(zmallOrder);
            // }
        }

        async handleMultipleAddPosOrders(zmall_orders) {
            console.log("zmall_orders");
            console.log(zmall_orders);
            for (let order of zmall_orders) {
                await this.handleaddposorder_auto(order);
            }
        }
    
        async createPosOrder(zmallOrder) {
            await jsonrpc('/web/dataset/call_kw/pos.order/create_pos_order/', {
                model: 'pos.order',
                method: 'create_pos_order',
                args: [zmallOrder],
                kwargs: {
                    context: {
                        pos: true
                    }
                }
            }).then(function(order) {
                console.log("POS Order created: ", order);
            }, function(err) {
                console.log("Error creating POS Order: ", err);
            });
        }
    



        

}

DeliveryOrdersScreen.template = "pos_etta.DeliveryOrdersScreen";
registry.category('pos_screens').add('DeliveryOrdersScreen', DeliveryOrdersScreen);

