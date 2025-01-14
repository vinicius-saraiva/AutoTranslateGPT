import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Enable CORS and JSON parsing - these need to be before any routes
app.use(cors());
app.use(express.json());  // Make sure this is before the routes

// Log all incoming requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, {
        body: req.body,
        query: req.query,
        headers: req.headers
    });
    next();
});

// Set correct MIME types
app.use(express.static(dirname(__dirname), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Serve index.html at the root route
app.get('/', (req, res) => {
    res.sendFile(join(dirname(__dirname), 'src', 'index.html'));
});

// Explicitly serve the CSS file
app.get('/styles.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(join(dirname(__dirname), 'src', 'styles.css'));
});

// Proxy endpoint for Localise
app.get('/api/translations', async (req, res) => {
    const apiKey = req.query.key;
    const filter = req.query.filter;
    
    try {
        // Base URL
        let url = 'https://localise.biz/api/export/all.json';
        
        // Add parameters exactly as they appear in the working request
        if (filter === '!sameassource') {
            // Don't encode anything, pass the filter exactly as needed
            url += `?filter=!sameassource&key=${apiKey}`;
        } else {
            url += `?key=${apiKey}`;
        }
        
        console.log('DEBUG - Final Localise URL:', url);
        
        const response = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Localise Error Response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Replace your existing glossary route with this
app.get('/glossary.json', async (req, res) => {
    try {
        const filePath = join(dirname(__dirname), 'src', 'glossary.json');
        console.log('Reading glossary from:', filePath);
        
        const data = await readFile(filePath, 'utf8');
        console.log('Glossary content:', data.substring(0, 100) + '...'); // Log first 100 chars
        
        // Parse to verify it's valid JSON
        const jsonData = JSON.parse(data);
        
        // Send as JSON with proper headers
        res.json(jsonData);
        
    } catch (error) {
        console.error('Error serving glossary:', error);
        res.status(500).json({ 
            error: 'Failed to serve glossary',
            details: error.message,
            path: join(dirname(__dirname), 'src', 'glossary.json')
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 