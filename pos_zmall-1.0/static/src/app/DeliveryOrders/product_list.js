/** @odoo-module */
// import {ProductsWidget} from "@point_of_sale/app/screens/product_list/ProductsWidget";
import { patch } from "@web/core/utils/patch";
import { ProductsWidget } from "@point_of_sale/app/screens/product_screen/product_list/product_list";
import {onWillDestroy} from "@odoo/owl";
/** @odoo-module **/
import { jsonrpc } from "@web/core/network/rpc_service";
import { _t } from "@web/core/l10n/translation";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { useService } from "@web/core/utils/hooks";
import { ConnectionLostError, ConnectionAbortedError } from "@web/core/network/rpc_service";

import { ProductCard } from "@point_of_sale/app/generic_components/product_card/product_card";
import { Component, useState, useEffect, useRef } from "@odoo/owl";
import { OfflineErrorPopup } from "@point_of_sale/app/errors/popups/offline_error_popup";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { ProductInfoPopup } from "@point_of_sale/app/screens/product_screen/product_info_popup/product_info_popup";
import { CategorySelector } from "@point_of_sale/app/generic_components/category_selector/category_selector";
import { Input } from "@point_of_sale/app/generic_components/inputs/input/input";








patch(ProductsWidget.prototype, {
    setup(){
        super.setup(...arguments);
        this.storeId = window.localStorage.getItem("store_id");
        this.serverToken = window.localStorage.getItem("server_token");
        this.pos = usePos();
        this.syncproducts();
        this.syncInterval = setInterval(() => {
            this.syncproducts();
        }, 50000);
        
        onWillDestroy(() => clearTimeout(this.syncInterval));
    },

    async authZmall() {
        let self = this;
        await jsonrpc('/web/dataset/call_kw/pos.config/get_or_create_access_token/',{
                model: 'pos.config',
                method: 'get_or_create_access_token',
                args: [self.pos.config.id],
                kwargs: {
                    context: {
                        pos: true
                    }
                }
            
        }).then( (values)=> {
            
            
            window.localStorage.setItem("server_token", values.server_token);
            window.localStorage.setItem("store_id", values.store_id);
           
            return values;
        }, function (err) {
            
            
            return err;
        });
    },

    // updated
    async setProductsStatus(data) {
                try {
                    let self = this;
                    console.log("======================= setOrdersStatus data =======================")
                    const value = await jsonrpc('/web/dataset/call_kw/pos.config/update_zmall_product/', {
                        model: 'pos.config',
                        method: 'update_zmall_product',
                        args: [[], data],
                        context: {
                            pos: true
                        },
                        kwargs: {}
                    });
                    if (value === "reauth") {
                        this.authZmall();
                        let newstoreId = window.localStorage.getItem("store_id");
                        let newserverToken = window.localStorage.getItem("server_token");
                        // fixmebini 
                        let newdata = {
                            "name":data['name'],
                            "price":data['price'],
                            "is_item_in_stock":data['is_item_in_stock'],
                            "is_visible_in_store": data['is_visible_in_store'],
                            'item_id':data['item_id'],
                            "product_id": data['product_id'],
                            "server_token": newserverToken,
                            "store_id": newstoreId,
                            
    
                        }
                        return await self.setProductsStatus(newdata);
                    }
            
                    if (value === "done") {
                       
                        return true;
                    }
            
                    if (value === "error") {
                       
                        return false;
                    }
                    return value;
                } catch (err) {
                    console.log("=========err=========");
                    // console.log("the error is " + err)
                    console.log(err);
                    throw err;
                }
        },







    async syncproducts(){
            let self = this;
            await self.authZmall();
            // initialize necessary variables first
            this.storeId = window.localStorage.getItem("store_id");
            this.serverToken = window.localStorage.getItem("server_token");
            window.localStorage.setItem("config_id", self.pos.config.id);
            
    
            // step 1 get and store odoo products
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
    
            // step2 get and store live products
    
            
            // window.localStorage.setItem("live products", JSON.stringify({}));
        
            this.storeId = window.localStorage.getItem("store_id");
            this.serverToken = window.localStorage.getItem("server_token");
            let requestData = {
                "config_id": self.pos.config.id,
                "store_id": this.storeId,
                "server_token": this.serverToken
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
            }).then( async (values) =>{
                // console.log("values"+values);
                
                let self = this;
                // console.log(values["success"]);
                // console.log("values.success"+values.success);
                if (values.success == false || values.success =="false"){
                    // console.log("connection failed please reauth");
                    await this.authZmall();
                    // self.syncproducts();
                    return;

                }
                // console.log("live products: " + window.localStorage.getItem("liveproducts"));
                // console.log("live products: " + JSON.stringify(values));
                window.localStorage.setItem("liveproducts", JSON.stringify(values));

            });

            var liveproducts = window.localStorage.getItem("liveproducts");
            // console.log("live products from locstore : ", liveproducts);
                // console.log("ZMALL ORDERS RESPOSNSE");
            
    
    
                // Convert liveProducts to an array of pos_id for faster lookup
            if (liveproducts && liveproducts.length){
                    var odoo_product_not_in_live = [];
    
                    // console.log("liveproducts: ", JSON.parse(liveproducts));
                    var liveprodjson = JSON.parse(window.localStorage.getItem("liveproducts"));
                    var odoo_products = JSON.parse(window.localStorage.getItem("odoo_products"));
                    if (odoo_products && odoo_products.length && liveprodjson && liveprodjson.length){
                        for (var odoo_product of odoo_products){
                            var flag = false;
                            let odoo_product_id = odoo_product.id;
                            let odoo_product_price = odoo_product.list_price;
                            for (let live_product of liveprodjson){
                              
                                if (live_product.pos_id == odoo_product_id){
                                    // console.log("odoo product available in pos?",odoo_product.available_in_pos);
                                    flag = true;

                                    const data = {
                                        "config_id": self.pos.config.id,
                                        "name": odoo_product.name,
                                        "is_item_in_stock": odoo_product.sale_ok,
                                        "is_visible_in_store": odoo_product.available_in_pos,
                                        'item_id': live_product.item_id,
                                        "product_id": live_product.product_id,
                                        "price": odoo_product_price,
                                        "server_token": self.serverToken,
                                        "store_id": self.storeId
                                    };
                
                                    this.updateProductStatus(data, odoo_product, live_product);
    
                                    break;
                                }
    
    
                            }
    
                            if (!flag){
                                odoo_product_not_in_live.push(odoo_product);
                                
                            }
                        }
                    }


                    
                    // FIXMEBINI Hardcoded
                    // let  config_id =  1;
                    let config_id = this.env.pos && this.env.pos.config ? this.env.pos.config.id : 1;
                    // console.log("config_id"+window.localStorage.setItem("config_id", config_id));
    
                    for (let item of odoo_product_not_in_live){
                        // console.log(item);
                        // console.log("item.name"+item.name);
                        this.storeId = window.localStorage.getItem("store_id");
                        this.serverToken = window.localStorage.getItem("server_token");
                        let requestData = {
                            "deal_of_the_day": false,
                            "details": "",
                            "discount": false,
                            "expiry_date": null,
                            "is_available": true,
                            "is_item_in_stock": true,
                            "is_most_popular": false,
                            "is_visible_in_store": item.available_in_pos,
                            "name": item.name,
                            "new_price": 0,
                            "other_id": null,
                            "pos_id":item.id,
                            "price": item.list_price,
                            "product_id": "6527e6d7447f424c612e9937",
                            "sequence_number": "",
                            "server_token": this.serverToken,
                            "store_id": this.storeId,
                            "tax": 0,
                            "total_quantity": 0,
                            "use_stock_management": false
                            }
                            let debug = false;

                            if (debug){
    
                            await jsonrpc('/web/dataset/call_kw/pos.config/add_item/',{
                                model: 'pos.config',
                                method: 'add_item',
                                args: [[], requestData,config_id],
                                kwargs: {
                                    context: {
                                        pos: true
                                    }
                                }
        
                            }).then( (values)=> {
                                console.log(values);
                                // console.log("Value after the add item request: ", JSON.stringify(values));
                            }
                            );
                        }
                    }  
                }
            },
            async  updateProductStatus(data, odoo_product, live_product) {
                try {
                    const value = await jsonrpc('/web/dataset/call_kw/pos.config/update_zmall_product/', {
                        model: 'pos.config',
                        method: 'update_zmall_product',
                        args: [[], data],
                        context: {
                            pos: true
                        },
                        kwargs: {}
                    });
                  
                    if (value === "reauth") {
                        await this.authZmall();
                        const newstoreId = window.localStorage.getItem("store_id");
                        const newserverToken = window.localStorage.getItem("server_token");
                        const newdata = {
                            "config_id": this.pos.config.id,
                            "name": odoo_product.name,
                            "is_item_in_stock": odoo_product.sale_ok,
                            "is_visible_in_store": odoo_product.available_in_pos,
                            'item_id': live_product.item_id,
                            "product_id": live_product.product_id,
                            "price": odoo_product.list_price,
                            "server_token": newserverToken,
                            "store_id": newstoreId
                        };
                        await this.updateProductStatus(newdata, odoo_product, live_product);
                    }
            
                  
                } catch (err) {
                   
                    throw err;
                }
        },
});



