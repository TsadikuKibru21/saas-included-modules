/** @odoo-module **/
import { Component, useState } from "@odoo/owl";

export class ChartJsSample extends Component {
    setup() {
        this.state = useState({ filterType: "all" });
    }

    onFilterChange(event) {
        this.state.filterType = event.target.value;
    }

    filterCondition(statType) {
        return this.state.filterType === "all" || this.state.filterType === statType;
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
        this.data = await this.orm.searchRead("sale.order", domain, ["name", "partner_id", "amount_total"]);
        console.log('Fetched data:', this.data);
        this.renderChart();
//     }
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
}

ChartJsSample.template = "chart_sample.chartjs_sample";
