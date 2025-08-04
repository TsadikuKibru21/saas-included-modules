// // // // // // // /** @odoo-module **/

// // // // // // // import { registry } from "@web/core/registry";
// // // // // // // import { useService } from "@web/core/utils/hooks";

// // // // // // // import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
// // // // // // // import { loadJS } from "@web/core/assets";
// // // // // // // import { getColor } from "@web/core/colors/colors";

// // // // // // // const actionRegistry = registry.category("actions");

// // // // // // // export class ChartjsSampleHR extends Component {
// // // // // // //     setup() {
// // // // // // //         this.orm = useService('orm');
// // // // // // //         this.action = useService("action");
// // // // // // //         this.data = useState([]);
// // // // // // //         this.filterType = useState({ value: "all" });
// // // // // // //         this.searchQuery = useState({ value: "" });
// // // // // // //         this.stats = useState({
// // // // // // //             totalEmployees: 0,
// // // // // // //             totalDepartments: 0,
// // // // // // //             totalJobs: 0,
// // // // // // //             totalLeaves: 0,
// // // // // // //         });
// // // // // // //         this.canvasRef = useRef("canvas");
// // // // // // //         this.canvasReftwo = useRef("canvastwo");
// // // // // // //         this.canvasRefthree = useRef("canvasthree");

// // // // // // //         onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));

// // // // // // //         onMounted(() => {
// // // // // // //             this.fetchData();
// // // // // // //             this.fetchStats();
// // // // // // //         });

// // // // // // //         onWillUnmount(() => {
// // // // // // //             if (this.chart) {
// // // // // // //                 this.chart.destroy();
// // // // // // //             }
// // // // // // //             if (this.charttwo) {
// // // // // // //                 this.charttwo.destroy();
// // // // // // //             }
// // // // // // //             if (this.chartthree) {
// // // // // // //                 this.chartthree.destroy();
// // // // // // //             }
// // // // // // //         });

// // // // // // //         // Bind methods to ensure correct `this` context
// // // // // // //         this.goToHRPage = this.goToHRPage.bind(this);
// // // // // // //         this.fetchData = this.fetchData.bind(this);
// // // // // // //         this.fetchStats = this.fetchStats.bind(this);
// // // // // // //         this.renderChart = this.renderChart.bind(this);
// // // // // // //         this.onSearchQueryChange = this.onSearchQueryChange.bind(this);
// // // // // // //     }

// // // // // // //     async fetchData() {
// // // // // // //         const domain = [];
        
// // // // // // //         if (this.filterType.value && this.filterType.value !== "all") {
// // // // // // //             domain.push(['type', '=', this.filterType.value]);
// // // // // // //         }
// // // // // // //         if (this.searchQuery.value) {
// // // // // // //             domain.push(['name', 'ilike', this.searchQuery.value]);
// // // // // // //         }
    
// // // // // // //         const employees = await this.orm.searchRead("hr.employee", domain, ["id", "name", "department_id", "job_id"]);
// // // // // // //         console.log('Fetched employees:', employees);

// // // // // // //         this.data = employees;
// // // // // // //         this.renderChart();
// // // // // // //     }

// // // // // // //     async fetchStats() {
// // // // // // //         const totalEmployees = await this.orm.searchRead("hr.employee", [], ["id"]);
// // // // // // //         const totalDepartments = await this.orm.searchRead("hr.department", [], ["id"]);
// // // // // // //         const totalJobs = await this.orm.searchRead("hr.job", [], ["id"]);
// // // // // // //         const totalLeaves = await this.orm.searchRead("hr.leave", [], ["id"]);

// // // // // // //         this.stats.totalEmployees = totalEmployees.length;
// // // // // // //         this.stats.totalDepartments = totalDepartments.length;
// // // // // // //         this.stats.totalJobs = totalJobs.length;
// // // // // // //         this.stats.totalLeaves = totalLeaves.length;
// // // // // // //     }

// // // // // // //     renderChart() {
// // // // // // //         const labels = this.data.map(item => item.name || "Unknown Employee");
// // // // // // //         const data = this.data.map(item => item.department_id[1] || 0);
// // // // // // //         const color = labels.map((_, index) => getColor(index));
    
// // // // // // //         if (this.chart) this.chart.destroy();
// // // // // // //         if (this.charttwo) this.charttwo.destroy();
// // // // // // //         if (this.chartthree) this.chartthree.destroy();
    
// // // // // // //         this.chart = new Chart(this.canvasRef.el, {
// // // // // // //             type: "bar",
// // // // // // //             data: {
// // // // // // //                 labels: labels,
// // // // // // //                 datasets: [
// // // // // // //                     {
// // // // // // //                         label: 'Employee Departments',
// // // // // // //                         data: data,
// // // // // // //                         backgroundColor: color,
// // // // // // //                     },
// // // // // // //                 ],
// // // // // // //             },
// // // // // // //         });
    
// // // // // // //         this.charttwo = new Chart(this.canvasReftwo.el, {
// // // // // // //             type: "line",
// // // // // // //             data: {
// // // // // // //                 labels: labels,
// // // // // // //                 datasets: [
// // // // // // //                     {
// // // // // // //                         label: 'Employee Departments',
// // // // // // //                         data: data,
// // // // // // //                         backgroundColor: color,
// // // // // // //                         borderColor: color,
// // // // // // //                         fill: false,
// // // // // // //                     },
// // // // // // //                 ],
// // // // // // //             },
// // // // // // //         });

// // // // // // //         this.chartthree = new Chart(this.canvasRefthree.el, {
// // // // // // //             type: "pie",
// // // // // // //             data: {
// // // // // // //                 labels: labels,
// // // // // // //                 datasets: [
// // // // // // //                     {
// // // // // // //                         label: 'Employee Departments',
// // // // // // //                         data: data,
// // // // // // //                         backgroundColor: color,
// // // // // // //                     },
// // // // // // //                 ],
// // // // // // //             },
// // // // // // //         });
// // // // // // //     }

// // // // // // //     onSearchQueryChange(event) {
// // // // // // //         this.searchQuery.value = event.target.value;
// // // // // // //         this.fetchData();
// // // // // // //     }

// // // // // // //     goToHRPage(filter) {
// // // // // // //         const domain = [];

// // // // // // //         if (filter === "employees") {
// // // // // // //             domain.push(["type", "=", "employee"]);
// // // // // // //         } else if (filter === "departments") {
// // // // // // //             domain.push(["type", "=", "department"]);
// // // // // // //         } else if (filter === "jobs") {
// // // // // // //             domain.push(["type", "=", "job"]);
// // // // // // //         } else if (filter === "leaves") {
// // // // // // //             domain.push(["type", "=", "leave"]);
// // // // // // //         }

// // // // // // //         if (this.action) {
// // // // // // //             this.action.doAction({
// // // // // // //                 type: "ir.actions.act_window",
// // // // // // //                 res_model: "hr.employee",
// // // // // // //                 view_mode: "list",
// // // // // // //                 views: [[false, "list"]],
// // // // // // //                 target: "current",
// // // // // // //                 domain: domain,
// // // // // // //             });
// // // // // // //         } else {
// // // // // // //             console.error("Action service is not available.");
// // // // // // //         }
// // // // // // //     }
// // // // // // // }

// // // // // // // ChartjsSampleHR.template = "chart_sample.chartjs_sample_hr";

// // // // // // // actionRegistry.add("chartjs_sample_hr", ChartjsSampleHR);

// // // // // // /** @odoo-module **/

// // // // // // import { registry } from "@web/core/registry";
// // // // // // import { useService } from "@web/core/utils/hooks";

// // // // // // import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
// // // // // // import { loadJS } from "@web/core/assets";
// // // // // // import { getColor } from "@web/core/colors/colors";

// // // // // // const actionRegistry = registry.category("actions");

// // // // // // export class ChartjsSampleHR extends Component {
// // // // // //     setup() {
// // // // // //         this.orm = useService('orm');
// // // // // //         this.action = useService("action");
// // // // // //         this.data = useState([]);
// // // // // //         this.filterType = useState({ value: "all" });
// // // // // //         this.searchQuery = useState({ value: "" });
// // // // // //         this.stats = useState({
// // // // // //             totalEmployees: 0,
// // // // // //             totalDepartments: 0,
// // // // // //             totalJobs: 0,
// // // // // //             totalLeaves: 0,
// // // // // //             totalContracts: 0,
// // // // // //         });
// // // // // //         this.canvasRef = useRef("canvas");
// // // // // //         this.canvasReftwo = useRef("canvastwo");
// // // // // //         this.canvasRefthree = useRef("canvasthree");
// // // // // //         this.canvasRefDoughnut = useRef("canvasDoughnut");
// // // // // //         this.canvasRefLeave = useRef("canvasLeave");

// // // // // //         onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));

// // // // // //         onMounted(() => {
// // // // // //             this.fetchData();
// // // // // //             this.fetchStats();
// // // // // //         });

// // // // // //         onWillUnmount(() => {
// // // // // //             if (this.chart) {
// // // // // //                 this.chart.destroy();
// // // // // //             }
// // // // // //             if (this.charttwo) {
// // // // // //                 this.charttwo.destroy();
// // // // // //             }
// // // // // //             if (this.chartthree) {
// // // // // //                 this.chartthree.destroy();
// // // // // //             }
// // // // // //             if (this.chartDoughnut) {
// // // // // //                 this.chartDoughnut.destroy();
// // // // // //             }
// // // // // //             if (this.chartLeave) {
// // // // // //                 this.chartLeave.destroy();
// // // // // //             }
// // // // // //         });

// // // // // //         // Bind methods to ensure correct `this` context
// // // // // //         this.goToHRPage = this.goToHRPage.bind(this);
// // // // // //         this.fetchData = this.fetchData.bind(this);
// // // // // //         this.fetchStats = this.fetchStats.bind(this);
// // // // // //         this.renderChart = this.renderChart.bind(this);
// // // // // //         this.onSearchQueryChange = this.onSearchQueryChange.bind(this);
// // // // // //     }

// // // // // //     async fetchData() {
// // // // // //         const domain = [];
        
// // // // // //         if (this.filterType.value && this.filterType.value !== "all") {
// // // // // //             domain.push(['type', '=', this.filterType.value]);
// // // // // //         }
// // // // // //         if (this.searchQuery.value) {
// // // // // //             domain.push(['name', 'ilike', this.searchQuery.value]);
// // // // // //         }
    
// // // // // //         const employees = await this.orm.searchRead("hr.employee", domain, ["id", "name", "department_id", "job_id"]);
// // // // // //         console.log('Fetched employees:', employees);

// // // // // //         this.data = employees;
// // // // // //         this.renderChart();
// // // // // //     }

// // // // // //     async fetchStats() {
// // // // // //         const totalEmployees = await this.orm.searchRead("hr.employee", [], ["id"]);
// // // // // //         const totalDepartments = await this.orm.searchRead("hr.department", [], ["id"]);
// // // // // //         const totalJobs = await this.orm.searchRead("hr.job", [], ["id"]);
// // // // // //         const totalLeaves = await this.orm.searchRead("hr.leave", [], ["id"]);
// // // // // //         const totalContracts = await this.orm.searchRead("hr.contract", [], ["id"]);

// // // // // //         this.stats.totalEmployees = totalEmployees.length;
// // // // // //         this.stats.totalDepartments = totalDepartments.length;
// // // // // //         this.stats.totalJobs = totalJobs.length;
// // // // // //         this.stats.totalLeaves = totalLeaves.length;
// // // // // //         this.stats.totalContracts = totalContracts.length;
// // // // // //     }

// // // // // //     renderChart() {
// // // // // //         const labels = this.data.map(item => item.name || "Unknown Employee");
// // // // // //         const data = this.data.map(item => item.department_id[1] || 0);
// // // // // //         const color = labels.map((_, index) => getColor(index));
    
// // // // // //         if (this.chart) this.chart.destroy();
// // // // // //         if (this.charttwo) this.charttwo.destroy();
// // // // // //         if (this.chartthree) this.chartthree.destroy();
// // // // // //         if (this.chartDoughnut) this.chartDoughnut.destroy();
// // // // // //         if (this.chartLeave) this.chartLeave.destroy();
    
// // // // // //         this.chart = new Chart(this.canvasRef.el, {
// // // // // //             type: "bar",
// // // // // //             data: {
// // // // // //                 labels: labels,
// // // // // //                 datasets: [
// // // // // //                     {
// // // // // //                         label: 'Employee Departments',
// // // // // //                         data: data,
// // // // // //                         backgroundColor: color,
// // // // // //                     },
// // // // // //                 ],
// // // // // //             },
// // // // // //         });
    
// // // // // //         this.charttwo = new Chart(this.canvasReftwo.el, {
// // // // // //             type: "line",
// // // // // //             data: {
// // // // // //                 labels: labels,
// // // // // //                 datasets: [
// // // // // //                     {
// // // // // //                         label: 'Employee Departments',
// // // // // //                         data: data,
// // // // // //                         backgroundColor: color,
// // // // // //                         borderColor: color,
// // // // // //                         fill: false,
// // // // // //                     },
// // // // // //                 ],
// // // // // //             },
// // // // // //         });

// // // // // //         this.chartthree = new Chart(this.canvasRefthree.el, {
// // // // // //             type: "pie",
// // // // // //             data: {
// // // // // //                 labels: labels,
// // // // // //                 datasets: [
// // // // // //                     {
// // // // // //                         label: 'Employee Departments',
// // // // // //                         data: data,
// // // // // //                         backgroundColor: color,
// // // // // //                     },
// // // // // //                 ],
// // // // // //             },
// // // // // //         });

// // // // // //         this.chartDoughnut = new Chart(this.canvasRefDoughnut.el, {
// // // // // //             type: "doughnut",
// // // // // //             data: {
// // // // // //                 labels: labels,
// // // // // //                 datasets: [
// // // // // //                     {
// // // // // //                         label: 'Employee Departments',
// // // // // //                         data: data,
// // // // // //                         backgroundColor: color,
// // // // // //                     },
// // // // // //                 ],
// // // // // //             },
// // // // // //         });

// // // // // //         this.chartLeave = new Chart(this.canvasRefLeave.el, {
// // // // // //             type: "bar",
// // // // // //             data: {
// // // // // //                 labels: labels,
// // // // // //                 datasets: [
// // // // // //                     {
// // // // // //                         label: 'Leave Requests',
// // // // // //                         data: data,
// // // // // //                         backgroundColor: color,
// // // // // //                     },
// // // // // //                 ],
// // // // // //             },
// // // // // //         });
// // // // // //     }

// // // // // //     onSearchQueryChange(event) {
// // // // // //         this.searchQuery.value = event.target.value;
// // // // // //         this.fetchData();
// // // // // //     }

// // // // // //     goToHRPage(filter) {
// // // // // //         const domain = [];

// // // // // //         if (filter === "employees") {
// // // // // //             domain.push(["id", ">", 0]); // Fetch all employees
// // // // // //         } else if (filter === "departments") {
// // // // // //             domain.push(["department_id", "!=", false]); // Fetch employees with departments
// // // // // //         } else if (filter === "jobs") {
// // // // // //             domain.push(["job_id", "!=", false]); // Fetch employees with jobs
// // // // // //         } else if (filter === "leaves") {
// // // // // //             domain.push(["leave_ids", "!=", false]); // Fetch employees with leaves
// // // // // //         } else if (filter === "contracts") {
// // // // // //             domain.push(["contract_ids", "!=", false]); // Fetch employees with contracts
// // // // // //         }

// // // // // //         if (this.action) {
// // // // // //             this.action.doAction({
// // // // // //                 type: "ir.actions.act_window",
// // // // // //                 res_model: "hr.employee",
// // // // // //                 view_mode: "list",
// // // // // //                 views: [[false, "list"]],
// // // // // //                 target: "current",
// // // // // //                 domain: domain,
// // // // // //             });
// // // // // //         } else {
// // // // // //             console.error("Action service is not available.");
// // // // // //         }
// // // // // //     }
// // // // // // }

// // // // // // ChartjsSampleHR.template = "chart_sample.chartjs_sample_hr";

// // // // // // actionRegistry.add("chartjs_sample_hr", ChartjsSampleHR);




// // // // // /** @odoo-module **/

// // // // // import { registry } from "@web/core/registry";
// // // // // import { useService } from "@web/core/utils/hooks";

// // // // // import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
// // // // // import { loadJS } from "@web/core/assets";
// // // // // import { getColor } from "@web/core/colors/colors";

// // // // // const actionRegistry = registry.category("actions");

// // // // // export class ChartjsSampleHR extends Component {
// // // // //     setup() {
// // // // //         this.orm = useService('orm');
// // // // //         this.action = useService("action");
// // // // //         this.data = useState([]);
// // // // //         this.filterType = useState({ value: "all" });
// // // // //         this.searchQuery = useState({ value: "" });
// // // // //         this.stats = useState({
// // // // //             totalEmployees: 0,
// // // // //             totalDepartments: 0,
// // // // //             totalJobs: 0,
// // // // //             totalLeaves: 0,
// // // // //             totalContracts: 0,
// // // // //         });
// // // // //         this.canvasRef = useRef("canvas");
// // // // //         this.canvasReftwo = useRef("canvastwo");
// // // // //         this.canvasRefthree = useRef("canvasthree");
// // // // //         this.canvasRefDoughnut = useRef("canvasDoughnut");
// // // // //         this.canvasRefLeave = useRef("canvasLeave");

// // // // //         onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));

// // // // //         onMounted(() => {
// // // // //             this.fetchData();
// // // // //             this.fetchStats();
// // // // //         });

// // // // //         onWillUnmount(() => {
// // // // //             if (this.chart) {
// // // // //                 this.chart.destroy();
// // // // //             }
// // // // //             if (this.charttwo) {
// // // // //                 this.charttwo.destroy();
// // // // //             }
// // // // //             if (this.chartthree) {
// // // // //                 this.chartthree.destroy();
// // // // //             }
// // // // //             if (this.chartDoughnut) {
// // // // //                 this.chartDoughnut.destroy();
// // // // //             }
// // // // //             if (this.chartLeave) {
// // // // //                 this.chartLeave.destroy();
// // // // //             }
// // // // //         });

// // // // //         // Bind methods to ensure correct `this` context
// // // // //         this.goToHRPage = this.goToHRPage.bind(this);
// // // // //         this.fetchData = this.fetchData.bind(this);
// // // // //         this.fetchStats = this.fetchStats.bind(this);
// // // // //         this.renderChart = this.renderChart.bind(this);
// // // // //         this.onSearchQueryChange = this.onSearchQueryChange.bind(this);
// // // // //     }

// // // // //     async fetchData() {
// // // // //         const domain = [];
        
// // // // //         if (this.filterType.value && this.filterType.value !== "all") {
// // // // //             domain.push(['type', '=', this.filterType.value]);
// // // // //         }
// // // // //         if (this.searchQuery.value) {
// // // // //             domain.push(['name', 'ilike', this.searchQuery.value]);
// // // // //         }
    
// // // // //         const employees = await this.orm.searchRead("hr.employee", domain, ["id", "name", "department_id", "job_id"]);
// // // // //         console.log('Fetched employees:', employees);

// // // // //         this.data = employees;
// // // // //         this.renderChart();
// // // // //     }

// // // // //     async fetchStats() {
// // // // //         const totalEmployees = await this.orm.searchRead("hr.employee", [], ["id"]);
// // // // //         const totalDepartments = await this.orm.searchRead("hr.department", [], ["id"]);
// // // // //         const totalJobs = await this.orm.searchRead("hr.job", [], ["id"]);
// // // // //         const totalLeaves = await this.orm.searchRead("hr.leave", [], ["id"]);
// // // // //         const totalContracts = await this.orm.searchRead("hr.contract", [], ["id"]);

// // // // //         this.stats.totalEmployees = totalEmployees.length;
// // // // //         this.stats.totalDepartments = totalDepartments.length;
// // // // //         this.stats.totalJobs = totalJobs.length;
// // // // //         this.stats.totalLeaves = totalLeaves.length;
// // // // //         this.stats.totalContracts = totalContracts.length;
// // // // //     }

// // // // //     renderChart() {
// // // // //         const labels = this.data.map(item => item.name || "Unknown Employee");
// // // // //         const data = this.data.map(item => item.department_id[1] || 0);
// // // // //         const color = labels.map((_, index) => getColor(index));
    
// // // // //         if (this.chart) this.chart.destroy();
// // // // //         if (this.charttwo) this.charttwo.destroy();
// // // // //         if (this.chartthree) this.chartthree.destroy();
// // // // //         if (this.chartDoughnut) this.chartDoughnut.destroy();
// // // // //         if (this.chartLeave) this.chartLeave.destroy();
    
// // // // //         this.chart = new Chart(this.canvasRef.el, {
// // // // //             type: "bar",
// // // // //             data: {
// // // // //                 labels: labels,
// // // // //                 datasets: [
// // // // //                     {
// // // // //                         label: 'Employee Departments',
// // // // //                         data: data,
// // // // //                         backgroundColor: color,
// // // // //                     },
// // // // //                 ],
// // // // //             },
// // // // //         });
    
// // // // //         this.charttwo = new Chart(this.canvasReftwo.el, {
// // // // //             type: "line",
// // // // //             data: {
// // // // //                 labels: labels,
// // // // //                 datasets: [
// // // // //                     {
// // // // //                         label: 'Employee Departments',
// // // // //                         data: data,
// // // // //                         backgroundColor: color,
// // // // //                         borderColor: color,
// // // // //                         fill: false,
// // // // //                     },
// // // // //                 ],
// // // // //             },
// // // // //         });

// // // // //         this.chartthree = new Chart(this.canvasRefthree.el, {
// // // // //             type: "pie",
// // // // //             data: {
// // // // //                 labels: labels,
// // // // //                 datasets: [
// // // // //                     {
// // // // //                         label: 'Employee Departments',
// // // // //                         data: data,
// // // // //                         backgroundColor: color,
// // // // //                     },
// // // // //                 ],
// // // // //             },
// // // // //         });

// // // // //         this.chartDoughnut = new Chart(this.canvasRefDoughnut.el, {
// // // // //             type: "doughnut",
// // // // //             data: {
// // // // //                 labels: labels,
// // // // //                 datasets: [
// // // // //                     {
// // // // //                         label: 'Employee Departments',
// // // // //                         data: data,
// // // // //                         backgroundColor: color,
// // // // //                     },
// // // // //                 ],
// // // // //             },
// // // // //         });

// // // // //         this.chartLeave = new Chart(this.canvasRefLeave.el, {
// // // // //             type: "bar",
// // // // //             data: {
// // // // //                 labels: labels,
// // // // //                 datasets: [
// // // // //                     {
// // // // //                         label: 'Leave Requests',
// // // // //                         data: data,
// // // // //                         backgroundColor: color,
// // // // //                     },
// // // // //                 ],
// // // // //             },
// // // // //         });
// // // // //     }

// // // // //     onSearchQueryChange(event) {
// // // // //         this.searchQuery.value = event.target.value;
// // // // //         this.fetchData();
// // // // //     }

// // // // //     goToHRPage(filter) {
// // // // //         const domain = [];

// // // // //         if (filter === "employees") {
// // // // //             domain.push(["id", ">", 0]); // Fetch all employees
// // // // //         } else if (filter === "departments") {
// // // // //             domain.push(["department_id", "!=", false]); // Fetch employees with departments
// // // // //         } else if (filter === "jobs") {
// // // // //             domain.push(["job_id", "!=", false]); // Fetch employees with jobs
// // // // //         } else if (filter === "leaves") {
// // // // //             domain.push(["leave_ids", "!=", false]); // Fetch employees with leaves
// // // // //         } else if (filter === "contracts") {
// // // // //             domain.push(["contract_ids", "!=", false]); // Fetch employees with contracts
// // // // //         }

// // // // //         if (this.action) {
// // // // //             this.action.doAction({
// // // // //                 type: "ir.actions.act_window",
// // // // //                 res_model: "hr.employee",
// // // // //                 view_mode: "list",
// // // // //                 views: [[false, "list"]],
// // // // //                 target: "current",
// // // // //                 domain: domain,
// // // // //             });
// // // // //         } else {
// // // // //             console.error("Action service is not available.");
// // // // //         }
// // // // //     }
// // // // // }

// // // // // ChartjsSampleHR.template = "chart_sample.chartjs_sample_hr";

// // // // // actionRegistry.add("chartjs_sample_hr", ChartjsSampleHR);


// // // // /** @odoo-module **/

// // // // import { registry } from "@web/core/registry";
// // // // import { useService } from "@web/core/utils/hooks";

// // // // import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
// // // // import { loadJS } from "@web/core/assets";
// // // // import { getColor } from "@web/core/colors/colors";

// // // // const actionRegistry = registry.category("actions");

// // // // export class ChartjsSampleHR extends Component {
// // // //     setup() {
// // // //         this.orm = useService('orm');
// // // //         this.action = useService("action");
// // // //         this.data = useState([]);
// // // //         this.filterType = useState({ value: "all" });
// // // //         this.searchQuery = useState({ value: "" });
// // // //         this.stats = useState({
// // // //             totalEmployees: 0,
// // // //             totalDepartments: 0,
// // // //             totalJobs: 0,
// // // //             totalLeaves: 0,
// // // //             totalContracts: 0,
// // // //         });
// // // //         this.canvasRef = useRef("canvas");
// // // //         this.canvasReftwo = useRef("canvastwo");
// // // //         this.canvasRefthree = useRef("canvasthree");
// // // //         this.canvasRefDoughnut = useRef("canvasDoughnut");
// // // //         this.canvasRefLeave = useRef("canvasLeave");

// // // //         onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));

// // // //         onMounted(() => {
// // // //             this.fetchData();
// // // //             this.fetchStats();
// // // //         });

// // // //         onWillUnmount(() => {
// // // //             if (this.chart) {
// // // //                 this.chart.destroy();
// // // //             }
// // // //             if (this.charttwo) {
// // // //                 this.charttwo.destroy();
// // // //             }
// // // //             if (this.chartthree) {
// // // //                 this.chartthree.destroy();
// // // //             }
// // // //             if (this.chartDoughnut) {
// // // //                 this.chartDoughnut.destroy();
// // // //             }
// // // //             if (this.chartLeave) {
// // // //                 this.chartLeave.destroy();
// // // //             }
// // // //         });

// // // //         // Bind methods to ensure correct `this` context
// // // //         this.goToHRPage = this.goToHRPage.bind(this);
// // // //         this.fetchData = this.fetchData.bind(this);
// // // //         this.fetchStats = this.fetchStats.bind(this);
// // // //         this.renderChart = this.renderChart.bind(this);
// // // //         this.onSearchQueryChange = this.onSearchQueryChange.bind(this);
// // // //     }

// // // //     async fetchData() {
// // // //         const domain = [];
        
// // // //         if (this.filterType.value && this.filterType.value !== "all") {
// // // //             domain.push(['type', '=', this.filterType.value]);
// // // //         }
// // // //         if (this.searchQuery.value) {
// // // //             domain.push(['name', 'ilike', this.searchQuery.value]);
// // // //         }
    
// // // //         const employees = await this.orm.searchRead("hr.employee", domain, ["id", "name", "department_id", "job_id"]);
// // // //         console.log('Fetched employees:', employees);

// // // //         // Aggregate data by department
// // // //         const departmentCounts = employees.reduce((acc, employee) => {
// // // //             const department = employee.department_id[1] || "Unknown Department";
// // // //             if (!acc[department]) {
// // // //                 acc[department] = 0;
// // // //             }
// // // //             acc[department]++;
// // // //             return acc;
// // // //         }, {});

// // // //         this.data = Object.entries(departmentCounts).map(([department, count]) => ({
// // // //             department,
// // // //             count,
// // // //         }));

// // // //         this.renderChart();
// // // //     }

// // // //     async fetchStats() {
// // // //         const totalEmployees = await this.orm.searchRead("hr.employee", [], ["id"]);
// // // //         const totalDepartments = await this.orm.searchRead("hr.department", [], ["id"]);
// // // //         const totalJobs = await this.orm.searchRead("hr.job", [], ["id"]);
// // // //         const totalLeaves = await this.orm.searchRead("hr.leave", [], ["id"]);
// // // //         const totalContracts = await this.orm.searchRead("hr.contract", [], ["id"]);

// // // //         this.stats.totalEmployees = totalEmployees.length;
// // // //         this.stats.totalDepartments = totalDepartments.length;
// // // //         this.stats.totalJobs = totalJobs.length;
// // // //         this.stats.totalLeaves = totalLeaves.length;
// // // //         this.stats.totalContracts = totalContracts.length;
// // // //     }

// // // //     renderChart() {
// // // //         const labels = this.data.map(item => item.department);
// // // //         const data = this.data.map(item => item.count);
// // // //         const color = labels.map((_, index) => getColor(index));
    
// // // //         if (this.chart) this.chart.destroy();
// // // //         if (this.charttwo) this.charttwo.destroy();
// // // //         if (this.chartthree) this.chartthree.destroy();
// // // //         if (this.chartDoughnut) this.chartDoughnut.destroy();
// // // //         if (this.chartLeave) this.chartLeave.destroy();
    
// // // //         this.chart = new Chart(this.canvasRef.el, {
// // // //             type: "bar",
// // // //             data: {
// // // //                 labels: labels,
// // // //                 datasets: [
// // // //                     {
// // // //                         label: 'Total Employees per Department',
// // // //                         data: data,
// // // //                         backgroundColor: color,
// // // //                     },
// // // //                 ],
// // // //             },
// // // //         });
    
// // // //         this.charttwo = new Chart(this.canvasReftwo.el, {
// // // //             type: "line",
// // // //             data: {
// // // //                 labels: labels,
// // // //                 datasets: [
// // // //                     {
// // // //                         label: 'Total Employees per Department',
// // // //                         data: data,
// // // //                         backgroundColor: color,
// // // //                         borderColor: color,
// // // //                         fill: false,
// // // //                     },
// // // //                 ],
// // // //             },
// // // //         });

// // // //         this.chartthree = new Chart(this.canvasRefthree.el, {
// // // //             type: "pie",
// // // //             data: {
// // // //                 labels: labels,
// // // //                 datasets: [
// // // //                     {
// // // //                         label: 'Total Employees per Department',
// // // //                         data: data,
// // // //                         backgroundColor: color,
// // // //                     },
// // // //                 ],
// // // //             },
// // // //         });

// // // //         this.chartDoughnut = new Chart(this.canvasRefDoughnut.el, {
// // // //             type: "doughnut",
// // // //             data: {
// // // //                 labels: labels,
// // // //                 datasets: [
// // // //                     {
// // // //                         label: 'Total Employees per Department',
// // // //                         data: data,
// // // //                         backgroundColor: color,
// // // //                     },
// // // //                 ],
// // // //             },
// // // //         });

// // // //         this.chartLeave = new Chart(this.canvasRefLeave.el, {
// // // //             type: "bar",
// // // //             data: {
// // // //                 labels: labels,
// // // //                 datasets: [
// // // //                     {
// // // //                         label: 'Leave Requests',
// // // //                         data: data,
// // // //                         backgroundColor: color,
// // // //                     },
// // // //                 ],
// // // //             },
// // // //         });
// // // //     }

// // // //     onSearchQueryChange(event) {
// // // //         this.searchQuery.value = event.target.value;
// // // //         this.fetchData();
// // // //     }

// // // //     goToHRPage(filter) {
// // // //         const domain = [];

// // // //         if (filter === "employees") {
// // // //             domain.push(["id", ">", 0]); // Fetch all employees
// // // //         } else if (filter === "departments") {
// // // //             domain.push(["department_id", "!=", false]); // Fetch employees with departments
// // // //         } else if (filter === "jobs") {
// // // //             domain.push(["job_id", "!=", false]); // Fetch employees with jobs
// // // //         } else if (filter === "leaves") {
// // // //             domain.push(["leave_ids", "!=", false]); // Fetch employees with leaves
// // // //         } else if (filter === "contracts") {
// // // //             domain.push(["contract_ids", "!=", false]); // Fetch employees with contracts
// // // //         }

// // // //         if (this.action) {
// // // //             this.action.doAction({
// // // //                 type: "ir.actions.act_window",
// // // //                 res_model: "hr.employee",
// // // //                 view_mode: "list",
// // // //                 views: [[false, "list"]],
// // // //                 target: "current",
// // // //                 domain: domain,
// // // //             });
// // // //         } else {
// // // //             console.error("Action service is not available.");
// // // //         }
// // // //     }
// // // // }

// // // // ChartjsSampleHR.template = "chart_sample.chartjs_sample_hr";

// // // // actionRegistry.add("chartjs_sample_hr", ChartjsSampleHR);


// // // /** @odoo-module **/

// // // import { registry } from "@web/core/registry";
// // // import { useService } from "@web/core/utils/hooks";

// // // import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
// // // import { loadJS } from "@web/core/assets";
// // // import { getColor } from "@web/core/colors/colors";

// // // const actionRegistry = registry.category("actions");

// // // export class ChartjsSampleHR extends Component {
// // //     setup() {
// // //         this.orm = useService('orm');
// // //         this.action = useService("action");
// // //         this.data = useState([]);
// // //         this.filterType = useState({ value: "all" });
// // //         this.searchQuery = useState({ value: "" });
// // //         this.stats = useState({
// // //             totalEmployees: 0,
// // //             totalDepartments: 0,
// // //             totalJobs: 0,
// // //             totalLeaves: 0,
// // //             totalContracts: 0,
// // //             turnoverRate: 0,
// // //             absentRate: 0,
// // //             pendingLeaves: 0,
// // //         });
// // //         this.canvasRef = useRef("canvas");
// // //         this.canvasReftwo = useRef("canvastwo");
// // //         this.canvasRefthree = useRef("canvasthree");
// // //         this.canvasRefDoughnut = useRef("canvasDoughnut");
// // //         this.canvasRefLeave = useRef("canvasLeave");

// // //         onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));

// // //         onMounted(() => {
// // //             this.fetchData();
// // //         });

// // //         onWillUnmount(() => {
// // //             if (this.chart) {
// // //                 this.chart.destroy();
// // //             }
// // //             if (this.charttwo) {
// // //                 this.charttwo.destroy();
// // //             }
// // //             if (this.chartthree) {
// // //                 this.chartthree.destroy();
// // //             }
// // //             if (this.chartDoughnut) {
// // //                 this.chartDoughnut.destroy();
// // //             }
// // //             if (this.chartLeave) {
// // //                 this.chartLeave.destroy();
// // //             }
// // //         });

// // //         // Bind methods to ensure correct `this` context
// // //         this.goToHRPage = this.goToHRPage.bind(this);
// // //         this.fetchData = this.fetchData.bind(this);
// // //         this.renderChart = this.renderChart.bind(this);
// // //         this.onSearchQueryChange = this.onSearchQueryChange.bind(this);
// // //     }

// // //     async fetchData() {
// // //         const hrMetrics = await this.orm.call("hr.employee", "get_hr_metrics_chart");
// // //         console.log('Fetched HR metrics:', hrMetrics);

// // //         this.stats.totalEmployees = hrMetrics.totalEmployees;
// // //         this.stats.totalDepartments = hrMetrics.totalDepartments;
// // //         this.stats.totalJobs = hrMetrics.totalJobs;
// // //         this.stats.totalLeaves = hrMetrics.totalLeaves;
// // //         this.stats.totalContracts = hrMetrics.totalContracts;
// // //         this.stats.turnoverRate = hrMetrics.turnover_rate;
// // //         this.stats.absentRate = hrMetrics.absent_rate;
// // //         this.stats.pendingLeaves = hrMetrics.pending_leaves;

// // //         this.data = hrMetrics;

// // //         this.renderChart();
// // //     }

// // //     renderChart() {
// // //         const contractLabels = this.data.contract_running_vs_exit.labels;
// // //         const contractData = this.data.contract_running_vs_exit.data;
// // //         const contractColor = contractLabels.map((_, index) => getColor(index));

// // //         const expirationLabels = this.data.contract_expiration.labels;
// // //         const expirationData = this.data.contract_expiration.data;
// // //         const expirationColor = expirationLabels.map((_, index) => getColor(index));

// // //         if (this.chart) this.chart.destroy();
// // //         if (this.charttwo) this.charttwo.destroy();
// // //         if (this.chartthree) this.chartthree.destroy();
// // //         if (this.chartDoughnut) this.chartDoughnut.destroy();
// // //         if (this.chartLeave) this.chartLeave.destroy();

// // //         this.chart = new Chart(this.canvasRef.el, {
// // //             type: "bar",
// // //             data: {
// // //                 labels: contractLabels,
// // //                 datasets: [
// // //                     {
// // //                         label: 'Contract Running vs Exit',
// // //                         data: contractData,
// // //                         backgroundColor: contractColor,
// // //                     },
// // //                 ],
// // //             },
// // //         });

// // //         this.charttwo = new Chart(this.canvasReftwo.el, {
// // //             type: "line",
// // //             data: {
// // //                 labels: expirationLabels,
// // //                 datasets: [
// // //                     {
// // //                         label: 'Contract Expiration Dates',
// // //                         data: expirationData,
// // //                         backgroundColor: expirationColor,
// // //                         borderColor: expirationColor,
// // //                         fill: false,
// // //                     },
// // //                 ],
// // //             },
// // //         });

// // //         this.chartthree = new Chart(this.canvasRefthree.el, {
// // //             type: "pie",
// // //             data: {
// // //                 labels: contractLabels,
// // //                 datasets: [
// // //                     {
// // //                         label: 'Contract Running vs Exit',
// // //                         data: contractData,
// // //                         backgroundColor: contractColor,
// // //                     },
// // //                 ],
// // //             },
// // //         });

// // //         this.chartDoughnut = new Chart(this.canvasRefDoughnut.el, {
// // //             type: "doughnut",
// // //             data: {
// // //                 labels: contractLabels,
// // //                 datasets: [
// // //                     {
// // //                         label: 'Contract Running vs Exit',
// // //                         data: contractData,
// // //                         backgroundColor: contractColor,
// // //                     },
// // //                 ],
// // //             },
// // //         });

// // //         this.chartLeave = new Chart(this.canvasRefLeave.el, {
// // //             type: "bar",
// // //             data: {
// // //                 labels: expirationLabels,
// // //                 datasets: [
// // //                     {
// // //                         label: 'Contract Expiration Dates',
// // //                         data: expirationData,
// // //                         backgroundColor: expirationColor,
// // //                     },
// // //                 ],
// // //             },
// // //         });
// // //     }

// // //     onSearchQueryChange(event) {
// // //         this.searchQuery.value = event.target.value;
// // //         this.fetchData();
// // //     }

// // //     goToHRPage(filter) {
// // //         const domain = [];

// // //         if (filter === "employees") {
// // //             domain.push(["id", ">", 0]); // Fetch all employees
// // //         } else if (filter === "departments") {
// // //             domain.push(["department_id", "!=", false]); // Fetch employees with departments
// // //         } else if (filter === "jobs") {
// // //             domain.push(["job_id", "!=", false]); // Fetch employees with jobs
// // //         } else if (filter === "leaves") {
// // //             domain.push(["leave_ids", "!=", false]); // Fetch employees with leaves
// // //         } else if (filter === "contracts") {
// // //             domain.push(["contract_ids", "!=", false]); // Fetch employees with contracts
// // //         }

// // //         if (this.action) {
// // //             this.action.doAction({
// // //                 type: "ir.actions.act_window",
// // //                 res_model: "hr.employee",
// // //                 view_mode: "list",
// // //                 views: [[false, "list"]],
// // //                 target: "current",
// // //                 domain: domain,
// // //             });
// // //         } else {
// // //             console.error("Action service is not available.");
// // //         }
// // //     }
// // // }

// // // ChartjsSampleHR.template = "chart_sample.chartjs_sample_hr";

// // // actionRegistry.add("chartjs_sample_hr", ChartjsSampleHR);


// // /** @odoo-module **/

// // import { registry } from "@web/core/registry";
// // import { useService } from "@web/core/utils/hooks";

// // import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
// // import { loadJS } from "@web/core/assets";
// // import { getColor } from "@web/core/colors/colors";

// // const actionRegistry = registry.category("actions");

// // export class ChartjsSampleHR extends Component {
// //     setup() {
// //         this.orm = useService('orm');
// //         this.action = useService("action");
// //         this.data = useState({});
// //         this.filterType = useState({ value: "all" });
// //         this.searchQuery = useState({ value: "" });
// //         this.stats = useState({
// //             totalEmployees: 0,
// //             totalDepartments: 0,
// //             totalJobs: 0,
// //             totalLeaves: 0,
// //             totalContracts: 0,
// //             turnoverRate: 0,
// //             absentRate: 0,
// //             pendingLeaves: 0,
// //         });
// //         this.canvasRef = useRef("canvas");
// //         this.canvasReftwo = useRef("canvastwo");
// //         this.canvasRefthree = useRef("canvasthree");
// //         this.canvasRefDoughnut = useRef("canvasDoughnut");
// //         this.canvasRefLeave = useRef("canvasLeave");

// //         onWillStart(async () => await loadJS(["/web/static/lib/Chart/Chart.js"]));

// //         onMounted(() => {
// //             this.fetchData();
// //         });

// //         onWillUnmount(() => {
// //             if (this.chart) {
// //                 this.chart.destroy();
// //             }
// //             if (this.charttwo) {
// //                 this.charttwo.destroy();
// //             }
// //             if (this.chartthree) {
// //                 this.chartthree.destroy();
// //             }
// //             if (this.chartDoughnut) {
// //                 this.chartDoughnut.destroy();
// //             }
// //             if (this.chartLeave) {
// //                 this.chartLeave.destroy();
// //             }
// //         });

// //         // Bind methods to ensure correct `this` context
// //         this.goToHRPage = this.goToHRPage.bind(this);
// //         this.fetchData = this.fetchData.bind(this);
// //         this.renderChart = this.renderChart.bind(this);
// //         this.onSearchQueryChange = this.onSearchQueryChange.bind(this);
// //     }

// //     async fetchData() {
// //         const hrMetrics = await this.orm.call("hr.employee", "get_hr_metrics_chart");
// //         console.log('Fetched HR metrics:', hrMetrics);

// //         this.stats.totalEmployees = hrMetrics.totalEmployees;
// //         this.stats.totalDepartments = hrMetrics.totalDepartments;
// //         this.stats.totalJobs = hrMetrics.totalJobs;
// //         this.stats.totalLeaves = hrMetrics.totalLeaves;
// //         this.stats.totalContracts = hrMetrics.totalContracts;
// //         this.stats.turnoverRate = hrMetrics.turnover_rate;
// //         this.stats.absentRate = hrMetrics.absent_rate;
// //         this.stats.pendingLeaves = hrMetrics.pending_leaves;

// //         this.data = hrMetrics;

// //         this.renderChart();
// //     }

// //     renderChart() {
// //         const contractLabels = this.data.contract_running_vs_exit.labels;
// //         const contractData = this.data.contract_running_vs_exit.data;
// //         const contractColor = contractLabels.map((_, index) => getColor(index));

// //         const expirationLabels = this.data.contract_expiration.labels;
// //         const expirationData = this.data.contract_expiration.data;
// //         const expirationColor = expirationLabels.map((_, index) => getColor(index));

// //         const absentRateLabels = ["Absent Rate", "Present Rate"];
// //         const absentRateData = [this.stats.absentRate, 100 - this.stats.absentRate];
// //         const absentRateColor = absentRateLabels.map((_, index) => getColor(index));

// //         const turnoverRateLabels = ["Turnover Rate", "Retention Rate"];
// //         const turnoverRateData = [this.stats.turnoverRate, 100 - this.stats.turnoverRate];
// //         const turnoverRateColor = turnoverRateLabels.map((_, index) => getColor(index));

// //         const pendingLeavesLabels = ["Pending Leaves"];
// //         const pendingLeavesData = [this.stats.pendingLeaves];
// //         const pendingLeavesColor = pendingLeavesLabels.map((_, index) => getColor(index));

// //         if (this.chart) this.chart.destroy();
// //         if (this.charttwo) this.charttwo.destroy();
// //         if (this.chartthree) this.chartthree.destroy();
// //         if (this.chartDoughnut) this.chartDoughnut.destroy();
// //         if (this.chartLeave) this.chartLeave.destroy();

// //         this.chart = new Chart(this.canvasRef.el, {
// //             type: "line",
// //             data: {
// //                 labels: contractLabels,
// //                 datasets: [
// //                     {
// //                         label: 'Contract Running vs Exit',
// //                         data: contractData,
// //                         backgroundColor: contractColor,
// //                     },
// //                 ],
// //             },
// //         });

// //         this.charttwo = new Chart(this.canvasReftwo.el, {
// //             type: "line",
// //             data: {
// //                 labels: expirationLabels,
// //                 datasets: [
// //                     {
// //                         label: 'Contract Expiration Dates',
// //                         data: expirationData,
// //                         backgroundColor: expirationColor,
// //                         borderColor: expirationColor,
// //                         fill: false,
// //                     },
// //                 ],
// //             },
// //         });

// //         this.chartthree = new Chart(this.canvasRefthree.el, {
// //             type: "pie",
// //             data: {
// //                 labels: turnoverRateLabels,
// //                 datasets: [
// //                     {
// //                         label: 'Turnover Rate',
// //                         data: turnoverRateData,
// //                         backgroundColor: turnoverRateColor,
// //                     },
// //                 ],
// //             },
// //         });

// //         this.chartDoughnut = new Chart(this.canvasRefDoughnut.el, {
// //             type: "doughnut",
// //             data: {
// //                 labels: absentRateLabels,
// //                 datasets: [
// //                     {
// //                         label: 'Absent Rate',
// //                         data: absentRateData,
// //                         backgroundColor: absentRateColor,
// //                     },
// //                 ],
// //             },
// //         });

// //         this.chartLeave = new Chart(this.canvasRefLeave.el, {
// //             type: "bar",
// //             data: {
// //                 labels: pendingLeavesLabels,
// //                 datasets: [
// //                     {
// //                         label: 'Pending Leaves',
// //                         data: pendingLeavesData,
// //                         backgroundColor: pendingLeavesColor,
// //                     },
// //                 ],
// //             },
// //         });
// //     }

// //     onSearchQueryChange(event) {
// //         this.searchQuery.value = event.target.value;
// //         this.fetchData();
// //     }

// //     goToHRPage(filter) {
// //         const domain = [];

// //         if (filter === "employees") {
// //             domain.push(["id", ">", 0]); // Fetch all employees
// //         } else if (filter === "departments") {
// //             domain.push(["department_id", "!=", false]); // Fetch employees with departments
// //         } else if (filter === "jobs") {
// //             domain.push(["job_id", "!=", false]); // Fetch employees with jobs
// //         } else if (filter === "leaves") {
// //             domain.push(["leave_ids", "!=", false]); // Fetch employees with leaves
// //         } else if (filter === "contracts") {
// //             domain.push(["contract_ids", "!=", false]); // Fetch employees with contracts
// //         }

// //         if (this.action) {
// //             this.action.doAction({
// //                 type: "ir.actions.act_window",
// //                 res_model: "hr.employee",
// //                 view_mode: "list",
// //                 views: [[false, "list"]],
// //                 target: "current",
// //                 domain: domain,
// //             });
// //         } else {
// //             console.error("Action service is not available.");
// //         }
// //     }
// // }

// // ChartjsSampleHR.template = "chart_sample.chartjs_sample_hr";

// // actionRegistry.add("chartjs_sample_hr", ChartjsSampleHR);



// /** @odoo-module **/

// import { registry } from "@web/core/registry";
// import { useService } from "@web/core/utils/hooks";

// import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
// import { loadJS } from "@web/core/assets";
// import { getColor } from "@web/core/colors/colors";

// const actionRegistry = registry.category("actions");

// export class ChartjsSampleHR extends Component {
//     setup() {
//         this.orm = useService('orm');
//         this.action = useService("action");
//         this.data = useState({});
//         this.filterType = useState({ value: "all" });
//         this.searchQuery = useState({ value: "" });
//         this.stats = useState({
//             totalActiveEmployees: 0,
//             totalDepartments: 0,
//             totalJobs: 0,
//             totalLeaves: 0,
//             totalAttendance: 0,
//             turnoverRate: 0,
//             absentRate: 0,
//             pendingLeaves: 0,
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
//         this.goToHRPage = this.goToHRPage.bind(this);
//         this.fetchData = this.fetchData.bind(this);
//         this.renderChart = this.renderChart.bind(this);
//         this.onSearchQueryChange = this.onSearchQueryChange.bind(this);
//     }

//     async fetchData() {
//         const hrMetrics = await this.orm.call("hr.employee", "get_hr_metrics_chart");
//         console.log('Fetched HR metrics:', hrMetrics);
//         console.log( hrMetrics);
//         this.stats.totalActiveEmployees = hrMetrics.total_active_employees;
//         console.log('Fetched HR metrics:', hrMetrics);
//         this.stats.totalDepartments = hrMetrics.total_departments;
//         this.stats.totalJobs = hrMetrics.total_jobs;
//         this.stats.totalLeaves = hrMetrics.total_leaves;
//         this.stats.totalAttendance = hrMetrics.total_attendance;
//         this.stats.turnoverRate = hrMetrics.turnover_rate;
//         this.stats.absentRate = hrMetrics.absent_rate;
//         this.stats.pendingLeaves = hrMetrics.pending_leaves;

//         this.data = hrMetrics;

//         this.renderChart();
//     }

//     renderChart() {
//         const contractLabels = this.data.contract_running_vs_exit.labels;
//         const contractData = this.data.contract_running_vs_exit.data;
//         const contractColor = contractLabels.map((_, index) => getColor(index));

//         const expirationLabels = this.data.contract_expiration.labels;
//         const expirationData = this.data.contract_expiration.data;
//         const expirationColor = expirationLabels.map((_, index) => getColor(index));

//         const absentRateLabels = ["Absent Rate", "Present Rate"];
//         const absentRateData = [this.stats.absentRate, 100 - this.stats.absentRate];
//         const absentRateColor = absentRateLabels.map((_, index) => getColor(index));

//         const turnoverRateLabels = ["Turnover Rate", "Retention Rate"];
//         const turnoverRateData = [this.stats.turnoverRate, 100 - this.stats.turnoverRate];
//         const turnoverRateColor = turnoverRateLabels.map((_, index) => getColor(index));

//         const pendingLeavesLabels = ["Pending Leaves"];
//         const pendingLeavesData = [this.stats.pendingLeaves];
//         const pendingLeavesColor = pendingLeavesLabels.map((_, index) => getColor(index));

//         if (this.chart) this.chart.destroy();
//         if (this.charttwo) this.charttwo.destroy();
//         if (this.chartthree) this.chartthree.destroy();
//         if (this.chartDoughnut) this.chartDoughnut.destroy();
//         if (this.chartLeave) this.chartLeave.destroy();

//         this.chart = new Chart(this.canvasRef.el, {
//             type: "bar",
//             data: {
//                 labels: contractLabels,
//                 datasets: [
//                     {
//                         label: 'Contract Running vs Exit',
//                         data: contractData,
//                         backgroundColor: contractColor,
//                     },
//                 ],
//             },
//         });

//         this.charttwo = new Chart(this.canvasReftwo.el, {
//             type: "line",
//             data: {
//                 labels: expirationLabels,
//                 datasets: [
//                     {
//                         label: 'Contract Expiration Dates',
//                         data: expirationData,
//                         backgroundColor: expirationColor,
//                         borderColor: expirationColor,
//                         fill: false,
//                     },
//                 ],
//             },
//         });

//         this.chartthree = new Chart(this.canvasRefthree.el, {
//             type: "pie",
//             data: {
//                 labels: turnoverRateLabels,
//                 datasets: [
//                     {
//                         label: 'Turnover Rate',
//                         data: turnoverRateData,
//                         backgroundColor: turnoverRateColor,
//                     },
//                 ],
//             },
//         });

//         this.chartDoughnut = new Chart(this.canvasRefDoughnut.el, {
//             type: "doughnut",
//             data: {
//                 labels: absentRateLabels,
//                 datasets: [
//                     {
//                         label: 'Absent Rate',
//                         data: absentRateData,
//                         backgroundColor: absentRateColor,
//                     },
//                 ],
//             },
//         });

//         this.chartLeave = new Chart(this.canvasRefLeave.el, {
//             type: "bar",
//             data: {
//                 labels: pendingLeavesLabels,
//                 datasets: [
//                     {
//                         label: 'Pending Leaves',
//                         data: pendingLeavesData,
//                         backgroundColor: pendingLeavesColor,
//                     },
//                 ],
//             },
//         });
//     }

//     onSearchQueryChange(event) {
//         this.searchQuery.value = event.target.value;
//         this.fetchData();
//     }

//     goToHRPage(filter) {
//         const domain = [];

//         if (filter === "employees") {
//             domain.push(["id", ">", 0]); // Fetch all employees
//         } else if (filter === "departments") {
//             domain.push(["department_id", "!=", false]); // Fetch employees with departments
//         } else if (filter === "jobs") {
//             domain.push(["job_id", "!=", false]); // Fetch employees with jobs
//         } else if (filter === "leaves") {
//             domain.push(["leave_ids", "!=", false]); // Fetch employees with leaves
//         } else if (filter === "attendance") {
//             domain.push(["attendance_ids", "!=", false]); // Fetch employees with attendance records
//         }

//         if (this.action) {
//             this.action.doAction({
//                 type: "ir.actions.act_window",
//                 res_model: "hr.employee",
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

// ChartjsSampleHR.template = "chart_sample.chartjs_sample_hr";

// actionRegistry.add("chartjs_sample_hr", ChartjsSampleHR);



/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
import { loadJS } from "@web/core/assets";
import { getColor } from "@web/core/colors/colors";

const actionRegistry = registry.category("actions");

export class ChartjsSampleHR extends Component {
    setup() {
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
        console.log('Fetched HR metrics:', hrMetrics);

        // this.stats.totalActiveEmployees = hrMetrics.total_active_employees || 0;
        this.stats.totalDepartments = hrMetrics.total_departments || 0;
        
        this.stats.totalJobs = hrMetrics.total_jobs || 0;
        this.stats.totalLeaves = hrMetrics.total_leaves || 0;
        this.stats.totalAttendance = hrMetrics.pending_leaves || 0;
        console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^',this.stats.total_departments)
        this.stats.turnoverRate = hrMetrics.turnover_rate || 0;
        this.stats.absentRate = hrMetrics.absent_rate || 0;
        this.stats.pendingLeaves = hrMetrics.pending_leaves || 0;

        this.data = hrMetrics;

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

        this.charttwo = new Chart(this.canvasReftwo.el, {
            type: "line",
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
            type: "pie",
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



    // goToHRPage(filter) {
    //     let resModel = "hr.employee"; // Default model
    //     let domain = [];
    
    //     if (filter === "employees") {
    //         resModel = "hr.employee";
    //         domain.push(["active", "=", true]); // Show active employees
    //     } else if (filter === "departments") {
    //         resModel = "hr.department"; // Navigate to departments
    //     } else if (filter === "jobs") {
    //         resModel = "hr.job"; // Navigate to job positions
    //     } else if (filter === "leaves") {
    //         resModel = "hr.leave"; // Navigate to leave records
    //         domain.push(["state", "=", "validate"]); // Show approved leaves
    //     } else if (filter === "attendance") {
    //         resModel = "hr.attendance"; // Navigate to attendance records
    //     }
    
    //     if (this.action) {
    //         this.action.doAction({
    //             type: "ir.actions.act_window",
    //             res_model: resModel,
    //             view_mode: "list",
    //             views: [[false, "list"]],
    //             target: "current",
    //             domain: domain,
    //         });
    //     } else {
    //         console.error("Action service is not available.");
    //     }
    // }

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

ChartjsSampleHR.template = "chart_sample.chartjs_sample_hr";

actionRegistry.add("chartjs_sample_hr", ChartjsSampleHR);