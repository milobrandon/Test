// API Base URL
const API_URL = '/api';

// State
let penguins = [];
let movements = [];
let selectedPenguin = null;
let map = null;
let markers = {};
let paths = {};
let showPaths = true;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadPenguins();
    loadStats();
});

// Initialize Leaflet map centered on Antarctica
function initMap() {
    map = L.map('map', {
        center: [-75, 0],
        zoom: 3,
        minZoom: 2,
        maxZoom: 10
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Add Antarctica outline circle for reference
    L.circle([-90, 0], {
        color: '#57c5b6',
        fillColor: '#e8f4f8',
        fillOpacity: 0.3,
        radius: 2500000
    }).addTo(map);

    // Map click handler for setting movement coordinates
    map.on('click', (e) => {
        const modal = document.getElementById('add-movement-modal');
        if (modal.classList.contains('active')) {
            document.getElementById('movement-lat').value = e.latlng.lat.toFixed(6);
            document.getElementById('movement-lng').value = e.latlng.lng.toFixed(6);
        }
    });
}

// Center map on Antarctica
function centerOnAntarctica() {
    map.setView([-75, 0], 3);
}

// Toggle movement paths visibility
function toggleAllPaths() {
    showPaths = !showPaths;
    Object.values(paths).forEach(path => {
        if (showPaths) {
            path.addTo(map);
        } else {
            path.remove();
        }
    });
}

// Load all penguins
async function loadPenguins() {
    try {
        const response = await fetch(`${API_URL}/penguins`);
        penguins = await response.json();
        renderPenguinList();
        updateMapMarkers();
    } catch (error) {
        console.error('Error loading penguins:', error);
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const stats = await response.json();
        document.getElementById('total-penguins').textContent = stats.totalPenguins;
        document.getElementById('total-movements').textContent = stats.totalMovements;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Render penguin list in sidebar
function renderPenguinList() {
    const container = document.getElementById('penguin-list');

    if (penguins.length === 0) {
        container.innerHTML = '<p class="empty-state">No penguins tracked yet</p>';
        return;
    }

    container.innerHTML = penguins.map(penguin => `
        <div class="penguin-card ${selectedPenguin?.id === penguin.id ? 'active' : ''}"
             onclick="selectPenguin('${penguin.id}')">
            <div class="penguin-card-header">
                <span class="penguin-icon">${getSpeciesEmoji(penguin.species)}</span>
                <div class="penguin-info">
                    <h3>${penguin.name}</h3>
                    <span class="species">${penguin.species} Penguin</span>
                </div>
            </div>
            <div class="penguin-status">
                <span class="status-dot ${penguin.currentLocation ? '' : 'inactive'}"></span>
                ${penguin.currentLocation ? 'Location tracked' : 'No location data'}
            </div>
        </div>
    `).join('');
}

// Get emoji for penguin species
function getSpeciesEmoji(species) {
    return '🐧';
}

// Update map markers for all penguins
function updateMapMarkers() {
    // Clear existing markers
    Object.values(markers).forEach(marker => marker.remove());
    markers = {};

    penguins.forEach(penguin => {
        if (penguin.currentLocation) {
            const marker = L.marker([
                penguin.currentLocation.latitude,
                penguin.currentLocation.longitude
            ], {
                title: penguin.name
            }).addTo(map);

            marker.bindPopup(`
                <div class="penguin-popup">
                    <h4>${getSpeciesEmoji(penguin.species)} ${penguin.name}</h4>
                    <p>${penguin.species} Penguin</p>
                    <p>Colony: ${penguin.colony}</p>
                </div>
            `);

            marker.on('click', () => selectPenguin(penguin.id));
            markers[penguin.id] = marker;
        }
    });
}

// Select a penguin and show details
async function selectPenguin(id) {
    const penguin = penguins.find(p => p.id === id);
    if (!penguin) return;

    selectedPenguin = penguin;
    renderPenguinList();

    // Load movements for this penguin
    try {
        const response = await fetch(`${API_URL}/penguins/${id}/movements`);
        const penguinMovements = await response.json();
        renderPenguinDetails(penguin, penguinMovements);
        renderPenguinPath(penguin, penguinMovements);

        // Center map on penguin if it has a location
        if (penguin.currentLocation) {
            map.setView([
                penguin.currentLocation.latitude,
                penguin.currentLocation.longitude
            ], 5);

            // Open popup
            if (markers[id]) {
                markers[id].openPopup();
            }
        }
    } catch (error) {
        console.error('Error loading movements:', error);
    }
}

// Render penguin details panel
function renderPenguinDetails(penguin, movements) {
    const panel = document.getElementById('details-panel');

    panel.innerHTML = `
        <div class="penguin-details">
            <div class="penguin-details-header">
                <div class="icon">${getSpeciesEmoji(penguin.species)}</div>
                <h2>${penguin.name}</h2>
                <p class="species">${penguin.species} Penguin</p>
            </div>

            <div class="details-section">
                <h3>Information</h3>
                <div class="detail-row">
                    <span class="detail-label">Tag ID</span>
                    <span class="detail-value">${penguin.tagId}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Colony</span>
                    <span class="detail-value">${penguin.colony}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">First Tracked</span>
                    <span class="detail-value">${formatDate(penguin.createdAt)}</span>
                </div>
            </div>

            ${penguin.currentLocation ? `
                <div class="details-section">
                    <h3>Current Location</h3>
                    <div class="detail-row">
                        <span class="detail-label">Latitude</span>
                        <span class="detail-value">${penguin.currentLocation.latitude.toFixed(4)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Longitude</span>
                        <span class="detail-value">${penguin.currentLocation.longitude.toFixed(4)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Updated</span>
                        <span class="detail-value">${formatDate(penguin.currentLocation.updatedAt)}</span>
                    </div>
                </div>
            ` : ''}

            <div class="details-section">
                <h3>Movement History (${movements.length})</h3>
                <div class="movement-list">
                    ${movements.length > 0 ? movements.map(m => `
                        <div class="movement-item">
                            <div class="coords">${m.latitude.toFixed(4)}, ${m.longitude.toFixed(4)}</div>
                            <div class="time">${formatDateTime(m.timestamp)}</div>
                            ${m.notes ? `<div class="notes">${m.notes}</div>` : ''}
                        </div>
                    `).join('') : '<p class="empty-state">No movements recorded</p>'}
                </div>
            </div>

            <div class="details-actions">
                <button class="btn btn-primary btn-block" onclick="showAddMovementModal('${penguin.id}', '${penguin.name}')">
                    Record Movement
                </button>
                <button class="btn btn-danger btn-block" onclick="deletePenguin('${penguin.id}')">
                    Delete Penguin
                </button>
            </div>
        </div>
    `;
}

// Render movement path on map
function renderPenguinPath(penguin, movements) {
    // Remove existing path for this penguin
    if (paths[penguin.id]) {
        paths[penguin.id].remove();
    }

    if (movements.length < 2) return;

    // Sort movements by timestamp (oldest first)
    const sortedMovements = [...movements].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
    );

    const coordinates = sortedMovements.map(m => [m.latitude, m.longitude]);

    const path = L.polyline(coordinates, {
        color: '#1a5f7a',
        weight: 2,
        opacity: 0.7,
        dashArray: '5, 10'
    });

    if (showPaths) {
        path.addTo(map);
    }

    paths[penguin.id] = path;
}

// Format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

// Format date and time
function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString();
}

// Show add penguin modal
function showAddPenguinModal() {
    document.getElementById('add-penguin-form').reset();
    document.getElementById('add-penguin-modal').classList.add('active');
}

// Show add movement modal
function showAddMovementModal(penguinId, penguinName) {
    document.getElementById('add-movement-form').reset();
    document.getElementById('movement-penguin-id').value = penguinId;
    document.getElementById('movement-penguin-name').textContent = `Recording movement for: ${penguinName}`;
    document.getElementById('add-movement-modal').classList.add('active');
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Add a new penguin
async function addPenguin(event) {
    event.preventDefault();

    const penguin = {
        name: document.getElementById('penguin-name').value,
        species: document.getElementById('penguin-species').value,
        colony: document.getElementById('penguin-colony').value || undefined,
        tagId: document.getElementById('penguin-tag').value || undefined
    };

    try {
        const response = await fetch(`${API_URL}/penguins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(penguin)
        });

        if (response.ok) {
            closeModal('add-penguin-modal');
            loadPenguins();
            loadStats();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to add penguin');
        }
    } catch (error) {
        console.error('Error adding penguin:', error);
        alert('Failed to add penguin');
    }
}

// Add a movement record
async function addMovement(event) {
    event.preventDefault();

    const penguinId = document.getElementById('movement-penguin-id').value;
    const movement = {
        latitude: parseFloat(document.getElementById('movement-lat').value),
        longitude: parseFloat(document.getElementById('movement-lng').value),
        notes: document.getElementById('movement-notes').value || undefined
    };

    try {
        const response = await fetch(`${API_URL}/penguins/${penguinId}/movements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(movement)
        });

        if (response.ok) {
            closeModal('add-movement-modal');
            loadPenguins();
            loadStats();
            selectPenguin(penguinId);
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to record movement');
        }
    } catch (error) {
        console.error('Error recording movement:', error);
        alert('Failed to record movement');
    }
}

// Delete a penguin
async function deletePenguin(id) {
    if (!confirm('Are you sure you want to delete this penguin and all its tracking data?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/penguins/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            selectedPenguin = null;
            document.getElementById('details-panel').innerHTML = `
                <div class="panel-placeholder">
                    <p>Select a penguin to view details</p>
                </div>
            `;

            // Remove marker and path
            if (markers[id]) {
                markers[id].remove();
                delete markers[id];
            }
            if (paths[id]) {
                paths[id].remove();
                delete paths[id];
            }

            loadPenguins();
            loadStats();
        } else {
            alert('Failed to delete penguin');
        }
    } catch (error) {
        console.error('Error deleting penguin:', error);
        alert('Failed to delete penguin');
    }
}
