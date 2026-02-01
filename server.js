const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'penguins.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ penguins: [], movements: [] }, null, 2));
}

// Helper functions
function readData() {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// API Routes

// Get all penguins
app.get('/api/penguins', (req, res) => {
    const data = readData();
    res.json(data.penguins);
});

// Get a single penguin by ID
app.get('/api/penguins/:id', (req, res) => {
    const data = readData();
    const penguin = data.penguins.find(p => p.id === req.params.id);
    if (!penguin) {
        return res.status(404).json({ error: 'Penguin not found' });
    }
    res.json(penguin);
});

// Create a new penguin
app.post('/api/penguins', (req, res) => {
    const data = readData();
    const { name, species, tagId, colony } = req.body;

    if (!name || !species) {
        return res.status(400).json({ error: 'Name and species are required' });
    }

    const newPenguin = {
        id: uuidv4(),
        name,
        species,
        tagId: tagId || `TAG-${Date.now()}`,
        colony: colony || 'Unknown',
        currentLocation: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    data.penguins.push(newPenguin);
    writeData(data);
    res.status(201).json(newPenguin);
});

// Update a penguin
app.put('/api/penguins/:id', (req, res) => {
    const data = readData();
    const index = data.penguins.findIndex(p => p.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'Penguin not found' });
    }

    const { name, species, tagId, colony } = req.body;
    data.penguins[index] = {
        ...data.penguins[index],
        name: name || data.penguins[index].name,
        species: species || data.penguins[index].species,
        tagId: tagId || data.penguins[index].tagId,
        colony: colony || data.penguins[index].colony,
        updatedAt: new Date().toISOString()
    };

    writeData(data);
    res.json(data.penguins[index]);
});

// Delete a penguin
app.delete('/api/penguins/:id', (req, res) => {
    const data = readData();
    const index = data.penguins.findIndex(p => p.id === req.params.id);

    if (index === -1) {
        return res.status(404).json({ error: 'Penguin not found' });
    }

    data.penguins.splice(index, 1);
    // Also remove associated movements
    data.movements = data.movements.filter(m => m.penguinId !== req.params.id);
    writeData(data);
    res.json({ message: 'Penguin deleted successfully' });
});

// Record a movement for a penguin
app.post('/api/penguins/:id/movements', (req, res) => {
    const data = readData();
    const penguin = data.penguins.find(p => p.id === req.params.id);

    if (!penguin) {
        return res.status(404).json({ error: 'Penguin not found' });
    }

    const { latitude, longitude, notes } = req.body;

    if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const movement = {
        id: uuidv4(),
        penguinId: req.params.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        notes: notes || '',
        timestamp: new Date().toISOString()
    };

    // Update penguin's current location
    const penguinIndex = data.penguins.findIndex(p => p.id === req.params.id);
    data.penguins[penguinIndex].currentLocation = {
        latitude: movement.latitude,
        longitude: movement.longitude,
        updatedAt: movement.timestamp
    };
    data.penguins[penguinIndex].updatedAt = movement.timestamp;

    data.movements.push(movement);
    writeData(data);
    res.status(201).json(movement);
});

// Get movement history for a penguin
app.get('/api/penguins/:id/movements', (req, res) => {
    const data = readData();
    const penguin = data.penguins.find(p => p.id === req.params.id);

    if (!penguin) {
        return res.status(404).json({ error: 'Penguin not found' });
    }

    const movements = data.movements
        .filter(m => m.penguinId === req.params.id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(movements);
});

// Get all movements (for map visualization)
app.get('/api/movements', (req, res) => {
    const data = readData();
    res.json(data.movements);
});

// Get statistics
app.get('/api/stats', (req, res) => {
    const data = readData();

    const speciesCount = {};
    const colonyCount = {};

    data.penguins.forEach(p => {
        speciesCount[p.species] = (speciesCount[p.species] || 0) + 1;
        colonyCount[p.colony] = (colonyCount[p.colony] || 0) + 1;
    });

    res.json({
        totalPenguins: data.penguins.length,
        totalMovements: data.movements.length,
        speciesDistribution: speciesCount,
        colonyDistribution: colonyCount
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Penguin Tracker API running on http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser to view the app`);
});
