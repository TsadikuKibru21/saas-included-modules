$(document).ready(function () {
    if (window.location.pathname.match(/^\/saas\/product\/\d+$/)) {
        console.log("📌 SaaS product page loaded.");

        // Initialize variables to track quantities and selected subscription plan
        let selectedPlanId = null;
        const hardwareQuantities = {};
        const accessoryQuantities = {};

        // Handle quantity changes for mandatory hardware and accessories
        document.querySelectorAll('.product-card').forEach(card => {
            const decrementBtn = card.querySelector('.decrement');
            const incrementBtn = card.querySelector('.increment');
            const quantityValue = card.querySelector('.quantity-value');
            const productId = card.querySelector('.product_id')?.value; // Get product ID from hidden input

            if (!productId) return; // Skip if product ID is missing

            let quantity = parseInt(quantityValue.textContent) || 0;

            decrementBtn.addEventListener('click', () => {
                if (quantity > 0) {
                    quantity--;
                    quantityValue.textContent = quantity;
                    updateQuantities(productId, quantity);
                }
            });

            incrementBtn.addEventListener('click', () => {
                quantity++;
                quantityValue.textContent = quantity;
                updateQuantities(productId, quantity);
            });

            // Update quantities in the respective object (mandatory hardware or accessory)
            function updateQuantities(productId, quantity) {
                if (card.classList.contains('mandatory-hardware')) {
                    hardwareQuantities[productId] = quantity;
                } else {
                    accessoryQuantities[productId] = quantity;
                }
            }
        });

        // Fetch the SaaS product ID
        const saasProductId = $('.saas_product_id').val();

        document.getElementById('proceed-checkout-btn').addEventListener('click', function () {
            // Find the selected subscription plan by checking the checked checkbox
            selectedPlanId = $('input[name="subscription_plan"]:checked').val();

            if (!selectedPlanId) {
                alert("⚠️ Please select a subscription plan before proceeding.");
                return;
            }

            if (!saasProductId) {
                console.error("❌ SaaS Product ID is missing.");
                alert("❌ An error occurred. Please try again.");
                return;
            }

            const dataToSend = {
                saas_product_id: saasProductId,
                plan_id: selectedPlanId,
                hardware_quantities: hardwareQuantities,
                accessory_quantities: accessoryQuantities
            };

            console.log("📤 Sending checkout data:", JSON.stringify(dataToSend));

            fetch('/submit_checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            })
                .then(response => response.json())
                .then(data => {
                    console.log('✅ Checkout data sent successfully:', data.result);
                    if (data.result.status === 'success') {
                        window.location.href = data.result.redirect_url;
                    } else {
                        alert('⚠️ Error: ' + data.result.message);
                    }
                })
                .catch(error => {
                    console.error('❌ Fetch Error:', error);
                    alert('❌ There was an error with the checkout process. Please try again.');
                });
        });


        var currentStep = 1;
        var numSteps = 3;

        function nextStep() {
            currentStep++;
            if (currentStep > numSteps) {
                currentStep = 1;
            }

            var stepper = document.getElementById('stepper1');
            var steps = stepper.getElementsByClassName('step');
            var nextButton = document.getElementById('nextBtn');
            var proceedButton = document.getElementById('proceed-checkout-btn');

            Array.from(steps).forEach((step, index) => {
                let stepNum = index + 1;
                if (stepNum === currentStep) {
                    addClass(step, 'editing');
                } else {
                    removeClass(step, 'editing');
                }
                if (stepNum < currentStep) {
                    addClass(step, 'done');
                } else {
                    removeClass(step, 'done');
                }
            });

            // Show/Hide Step Content
            for (let i = 1; i <= numSteps; i++) {
                let content = document.getElementById(`step${i}-content`);
                if (i === currentStep) {
                    content.style.display = "block";
                } else {
                    content.style.display = "none";
                }
            }

            if (currentStep === numSteps) {
                nextButton.style.visibility = "hidden";
                proceedButton.style.visibility = "visible";
            } else {
                nextButton.style.visibility = "visible";
                proceedButton.style.visibility = "hidden";
            }
        }

        function hasClass(elem, className) {
            return new RegExp(' ' + className + ' ').test(' ' + elem.className + ' ');
        }

        function addClass(elem, className) {
            if (!hasClass(elem, className)) {
                elem.className += ' ' + className;
            }
        }

        function removeClass(elem, className) {
            var newClass = ' ' + elem.className.replace(/[\t\r\n]/g, ' ') + ' ';
            if (hasClass(elem, className)) {
                while (newClass.indexOf(' ' + className + ' ') >= 0) {
                    newClass = newClass.replace(' ' + className + ' ', ' ');
                }
                elem.className = newClass.replace(/^\s+|\s+$/g, '');
            }
        }

        document.getElementById("nextBtn").addEventListener("click", nextStep);

    }
});
