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
import { DeliveryProductLine } from "./DeliveryProductLine";







export class DeliveryProductScreen extends Component {
    // static template = "pos_etta.DeliveryOrdersScreen";
    static components = {DeliveryOrderLine,DeliveryProductLine };
    constructor() {
        super(...arguments);
        this.clickOrderLineEtta = this.clickOrderLineEtta.bind(this);
        this.handleaddposorder = this.handleaddposorder.bind(this);
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
        // this.updateOrderList = debounce(this.updateOrderList, 70);
        this.loading = false;
        // this.state.zmallorders = {}
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
        this.orm = useService("orm");
        this.pos = usePos();
        this.rpc = useService('rpc');
        console.log("this.pos",this.pos);
        const posBus = useService('pos_bus');
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
        self.setLoading(true);
        // await this.orm.call("pos.config", "auth_zmall", [this.pos.config.id], {})



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
            
            self.setLoading(false);
            window.localStorage.setItem("server_token", values.server_token);
            window.localStorage.setItem("store_id", values.store_id);
           
            return values;
        }, function (err) {
            
            self.setLoading(false);
            return err;
        });
    }

    async  pollForOrders() {
    
        if (this.was_cancelled) {
            console.log('was_cancelled');
            return false;
        }
    
        try {
            let status = await this.getOrdersFromBackEnd();
            console.log("ROSOLVED");
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
        window.localStorage.setItem("liveproducts", JSON.stringify({}));
        self.setLoading(true);
        let storeId = window.localStorage.getItem("store_id");
        let serverToken = window.localStorage.getItem("server_token");
        console.log("storeId" + storeId);
        // console.log("serverToken" + serverToken);
        let requestData = {
            "config_id": this.pos.config.id,
            "store_id": storeId,
            "server_token": serverToken
        }
        
        
        await jsonrpc('/web/dataset/call_kw/pos.config/get_zmall_products/',{
            model: 'pos.config',
            method: 'get_zmall_products',
            args: [[], requestData],
            kwargs: {
                context: {
                    pos: true
                }
            }

        }).then(function (values) {
            self.setLoading(false);
            // console.log("ZMALL ORDERS RESPOSNSE");
            console.log("live data: " + JSON.stringify(values));
            console.log("values.error_code"+values.error_code);
            console.log("values.error_message"+values.error_code == 652);
            if (values.error_code == 652) {
                console.log("no order");
                self.setZmallOrders({});
                window.localStorage.setItem("liveproducts", JSON.stringify({}));
                // getOrdersFromBackEnd();
                
            }
    
            else if ('error_code' in values) {
                console.log("authenticate again");
                setTimeout(this.authzmall, 60020); 
            }

            
            console.log(values);
            window.localStorage.setItem("liveproducts", JSON.stringify(values));
            // this.state.zmallorders = values;
            self.setZmallOrders(values);
            return values;

        }, function (err) {
            self.setLoading(false);
            console.log("=========err=========");
            console.log(err);
            return err;
        });
    }

    async handleaddposorder (event) {
        let self = this;
        console.log("========================");
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
                    label: _t("add to pos order"),
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
                            "store_id": storeId,
                            "product_id":product_id
                        };
                        console.log("data"+data);


                        self.addposorder(data)
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

    async cancel_order() {
        let self = this;
        self.setLoading(true);
        let storeId = window.localStorage.getItem("store_id");
        let serverToken = window.localStorage.getItem("server_token");
        console.log("storeId" + storeId);
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
        
        
        await jsonrpc('/web/dataset/call_kw/pos.config/get_zmall_products/',{
            model: 'pos.config',
            method: 'get_zmall_products',
            args: [[], requestData],
            kwargs: {
                context: {
                    pos: true
                }
            }

        }).then(function (values) {
            self.setLoading(false);
            console.log("ZMALL ORDERS RESPOSNSE");
            console.log("live data: " + JSON.stringify(values));
            console.log("values.errors: " + values.error_code);
            if (values.error_code == 652) {
                console.log("no order");
                self.setZmallOrders({});
                window.localStorage.setItem("liveproducts", JSON.stringify({}));
                // getOrdersFromBackEnd();
                console.log("there is no order")
                this.popup.add(ErrorPopup, {
                    title: _t('empty order'),
                    body: _t('there is no order')
                });

                
            }
            else if ('error_code' in values) {
                console.log("authenticate again");
                setTimeout(this.authzmall, 6002); 
            }
            
            console.log(values);
            window.localStorage.setItem("liveproducts", JSON.stringify(values));
            // this.state.zmallorders = values;
            self.setZmallOrders(values);
            return values;

        }, function (err) {
            self.setLoading(false);
            console.log("=========err=========");
            console.log(err);
            return err;
        });
    }

        // updated
        async setProductsStatus(data) {
            try {
                let self = this;
                self.setLoading(true);
                console.log("======================= setOrdersStatus data =======================")
                console.log(data)
                console.log("======================= setOrdersStatus data =======================")
                const value = await jsonrpc('/web/dataset/call_kw/pos.config/set_zmall_product_status/', {
                    model: 'pos.config',
                    method: 'set_zmall_product_status',
                    args: [[], data],
                    context: {
                        pos: true
                    },
                    kwargs: {}
                });
                console.log(" value after inside setOrderStatus" + value)
                self.setLoading(false);
                console.log("======================= setOrdersStatus value =======================")
                console.log(value)
                console.log("======================= setOrdersStatus value =======================")
                if (value === "reauth") {
                    //auth
                    await self.authZmall();
                    let newstoreId = window.localStorage.getItem("store_id");
                    let newserverToken = window.localStorage.getItem("server_token");
                    // fixmebini 
                    let newdata = {
                        "name":data['name'],
                        "is_item_in_stock":data['is_item_in_stock'],
                        "is_visible_in_store": data['is_visible_in_store'],
                        'item_id':data['item_id'],
                        "product_id": data['product_id'],
                        "server_token": newserverToken,
                        "store_id": newstoreId

                    }
                    return await self.setProductsStatus(newdata);
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


    // updated
    async setOrdersStatus(data) {
        try {
            let self = this;
            self.setLoading(true);
            console.log("======================= setOrdersStatus data =======================")
            console.log(data)
            console.log("======================= setOrdersStatus data =======================")
            const value = await jsonrpc('/web/dataset/call_kw/pos.config/set_zmall_order_status/', {
                model: 'pos.config',
                method: 'set_zmall_order_status',
                args: [[], data],
                context: {
                    pos: true
                },
                kwargs: {}
            });
            console.log(" value after inside setOrderStatus" + value)
            self.setLoading(false);
            console.log("======================= setOrdersStatus value =======================")
            console.log(value)
            console.log("======================= setOrdersStatus value =======================")
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


    async addposorder(data) {
        try {
            let self = this;
            self.setLoading(true);
            console.log("======================= cancel order data =======================")
            console.log(data)
            console.log("======================= setOrdersStatus data =======================")
            const value = await jsonrpc('/web/dataset/call_kw/pos.config/add_pos_order/', {
                model: 'pos.config',
                method: 'add_pos_order',
                args: [[], data],
                context: {
                    pos: true
                },
                kwargs: {}
            });
            console.log(" value after inside cancelorder" + value)
            self.setLoading(false);
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



    async cancelOrder(data) {
        try {
            let self = this;
            self.setLoading(true);
            console.log("======================= cancel order data =======================")
            console.log(data)
            console.log("======================= setOrdersStatus data =======================")
            const value = await jsonrpc('/web/dataset/call_kw/pos.config/cancel_or_reject_order/', {
                model: 'pos.config',
                method: 'cancel_or_reject_order',
                args: [[], data],
                context: {
                    pos: true
                },
                kwargs: {}
            });
            console.log(" value after inside cancelorder" + value)
            self.setLoading(false);
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
        await this.getProductData()
        this.render()
    }



    get getMoves() {
        return JSON.parse(window.localStorage.getItem("liveproducts"));
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
                    label: _t("in stock"),
                    imageUrl: "/pos_etta/static/description/created.png",
                    isSelected: this.isItemSelected(1, event.is_visible_in_store)
                    
                },
                {
                    id: 3,
                    item: 3,
                    label: "out of stock",
                    imageUrl: "/pos_etta/static/description/accepted.png",
                    isSelected: this.isItemSelected(3, event.is_visible_in_store)
                },
            ]
        }).then( async (selectedstatus) => {
            
            console.log("selected status");
            let in_stock = false;
            let is_visible = false;
            if (selectedstatus.payload == 1){
                in_stock = true;
                // is_visible = true;

            }

            await this.popup.add(SelectionPopup, {
                title: _t('Change Order Status'),
                list: [
                    {
                        id: 1,
                        item: 1,
                        label: _t("visible"),
                        imageUrl: "/pos_etta/static/description/created.png",
                        isSelected: this.isItemSelected(1, event.is_visible_in_store)
                        
                    },
                    {
                        id: 3,
                        item: 3,
                        label: "invisible",
                        imageUrl: "/pos_etta/static/description/accepted.png",
                        isSelected: this.isItemSelected(3, event.is_visible_in_store)
                    },
                   
                ]
            }).then( async (visiblitystatus) => {
            console.log(visiblitystatus);
            console.log(visiblitystatus)
            if (visiblitystatus) {
                console.log(visiblitystatus);
                if (visiblitystatus.payload == 1){
                    is_visible = true;
                    // is_visible = true;
    
                }
                    
                   let {confirmed} =  await this.popup.add(ConfirmPopup, {
                        title: _t('Confirmation'),
                        body: _t('Are you sure you want to proceed?')
                    });
                    console.log("after confirmation:" + confirmed);
                    
    
                    // if (confirmed) {
                    if (confirmed){
                        let storeId = window.localStorage.getItem("store_id");
                        let serverToken = window.localStorage.getItem("server_token");
                        window.localStorage.setItem("config_id", this.pos.config.id);
                        console.log("inside true");
                        console.log("CHANGE product STATUS");
                        // console.log("Order ID => " + event.zmall_order_id + " TO Status => " + selectedstatus.payload);
                        console.log({
                            "server_token": serverToken,
                            "store_id": storeId
                        });
                        let data = {
                            "config_id": this.pos.config.id,
                            "name":event.name,
                            "is_item_in_stock":in_stock,         
                            "is_visible_in_store": is_visible,
                            'item_id':event.item_id,
                            "product_id": event.product_id,

                            // "order_id": event.zmall_order_id,
                            // "order_status": selectedstatus.payload,
                            "server_token": serverToken,
                            "store_id": storeId
                        };
                        console.log("data"+data);


                        self.setProductsStatus(data)
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
        });
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

    backclick(){
        this.pos.closeTempScreen();
        this.pos.showTempScreen("DeliveryOrdersScreen");

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

        

        clickOrder(order) {
            if (this.state.selectedOrder && this.state.selectedOrder.unique_id === order.unique_id) {
                this.state.selectedOrder = null;
            } else {
                this.state.selectedOrder = order;
            }
            this.confirm();
        }

        // product functionality


        clickProduct(order) {
            if (this.state.selectedOrder && this.state.selectedOrder.unique_id === order.unique_id) {
                this.state.selectedOrder = null;
            } else {
                this.state.selectedOrder = order;
            }
            this.confirm();
        }

        get getProducts() {
            return JSON.parse(window.localStorage.getItem("liveproducts"));
        }

        async getProductData() {
            let self = this;
            self.setLoading(true);
            let storeId = window.localStorage.getItem("store_id");
            let serverToken = window.localStorage.getItem("server_token");
            console.log("storeId" + storeId);
            // console.log("serverToken" + serverToken);
            let requestData = {
                "config_id": this.pos.config.id,
                "store_id": storeId,
                "server_token": serverToken
            }
            
            
            await jsonrpc('/web/dataset/call_kw/pos.config/get_zmall_products/',{
                model: 'pos.config',
                method: 'get_zmall_products',
                args: [[], requestData],
                kwargs: {
                    context: {
                        pos: true
                    }
                }
    
            }).then(function (values) {
                self.setLoading(false);
                // console.log("ZMALL ORDERS RESPOSNSE");
                console.log("live data: " + JSON.stringify(values));
                console.log("values.error_code"+values.error_code);
                console.log("values.error_message"+values.error_code == 652);
                if (values.error_code == 652) {
                    console.log("no order");
                    self.setZmallOrders({});
                    window.localStorage.setItem("liveproducts", JSON.stringify({}));
                    // getOrdersFromBackEnd();
                    
                }
        
                else if ('error_code' in values) {
                    console.log("authenticate again");
                    setTimeout(this.authzmall, 60020); 
                }
    
                
                console.log(values);
                window.localStorage.setItem("liveproducts", JSON.stringify(values));
                // this.state.zmallorders = values;
                self.setZmallOrders(values);
                return values;
    
            }, function (err) {
                self.setLoading(false);
                console.log("=========err=========");
                console.log(err);
                return err;
            });
        }





}


DeliveryProductScreen.template = "pos_etta.DeliveryProductScreen";
registry.category('pos_screens').add('DeliveryProductScreen', DeliveryProductScreen);

