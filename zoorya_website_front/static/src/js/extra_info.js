$(document).ready(function () {
    // Match URL with optional query parameters
    if (window.location.pathname.match(/^\/shop\/extra_info$/)) {
        console.log("Loaded extra_info.js");
        document.addEventListener('DOMContentLoaded', function () {
            document.querySelectorAll('.file-input').forEach(input => {
                input.addEventListener('change', function () {
                    const file = this.files[0];
                    const maxSize = this.dataset.maxSize;

                    if (file && file.size > maxSize) {
                        alert('File size exceeds 2MB. Please upload a smaller file.');
                        this.value = ''; // Clear the input
                    }
                });
            });
        });
    }
});