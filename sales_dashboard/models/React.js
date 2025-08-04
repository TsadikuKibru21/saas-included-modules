const url = 'http://67.217.59.107:32356/jsonrpc'; // Replace with your Odoo URL
const db = 'your_database';
const username = 'your_username';
const password = 'your_password';

// Function to fetch data from Odoo
async function fetchOdooData(model, method = 'search_read', domain = [], fields = []) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: method,
                params: {
                    model: model,
                    domain: domain,
                    fields: fields,
                },
                id: Math.floor(Math.random() * 1000),
            }),
        });

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error.message);
        }
        return result.result;
    } catch (error) {
        console.error(`Error fetching data for model ${model}:`, error);
    }
}

// Function to authenticate with Odoo
async function authenticate() {
    return await fetchOdooData('common', 'login', [], [db, username, password]);
}

// Function to initialize the dashboard and fetch data from multiple modules
async function initializeDashboard() {
    try {
        await authenticate(); // Authenticate with Odoo

        // Define models and fields for multiple modules
        const modules = {
            purchase: { model: 'purchase.order', fields: ['name', 'date_order', 'amount_total', 'state'] },
            sales: { model: 'sale.order', fields: ['name', 'date_order', 'amount_total', 'state'] },
            inventory: { model: 'stock.quant', fields: ['product_id', 'location_id', 'quantity', 'lot_id'] },
            manufacturing: { model: 'mrp.production', fields: ['name', 'product_id', 'state', 'date_planned'] },
            hr: { model: 'hr.employee', fields: ['name', 'department_id', 'job_id', 'work_email'] },
        };

        // Fetch data for each module
        const dataPromises = Object.keys(modules).map(async (key) => {
            const module = modules[key];
            const data = await fetchOdooData(module.model, 'search_read', [], module.fields);
            return { [key]: data };
        });

        // Wait for all data to be fetched
        const allData = await Promise.all(dataPromises);
        console.log(allData); // Log the combined data

        // Process and visualize data
        visualizeData(allData);
    } catch (error) {
        console.error("Error initializing dashboard:", error);
    }
}

// Function to visualize the fetched data
function visualizeData(data) {
    const ctxSales = document.getElementById('salesChart').getContext('2d');
    const ctxPurchase = document.getElementById('purchaseChart').getContext('2d');

    const salesData = extractData(data, 'sales');
    createChart(ctxSales, 'Sales Overview', salesData.labels, salesData.values);

    const purchaseData = extractData(data, 'purchase');
    createChart(ctxPurchase, 'Purchases Overview', purchaseData.labels, purchaseData.values);
}

// Helper function to extract data for charts
function extractData(data, module) {
    const records = data.find(d => d[module])[module];
    const labels = records.map(record => record.name);
    const values = records.map(record => record.amount_total || record.quantity);

    return { labels, values };
}

// Function to create a chart
function createChart(ctx, title, labels, data) {
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                title: {
                    display: true,
                    text: title
                }
            }
        }
    });
}

// Initialize the dashboard
initializeDashboard();