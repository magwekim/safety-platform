// Map Visualization JavaScript

// Global variables
let map;
let markers;
let regularMarkers = [];
let clustersEnabled = true;

/**
 * Initialize the map
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {Array} hotspotsData - Hotspot data array
 */
function initializeMap(centerLat, centerLon, hotspotsData) {
    // Create map
    map = L.map('map').setView([centerLat, centerLon], 13);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 10
    }).addTo(map);

    // Create marker cluster group
    markers = L.markerClusterGroup({
        iconCreateFunction: createClusterIcon,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 80,
        spiderfyDistanceMultiplier: 2
    });

    // Add markers
    createHotspotMarkers(hotspotsData);

    // Add markers to map
    map.addLayer(markers);

    // Auto-fit bounds if hotspots exist
    if (hotspotsData.length > 0) {
        const bounds = L.latLngBounds(hotspotsData.map(h => [h.lat, h.lon]));
        map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Add map event listeners
    map.on('zoomend', updateUIOnZoom);
}

/**
 * Create cluster icon with dynamic styling
 * @param {Object} cluster - Marker cluster
 * @returns {Object} - Leaflet div icon
 */
function createClusterIcon(cluster) {
    const count = cluster.getChildCount();
    let size = 40;
    let className = 'cluster-icon';

    if (count > 20) {
        size = 60;
    } else if (count > 10) {
        size = 50;
    }

    return L.divIcon({
        html: `<div class="cluster-icon" style="width:${size}px;height:${size}px;line-height:${size}px;">${count}</div>`,
        className: '',
        iconSize: [size, size]
    });
}

/**
 * Create hotspot markers on the map
 * @param {Array} hotspots - Array of hotspot data
 */
function createHotspotMarkers(hotspots) {
    hotspots.forEach(hotspot => {
        const lat = hotspot.lat;
        const lon = hotspot.lon;
        const count = hotspot.incident_count;

        // Determine risk level and styling
        const riskData = getRiskLevel(count);

        // Create circle marker
        const circle = L.circleMarker([lat, lon], {
            radius: riskData.radius,
            fillColor: riskData.color,
            color: '#fff',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.8
        });

        // Create popup content
        const popupContent = createPopupContent(hotspot, riskData);
        circle.bindPopup(popupContent);

        // Add hover effect
        circle.on('mouseover', function() {
            this.setStyle({ weight: 5, fillOpacity: 1 });
        });

        circle.on('mouseout', function() {
            this.setStyle({ weight: 3, fillOpacity: 0.8 });
        });

        // Add to marker groups
        markers.addLayer(circle);
        regularMarkers.push(circle);
    });
}

/**
 * Get risk level data based on incident count
 * @param {number} count - Incident count
 * @returns {Object} - Risk level data
 */
function getRiskLevel(count) {
    if (count >= 10) {
        return {
            color: '#d32f2f',
            radius: 18,
            level: 'CRITICAL',
            description: 'Immediate attention required'
        };
    } else if (count >= 5) {
        return {
            color: '#f57c00',
            radius: 15,
            level: 'HIGH',
            description: 'Frequent incidents'
        };
    } else if (count >= 3) {
        return {
            color: '#fbc02d',
            radius: 12,
            level: 'MEDIUM',
            description: 'Moderate activity'
        };
    } else {
        return {
            color: '#1976d2',
            radius: 10,
            level: 'LOW',
            description: 'Low incident rate'
        };
    }
}

/**
 * Create popup content HTML
 * @param {Object} hotspot - Hotspot data
 * @param {Object} riskData - Risk level data
 * @returns {string} - HTML string
 */
function createPopupContent(hotspot, riskData) {
    return `
        <strong>${hotspot.location}</strong>
        <div style="margin-top: 10px;">
            <div class="popup-stat">
                <span class="popup-label">Risk Level:</span>
                <span class="popup-value" style="color: ${riskData.color};">${riskData.level}</span>
            </div>
            <div class="popup-stat">
                <span class="popup-label">Incidents:</span>
                <span class="popup-value">${hotspot.incident_count}</span>
            </div>
            <div class="popup-stat">
                <span class="popup-label">Last Incident:</span>
                <span class="popup-value">${hotspot.last_incident ? formatDate(hotspot.last_incident) : 'N/A'}</span>
            </div>
            <div class="popup-stat">
                <span class="popup-label">Status:</span>
                <span class="popup-value">${riskData.description}</span>
            </div>
        </div>
    `;
}

/**
 * Format date string
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Toggle between clustered and individual markers
 */
function toggleClusters() {
    const btn = document.getElementById('toggleBtn');

    if (clustersEnabled) {
        // Switch to individual markers
        map.removeLayer(markers);
        regularMarkers.forEach(marker => marker.addTo(map));

        btn.textContent = '🔥 Toggle Clusters';
        btn.style.background = '#4caf50';
        btn.style.color = 'white';
        clustersEnabled = false;
    } else {
        // Switch to clustered markers
        regularMarkers.forEach(marker => map.removeLayer(marker));
        map.addLayer(markers);

        btn.textContent = '🗺️ Toggle Clusters';
        btn.style.background = 'white';
        btn.style.color = '#333';
        clustersEnabled = true;
    }
}

/**
 * Analyze crime patterns
 * @param {Array} hotspots - Hotspot data array
 * @returns {Array} - Pattern insights
 */
function analyzePatterns(hotspots) {
    const patterns = [];

    // Find highest risk areas
    const critical = hotspots.filter(h => h.incident_count >= 10);
    if (critical.length > 0) {
        const topArea = critical.sort((a, b) => b.incident_count - a.incident_count)[0];
        patterns.push(`<strong>Highest Risk:</strong> ${topArea.location} (${topArea.incident_count} incidents)`);
    }

    // Calculate average incidents
    const avgIncidents = (hotspots.reduce((sum, h) => sum + h.incident_count, 0) / hotspots.length).toFixed(1);
    patterns.push(`<strong>Average:</strong> ${avgIncidents} incidents per location`);

    // Risk distribution
    const criticalCount = hotspots.filter(h => h.incident_count >= 10).length;
    const highCount = hotspots.filter(h => h.incident_count >= 5 && h.incident_count < 10).length;
    const mediumCount = hotspots.filter(h => h.incident_count >= 3 && h.incident_count < 5).length;

    if (criticalCount > 0) {
        patterns.push(`<strong>${criticalCount}</strong> critical risk zones identified`);
    }
    if (highCount > 0) {
        patterns.push(`<strong>${highCount}</strong> high risk areas detected`);
    }

    // Recent activity
    const recentIncidents = hotspots.filter(h => {
        if (!h.last_incident) return false;
        const lastDate = new Date(h.last_incident);
        const daysSince = (Date.now() - lastDate) / (1000 * 60 * 60 * 24);
        return daysSince <= 7;
    }).length;

    if (recentIncidents > 0) {
        patterns.push(`<strong>${recentIncidents}</strong> locations with incidents in last 7 days`);
    }

    // Concentration analysis
    const totalIncidents = hotspots.reduce((sum, h) => sum + h.incident_count, 0);
    const top3 = [...hotspots].sort((a, b) => b.incident_count - a.incident_count).slice(0, 3);
    const top3Total = top3.reduce((sum, h) => sum + h.incident_count, 0);
    const concentration = ((top3Total / totalIncidents) * 100).toFixed(0);

    patterns.push(`<strong>${concentration}%</strong> of incidents in top 3 locations`);

    return patterns;
}

/**
 * Display pattern analysis
 * @param {Array} patterns - Pattern insights array
 */
function displayPatterns(patterns) {
    const patternList = document.getElementById('patternList');
    if (patternList) {
        patternList.innerHTML = patterns.map(p => `<li>${p}</li>`).join('');
    }
}

/**
 * Update UI based on zoom level
 */
function updateUIOnZoom() {
    const zoom = map.getZoom();

    // Adjust marker sizes based on zoom
    regularMarkers.forEach(marker => {
        const currentRadius = marker.getRadius();
        const baseRadius = currentRadius;
        const newRadius = baseRadius * (zoom / 13);
        marker.setRadius(Math.max(newRadius, 5));
    });
}

/**
 * Export map as image
 */
function exportMapImage() {
    // Using leaflet-image plugin (if available)
    if (typeof leafletImage !== 'undefined') {
        leafletImage(map, function(err, canvas) {
            if (err) {
                console.error('Export error:', err);
                return;
            }

            const img = document.createElement('img');
            const dimensions = map.getSize();
            img.width = dimensions.x;
            img.height = dimensions.y;
            img.src = canvas.toDataURL();

            // Download image
            const link = document.createElement('a');
            link.download = `hotspot_map_${new Date().toISOString().split('T')[0]}.png`;
            link.href = img.src;
            link.click();
        });
    } else {
        alert('Map export feature requires additional plugin');
    }
}

/**
 * Filter hotspots by risk level
 * @param {string} level - Risk level to filter ('all', 'critical', 'high', 'medium', 'low')
 */
function filterByRiskLevel(level) {
    regularMarkers.forEach(marker => {
        const radius = marker.getRadius();
        let show = true;

        if (level !== 'all') {
            const riskLevel = radius >= 18 ? 'critical' :
                             radius >= 15 ? 'high' :
                             radius >= 12 ? 'medium' : 'low';
            show = riskLevel === level;
        }

        if (show) {
            marker.setStyle({ opacity: 1, fillOpacity: 0.8 });
        } else {
            marker.setStyle({ opacity: 0.2, fillOpacity: 0.2 });
        }
    });
}

/**
 * Search for location on map
 * @param {string} searchTerm - Location search term
 */
function searchLocation(searchTerm) {
    // Simple search through marker popups
    let found = false;

    regularMarkers.forEach(marker => {
        const popup = marker.getPopup();
        if (popup) {
            const content = popup.getContent().toLowerCase();
            if (content.includes(searchTerm.toLowerCase())) {
                map.setView(marker.getLatLng(), 15);
                marker.openPopup();
                found = true;
                return false; // Break loop
            }
        }
    });

    if (!found) {
        alert(`Location "${searchTerm}" not found on map`);
    }
}

/**
 * Add custom controls to map
 */
function addCustomControls() {
    // Add fullscreen control
    const fullscreenBtn = L.control({position: 'topleft'});
    fullscreenBtn.onAdd = function() {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        div.innerHTML = '<a href="#" title="Fullscreen" style="width:36px;height:36px;line-height:36px;text-align:center;">⛶</a>';
        div.onclick = function(e) {
            e.preventDefault();
            toggleFullscreen();
        };
        return div;
    };
    fullscreenBtn.addTo(map);
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

/**
 * Initialize map when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    // Get data from page (assumes data is embedded in script tag or data attributes)
    const mapContainer = document.getElementById('map');

    if (mapContainer && typeof hotspotsData !== 'undefined') {
        const centerLat = parseFloat(mapContainer.dataset.centerLat || -0.3031);
        const centerLon = parseFloat(mapContainer.dataset.centerLon || 36.0800);

        initializeMap(centerLat, centerLon, hotspotsData);

        const patterns = analyzePatterns(hotspotsData);
        displayPatterns(patterns);

        // Add custom controls
        addCustomControls();
    }

    // Remove loading overlay if exists
    const loadingOverlay = document.querySelector('.loading-overlay');
    if (loadingOverlay) {
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 1000);
    }
});