// Report Form JavaScript - FIXED VERSION with Language Detection & Custom Category
let currentReportId = '';
let gpsCapturing = false;

// Language Detection - FIXED
function detectLanguage() {
    const text = document.getElementById('description').value.trim();
    const languageDetected = document.getElementById('languageDetected');

    if (!text || text.length < 5) {
        languageDetected.textContent = 'Auto-detecting...';
        languageDetected.className = 'badge bg-secondary';
        return;
    }

    // Expanded Swahili word list
    const swahiliWords = [
        'ni', 'na', 'ya', 'wa', 'kwa', 'hii', 'hiyo', 'hizo', 'watu', 'polisi',
        'tafadhali', 'sasa', 'hapa', 'pale', 'yule', 'huyu', 'wale', 'hawa',
        'mimi', 'wewe', 'yeye', 'sisi', 'ninyi', 'wao', 'yake', 'yangu', 'yako',
        'kuna', 'hakuna', 'kwamba', 'lakini', 'au', 'ndiyo', 'hapana', 'jambo',
        'habari', 'asante', 'karibu', 'samahani', 'leo', 'jana', 'kesho',
        'mtu', 'watu', 'kitu', 'vitu', 'mahali', 'wakati', 'sababu', 'namna'
    ];

    const words = text.toLowerCase().split(/\s+/);
    let swahiliCount = 0;
    let totalWords = words.length;

    // Count Swahili words
    words.forEach(word => {
        // Remove punctuation
        const cleanWord = word.replace(/[^\w]/g, '');
        if (swahiliWords.includes(cleanWord)) {
            swahiliCount++;
        }
    });

    // Calculate percentage
    const swahiliPercentage = (swahiliCount / totalWords) * 100;

    console.log('Language Detection:', {
        totalWords: totalWords,
        swahiliCount: swahiliCount,
        percentage: swahiliPercentage.toFixed(1) + '%'
    });

    // Determine language
    if (swahiliCount >= 2 || swahiliPercentage >= 20) {
        languageDetected.textContent = 'Kiswahili';
        languageDetected.className = 'badge bg-success';
    } else {
        languageDetected.textContent = 'English';
        languageDetected.className = 'badge bg-primary';
    }
}

// GPS Location Capture - FIXED
function captureLocation() {
    if (gpsCapturing) return;

    const statusCard = document.getElementById('gpsStatusCard');
    const statusContent = document.getElementById('gpsStatusContent');
    const btn = document.getElementById('captureGpsBtn');
    const btnText = document.getElementById('gpsButtonText');

    // Check if already captured successfully - allow retry
    if (document.getElementById('gpsWasCaptured').value === 'true') {
        document.getElementById('gpsWasCaptured').value = 'false';
        document.getElementById('lat').value = '-0.3031';
        document.getElementById('lon').value = '36.0800';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline-primary');
        btnText.textContent = 'Capture GPS Location';
        statusCard.style.display = 'none';
        return;
    }

    if (!navigator.geolocation) {
        statusCard.style.display = 'block';
        statusCard.className = 'gps-status-card error';
        statusContent.innerHTML = `
            <div class="text-danger">
                <strong>❌ Geolocation Not Supported</strong>
                <p class="mb-0 mt-2">Your browser doesn't support GPS location. Using default Nakuru location.</p>
            </div>
        `;
        return;
    }

    gpsCapturing = true;
    btn.disabled = true;
    btnText.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Capturing Location...';

    statusCard.style.display = 'block';
    statusCard.className = 'gps-status-card capturing';
    statusContent.innerHTML = `
        <div class="text-warning">
            <strong>📡 Capturing GPS Location...</strong>
            <p class="mb-0 mt-2">Please allow location access when prompted.</p>
        </div>
    `;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const accuracy = Math.round(position.coords.accuracy);

            // Validate coordinates are within Kenya bounds
            if (lat < -5 || lat > 5 || lon < 33 || lon > 42) {
                statusCard.className = 'gps-status-card error';
                statusContent.innerHTML = `
                    <div class="text-warning">
                        <strong>⚠️ Location Outside Kenya</strong>
                        <p class="mb-2 mt-2">Detected: ${lat.toFixed(6)}, ${lon.toFixed(6)}</p>
                        <p class="mb-0"><small>Using default Nakuru location for this report.</small></p>
                    </div>
                `;
                btn.disabled = false;
                gpsCapturing = false;
                btnText.textContent = 'Retry GPS Capture';
                return;
            }

            document.getElementById('lat').value = lat;
            document.getElementById('lon').value = lon;
            document.getElementById('gpsWasCaptured').value = 'true';

            statusCard.className = 'gps-status-card success';
            statusContent.innerHTML = `
                <div class="text-success">
                    <strong>✓ GPS Location Captured Successfully!</strong>
                    <div class="gps-coordinates mt-2">
                        <div><strong>Latitude:</strong> ${lat.toFixed(6)}</div>
                        <div><strong>Longitude:</strong> ${lon.toFixed(6)}</div>
                        <div><strong>Accuracy:</strong> ±${accuracy} meters</div>
                    </div>
                    <small class="text-muted d-block mt-2">Click the button again to recapture location</small>
                </div>
            `;

            btnText.textContent = 'Recapture GPS';
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-success');
            btn.disabled = false;
            gpsCapturing = false;
        },
        (error) => {
            let errorMsg = '';
            let errorTitle = 'GPS Capture Failed';

            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorTitle = 'Location Access Denied';
                    errorMsg = 'Please enable location permissions in your browser settings.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorTitle = 'Location Unavailable';
                    errorMsg = 'Your device cannot determine your location at this time.';
                    break;
                case error.TIMEOUT:
                    errorTitle = 'Request Timeout';
                    errorMsg = 'Location request took too long. Please try again.';
                    break;
                default:
                    errorMsg = 'An unknown error occurred while capturing location.';
            }

            statusCard.className = 'gps-status-card error';
            statusContent.innerHTML = `
                <div class="text-danger">
                    <strong>❌ ${errorTitle}</strong>
                    <p class="mb-2 mt-2">${errorMsg}</p>
                    <p class="mb-0"><small><strong>Using default Nakuru location:</strong> -0.3031, 36.0800</small></p>
                </div>
            `;

            btnText.textContent = 'Retry GPS Capture';
            btn.disabled = false;
            gpsCapturing = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Handle Category Selection - FIXED to allow custom input
function handleCategoryChange() {
    const categorySelect = document.getElementById('category');
    const customCategoryInput = document.getElementById('customCategoryInput');
    const customCategoryField = document.getElementById('customCategory');

    if (categorySelect.value === 'Other') {
        customCategoryInput.style.display = 'block';
        customCategoryField.required = true;
        customCategoryField.focus();
    } else {
        customCategoryInput.style.display = 'none';
        customCategoryField.required = false;
        customCategoryField.value = '';
    }
}

// File Upload Handler with Preview
function handleFileSelect(input) {
    const file = input.files[0];
    if (!file) return;

    // Validate file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        alert('File exceeds 10MB. Please choose a smaller file.');
        input.value = '';
        return;
    }

    // Show preview container
    const previewContainer = document.getElementById('filePreviewContainer');
    const previewContent = document.getElementById('previewContent');
    const fileInfo = document.getElementById('fileInfo');

    previewContainer.classList.add('active');

    // Display file info
    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    fileInfo.innerHTML = `
        <div><strong>File Name:</strong> ${file.name}</div>
        <div><strong>File Size:</strong> ${fileSize} MB</div>
        <div><strong>File Type:</strong> ${file.type}</div>
    `;

    // Create preview based on file type
    const reader = new FileReader();

    if (file.type.startsWith('image/')) {
        reader.onload = function(e) {
            previewContent.innerHTML = `
                <img src="${e.target.result}" class="preview-image" alt="Image preview">
            `;
        };
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
        reader.onload = function(e) {
            previewContent.innerHTML = `
                <video controls class="preview-video">
                    <source src="${e.target.result}" type="${file.type}">
                    Your browser does not support the video tag.
                </video>
            `;
        };
        reader.readAsDataURL(file);
    } else {
        previewContent.innerHTML = `
            <div class="alert alert-info">
                <strong>File ready for upload</strong>
                <p class="mb-0">Preview not available for this file type.</p>
            </div>
        `;
    }
}

// Remove File
function removeFile() {
    const input = document.getElementById('media');
    input.value = '';

    const previewContainer = document.getElementById('filePreviewContainer');
    previewContainer.classList.remove('active');

    document.getElementById('previewContent').innerHTML = '';
    document.getElementById('fileInfo').innerHTML = '';
}

// Form Submission - FIXED
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('incidentForm');

    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';

            const formData = new FormData(this);

            // Handle custom category
            const categorySelect = document.getElementById('category');
            const customCategory = document.getElementById('customCategory');

            if (categorySelect.value === 'Other' && customCategory.value.trim()) {
                formData.set('category', customCategory.value.trim());
            }

            fetch('/report', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    currentReportId = data.report_id;
                    document.getElementById('displayReportId').textContent = data.report_id;
                    document.getElementById('successModal').classList.add('active');

                    // Reset form
                    document.getElementById('incidentForm').reset();
                    document.getElementById('lat').value = -0.3031;
                    document.getElementById('lon').value = 36.0800;
                    document.getElementById('gpsWasCaptured').value = 'false';
                    document.getElementById('gpsStatusCard').style.display = 'none';
                    document.getElementById('filePreviewContainer').classList.remove('active');
                    document.getElementById('customCategoryInput').style.display = 'none';
                    document.getElementById('languageDetected').textContent = 'Auto-detecting...';
                    document.getElementById('languageDetected').className = 'badge bg-secondary';

                    // Reset GPS button
                    const btn = document.getElementById('captureGpsBtn');
                    const btnText = document.getElementById('gpsButtonText');
                    btnText.textContent = 'Capture GPS Location';
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-outline-primary');
                } else {
                    alert('Error: ' + (data.error || 'Failed to submit report'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while submitting your report. Please try again.');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit Anonymous Report';
            });
        });
    }

    // Add event listener for category change
    const categorySelect = document.getElementById('category');
    if (categorySelect) {
        categorySelect.addEventListener('change', handleCategoryChange);
    }

    // Add event listener for description to detect language
    const descriptionField = document.getElementById('description');
    if (descriptionField) {
        descriptionField.addEventListener('input', detectLanguage);
    }
});

// Download Report ID
function downloadReportId() {
    if (!currentReportId) {
        alert('No report ID available');
        return;
    }

    const reportContent = `
NAKURU CITIZEN SAFETY REPORTING PLATFORM
=========================================

REPORT CONFIRMATION
-------------------

Report ID: ${currentReportId}

Date: ${new Date().toLocaleString()}

IMPORTANT INFORMATION:
- Keep this Report ID safe
- Use this ID to track your report status
- Visit the platform and use "Track Report" feature
- Contact: 0725646760 for emergencies

Thank you for helping keep Nakuru safe!

=========================================
© 2025 Citizen Safety Reporting Platform
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_ID_${currentReportId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    alert('Report ID downloaded successfully! Please keep this file safe.');
}

// Close Success Modal
function closeSuccessModal() {
    document.getElementById('successModal').classList.remove('active');
    currentReportId = '';
}

// Close modal when clicking outside
const successModal = document.getElementById('successModal');
if (successModal) {
    successModal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeSuccessModal();
        }
    });
}