/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
import { loadJS } from "@web/core/assets";
import { getColor } from "@web/core/colors/colors";

const actionRegistry = registry.category("actions");

export class ChartjsSampleInventory extends Component {
    setup() {
        this.orm = useService('orm');
        this.action = useService("action");
        this.data = useState([]);
        this.filterType = useState({ value: "all" });
        this.searchQuery = useState({ value: "" });
        this.stats = useState({
            totalProducts: 0,
            totalStock: 0,
            totalStockValue: 0,
            stockMovements: 0,
        });
        this.canvasRef = useRef("canvas");
        this.canvasReftwo = useRef("canvastwo");
        this.canvasRefthree = useRef("canvasthree");

        onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));

        onMounted(() => {
            this.fetchData();
            this.fetchStats();
        });

        onWillUnmount(() => {
            if (this.chart) {
                this.chart.destroy();
            }
            if (this.charttwo) {
                this.charttwo.destroy();
            }
            if (this.chartthree) {
                this.chartthree.destroy();
            }
        });

        // Bind methods to ensure correct `this` context
        this.goToInventoryPage = this.goToInventoryPage.bind(this);
    }

    async fetchData() {
        const domain = [];
        
        if (this.filterType.value && this.filterType.value !== "all") {
            domain.push(['type', '=', this.filterType.value]);
        }
        if (this.searchQuery.value) {
            domain.push(['name', 'ilike', this.searchQuery.value]);
        }
    
        const products = await this.orm.searchRead("product.product", domain, ["id", "name", "qty_available", "standard_price"]);
        console.log('Fetched products:', products);

        this.data = products;
        this.renderChart();
    }

    async fetchStats() {
        const totalProducts = await this.orm.searchRead("product.product", [], ["id"]);
        const totalStock = await this.orm.searchRead("product.product", [], ["qty_available"]);
        const totalStockValue = await this.orm.searchRead("product.product", [], ["qty_available", "standard_price"]);
        const stockMovements = await this.orm.searchRead("stock.move", [], ["id"]);

        this.stats.totalProducts = totalProducts.length;
        this.stats.totalStock = totalStock.reduce((sum, product) => sum + product.qty_available, 0);
        this.stats.totalStockValue = totalStockValue.reduce((sum, product) => sum + (product.qty_available * product.standard_price), 0);
        this.stats.stockMovements = stockMovements.length;
    }

    renderChart() {
        const labels = this.data.map(item => item.name || "Unknown Product");
        const data = this.data.map(item => item.qty_available || 0);
        const color = labels.map((_, index) => getColor(index));
    
        if (this.chart) this.chart.destroy();
        if (this.charttwo) this.charttwo.destroy();
        if (this.chartthree) this.chartthree.destroy();
    
        this.chart = new Chart(this.canvasRef.el, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Product Stock',
                        data: data,
                        backgroundColor: color,
                    },
                ],
            },
        });
    
        this.charttwo = new Chart(this.canvasReftwo.el, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Product Stock',
                        data: data,
                        backgroundColor: color,
                        borderColor: color,
                        fill: false,
                    },
                ],
            },
        });

        this.chartthree = new Chart(this.canvasRefthree.el, {
            type: "pie",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Product Stock',
                        data: data,
                        backgroundColor: color,
                    },
                ],
            },
        });
    }

    onSearchQueryChange(event) {
        this.searchQuery.value = event.target.value;
        this.fetchData();
    }

    goToInventoryPage(filter) {
        const domain = [];

        if (filter === "products") {
            domain.push(["type", "=", "product"]);
        } else if (filter === "stock") {
            domain.push(["qty_available", ">", 0]);
        } else if (filter === "stock_value") {
            domain.push(["standard_price", ">", 0]);
        } else if (filter === "stock_movements") {
            domain.push(["state", "=", "done"]);
        }

        if (this.action) {
            this.action.doAction({
                type: "ir.actions.act_window",
                res_model: "product.product",
                view_mode: "list",
                views: [[false, "list"]],
                target: "current",
                domain: domain,
            });
        } else {
            console.error("Action service is not available.");
        }
    }
}

ChartjsSampleInventory.template = "chart_sample.chartjs_sample_inventory";

actionRegistry.add("chartjs_sample_inventory", ChartjsSampleInventory);