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
        this.startDate = useState({ value: "" });
        this.endDate = useState({ value: "" });
        this.state = useState({
            showExportOptions: false,
            showEditPopup: false,
            editPopupPosition: { top: 0, left: 0 },
        });
        this.stats = useState({
            totalActiveEmployees: 0,
            totalDepartments: 0,
            totalJobs: 0,
            totalLeads: 0,
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
            totalWon: 0,
            totalLost: 0,
            totalProducts: 0,
            totalStock: 0,
            stockMovements: 0,
            totalRevenue: 0,
            totalPurchases: 0,
            totalRFQs: 0,
            totalSpent: 0,
            purchasePercent: 0,
            rfqPercent: 0,
            ordersPercent: 0,
            spentPercent: 0,
        });
        this.canvasRef = useRef("canvas");
        this.canvasReftwo = useRef("canvastwo");
        this.canvasRefthree = useRef("canvasthree");
        this.canvasRefDoughnut = useRef("canvasDoughnut");
        this.canvasRefLeave = useRef("canvasLeave");
        this.topManufacturedProducts = useRef("topManufacturedProducts");

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
        this.goToCRMPage_1 = this.goToCRMPage_1.bind(this);
        this.goToInventoryPage = this.goToInventoryPage.bind(this);
        this.goToSalesPage = this.goToSalesPage.bind(this);
        this.fetchData = this.fetchData.bind(this);
        this.renderChart = this.renderChart.bind(this);
        this.onSearchQueryChange = this.onSearchQueryChange.bind(this);
        this.exportCard = this.exportCard.bind(this);
        this.deleteCard = this.deleteCard.bind(this);
        this.editCard = this.editCard.bind(this);
        this.refreshCard = this.refreshCard.bind(this);
        this.toggleExportOptions = this.toggleExportOptions.bind(this);
        this.exportPDF = this.exportPDF.bind(this);
        this.exportExcel = this.exportExcel.bind(this);
        this.showEditPopup = this.showEditPopup.bind(this);
        this.saveEdit = this.saveEdit.bind(this);
        this.closeEditPopup = this.closeEditPopup.bind(this);
    }

    formatNumber(num) {
        if (num >= 1000) {
            return (num / 1000).toFixed(2) + 'k';
        }
        return num.toFixed(2);
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

        const totalLeads = await this.orm.searchRead("crm.lead", [], ["id"]);
        this.stats.totalLeads = totalLeads.length;

        console.log("Quotations fetched:", quotations);
        const totalWon = await this.orm.searchRead("crm.lead", [['stage_id', '=', 'won']], ["id"]);
        const totalLost = await this.orm.searchRead("crm.lead", [['stage_id', '=', 'lost']], ["id"]);
        this.stats.totalWon = totalWon.length;
        this.stats.totalLost = totalLost.length;
        console.log('SEEE THIS ONE ',totalLost)


        const totalPurchases = await this.orm.searchRead("purchase.order", [['state', '=', 'purchase']], ["amount_total"]);
        const totalRFQs = await this.orm.searchRead("purchase.order", [['state', '=', 'rfq']], ["amount_total"]);
        // const totalOrders = await this.orm.searchRead("purchase.order", [['state', 'in', ['purchase', 'rfq']]], ["amount_total"]);
        const totalSpent = await this.orm.searchRead("purchase.order", [['state', '=', 'purchase']], ["amount_total"]);

        const totalSpentAmount = totalSpent.reduce((sum, order) => sum + order.amount_total, 0);
        
        this.stats.totalPurchases = totalPurchases.length;
        this.stats.totalRFQs = totalRFQs.length;
        // this.stats.totalOrders = totalOrders.length;
        // this.stats.totalSpent = formatNumber(totalSpentAmount);
        this.stats.totalSpent = totalSpentAmount >= 1000 ? (totalSpentAmount / 1000).toFixed(2) + 'k' : totalSpentAmount.toFixed(2);
    // // const topQuotations = await this.orm.call("sale.order", "get_top_quotations_chart", []);
    const topQuotations = await this.orm.call("sale.order", "get_top_quotations_chart", []);
    console.log('top_quotations',topQuotations)
    const topProducts = await this.orm.call("sale.order", "get_top_products_chart", []);
    console.log ('top_products',topProducts)
    const topCustomers = await this.orm.call("sale.order", "get_top_customers_chart_new", []);
    console.log('top_customers',topCustomers)
    const topVendorsnew = await this.orm.call("sale.order", "get_top_vendors_chart_new", []);
    this.stats.topVendorsnew = topVendorsnew;
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
    
    // const topVendors = await this.orm.call("sale.order", "get_top_vendors_chart", []);
    // console.log('uyyuyuyuyuyuuyuy', topVendors);
    // this.stats.topVendors = topVendors; // ✅ Ensure consistency in naming

//     const topVendors = await this.orm.call("sale.order", "get_top_vendors_chart", []);
// console.log('Top __________________________Vendors Dictionary:', topVendors);

// // Convert the dictionary into labels & data arrays
// this.stats.topVendors = {
//     labels: Object.keys(topVendors), // Vendor names
//     data: Object.values(topVendors), // Total spent
// };


const topVendors = await this.orm.call("sale.order", "get_top_vendors_chart", []);
console.log('Top Vendors Dictionary:', topVendors);

// Convert dictionary to array of objects for easy table rendering
this.stats.topVendors = Object.entries(topVendors).map(([vendor, amount]) => ({
    vendor,
    amount
}));

    
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
        // const totalSales = await this.orm.searchRead("sale.order", [['state', '=', 'sale']], ["amount_total"]);
        this.stats.totalSales = totalSales.length;

        const totalProducts = await this.orm.searchRead("product.product", [], ["id"]);
        const totalStock = await this.orm.searchRead("product.product", [], ["qty_available"]);
        // const totalStockValue = await this.orm.searchRead("product.product", [], ["qty_available", "standard_price"]);
        const stockMovements = await this.orm.searchRead("stock.move", [], ["id"]);

        this.stats.totalProducts = totalProducts.length;
        this.stats.totalStock = totalStock.reduce((sum, product) => sum + product.qty_available, 0);
        // this.stats.totalStockValue = totalStockValue.reduce((sum, product) => sum + (product.qty_available * product.standard_price), 0);
        this.stats.stockMovements = stockMovements.length;
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
        // const topManufacturedProducts = this.stats.topManufacturedProducts;
        // console.log('Top Manufactured Products:', topManufacturedProducts);
        if (this.chart) this.chart.destroy();
        if (this.charttwo) this.charttwo.destroy();
        if (this.chartthree) this.chartthree.destroy();
        if (this.chartDoughnut) this.chartDoughnut.destroy();
        if (this.chartLeave) this.chartLeave.destroy();
        // if (this.topManufacturedProducts) this.topManufacturedProducts.destroy();

        this.chart = new Chart(this.canvasRef.el, {
            type: "bar",
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

        // this.topManufacturedProducts = new Chart(this.topManufacturedProducts.el, {
        //     type: "bar",
        //     data: {
        //         labels: topManufacturedProducts.labels,
        //         datasets: [
        //             {
        //                 label: 'Top Manufactured Products',
        //                 data: topManufacturedProducts.data,
        //                 backgroundColor: getColor(0),
        //             },
        //         ],
        //     },
        // });
        

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

    goToCRMPage_1(filter) {
        const domain = [];

        if (filter === "leads") {
            domain.push(["type", "=", "lead"]);
        } else if (filter === "opportunities") {
            domain.push(["type", "=", "opportunity"]);
        } else if (filter === "won") {
            domain.push(["stage_id", "=", "won"]);
        } else if (filter === "lost") {
            domain.push(["stage_id", "=", "lost"]);
        }

        if (this.action) {
            this.action.doAction({
                type: "ir.actions.act_window",
                res_model: "crm.lead",
                view_mode: "list",
                views: [[false, "list"]],
                target: "current",
                domain: domain,
            });
        } else {
            console.error("Action service is not available.");
        }
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
            domain.push(["state", "=", "confirmed"]);
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

    
    goToCRMPage(filter) {
        let resModel = "crm.lead"; 
        const domain = [];

        if (filter === "leads") {
            domain.push(["type", "=", "lead"]);
        } else if (filter === "opportunities") {
            domain.push(["type", "=", "opportunity"]);
        } else if (filter === "won") {
            domain.push(["stage_id", "=", "won"]);
        } else if (filter === "lost") {
            domain.push(["stage_id", "=", "lost"]);
        }

        if (this.action) {
            this.action.doAction({
                type: "ir.actions.act_window",
                res_model: "crm.lead",
                view_mode: "list",
                views: [[false, "list"]],
                target: "current",
                domain: domain,
            });
        } else {
            console.error("Action service is not available.");
        }
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


    goToInventoryPage(filter) {
        let resModel = "product.product"; 
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

        // if (this.action) {
        //     this.action.doAction({
        //         type: "ir.actions.act_window",
        //         res_model: "product.product",
        //         view_mode: "list",
        //         views: [[false, "list"]],
        //         target: "current",
        //         domain: domain,
        //     });
        // } else {
        //     console.error("Action service is not available.");
        // }
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

    onStartDateChange(event) {
        this.startDate.value = event.target.value;
        this.fetchData();
    }

    onEndDateChange(event) {
        this.endDate.value = event.target.value;
        this.fetchData();
    }

    toggleExportOptions() {
        this.state.showExportOptions = !this.state.showExportOptions;
    }

    exportPDF() {
        console.log("Exporting to PDF...");
        // Implement PDF export logic here
    }

    exportExcel() {
        console.log("Exporting to Excel...");
        // Implement Excel export logic here
    }

    exportCard() {
        this.toggleExportOptions();
    }

    deleteCard() {
        console.log("Deleting card...");
        // Implement the delete card logic here
    }

    editCard(event) {
        console.log("Editing card...");
        // Show pop-up to select dashboard type, domain, and model
        const rect = event.target.getBoundingClientRect();
        this.state.editPopupPosition = { top: rect.bottom + window.scrollY, left: rect.left + window.scrollX };
        this.showEditPopup();
    }

    refreshCard() {
        console.log("Refreshing card...");
        // Implement the refresh card logic here
    }

    showEditPopup() {
        this.state.showEditPopup = true;
    }

    saveEdit() {
        console.log("Saving edit...");
        // Implement save logic here
        this.state.showEditPopup = false;
    }

    closeEditPopup() {
        this.state.showEditPopup = false;
    }
}

ChartjsSampleHRGEN.template = "chart_sample.chartjs_sample_hr_gen";

actionRegistry.add("chartjs_sample_hr_gen", ChartjsSampleHRGEN);
