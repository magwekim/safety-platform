// Admin Dashboard JavaScript

/**
 * Filter stations by status (active/inactive/all)
 * @param {string} type - Filter type: 'active', 'inactive', or 'all'
 */
function filterStations(type) {
    const rows = document.querySelectorAll('#stationsTable tbody tr');

    rows.forEach(row => {
        const isActive = row.dataset.active === '1';

        if (type === 'all') {
            row.style.display = '';
        } else if (type === 'active') {
            row.style.display = isActive ? '' : 'none';
        } else if (type === 'inactive') {
            row.style.display = !isActive ? '' : 'none';
        }
    });

    // Update active button state
    updateFilterButtons(type);
}

/**
 * Update filter button active states
 * @param {string} activeType - Currently active filter
 */
function updateFilterButtons(activeType) {
    const buttons = document.querySelectorAll('.btn-outline-success, .btn-outline-danger, .btn-outline-secondary');

    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(activeType) ||
            (activeType === 'all' && btn.textContent.toLowerCase().includes('all'))) {
            btn.classList.add('active');
        }
    });
}

/**
 * Deactivate a police station
 * @param {string} stationId - Station ID
 * @param {string} name - Station name
 */
function deactivateStation(stationId, name) {
    if (!confirm(`Deactivate ${name} Police Station? This will prevent login.`)) {
        return;
    }

    // Show loading state
    const button = event.target;
    const originalText = button.textContent;
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Processing...';

    fetch(`/admin/deactivate_station/${stationId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('success', `${name} has been deactivated successfully`);
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showNotification('error', data.error || 'Failed to deactivate station');
            button.disabled = false;
            button.textContent = originalText;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('error', 'Network error. Please try again.');
        button.disabled = false;
        button.textContent = originalText;
    });
}

/**
 * Activate a police station
 * @param {string} stationId - Station ID
 * @param {string} name - Station name
 */
function activateStation(stationId, name) {
    if (!confirm(`Activate ${name} Police Station?`)) {
        return;
    }

    // Show loading state
    const button = event.target;
    const originalText = button.textContent;
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Processing...';

    fetch(`/admin/activate_station/${stationId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('success', `${name} has been activated successfully`);
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showNotification('error', data.error || 'Failed to activate station');
            button.disabled = false;
            button.textContent = originalText;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('error', 'Network error. Please try again.');
        button.disabled = false;
        button.textContent = originalText;
    });
}

/**
 * Show notification message
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {string} message - Notification message
 */
function showNotification(type, message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

    notification.innerHTML = `
        <strong>${type === 'success' ? '✓' : '✗'}</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

/**
 * Validate form before submission
 * @param {HTMLFormElement} form - Form element
 * @returns {boolean} - Validation result
 */
function validateStationForm(form) {
    const constituency = form.querySelector('[name="constituency"]').value.trim();
    const username = form.querySelector('[name="username"]').value.trim();
    const password = form.querySelector('[name="password"]').value;

    if (!constituency || constituency.length < 3) {
        showNotification('warning', 'Constituency name must be at least 3 characters');
        return false;
    }

    if (!username || username.length < 5) {
        showNotification('warning', 'Username must be at least 5 characters');
        return false;
    }

    if (!password || password.length < 8) {
        showNotification('warning', 'Password must be at least 8 characters');
        return false;
    }

    return true;
}

/**
 * Search/Filter table rows
 * @param {string} searchTerm - Search term
 */
function searchStations(searchTerm) {
    const rows = document.querySelectorAll('#stationsTable tbody tr');
    const term = searchTerm.toLowerCase();

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
}

/**
 * Export table data to CSV
 */
function exportToCSV() {
    const table = document.getElementById('stationsTable');
    const rows = Array.from(table.querySelectorAll('tr'));

    const csv = rows.map(row => {
        const cols = Array.from(row.querySelectorAll('th, td'));
        return cols.map(col => `"${col.textContent.trim()}"`).join(',');
    }).join('\n');

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stations_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showNotification('success', 'Station data exported successfully');
}

/**
 * Initialize tooltips
 */
function initTooltips() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
}

/**
 * Confirm deletion with enhanced dialog
 * @param {string} item - Item to delete
 * @returns {boolean} - User confirmation
 */
function confirmDelete(item) {
    return confirm(`Are you sure you want to delete ${item}?\n\nThis action cannot be undone.`);
}

/**
 * Auto-save form data to localStorage (draft)
 * @param {string} formId - Form ID
 */
function autoSaveForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    const inputs = form.querySelectorAll('input, textarea, select');

    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const formData = {};
            inputs.forEach(inp => {
                if (inp.name) {
                    formData[inp.name] = inp.value;
                }
            });
            localStorage.setItem(`draft_${formId}`, JSON.stringify(formData));
        });
    });
}

/**
 * Restore form data from localStorage
 * @param {string} formId - Form ID
 */
function restoreFormData(formId) {
    const savedData = localStorage.getItem(`draft_${formId}`);
    if (!savedData) return;

    const formData = JSON.parse(savedData);
    const form = document.getElementById(formId);

    Object.keys(formData).forEach(name => {
        const input = form.querySelector(`[name="${name}"]`);
        if (input && input.type !== 'password') {
            input.value = formData[name];
        }
    });

    showNotification('info', 'Draft data restored');
}

/**
 * Real-time statistics update
 */
function updateStatistics() {
    fetch('/admin/api/statistics')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.querySelectorAll('[data-stat]').forEach(el => {
                    const statName = el.dataset.stat;
                    if (data.stats[statName]) {
                        el.textContent = data.stats[statName];
                    }
                });
            }
        })
        .catch(error => console.error('Error updating statistics:', error));
}

/**
 * Initialize admin dashboard
 */
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    initTooltips();

    // Add form validation
    const addStationForm = document.querySelector('form[action="/admin/add_station"]');
    if (addStationForm) {
        addStationForm.addEventListener('submit', function(e) {
            if (!validateStationForm(this)) {
                e.preventDefault();
            }
        });
    }

    // Add search functionality
    const searchInput = document.getElementById('stationSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => searchStations(e.target.value));
    }

    // Auto-update statistics every 30 seconds
    if (document.querySelector('[data-stat]')) {
        setInterval(updateStatistics, 30000);
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + F: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('stationSearch');
            if (searchInput) searchInput.focus();
        }

        // Ctrl/Cmd + E: Export to CSV
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            if (typeof exportToCSV === 'function') exportToCSV();
        }
    });

    // Add confirmation to logout
    const logoutLink = document.querySelector('a[href*="logout"]');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to logout?')) {
                e.preventDefault();
            }
        });
    }

    // Initialize modals with animation
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('show.bs.modal', function() {
            this.querySelector('.modal-content').style.animation = 'slideUp 0.3s ease-out';
        });
    });

    // Add loading state to forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
            }
        });
    });
});

// Add CSS animation for modal
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(50px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);