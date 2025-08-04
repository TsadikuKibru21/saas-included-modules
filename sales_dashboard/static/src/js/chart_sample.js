// // // // /** @odoo-module **/

// // // // import { registry } from "@web/core/registry";
// // // // import { useService } from "@web/core/utils/hooks";

// // // // import { Component, onWillStart, useRef, onMounted, onWillUnmount,useState } from "@odoo/owl";
// // // // import { loadJS } from "@web/core/assets";
// // // // import { getColor } from "@web/core/colors/colors";

// // // // const actionRegistry = registry.category("actions");


// // // // export class ChartjsSample extends Component {
// // // //     async setup(){
// // // //         this.orm = useService('orm');
// // // //         this.data = useState([])
// // // //         console.log("I am called")
// // // //         this.canvasRef = useRef("canvas");
// // // //         this.canvasReftwo = useRef("canvastwo");
// // // //         onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));
// // // //         onMounted(() => {
// // // //             this.renderChart();
// // // //         });
        
// // // //         onWillUnmount(() => {
// // // //             this.chart.destroy();
// // // //             this.charttwo.destroy();
// // // //         });

// // // //         this.data = await this.orm.searchRead("sale.order", [], ["name", "partner_id", "amount_total"]);
// // // //         console.log('heyy dani it is me',this.data)


// // // //     }

// // // //     renderChart() {
// // // //         const labels = this.data.map(item => item.name);        ;
// // // //         const data = this.data.map(item => item.amount_total);
// // // //         const color = labels.map((_, index) => getColor(index));
// // // //         this.chart = new Chart(this.canvasRef.el, {
// // // //             type: "bar",
// // // //             data: {
// // // //                 labels: labels,
// // // //                 datasets: [
// // // //                     {
// // // //                         label: labels,
// // // //                         data: data,
// // // //                         backgroundColor: color,
// // // //                     },
// // // //                 ],
// // // //             },
// // // //         });

// // // //         this.charttwo = new Chart(this.canvasReftwo.el, {
// // // //             type: "pie",
// // // //             data: {
// // // //                 labels: labels,
// // // //                 datasets: [
// // // //                     {
// // // //                         label: labels,
// // // //                         data: data,
// // // //                         backgroundColor: color,
// // // //                     },
// // // //                 ],
// // // //             },
// // // //         });
// // // //     }
    
// // // // }

// // // // ChartjsSample.template="sales_dashboard.chartjs_sample"


// // // // actionRegistry.add("chartjs_sample", ChartjsSample);


// // // // #############################################################


// // // /** @odoo-module **/

// // // import { registry } from "@web/core/registry";
// // // import { useService } from "@web/core/utils/hooks";

// // // import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
// // // import { loadJS } from "@web/core/assets";
// // // import { getColor } from "@web/core/colors/colors";

// // // const actionRegistry = registry.category("actions");

// // // export class ChartjsSample extends Component {
// // //     async setup() {
// // //         this.orm = useService('orm');
// // //         this.data = useState([]);
// // //         console.log("I am called");
// // //         this.canvasRef = useRef("canvas");
// // //         this.canvasReftwo = useRef("canvastwo");
// // //         this.canvasRefthree = useRef("canvasthree"); // New canvas reference

// // //         onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));
// // //         onMounted(() => {
// // //             this.renderChart();
// // //         });

// // //         onWillUnmount(() => {
// // //             this.chart.destroy();
// // //             this.charttwo.destroy();
// // //             this.chartthree.destroy(); // Destroy the new chart
// // //         });

// // //         this.data = await this.orm.searchRead("sale.order", [], ["name", "partner_id", "amount_total"]);
// // //         console.log('heyy dani it is me', this.data);
// // //     }

// // //     renderChart() {
// // //         const labels = this.data.map(item => item.name);
// // //         const data = this.data.map(item => item.amount_total);
// // //         const color = labels.map((_, index) => getColor(index));

// // //         this.chart = new Chart(this.canvasRef.el, {
// // //             type: "bar",
// // //             data: {
// // //                 labels: labels,
// // //                 datasets: [
// // //                     {
// // //                         label: labels,
// // //                         data: data,
// // //                         backgroundColor: color,
// // //                     },
// // //                 ],
// // //             },
// // //         });

// // //         this.charttwo = new Chart(this.canvasReftwo.el, {
// // //             type: "pie",
// // //             data: {
// // //                 labels: labels,
// // //                 datasets: [
// // //                     {
// // //                         label: labels,
// // //                         data: data,
// // //                         backgroundColor: color,
// // //                     },
// // //                 ],
// // //             },
// // //         });

// // //         this.chartthree = new Chart(this.canvasRefthree.el, { // New chart
// // //             type: "line",
// // //             data: {
// // //                 labels: labels,
// // //                 datasets: [
// // //                     {
// // //                         label: labels,
// // //                         data: data,
// // //                         backgroundColor: color,
// // //                         borderColor: color,
// // //                         fill: false,
// // //                     },
// // //                 ],
// // //             },
// // //         });
// // //     }
// // // }

// // // ChartjsSample.template = "sales_dashboard.chartjs_sample";

// // // actionRegistry.add("chartjs_sample", ChartjsSample);



// // /** @odoo-module **/

// // import { registry } from "@web/core/registry";
// // import { useService } from "@web/core/utils/hooks";

// // import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
// // import { loadJS } from "@web/core/assets";
// // import { getColor } from "@web/core/colors/colors";

// // const actionRegistry = registry.category("actions");

// // export class ChartjsSample extends Component {
// //     setup() {
// //         this.orm = useService('orm');
// //         this.data = useState([]);
// //         this.filterType = useState({ value: "sale" });
// //         this.dateRange = useState({ value: "" });
// //         this.searchQuery = useState({ value: "" });
// //         console.log("I am called");
// //         this.canvasRef = useRef("canvas");
// //         this.canvasReftwo = useRef("canvastwo");
// //         this.canvasRefthree = useRef("canvasthree"); // New canvas reference

// //         onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));
// //         onMounted(() => {
// //             this.fetchData();
// //         });

// //         onWillUnmount(() => {
// //             this.chart.destroy();
// //             this.charttwo.destroy();
// //             this.chartthree.destroy(); // Destroy the new chart
// //         });
// //     }

// //     async fetchData() {
// //         const domain = [];
// //         if (this.filterType.value) {
// //             domain.push(['state', '=', this.filterType.value]);
// //         }
// //         if (this.dateRange.value) {
// //             const [startDate, endDate] = this.dateRange.value.split(" - ");
// //             domain.push(['date_order', '>=', startDate]);
// //             domain.push(['date_order', '<=', endDate]);
// //         }
// //         if (this.searchQuery.value) {
// //             domain.push(['name', 'ilike', this.searchQuery.value]);
// //         }
// //         this.data = await this.orm.searchRead("sale.order", domain, ["name", "partner_id", "amount_total"]);
// //         console.log('Fetched data:', this.data);
// //         this.renderChart();
// //     }

// //     renderChart() {
// //         const labels = this.data.map(item => item.name);
// //         const data = this.data.map(item => item.amount_total);
// //         const color = labels.map((_, index) => getColor(index));

// //         if (this.chart) this.chart.destroy();
// //         if (this.charttwo) this.charttwo.destroy();
// //         if (this.chartthree) this.chartthree.destroy();

// //         this.chart = new Chart(this.canvasRef.el, {
// //             type: "bar",
// //             data: {
// //                 labels: labels,
// //                 datasets: [
// //                     {
// //                         label: 'Sales',
// //                         data: data,
// //                         backgroundColor: color,
// //                     },
// //                 ],
// //             },
// //         });

// //         this.charttwo = new Chart(this.canvasReftwo.el, {
// //             type: "pie",
// //             data: {
// //                 labels: labels,
// //                 datasets: [
// //                     {
// //                         label: 'Sales',
// //                         data: data,
// //                         backgroundColor: color,
// //                     },
// //                 ],
// //             },
// //         });

// //         this.chartthree = new Chart(this.canvasRefthree.el, { // New chart
// //             type: "line",
// //             data: {
// //                 labels: labels,
// //                 datasets: [
// //                     {
// //                         label: 'Sales',
// //                         data: data,
// //                         backgroundColor: color,
// //                         borderColor: color,
// //                         fill: false,
// //                     },
// //                 ],
// //             },
// //         });
// //     }

// //     onFilterChange(event) {
// //         this.filterType.value = event.target.value;
// //         this.fetchData();
// //     }

// //     onDateRangeChange(event) {
// //         this.dateRange.value = event.target.value;
// //         this.fetchData();
// //     }

// //     onSearchQueryChange(event) {
// //         this.searchQuery.value = event.target.value;
// //         this.fetchData();
// //     }
// // }

// // ChartjsSample.template = "sales_dashboard.chartjs_sample";

// // actionRegistry.add("chartjs_sample", ChartjsSample);



// /** @odoo-module **/

// import { registry } from "@web/core/registry";
// import { useService } from "@web/core/utils/hooks";

// import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
// import { loadJS } from "@web/core/assets";
// import { getColor } from "@web/core/colors/colors";

// const actionRegistry = registry.category("actions");

// export class ChartjsSample extends Component {
//     setup() {
//         this.orm = useService('orm');
//         this.data = useState([]);
//         this.filterType = useState({ value: "sale" });
//         this.dateRange = useState({ value: "" });
//         this.searchQuery = useState({ value: "" });
//         this.stats = useState({
//             totalSales: 0,
//             totalQuotations: 0,
//             totalOrders: 0,
//             totalRevenue: 0,
//             salesPercent: 0,
//             quotationsPercent: 0,
//             ordersPercent: 0,
//             revenuePercent: 0,
//         });
//         console.log("I am called");
//         this.canvasRef = useRef("canvas");
//         this.canvasReftwo = useRef("canvastwo");
//         this.canvasRefthree = useRef("canvasthree"); // New canvas reference

//         onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));
//         onMounted(() => {
//             this.fetchData();
//             this.fetchStats();
//         });

//         onWillUnmount(() => {
//             this.chart.destroy();
//             this.charttwo.destroy();
//             this.chartthree.destroy(); // Destroy the new chart
//         });
//     }

//     async fetchData() {
//         const domain = [];
//         if (this.filterType.value) {
//             domain.push(['state', '=', this.filterType.value]);
//         }
//         if (this.dateRange.value) {
//             const [startDate, endDate] = this.dateRange.value.split(" - ");
//             domain.push(['date_order', '>=', startDate]);
//             domain.push(['date_order', '<=', endDate]);
//         }
//         if (this.searchQuery.value) {
//             domain.push(['name', 'ilike', this.searchQuery.value]);
//         }
//         this.data = await this.orm.searchRead("sale.order", domain, ["name", "partner_id", "amount_total"]);
//         console.log('Fetched data:', this.data);
//         this.renderChart();
//     }

//     async fetchStats() {
//         const totalSales = await this.orm.searchRead("sale.order", [['state', '=', 'sale']], ["amount_total"]);
//         const totalQuotations = await this.orm.searchRead("sale.order", [['state', '=', 'sent']], ["amount_total"]);
//         const totalOrders = await this.orm.searchRead("sale.order", [['state', 'in', ['sale', 'done']]], ["amount_total"]);
//         const totalRevenue = await this.orm.searchRead("sale.order", [['state', '=', 'done']], ["amount_total"]);

//         const totalSalesAmount = totalSales.reduce((sum, order) => sum + order.amount_total, 0);
//         const totalQuotationsAmount = totalQuotations.reduce((sum, order) => sum + order.amount_total, 0);
//         const totalOrdersAmount = totalOrders.reduce((sum, order) => sum + order.amount_total, 0);
//         const totalRevenueAmount = totalRevenue.reduce((sum, order) => sum + order.amount_total, 0);

//         this.stats.totalSales = totalSales.length;
//         this.stats.totalQuotations = totalQuotations.length;
//         this.stats.totalOrders = totalOrders.length;
//         this.stats.totalRevenue = totalRevenueAmount;

//         // Calculate percentages (example logic, adjust as needed)
//         this.stats.salesPercent = (totalSalesAmount / totalRevenueAmount) * 100;
//         this.stats.quotationsPercent = (totalQuotationsAmount / totalRevenueAmount) * 100;
//         this.stats.ordersPercent = (totalOrdersAmount / totalRevenueAmount) * 100;
//         this.stats.revenuePercent = 100; // Total revenue is 100% of itself
//     }

//     renderChart() {
//         const labels = this.data.map(item => item.name);
//         const data = this.data.map(item => item.amount_total);
//         const color = labels.map((_, index) => getColor(index));

//         if (this.chart) this.chart.destroy();
//         if (this.charttwo) this.charttwo.destroy();
//         if (this.chartthree) this.chartthree.destroy();

//         this.chart = new Chart(this.canvasRef.el, {
//             type: "bar",
//             data: {
//                 labels: labels,
//                 datasets: [
//                     {
//                         label: 'Sales',
//                         data: data,
//                         backgroundColor: color,
//                     },
//                 ],
//             },
//         });

//         this.charttwo = new Chart(this.canvasReftwo.el, {
//             type: "pie",
//             data: {
//                 labels: labels,
//                 datasets: [
//                     {
//                         label: 'Sales',
//                         data: data,
//                         backgroundColor: color,
//                     },
//                 ],
//             },
//         });

//         this.chartthree = new Chart(this.canvasRefthree.el, { // New chart
//             type: "line",
//             data: {
//                 labels: labels,
//                 datasets: [
//                     {
//                         label: 'Sales',
//                         data: data,
//                         backgroundColor: color,
//                         borderColor: color,
//                         fill: false,
//                     },
//                 ],
//             },
//         });
//     }

//     onFilterChange(event) {
//         this.filterType.value = event.target.value;
//         this.fetchData();
//     }

//     onDateRangeChange(event) {
//         this.dateRange.value = event.target.value;
//         this.fetchData();
//     }

//     onSearchQueryChange(event) {
//         this.searchQuery.value = event.target.value;
//         this.fetchData();
//     }
// }

// ChartjsSample.template = "sales_dashboard.chartjs_sample";

// actionRegistry.add("chartjs_sample", ChartjsSample);


/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
import { loadJS } from "@web/core/assets";
import { getColor } from "@web/core/colors/colors";

const actionRegistry = registry.category("actions");

export class ChartjsSample extends Component {
    setup() {   
        this.orm = useService('orm');
        this.action = useService("action");  // ✅ Get access to Odoo's action manager
        this.data = useState([]);
        this.filterType = useState({ value: "sale" });
        this.dateRange = useState({ value: "" });
        this.startDate = useState({ value: "" });
        this.endDate = useState({ value: "" });
        this.searchQuery = useState({ value: "" });
        this.stats = useState({
            totalSales: 0,
            totalQuotations: 0,
            totalOrders: 0,
            totalRevenue: 0,
            salesPercent: 0,
            quotationsPercent: 0,
            ordersPercent: 0,
            revenuePercent: 0,
        });
        console.log("I am called");
        this.canvasRef = useRef("canvas");
        this.canvasReftwo = useRef("canvastwo");
        this.canvasRefthree = useRef("canvasthree"); // New canvas reference

        onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));
        
//     async fetchData() {
//         const domain = [];
//         if (this.filterType.value) {
//             domain.push(['state', '=', this.filterType.value]);
//         }
//         if (this.dateRange.value) {
//             const [startDate, endDate] = this.dateRange.value.split(" - ");
//             domain.push(['date_order', '>=', startDate]);
//             domain.push(['date_order', '<=', endDate]);
//         }
//         if (this.searchQuery.value) {
//             domain.push(['name', 'ilike', this.searchQuery.value]);
//         }
//         this.data = await this.orm.searchRead("sale.order", domain, ["name", "partner_id", "amount_total"]);
//         console.log('Fetched data:', this.data);
//         this.renderChart();
//     }


        // onMounted(() => {
        //     this.fetchData();
        //     this.fetchStats();
        //     document.getElementById("topCustomersBtn").addEventListener("click", this.showTopCustomers);
        //     document.getElementById("topProductsBtn").addEventListener("click", this.showTopProducts);
        //     document.getElementById("salesCard").addEventListener("click", () => this.goToSalesPage("sale"));
        //     document.getElementById("quotationsCard").addEventListener("click", () => this.goToSalesPage("quotation"));
        //     document.getElementById("ordersCard").addEventListener("click", () => this.goToSalesPage("order"));
        //     document.getElementById("revenueCard").addEventListener("click", () => this.goToSalesPage("revenue"));
        //     document.getElementById("topCustomersBtn").addEventListener("click", this.showTopCustomers);
        //     document.getElementById("topProductsBtn").addEventListener("click", this.showTopProducts);
        //     document.getElementById("topSalesOrdersBtn").addEventListener("click", this.showTopSalesOrders);
        //     document.getElementById("topQuotationsBtn").addEventListener("click", this.showTopQuotations);

        //     const chartElement = document.getElementById('myChart');
        //     if (chartElement) {
        //         chartElement.addEventListener('click', handleChartClick);
        //     }

        //     window.addEventListener('load', function() {
        //         const chartElement = document.getElementById('myChart');
        //         if (chartElement) {
        //             new Chart(chartElement, { /* chart options */ });
        //         }
        //     });
            
        // });

        onMounted(() => {
            this.fetchData();
            this.fetchStats();
        
            // Check if elements exist before adding event listeners
            const topCustomersBtn = document.getElementById("topCustomersBtn");
            const topProductsBtn = document.getElementById("topProductsBtn");
            const salesCard = document.getElementById("salesCard");
            const quotationsCard = document.getElementById("quotationsCard");
            const ordersCard = document.getElementById("ordersCard");
            const revenueCard = document.getElementById("revenueCard");
            const topSalesOrdersBtn = document.getElementById("topSalesOrdersBtn");
            const topQuotationsBtn = document.getElementById("topQuotationsBtn");
            const chartElement = document.getElementById('myChart');
        
            // Add event listeners only if elements are present
            if (topCustomersBtn) {
                topCustomersBtn.addEventListener("click", this.showTopCustomers);
            }
            if (topProductsBtn) {
                topProductsBtn.addEventListener("click", this.showTopProducts);
            }
            if (salesCard) {
                salesCard.addEventListener("click", () => this.goToSalesPage("sale"));
            }
            if (quotationsCard) {
                quotationsCard.addEventListener("click", () => this.goToSalesPage("quotation"));
            }
            if (ordersCard) {
                ordersCard.addEventListener("click", () => this.goToSalesPage("order"));
            }
            if (revenueCard) {
                revenueCard.addEventListener("click", () => this.goToSalesPage("revenue"));
            }
            if (topSalesOrdersBtn) {
                topSalesOrdersBtn.addEventListener("click", this.showTopSalesOrders);
            }
            if (topQuotationsBtn) {
                topQuotationsBtn.addEventListener("click", this.showTopQuotations);
            }
        
            // Check if the chart element exists and attach the event listener
            if (chartElement) {
                chartElement.addEventListener('click', handleChartClick);
        
                // Initialize chart on window load
                window.addEventListener('load', function () {
                    if (chartElement) {
                        new Chart(chartElement, { /* chart options */ });
                    }
                });
            }
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
    
        // Fetching data for Top Sales Orders, Top Customers, and Top Products
        // this.data = await this.orm.searchRead("sale.order", domain, ["name", "partner_id", "product_id", "amount_total"]);
        // Fetch data from sale.order.line (instead of sale.order) to access product_id
        this.data = await this.orm.searchRead("sale.order.line", domain, ["product_id", "order_id", "price_total"]);
      
        this.sales_data = await this.orm.call("sale.order", "get_top_customers_chart", []);     
        
        console.log('Fetched data:', this.data);
        this.renderChart();
    }

    
    
    async fetchStats() {
        const totalSales = await this.orm.searchRead("sale.order", [['state', '=', 'sale']], ["amount_total"]);
        const totalQuotations = await this.orm.searchRead("sale.order", [['state', 'in', ['draft', 'sent']]], ["amount_total"]);
        const totalOrders = await this.orm.searchRead("sale.order", [['state', 'in', ['sale', 'draft','sent']]], ["amount_total"]);
        const totalRevenue = await this.orm.searchRead("sale.order", [['state', '=', 'sale']], ["amount_total"]);
    
        const totalSalesAmount = totalSales.reduce((sum, order) => sum + order.amount_total, 0);
        const totalQuotationsAmount = totalQuotations.reduce((sum, order) => sum + order.amount_total, 0);
        const totalOrdersAmount = totalOrders.reduce((sum, order) => sum + order.amount_total, 0);
        const totalRevenueAmount = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(totalRevenue.reduce((sum, order) => sum + order.amount_total, 0));
    
        this.stats.totalSales = totalSales.length;
        this.stats.totalQuotations = totalQuotations.length;
        this.stats.totalOrders = totalOrders.length;
        this.stats.totalRevenue = totalRevenueAmount;
    
        // Calculate percentages (example logic, adjust as needed)
        this.stats.salesPercent = (totalSalesAmount / totalRevenueAmount) * 100;
        this.stats.quotationsPercent = (totalQuotationsAmount / totalRevenueAmount) * 100;
        this.stats.ordersPercent = (totalOrdersAmount / totalRevenueAmount) * 100;
        this.stats.revenuePercent = 100; // Total revenue is 100% of itself
    }
    

    // renderChart() {
    //     const labels = this.data.map(item => item.partner_id[1]); // Assuming partner_id is customer
    //     const data = this.data.map(item => item.amount_total);
    //     const color = labels.map((_, index) => getColor(index));
    
    //     if (this.chart) this.chart.destroy();
    //     if (this.charttwo) this.charttwo.destroy();
    //     if (this.chartthree) this.chartthree.destroy();
    
    //     this.chart = new Chart(this.canvasRef.el, {
    //         type: "bar",
    //         data: {
    //             labels: labels,
    //             datasets: [
    //                 {
    //                     label: 'Top Customers',
    //                     data: data,
    //                     backgroundColor: color,
    //                 },
    //             ],
    //         },
    //     });
    
    //     this.charttwo = new Chart(this.canvasReftwo.el, {
    //         type: "pie",
    //         data: {
    //             labels: labels,
    //             datasets: [
    //                 {
    //                     label: 'Top Products',
    //                     data: data,
    //                     backgroundColor: color,
    //                 },
    //             ],
    //         },
    //     });
    
    //     this.chartthree = new Chart(this.canvasRefthree.el, { // Line chart
    //         type: "line",
    //         data: {
    //             labels: labels,
    //             datasets: [
    //                 {
    //                     label: 'Top Sales Orders',
    //                     data: data,
    //                     backgroundColor: color,
    //                     borderColor: color,
    //                     fill: false,
    //                 },
    //             ],
    //         },
    //     });
    // }

    renderChart() {
        // Extracting the order ID for labels (or another field that suits your chart's labels)
        const labels = this.data.map(item => item.order_id[1] || "Unknown Order");
    
        // Extracting the price totals for chart data
        const data = this.data.map(item => item.price_total || 0);
    
        // Creating color based on the index
        const color = labels.map((_, index) => getColor(index));
    
        // Destroy existing charts if they exist
        if (this.chart) this.chart.destroy();
        if (this.charttwo) this.charttwo.destroy();
        if (this.chartthree) this.chartthree.destroy();
    
        // Creating bar chart for orders
        this.chart = new Chart(this.canvasRef.el, {
            type: "bar",
            data: {
                labels: this.sales_data.labels,
                datasets: [
                    {
                        label: 'Top 10 Customers',
                        data: this.sales_data.data,
                        backgroundColor: color,
                    },
                ],
            },
        });
    
        // Creating pie chart for products (using product_id as an example)
        const productLabels = this.data.map(item => item.product_id[1] || "Unknown Product");
        this.charttwo = new Chart(this.canvasReftwo.el, {
            type: "pie",
            data: {
                labels: productLabels,
                datasets: [
                    {
                        label: 'Top Products',
                        data: data,
                        backgroundColor: color,
                    },
                ],
            },
        });
    
        // Creating line chart for orders, reusing the same data
        this.chartthree = new Chart(this.canvasRefthree.el, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Top Sales Orders',
                        data: data,
                        backgroundColor: color,
                        borderColor: color,
                        fill: false,
                    },
                ],
            },
        });
    }
    
    
    onFilterChangenew(event) {
        this.filterType.value = event.target.value;
        this.fetchData();
    }

    onDateRangeChange(event) {
        this.dateRange.value = event.target.value;
        this.fetchData();
    }

    onSearchQueryChange(event) {
        this.searchQuery.value = event.target.value;
        this.fetchData();
    }
    onFilterChange(ev) {
    this.filterType = ev.target.value;
    this.updateCharts();
}

goToSalesPage(filter) {
    const domain = [];

    // Define filter logic based on the filter type passed
    if (filter === "sale") {
        domain.push(["state", "=", "sale"]);
    } else if (filter === "quotation") {
        domain.push(["state", "in", ["draft", "sent"]]);
    } else if (filter === "order") {
        domain.push(["state", "in", ["sale", "draft", "sent"]]);
    } else if (filter === "revenue") {
        // Apply filter for Total Revenue, you may adjust based on your needs
        domain.push(["state", "=", "sale"]); // Example: Show all sales for revenue
    }


    // Ensure the action service is available and properly initialized
    if (this.action) {
        this.action.doAction({
            type: "ir.actions.act_window",
            res_model: "sale.order",
            view_mode: "list",
            views: [[false, "list"]],
            target: "current",
            domain: domain, // Apply the appropriate filter
        });
    } else {
        console.error("Action service is not available.");
    }
}



filterChartOne() {
    this.filteredChart = "chartOne";
    this.updateCharts();
}

filterChartTwo() {
    this.filteredChart = "chartTwo";
    this.updateCharts();
}

filterChartThree() {
    this.filteredChart = "chartThree";
    this.updateCharts();
}

onCustomerFilterChange() {
    const customer = document.getElementById("customerFilter").value;
    console.log("Customer Filter Changed:", customer);
    this.fetchData();
}

onProductFilterChange() {
    const product = document.getElementById("productFilter").value;
    console.log("Product Filter Changed:", product);
    this.fetchData();
}


showTopCustomers() {
    console.log("Displaying Top Customers");
    // You can fetch data related to top customers and update the charts accordingly
    this.filterType.value = "sale"; // Adjust the filter as needed
    this.fetchData();
}

showTopProducts() {
    console.log("Displaying Top Products");
    // You can fetch data related to top products and update the charts accordingly
    this.filterType.value = "product"; // Adjust the filter as needed
    this.fetchData();
}

showTopSalesOrders() {
    console.log("Displaying Top Sales Orders");
    // You can fetch data related to top sales orders and update the charts accordingly
    this.filterType.value = "order"; // Adjust the filter as needed
    this.fetchData();
}

   onStartDateChange(event) {
        this.startDate.value = event.target.value;
        this.fetchData();
    }

    onEndDateChange(event) {
        this.endDate.value = event.target.value;
        this.fetchData();
    }

showTopQuotations() {
    console.log("Displaying Top Quotations");
    // You can fetch data related to top quotations and update the charts accordingly
    this.filterType.value = "quotation"; // Adjust the filter as needed
    this.fetchData();
}

logFilters() {
    console.log("Fetching Data with Filters:", {
        filterType: this.filterType.value,
        dateFrom: this.dateRange.value.split(" - ")[0],
        dateTo: this.dateRange.value.split(" - ")[1],
        searchQuery: this.searchQuery.value,
        customer: document.getElementById("customerFilter")?.value,
        product: document.getElementById("productFilter")?.value,
    });
}
// onMounted(() => {
//     this.fetchData();
//     this.fetchStats();
//     document.getElementById("topCustomersBtn").addEventListener("click", this.showTopCustomers);
//     document.getElementById("topProductsBtn").addEventListener("click", this.showTopProducts);
// });




showTopCustomers() {
    console.log("Fetching top customers...");
    // Replace with actual API call or logic to display the top customers
    alert("Displaying Top Customers!");
}

showTopProducts() {
    console.log("Fetching top products...");
    // Replace with actual API call or logic to display the top products
    alert("Displaying Top Products!");
}


updateCharts() {
    const allCharts = [this.canvasRef, this.canvasReftwo, this.canvasRefthree];

    allCharts.forEach((chartRef, index) => {
        if (!chartRef.el) return; // Prevent undefined error
        
        if (this.filteredChart && index !== ["chartOne", "chartTwo", "chartThree"].indexOf(this.filteredChart)) {
            chartRef.el.style.display = "none"; // Hide other charts
        } else {
            chartRef.el.style.display = "block"; // Show selected chart
        }
    });
}


}

ChartjsSample.template = "sales_dashboard.chartjs_sample";

actionRegistry.add("chartjs_sample", ChartjsSample);