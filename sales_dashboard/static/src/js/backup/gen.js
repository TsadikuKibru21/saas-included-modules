/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
import { loadJS } from "@web/core/assets";
import { getColor } from "@web/core/colors/colors";

const actionRegistry = registry.category("actions");

export class ChartjsSampleHRGEN extends Component {
    setup() {
        this.topQuotations = useState({ value: [] });
        this.orm = useService('orm');
        this.action = useService("action");
        this.data = useState({});
        this.filterType = useState({ value: "all" });
        this.searchQuery = useState({ value: "" });
        this.stats = useState({
            totalActiveEmployees: 0,
            totalDepartments: 0,
            totalJobs: 0,
            totalLeaves: 0,
            totalAttendance: 0,
            turnoverRate: 0,
            absentRate: 0,
            pendingLeaves: 0,
            totalSales: 0,
            totalOpportunities: 0,
            totalQuotations: 0,
            totalOrders: 0,
            revenuePercent: 0,
            events: 0,
            totalStockValue: 0,
        });
        this.canvasRef = useRef("canvas");
        this.canvasReftwo = useRef("canvastwo");
        this.canvasRefthree = useRef("canvasthree");
        this.canvasRefDoughnut = useRef("canvasDoughnut");
        this.canvasRefLeave = useRef("canvasLeave");

        onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));

        onMounted(() => {
            this.fetchData();
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
            if (this.chartDoughnut) {
                this.chartDoughnut.destroy();
            }
            if (this.chartLeave) {
                this.chartLeave.destroy();
            }
        });

        // Bind methods to ensure correct `this` context
        this.goToHRPage = this.goToHRPage.bind(this);
        this.fetchData = this.fetchData.bind(this);
        this.renderChart = this.renderChart.bind(this);
        this.onSearchQueryChange = this.onSearchQueryChange.bind(this);
    }

    async fetchData() {
        const hrMetrics = await this.orm.call("hr.employee", "get_hr_metrics_chart");
        // this.stats.totalActiveEmployees = hrMetrics.contract_expiration.data.length;
        this.stats.totalActiveEmployees = hrMetrics.total_active_employees_with_running_contract;
        this.stats.events = hrMetrics.total_events;
        const totalOpportunities = await this.orm.searchRead("crm.lead", [['type', '=', 'opportunity']], ["id"]);
        this.stats.totalOpportunities = totalOpportunities.length;
        console.log('Fetched HR metrics:', hrMetrics.total_events);
        const topManufacturedProducts = await this.orm.call("mrp.production", "get_top_manufactured_products_chart", []);
        console.log("Top Manufactured Products:", topManufacturedProducts);
        this.stats.topManufacturedProducts = topManufacturedProducts;
        
        const topWorkCenters = await this.orm.call("mrp.workcenter", "get_top_workcenters_chart", []);
        console.log("Top Work Centers:", topWorkCenters);
        this.stats.topWorkCenters = topWorkCenters;

        const totalStockValue = await this.orm.searchRead("product.product", [], ["qty_available", "standard_price"]);
        this.stats.totalStockValue = totalStockValue.reduce((sum, product) => sum + (product.qty_available * product.standard_price), 0);
        
        // this.stats.totalActiveEmployees = hrMetrics.total_active_employees || 0;
        this.stats.totalDepartments = hrMetrics.total_departments || 0;
        
        this.stats.totalJobs = hrMetrics.total_jobs || 0;
        this.stats.totalLeaves = hrMetrics.total_leaves || 0;
        this.stats.totalAttendance = hrMetrics.pending_leaves || 0;
        console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^',this.stats.total_departments)
        this.stats.turnoverRate = hrMetrics.turnover_rate || 0;
        this.stats.absentRate = hrMetrics.absent_rate || 0;
        this.stats.pendingLeaves = hrMetrics.pending_leaves || 0;
        console.log("Fetching Quotations...");
        const quotations = await this.orm.searchRead(
            "sale.order", 
            [], 
            ["name", "partner_id", "amount_total", "date_order"]
        );

        console.log("Quotations fetched:", quotations);
        

    // // const topQuotations = await this.orm.call("sale.order", "get_top_quotations_chart", []);
    const topQuotations = await this.orm.call("sale.order", "get_top_quotations_chart", []);
    console.log('top_quotations',topQuotations)
    const topProducts = await this.orm.call("sale.order", "get_top_products_chart", []);
    console.log ('top_products',topProducts)
    const topCustomers = await this.orm.call("sale.order", "get_top_customers_chart", []);
    console.log('top_customers',topCustomers)
    // const topVendors = await this.orm.call("sale.order", "get_top_vendors_chart", []);
    // console.log('top_vendors',topVendors)
    const topPurchaseOrders = await this.orm.call("sale.order", "get_top_orders_chart", []);
    console.log('top_purchase_orders',topPurchaseOrders)
    const Rfq = await this.orm.call("sale.order", "get_top_rfq_chart", []);
    console.log('top_rfq',Rfq)

    this.stats.topRFQs = Rfq;
    console.log('stats.topRFQs:', this.stats.topRFQs);

    const Invoice = await this.orm.call("account.move", "get_top_invoices_chart", []);
    console.log('top_invoices_____________', Invoice);
    this.stats.topInvoices = Invoice; // ✅ Ensure consistency in naming
    
    const topVendors = await this.orm.call("sale.order", "get_top_vendors_chart", []);
    console.log('uyyuyuyuyuyuuyuy', topVendors);
    this.stats.topVendors = topVendors; // ✅ Ensure consistency in naming
    
    // const topSalesOrders = await this.orm.call("sale.order", "get_top_sales_orders_chart", []);
    this.stats.topQuotations = topQuotations
    this.stats.topProducts = topProducts
    this.stats.topCustomers = topCustomers

    console.log("Top Products:", this.stats.topProducts);
    console.log("Top Customers:", this.stats.topCustomers);

    console.log("Before assignment, topQuotations:", this.topQuotations);
    console.log("Type of topQuotations:", typeof this.topQuotations);
    
    if (!Array.isArray(this.topQuotations)) {
        console.warn("topQuotations is not an array! Initializing as an empty array.");
        this.topQuotations = [];
    }

    // Assign values properly
    this.topQuotations = quotations.map(q => ({
        ...q,
        partner_id: q.partner_id || ["", "Unknown Customer"]
    }));

    console.log("After assignment, topQuotations:", this.topQuotations);

    
        this.data = hrMetrics;


        // Fetch Sales Data
        const totalSales = await this.orm.searchRead("sale.order", [['state', '=', 'sale']], ["amount_total"]);
        const   revenuePercent = totalSales.reduce((sum, order) => sum + order.amount_total, 0);
        this.stats.revenuePercent = revenuePercent;
        const totalRevenue = await this.orm.searchRead("sale.order", [['state', '=', 'sale']], ["amount_total"]);
        const totalRevenueAmount = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(totalRevenue.reduce((sum, order) => sum + order.amount_total, 0));

        this.stats.totalRevenue = totalRevenueAmount;

        const totalQuotations = await this.orm.searchRead("sale.order", [['state', 'in', ['draft', 'sent']]], ["amount_total"]);
        console.log('totalSales', totalQuotations.length)
        const qout = totalQuotations.length
        const totalOrders = await this.orm.searchRead("sale.order", [['state', 'in', ['sale', 'draft', 'sent']]], ["amount_total"]);
        this.stats.totalOrders = totalOrders.length;
        // const topQuotations = await this.orm.searchRead("sale.order", [['state', 'in', ['draft', 'sent']]], ["name", "partner_id", "amount_total", "date_order"], { limit: 10, order: 'amount_total desc' });
        // this.topQuotations.splice(0, this.topQuotations.length, ...topQuotations);

        this.stats.totalSalesAmount = totalSales.reduce((sum, order) => sum + order.amount_total, 0);
        this.stats.totalQuotationsAmount = totalQuotations.reduce((sum, order) => sum + order.amount_total, 0);
        this.stats.totalOrdersAmount = totalOrders.reduce((sum, order) => sum + order.amount_total, 0);
        this.stats.qout = totalQuotations.length; // ✅ Ensure `qout` is inside `stats`
        console.log("Sales Data:", this.stats.totalSalesAmount, this.stats.totalQuotationsAmount, this.stats.totalOrdersAmount);
        console.log("Top Vendors Data:", this.stats.topVendors.data);
        console.log("Top Vendors Labels:", this.stats.topVendors.labels);
        // ✅ Convert Proxy object to a regular array
        this.stats.topVendors = {
            labels: [...topVendors.labels],  // Spread operator removes Proxy wrapper
            data: [...topVendors.data]
        };

        this.renderChart();
    }

    renderChart() {
        const contractLabels = this.data.contract_running_vs_exit.labels || [];
        const contractData = this.data.contract_running_vs_exit.data || [];
        const contractColor = contractLabels.map((_, index) => getColor(index));

        const expirationLabels = this.data.contract_expiration.labels || [];
        const expirationData = this.data.contract_expiration.data || [];
        const expirationColor = expirationLabels.map((_, index) => getColor(index));

        const absentRateLabels = ["Absent Rate", "Present Rate"];
        const absentRateData = [this.stats.absentRate, 100 - this.stats.absentRate];
        const absentRateColor = absentRateLabels.map((_, index) => getColor(index));

        const turnoverRateLabels = ["Turnover Rate", "Retention Rate"];
        const turnoverRateData = [this.stats.turnoverRate, 100 - this.stats.turnoverRate];
        const turnoverRateColor = turnoverRateLabels.map((_, index) => getColor(index));

        const pendingLeavesLabels = ["Pending Leaves"];
        const pendingLeavesData = [this.stats.pendingLeaves];
        const pendingLeavesColor = pendingLeavesLabels.map((_, index) => getColor(index));

        if (this.chart) this.chart.destroy();
        if (this.charttwo) this.charttwo.destroy();
        if (this.chartthree) this.chartthree.destroy();
        if (this.chartDoughnut) this.chartDoughnut.destroy();
        if (this.chartLeave) this.chartLeave.destroy();

        this.chart = new Chart(this.canvasRef.el, {
            type: "polarArea",
            data: {
                labels: contractLabels,
                datasets: [
                    {
                        label: 'Contract Running vs Exit',
                        data: contractData,
                        backgroundColor: contractColor,
                    },
                ],
            },
        });

        this.charttwo = new Chart(this.canvasReftwo.el, {
            type: "radar",
            data: {
                labels: expirationLabels,
                datasets: [
                    {
                        label: 'Contract Expiration Dates',
                        data: expirationData,
                        backgroundColor: expirationColor,
                        borderColor: expirationColor,
                        fill: false,
                    },
                ],
            },
        });

        this.chartthree = new Chart(this.canvasRefthree.el, {
            type: "scatter",
            data: {
                labels: turnoverRateLabels,
                datasets: [
                    {
                        label: 'Turnover Rate',
                        data: turnoverRateData,
                        backgroundColor: turnoverRateColor,
                    },
                ],
            },
        });

        this.chartDoughnut = new Chart(this.canvasRefDoughnut.el, {
            type: "doughnut",
            data: {
                labels: absentRateLabels,
                datasets: [
                    {
                        label: 'Absent Rate',
                        data: absentRateData,
                        backgroundColor: absentRateColor,
                    },
                ],
            },
        });

        this.chartLeave = new Chart(this.canvasRefLeave.el, {
            type: "bar",
            data: {
                labels: pendingLeavesLabels,
                datasets: [
                    {
                        label: 'Pending Leaves',
                        data: pendingLeavesData,
                        backgroundColor: pendingLeavesColor,
                    },
                ],
            },
        });
    }

    onSearchQueryChange(event) {
        this.searchQuery.value = event.target.value;
        this.fetchData();
    }

    goToHRPage(filter) {
        let resModel = "hr.employee"; // Default model
        let domain = [];
    
        if (filter === "employees") {
            resModel = "hr.employee";
            domain.push(["active", "=", true]); // Show active employees
        } else if (filter === "departments") {
            resModel = "hr.department"; // Navigate to departments
        } else if (filter === "jobs") {
            resModel = "hr.job"; // Navigate to job positions
        } else if (filter === "leaves") {
            resModel = "hr.leave"; // Navigate to leave records
            domain.push(["state", "=", "validate"]); // Show approved leaves
        } else if (filter === "pendingLeaves") {
            resModel = "hr.leave"; // Navigate to pending leave requests
            domain.push(["state", "=", "confirm"]); // Show only pending (to be approved) leaves
        }
    
        if (this.action) {
            this.action.doAction({
                type: "ir.actions.act_window",
                res_model: resModel,
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

ChartjsSampleHRGEN.template = "chart_sample.chartjs_sample_hr_gen";

actionRegistry.add("chartjs_sample_hr_gen", ChartjsSampleHRGEN);
