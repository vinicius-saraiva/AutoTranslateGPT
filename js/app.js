// Core application logic and state management
import { initializeOpenAIClient } from './api.js';
import { loadSavedPreferences } from './storage.js';

// Global application state
export const appState = {
    currentData: {
        englishSource: {},
        originalTranslations: {},
        translations: {},
        totalEntries: 0,
        currentBatch: 0,
        batchSize: 10,
        targetLang: '',
        sourceLang: 'en-GB',
        processedKeys: new Set(),
        multiLanguageTranslations: {},
        processedLanguages: new Set(),
        currentBatchProgress: 0,
        translationQueue: [],
        translationResults: {}
    },
    openaiClient: null
};

// Initialize the application
export function initializeApp() {
    try {
        // Load saved preferences
        loadSavedPreferences();
        
        // Initialize OpenAI client
        initializeOpenAIClient();
        
        // Initialize other core components
        // ... (to be moved from index.html)
    } catch (error) {
        console.error('Error initializing application:', error);
        showStatus('Error initializing application: ' + error.message, 'error');
    }
} 