import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());  // Enable CORS for all routes

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
    
    try {
        const response = await fetch('https://localise.biz/api/export/all.json', {
            headers: {
                'Authorization': `Loco ${apiKey}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
}); 