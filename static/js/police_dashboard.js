// Police Dashboard JavaScript - FIXED VERSION

// Global variables
let currentReportId = null;
let currentLang = 'en';
let translationsCache = { en: null, sw: null };

/**
 * Open manage report modal
 */
function openManageModal(btn) {
    const data = btn.dataset;
    currentReportId = data.id;
    translationsCache = { en: null, sw: null };

    // Detect language from report
    const lang = data.language.toLowerCase();
    if (/sw|kiswahili|swahili/.test(lang)) {
        currentLang = 'sw';
    } else {
        currentLang = 'en';
    }

    // Populate modal fields
    document.getElementById('manageReportId').textContent = data.short;
    document.getElementById('manageCategory').textContent = data.category;
    document.getElementById('manageLocation').textContent = data.location;
    document.getElementById('manageLanguage').textContent = data.language;
    document.getElementById('manageLangIndicator').textContent = data.language.substring(0, 2).toUpperCase();
    document.getElementById('manageDescription').textContent = data.description;

    // Update language badge color
    const indicator = document.getElementById('manageLangIndicator');
    if (currentLang === 'en') {
        indicator.style.background = '#1976d2';
        indicator.style.color = 'white';
    } else if (currentLang === 'sw') {
        indicator.style.background = '#ff9800';
        indicator.style.color = 'white';
    }

    // Handle spam warning
    const spamScore = parseInt(data.spamScore) || 0;
    const spamEl = document.getElementById('spamWarning');
    const scoreEl = document.getElementById('spamScore');
    if (spamScore > 50) {
        scoreEl.textContent = spamScore;
        spamEl.style.display = 'block';
    } else {
        spamEl.style.display = 'none';
    }

    // Handle media display
    const mediaPath = data.mediaPath || '';
    const mediaSection = document.getElementById('mediaSection');
    const mediaPreview = document.getElementById('mediaPreview');

    if (mediaPath) {
        mediaSection.style.display = 'block';
        const mediaUrl = `/media/${mediaPath}`;

        if (mediaPath.match(/\.(jpg|jpeg|png)$/i)) {
            mediaPreview.innerHTML = `
                <img src="${mediaUrl}" alt="Evidence" 
                     style="max-width:100%;max-height:400px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
            `;
        } else if (mediaPath.match(/\.(mp4|mov)$/i)) {
            mediaPreview.innerHTML = `
                <video controls style="max-width:100%;max-height:400px;border-radius:8px;">
                    <source src="${mediaUrl}" type="video/mp4">
                    Your browser does not support video playback.
                </video>
            `;
        } else {
            mediaPreview.innerHTML = `<p class="text-muted">File attached: ${mediaPath}</p>`;
        }
    } else {
        mediaSection.style.display = 'none';
    }

    // Hide translation panels
    document.getElementById('translationPanelEn').style.display = 'none';
    document.getElementById('translationPanelSw').style.display = 'none';

    // Configure translation buttons
    const enBtn = document.getElementById('translateEnBtn');
    const swBtn = document.getElementById('translateSwBtn');

    enBtn.style.display = 'inline-flex';
    swBtn.style.display = 'inline-flex';
    enBtn.disabled = false;
    swBtn.disabled = false;
    enBtn.innerHTML = '🇬🇧 Translate to English';
    swBtn.innerHTML = '🇰🇪 Translate to Kiswahili';

    // Update button states based on current language
    if (currentLang === 'en') {
        enBtn.innerHTML = '🇬🇧 Already in English';
        enBtn.style.opacity = '0.6';
    } else {
        enBtn.style.opacity = '1';
    }

    if (currentLang === 'sw') {
        swBtn.innerHTML = '🇰🇪 Already in Kiswahili';
        swBtn.style.opacity = '0.6';
    } else {
        swBtn.style.opacity = '1';
    }

    // Set form action
    document.getElementById('responseForm').action = '/police/respond/' + data.id;

    // Show modal
    document.getElementById('manageModal').classList.add('active');
}

/**
 * Close manage modal
 */
function closeManageModal() {
    document.getElementById('manageModal').classList.remove('active');
    currentReportId = null;
    translationsCache = { en: null, sw: null };
}

/**
 * Translate report to target language
 */
function translateReport(targetLang) {
    console.log(`Translation requested: ${targetLang}`);

    // Check if already in target language
    if ((currentLang === 'en' && targetLang === 'en') ||
        (currentLang === 'sw' && targetLang === 'sw')) {
        const panelId = targetLang === 'en' ? 'translationPanelEn' : 'translationPanelSw';
        const contentId = targetLang === 'en' ? 'translatedContentEn' : 'translatedContentSw';
        const panel = document.getElementById(panelId);
        const contentDiv = document.getElementById(contentId);
        const langName = targetLang === 'en' ? 'English' : 'Kiswahili';

        contentDiv.innerHTML = `<p style="color:#1976d2;font-weight:600;">ℹ️ This report is already in ${langName}. No translation needed.</p>`;
        panel.style.display = 'block';
        return;
    }

    // Check cache first
    if (translationsCache[targetLang]) {
        console.log('Using cached translation');
        showTranslation(targetLang, translationsCache[targetLang]);
        return;
    }

    // Proceed with translation
    const panelId = targetLang === 'en' ? 'translationPanelEn' : 'translationPanelSw';
    const contentId = targetLang === 'en' ? 'translatedContentEn' : 'translatedContentSw';
    const btnId = targetLang === 'en' ? 'translateEnBtn' : 'translateSwBtn';

    const panel = document.getElementById(panelId);
    const contentDiv = document.getElementById(contentId);
    const btn = document.getElementById(btnId);

    if (!panel || !contentDiv || !btn) {
        console.error('Translation elements not found');
        return;
    }

    const originalBtnText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-spinner"></span> Translating...';

    contentDiv.innerHTML = '<p style="color:#666;font-style:italic;">Translating to ' +
                          (targetLang === 'en' ? 'English' : 'Kiswahili') + '...</p>';
    panel.style.display = 'block';

    let attempts = 0;
    const maxAttempts = 3;

    function tryTranslate() {
        console.log(`Translation attempt ${attempts + 1} for report ${currentReportId}`);

        fetch(`/api/translate_report/${currentReportId}/${targetLang}?t=${Date.now()}`)
            .then(response => {
                console.log('Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Translation response:', data);
                btn.disabled = false;
                btn.innerHTML = originalBtnText;

                if (data.success) {
                    translationsCache[targetLang] = data;
                    showTranslation(targetLang, data);
                } else {
                    if (attempts < maxAttempts - 1) {
                        attempts++;
                        contentDiv.innerHTML = `<p style="color:#e67e22;">Retrying... (${attempts}/${maxAttempts})</p>`;
                        setTimeout(tryTranslate, 1500);
                    } else {
                        contentDiv.innerHTML = '<p style="color:#d32f2f;">❌ Translation unavailable. Please try again later.</p>';
                        console.error('Translation failed:', data.error);
                    }
                }
            })
            .catch(error => {
                console.error('Translation error:', error);
                btn.disabled = false;
                btn.innerHTML = originalBtnText;

                if (attempts < maxAttempts - 1) {
                    attempts++;
                    contentDiv.innerHTML = `<p style="color:#e67e22;">Retrying... (${attempts}/${maxAttempts})</p>`;
                    setTimeout(tryTranslate, 1500);
                } else {
                    contentDiv.innerHTML = '<p style="color:#d32f2f;">❌ Network error. Check your connection and try again.</p>';
                }
            });
    }

    tryTranslate();
}

/**
 * Show translated content
 */
function showTranslation(targetLang, data) {
    const contentId = targetLang === 'en' ? 'translatedContentEn' : 'translatedContentSw';
    const contentDiv = document.getElementById(contentId);
    const t = data.translated;
    const langName = targetLang === 'en' ? 'English' : 'Kiswahili';
    const flag = targetLang === 'en' ? '🇬🇧' : '🇰🇪';

    contentDiv.innerHTML = `
        <p style="color:#1976d2;font-weight:bold;margin-bottom:12px;">${flag} Translated to ${langName}:</p>
        <p><strong>Category:</strong> ${t.category}</p>
        <p><strong>Location:</strong> ${t.manual_location}</p>
        <p style="margin-top:12px;"><strong>Description:</strong></p>
        <p style="line-height:1.6;">${t.description}</p>
        <p style="font-size:11px;color:#888;margin-top:12px;font-style:italic;">
            Auto-translated • Original language: ${data.original_language?.toUpperCase() || 'Unknown'}
        </p>
    `;
}

/**
 * Show notification message
 */
function showNotification(type, message) {
    const notification = document.createElement('div');
    const bgColors = {
        success: '#d4edda',
        error: '#f8d7da',
        info: '#d1ecf1',
        warning: '#fff3cd'
    };
    const textColors = {
        success: '#155724',
        error: '#721c24',
        info: '#0c5460',
        warning: '#856404'
    };

    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.background = bgColors[type] || bgColors.info;
    notification.style.color = textColors[type] || textColors.info;
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '8px';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.style.maxWidth = '500px';
    notification.innerHTML = `
        <strong>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</strong> ${message}
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

/**
 * Initialize dashboard
 */
function initializeDashboard() {
    const responseForm = document.getElementById('responseForm');
    if (responseForm) {
        responseForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="loading-spinner"></span> Submitting...';

            fetch(this.action, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (response.redirected) {
                    window.location.href = response.url;
                    return null;
                }
                return response.json();
            })
            .then(data => {
                if (data === null) return;

                if (data && data.success) {
                    showNotification('success', 'Response submitted successfully');
                    setTimeout(() => {
                        closeManageModal();
                        window.location.reload();
                    }, 1500);
                } else {
                    showNotification('error', (data && data.error) || 'Failed to submit response');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('error', 'Network error. Please try again.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            });
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeManageModal();
        }
    });

    // Close modal on outside click
    const modal = document.getElementById('manageModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeManageModal();
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeDashboard);