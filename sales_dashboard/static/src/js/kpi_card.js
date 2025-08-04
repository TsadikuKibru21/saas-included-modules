/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
import { loadJS } from "@web/core/assets";
import { getColor } from "@web/core/colors/colors";

const actionRegistry = registry.category("actions");

export class PurchaseChart extends Component {
    setup() {   
        this.orm = useService('orm');
        this.action = useService("action");
        this.data = useState([]);
        this.filterType = useState({ value: "purchase" });
        this.dateRange = useState({ value: "" });
        this.startDate = useState({ value: "" });
        this.endDate = useState({ value: "" });
        this.searchQuery = useState({ value: "" });

        this.stats = useState({
            totalPurchases: 0,
            totalRFQs: 0,
            totalOrders: 0,
            totalSpent: 0,
            purchasePercent: 0,
            rfqPercent: 0,
            ordersPercent: 0,
            spentPercent: 0,
        });

        this.canvasRef = useRef("canvas");
        this.canvasReftwo = useRef("canvastwo");
        this.canvasRefthree = useRef("canvasthree");

        onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));

        onMounted(() => {
            this.fetchData();
            this.fetchStats();
        
            // Add event listeners if elements exist
            const topSuppliersBtn = document.getElementById("topSuppliersBtn");
            const topProductsBtn = document.getElementById("topProductsBtn");
            const purchaseCard = document.getElementById("purchaseCard");
            const rfqCard = document.getElementById("rfqCard");
            const ordersCard = document.getElementById("ordersCard");
            const spentCard = document.getElementById("spentCard");
        
            if (topSuppliersBtn) topSuppliersBtn.addEventListener("click", this.showTopSuppliers);
            if (topProductsBtn) topProductsBtn.addEventListener("click", this.showTopProducts);
            if (purchaseCard) purchaseCard.addEventListener("click", () => this.goToPurchasesPage("purchase"));
            if (rfqCard) rfqCard.addEventListener("click", () => this.goToPurchasesPage("rfq"));
            if (ordersCard) ordersCard.addEventListener("click", () => this.goToPurchasesPage("order"));
            if (spentCard) spentCard.addEventListener("click", () => this.goToPurchasesPage("spent"));
        });

        onWillUnmount(() => {
            if (this.chart) this.chart.destroy();
            if (this.charttwo) this.charttwo.destroy();
            if (this.chartthree) this.chartthree.destroy();
        });
    }

    async fetchData() {
        const domain = [];
        
        if (this.filterType.value) {
            domain.push(['state', '=', this.filterType.value]);
        }
        if (this.dateRange.value) {
            const [startDate, endDate] = this.dateRange.value.split(" - ");
            domain.push(['date_order', '>=', startDate]);
            domain.push(['date_order', '<=', endDate]);
        }
        if (this.searchQuery.value) {
            domain.push(['name', 'ilike', this.searchQuery.value]);
        }
    
        this.data = await this.orm.searchRead("purchase.order.line", domain, ["product_id", "order_id", "price_total"]);
        console.log('Fetched data:', this.data);
        this.renderChart();
    }

    async fetchStats() {
        const totalPurchases = await this.orm.searchRead("purchase.order", [['state', '=', 'purchase']], ["amount_total"]);
        const totalRFQs = await this.orm.searchRead("purchase.order", [['state', '=', 'rfq']], ["amount_total"]);
        const totalOrders = await this.orm.searchRead("purchase.order", [['state', 'in', ['purchase', 'rfq']]], ["amount_total"]);
        const totalSpent = await this.orm.searchRead("purchase.order", [['state', '=', 'purchase']], ["amount_total"]);

        const totalSpentAmount = totalSpent.reduce((sum, order) => sum + order.amount_total, 0);
        
        this.stats.totalPurchases = totalPurchases.length;
        this.stats.totalRFQs = totalRFQs.length;
        this.stats.totalOrders = totalOrders.length;
        this.stats.totalSpent = totalSpentAmount;
        
        this.stats.purchasePercent = (totalPurchases.length / totalOrders.length) * 100 || 0;
        this.stats.rfqPercent = (totalRFQs.length / totalOrders.length) * 100 || 0;
        this.stats.ordersPercent = (totalOrders.length / totalOrders.length) * 100 || 0;
        this.stats.spentPercent = 100;
    }

    renderChart() {
        const labels = this.data.map(item => item.order_id[1] || "Unknown Order");
        const data = this.data.map(item => item.price_total || 0);
        const color = labels.map((_, index) => getColor(index));

        if (this.chart) this.chart.destroy();
        if (this.charttwo) this.charttwo.destroy();
        if (this.chartthree) this.chartthree.destroy();

        this.chart = new Chart(this.canvasRef.el, {
            type: "bar",    
            data: {
                labels: labels,
                datasets: [
                    { label: 'Top Purchase Orders', data: data, backgroundColor: color },
                ],
            },
        });

        const productLabels = this.data.map(item => item.product_id[1] || "Unknown Product");
        this.charttwo = new Chart(this.canvasReftwo.el, {
            type: "pie",
            data: {
                labels: productLabels,
                datasets: [
                    { label: 'Top Purchased Products', data: data, backgroundColor: color },
                ],
            },
        });

        this.chartthree = new Chart(this.canvasRefthree.el, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    { label: 'Top Purchase Orders', data: data, backgroundColor: color, borderColor: color, fill: false },
                ],
            },
        });
    }
    onSearchQueryChange(event) {
        this.searchQuery.value = event.target.value;
        this.fetchData();
    }
    goToPurchasesPage(filter) {
        const domain = [];

        if (filter === "purchase") {
            domain.push(["state", "=", "purchase"]);
        } else if (filter === "rfq") {
            domain.push(["state", "=", "rfq"]);
        } else if (filter === "order") {
            domain.push(["state", "in", ["purchase", "rfq"]]);
        } else if (filter === "spent") {
            domain.push(["state", "=", "purchase"]);
        }

        if (this.action) {
            this.action.doAction({
                type: "ir.actions.act_window",
                res_model: "purchase.order",
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

PurchaseChart.template = "chart_sample.purchase_chart";
actionRegistry.add("purchase_chart", PurchaseChart);