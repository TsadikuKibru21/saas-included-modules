// /** @odoo-module **/

// import { registry } from "@web/core/registry";
// import { useService } from "@web/core/utils/hooks";
// import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
// import { loadJS } from "@web/core/assets";
// import { getColor } from "@web/core/colors/colors";

// const actionRegistry = registry.category("actions");

// export class ChartjsSampleManufacturing extends Component {
//     setup() {
//         this.orm = useService('orm');
//         this.action = useService("action");
//         this.data = useState({});
//         this.filterType = useState({ value: "all" });
//         this.searchQuery = useState({ value: "" });
//         this.stats = useState({
//             totalManufacturedProducts: 0,
//             totalWorkCenters: 0,
//             totalWorkOrders: 0,
//             totalOperations: 0,
//         });
//         this.canvasRef = useRef("canvas");
//         this.canvasReftwo = useRef("canvastwo");
//         this.canvasRefthree = useRef("canvasthree");
//         this.canvasRefDoughnut = useRef("canvasDoughnut");
//         this.canvasRefLeave = useRef("canvasLeave");

//         onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));

//         onMounted(() => {
//             this.fetchData();
//         });

//         onWillUnmount(() => {
//             if (this.chart) {
//                 this.chart.destroy();
//             }
//             if (this.charttwo) {
//                 this.charttwo.destroy();
//             }
//             if (this.chartthree) {
//                 this.chartthree.destroy();
//             }
//             if (this.chartDoughnut) {
//                 this.chartDoughnut.destroy();
//             }
//             if (this.chartLeave) {
//                 this.chartLeave.destroy();
//             }
//         });

//         // Bind methods to ensure correct `this` context
//         this.goToManufacturingPage = this.goToManufacturingPage.bind(this);
//         this.fetchData = this.fetchData.bind(this);
//         this.renderChart = this.renderChart.bind(this);
//         this.onSearchQueryChange = this.onSearchQueryChange.bind(this);
//     }

//     async fetchData() {
//         const manufacturingMetrics = await this.orm.call("mrp.production", "get_manufacturing_metrics_chart");
//         console.log('Fetched Manufacturing metrics:', manufacturingMetrics);

//         this.stats.totalManufacturedProducts = manufacturingMetrics.total_manufactured_products;
//         this.stats.totalWorkCenters = manufacturingMetrics.total_work_centers;
//         this.stats.totalWorkOrders = manufacturingMetrics.total_work_orders;
//         this.stats.totalOperations = manufacturingMetrics.total_operations;

//         this.data = manufacturingMetrics;

//         this.renderChart();
//     }

//     renderChart() {
//         const productLabels = this.data.top_manufactured_products.labels || [];
//         const productData = this.data.top_manufactured_products.data || [];
//         const productColor = productLabels.map((_, index) => getColor(index));

//         const workCenterLabels = this.data.top_work_centers.labels || [];
//         const workCenterData = this.data.top_work_centers.data || [];
//         const workCenterColor = workCenterLabels.map((_, index) => getColor(index));

//         if (this.chart) this.chart.destroy();
//         if (this.charttwo) this.charttwo.destroy();
//         if (this.chartthree) this.chartthree.destroy();
//         if (this.chartDoughnut) this.chartDoughnut.destroy();
//         if (this.chartLeave) this.chartLeave.destroy();

//         this.chart = new Chart(this.canvasRef.el, {
//             type: "bar",
//             data: {
//                 labels: productLabels,
//                 datasets: [
//                     {
//                         label: 'Top Manufactured Products',
//                         data: productData,
//                         backgroundColor: productColor,
//                     },
//                 ],
//             },
//         });

//         this.charttwo = new Chart(this.canvasReftwo.el, {
//             type: "line",
//             data: {
//                 labels: workCenterLabels,
//                 datasets: [
//                     {
//                         label: 'Top Work Centers',
//                         data: workCenterData,
//                         backgroundColor: workCenterColor,
//                         borderColor: workCenterColor,
//                         fill: false,
//                     },
//                 ],
//             },
//         });

//         this.chartthree = new Chart(this.canvasRefthree.el, {
//             type: "pie",
//             data: {
//                 labels: productLabels,
//                 datasets: [
//                     {
//                         label: 'Top Manufactured Products',
//                         data: productData,
//                         backgroundColor: productColor,
//                     },
//                 ],
//             },
//         });

//         this.chartDoughnut = new Chart(this.canvasRefDoughnut.el, {
//             type: "doughnut",
//             data: {
//                 labels: workCenterLabels,
//                 datasets: [
//                     {
//                         label: 'Top Work Centers',
//                         data: workCenterData,
//                         backgroundColor: workCenterColor,
//                     },
//                 ],
//             },
//         });

//         this.chartLeave = new Chart(this.canvasRefLeave.el, {
//             type: "bar",
//             data: {
//                 labels: productLabels,
//                 datasets: [
//                     {
//                         label: 'Top Manufactured Products',
//                         data: productData,
//                         backgroundColor: productColor,
//                     },
//                 ],
//             },
//         });
//     }

//     onSearchQueryChange(event) {
//         this.searchQuery.value = event.target.value;
//         this.fetchData();
//     }

//     goToManufacturingPage(filter) {
//         let resModel = "mrp.production"; // Default model
//         let domain = [];

//         if (filter === "products") {
//             resModel = "product.product";
//             domain.push(["type", "=", "product"]);
//         } else if (filter === "workCenters") {
//             resModel = "mrp.workcenter";
//         } else if (filter === "workOrders") {
//             resModel = "mrp.workorder";
//         } else if (filter === "operations") {
//             resModel = "mrp.operation";
//         }

//         if (this.action) {
//             this.action.doAction({
//                 type: "ir.actions.act_window",
//                 res_model: resModel,
//                 view_mode: "list",
//                 views: [[false, "list"]],
//                 target: "current",
//                 domain: domain,
//             });
//         } else {
//             console.error("Action service is not available.");
//         }
//     }
// }

// ChartjsSampleManufacturing.template = "chart_sample.chartjs_sample_manufacturing";

// actionRegistry.add("chartjs_sample_manufacturing", ChartjsSampleManufacturing);


/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
import { loadJS } from "@web/core/assets";
import { getColor } from "@web/core/colors/colors";

const actionRegistry = registry.category("actions");

export class ChartjsSampleManufacturing extends Component {
    setup() {
        this.orm = useService('orm');
        this.action = useService("action");
        this.data = useState([]);
        this.filterType = useState({ value: "all" });
        this.searchQuery = useState({ value: "" });
        this.stats = useState({
            totalManufacturedProducts: 0,
            totalWorkCenters: 0,
            totalWorkOrders: 0,
            totalOperations: 0,
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
        this.goToManufacturingPage = this.goToManufacturingPage.bind(this);
        this.fetchData = this.fetchData.bind(this);
        this.fetchStats = this.fetchStats.bind(this);
        this.renderChart = this.renderChart.bind(this);
        this.onSearchQueryChange = this.onSearchQueryChange.bind(this);
    }

    async fetchData() {
        const domain = [];
        
        if (this.filterType.value && this.filterType.value !== "all") {
            domain.push(['type', '=', this.filterType.value]);
        }
        if (this.searchQuery.value) {
            domain.push(['name', 'ilike', this.searchQuery.value]);
        }
    
        const products = await this.orm.searchRead("mrp.production", domain, ["id", "name", "state", "product_qty"]);
        console.log('Fetched products:', products);

        this.data = products;
        this.renderChart();
    }

    async fetchStats() {
        const totalManufacturedProducts = await this.orm.searchRead("mrp.production", [], ["id"]);
        const totalWorkCenters = await this.orm.searchRead("mrp.workcenter", [], ["id"]);
        const totalWorkOrders = await this.orm.searchRead("mrp.workorder", [], ["id"]);
        const totalOperations = await this.orm.searchRead("mrp.routing.workcenter", [], ["id"]);

        this.stats.totalManufacturedProducts = totalManufacturedProducts.length;
        this.stats.totalWorkCenters = totalWorkCenters.length;
        this.stats.totalWorkOrders = totalWorkOrders.length;
        this.stats.totalOperations = totalOperations.length;
    }

    renderChart() {
        const labels = this.data.map(item => item.name || "Unknown Product");
        const data = this.data.map(item => item.product_qty || 0);
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
                        label: 'Manufactured Quantity',
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
                        label: 'Manufactured Quantity',
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
                        label: 'Manufactured Quantity',
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

    goToManufacturingPage(filter) {
        const domain = [];

        if (filter === "products") {
            domain.push(["state", "=", "done"]);
        } else if (filter === "workCenters") {
            domain.push(["state", "=", "done"]);
        } else if (filter === "workOrders") {
            domain.push(["state", "=", "done"]);
        } else if (filter === "operations") {
            domain.push(["state", "=", "done"]);
        }

        if (this.action) {
            this.action.doAction({
                type: "ir.actions.act_window",
                res_model: "mrp.production",
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

ChartjsSampleManufacturing.template = "chart_sample.chartjs_sample_manufacturing";

actionRegistry.add("chartjs_sample_manufacturing", ChartjsSampleManufacturing);