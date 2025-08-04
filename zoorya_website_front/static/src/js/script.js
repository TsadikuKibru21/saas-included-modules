$(document).ready(function () {
    if (window.location.pathname === '/' || window.location.pathname === '/shop') {
        console.log("shop loaded");

        let products = [];

        // Fetch SaaS Products from Odoo using RPC
        function fetchSaaSProducts() {
            $.ajax({
                url: '/web/dataset/call_kw/saas.product/search_read',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "call",
                    params: {
                        model: "saas.product",
                        method: "search_read",
                        args: [[]],
                        kwargs: {
                            fields: ["id", "name", "image", "product_desc", "features", "category_id", "software_product_id"]
                        }
                    },
                    id: Math.floor(Math.random() * 1000)
                }),
                success: function (response) {
                    console.log("=== response ===");
                    console.dir(response);
                    if (response.result) {
                        products = response.result.map(product => ({
                            id: product.id,
                            name: product.name,
                            image: product.image ? `data:image/png;base64,${product.image}` : "/zoorya_website_front/static/src/img/pos-image.webp",
                            description: product.product_desc,
                            features: product.features,
                            categoryId: product.category_id[0], // Get category ID
                            softwareProductId: product.software_product_id[0] // Store software_product_id
                        }));

                        console.log("Fetched SaaS Products:", products);
                        fetchPrices(); // Fetch prices separately
                    }
                },
                error: function (xhr, status, error) {
                    console.error("Failed to fetch SaaS products:", xhr.responseText);
                }
            });
        }

        // Fetch prices for the software products
        function fetchPrices() {
            const productIds = products.map(product => product.softwareProductId).filter(id => id); // Get software product IDs

            if (productIds.length === 0) {
                //updateProductListing(products);
                return;
            }

            $.ajax({
                url: '/web/dataset/call_kw/product.product/search_read',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "call",
                    params: {
                        model: "product.product",
                        method: "search_read",
                        args: [[["id", "in", productIds]]], // Fetch only needed products
                        kwargs: {
                            fields: ["id", "list_price"]
                        }
                    },
                    id: Math.floor(Math.random() * 1000)
                }),
                success: function (response) {
                    console.log("Fetched Prices:", response);
                    if (response.result) {
                        let priceMap = {};
                        response.result.forEach(product => {
                            priceMap[product.id] = product.list_price;
                        });

                        // Update products with prices
                        products = products.map(product => ({
                            ...product,
                            price: priceMap[product.softwareProductId] || "N/A"
                        }));

                        const productContainer = $(".products");
                        productContainer.empty();
                        productContainer.html("<p>Please select a industry from the above list</p>");
                    }
                },
                error: function (xhr, status, error) {
                    console.error("Failed to fetch prices:", xhr.responseText);
                    updateProductListing(products); // Still update the listing even if prices fail
                }
            });
        }

        // Update product listing in the HTML
        function updateProductListing(filteredProducts) {
            const productContainer = $(".products");
            productContainer.empty();  // Clear existing products

            // If no products, show a message
            if (filteredProducts.length === 0) {
                productContainer.html("<p>No products available in this category.</p>");
                return;
            }

            // Render products in rows of 3
            filteredProducts.forEach((product, index) => {
                productContainer.append(`
                    <div class="product-card">
                        <img src="${product.image}" alt="Product Image" class="product-image" />
                        <h3 class="product-name">${product.name}</h3>
                        <ul class="features-list">
                            ${product.features.split(',').map(feature => `<li class="feature-item">${feature.trim()}</li>`).join('')}
                        </ul>
                        <div class="pricing">
                            <p class="price">${product.price}</p>
                            <p style="text-align:center;padding:0px;margin:0px;"><span class="pricing-subtext">/ User / Month</span></p>
                        </div>
                        <a href="/saas/product/${product.id}" class="cbtn">Get Started</a>
                    </div>
                `);
            });
        }

        // Category button click handler
        $(".category-btn").click(function () {
            const categoryId = $(this).data("category-id");  // Get the selected category ID
            const filteredProducts = products.filter(product => product.categoryId === categoryId); // Filter products by category
            updateProductListing(filteredProducts);  // Update the listing with filtered products
        });

        // Initial fetch of all SaaS products
        fetchSaaSProducts();
    }
});