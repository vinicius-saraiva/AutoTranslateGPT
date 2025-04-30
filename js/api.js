// API handling and external service integration
import { appState } from './app.js';
import { showStatus } from './ui.js';

// Initialize OpenAI client
export function initializeOpenAIClient() {
    const openaiApiKey = localStorage.getItem('openaiApiKey');
    if (!openaiApiKey) {
        throw new Error('OpenAI API key not found. Please configure it first.');
    }
    appState.openaiClient = new OpenAI({
        apiKey: openaiApiKey,
        dangerouslyAllowBrowser: true
    });
}

// Load project data from Localise
export async function loadProjectData(apiKey, filter = false) {
    try {
        let url = `/api/translations?key=${apiKey}`;
        if (filter) {
            url += '&filter=!sameassource';
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error loading project data:', error);
        showStatus('Error loading project data: ' + error.message, 'error');
        throw error;
    }
}

// Save project data to Localise
export async function saveProjectData(apiKey, data) {
    try {
        const response = await fetch(`/api/translations?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error saving project data:', error);
        showStatus('Error saving project data: ' + error.message, 'error');
        throw error;
    }
} 