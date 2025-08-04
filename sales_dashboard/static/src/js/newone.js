/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

import { Component, onWillStart, useRef, onMounted, onWillUnmount, useState } from "@odoo/owl";
import { loadJS } from "@web/core/assets";
import { getColor } from "@web/core/colors/colors";

const actionRegistry = registry.category("actions");

export class ChartjsSampleCRM extends Component {
    setup() {
        this.orm = useService('orm');
        this.action = useService("action");
        this.data = useState([]);
        this.filterType = useState({ value: "all" });
        this.searchQuery = useState({ value: "" });
        this.stats = useState({
            totalLeads: 0,
            totalOpportunities: 0,
            totalWon: 0,
            totalLost: 0,
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
        this.goToCRMPage = this.goToCRMPage.bind(this);
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
    
        const leads = await this.orm.searchRead("crm.lead", domain, ["id", "name", "stage_id", "probability"]);
        console.log('Fetched leads:', leads);

        this.data = leads;
        this.renderChart();
    }

    async fetchStats() {
        const totalLeads = await this.orm.searchRead("crm.lead", [], ["id"]);
        const totalOpportunities = await this.orm.searchRead("crm.lead", [['type', '=', 'opportunity']], ["id"]);
        const totalWon = await this.orm.searchRead("crm.lead", [['stage_id', '=', 'won']], ["id"]);
        const totalLost = await this.orm.searchRead("crm.lead", [['stage_id', '=', 'lost']], ["id"]);

        this.stats.totalLeads = totalLeads.length;
        this.stats.totalOpportunities = totalOpportunities.length;
        this.stats.totalWon = totalWon.length;
        this.stats.totalLost = totalLost.length;
    }

    renderChart() {
        const labels = this.data.map(item => item.name || "Unknown Lead");
        const data = this.data.map(item => item.probability || 0);
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
                        label: 'Lead Probability',
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
                        label: 'Lead Probability',
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
                        label: 'Lead Probability',
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

    goToCRMPage(filter) {
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
}

ChartjsSampleCRM.template = "chart_sample.chartjs_sample_crm";

actionRegistry.add("chartjs_sample_crm", ChartjsSampleCRM);