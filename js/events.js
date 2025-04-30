// Event handling and user interactions
import { appState } from './app.js';
import { showStatus } from './ui.js';
import { loadProjectData, saveProjectData } from './api.js';
import { savePreferences } from './storage.js';

// Setup all event listeners
export function setupEventListeners() {
    // Start button handler
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', handleStartTranslation);

    // Next button handler
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.addEventListener('click', handleNextBatch);

    // Save button handler
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.addEventListener('click', handleSaveTranslations);

    // API key input handlers
    document.getElementById('locoApiKey').addEventListener('change', savePreferences);
    document.getElementById('openaiApiKey').addEventListener('change', savePreferences);
    document.getElementById('batchSize').addEventListener('change', savePreferences);
    document.getElementById('ignoreBlank').addEventListener('change', savePreferences);

    // Project modal handlers
    setupProjectModalHandlers();
}

// Handle start translation button click
async function handleStartTranslation() {
    try {
        // Initialize OpenAI client first
        initializeOpenAIClient();
        
        const locoApiKey = document.getElementById('locoApiKey').value.trim();
        const openaiApiKey = localStorage.getItem('openaiApiKey');
        const targetLang = getSelectedLanguage('targetLangGrid');
        const sourceLang = getSelectedLanguage('sourceLangGrid');
        const batchSize = parseInt(document.getElementById('batchSize').value);
        const ignoreBlank = document.getElementById('ignoreBlank').checked;
        const ignoreTranslated = document.getElementById('ignoreTranslated').checked;
        const onlyEmpty = document.getElementById('onlyEmpty').checked;
        const filterCheckbox = document.getElementById('filterCheckbox').checked;

        if (!locoApiKey || !openaiApiKey || !targetLang || !sourceLang) {
            showStatus('Please fill in all required fields and select both languages', 'error');
            return;
        }

        showStatus('Loading project data...', 'info');

        // Load translations with filter if checkbox is checked
        const data = await loadProjectData(locoApiKey, filterCheckbox);
        
        // Process and prepare data
        // ... (to be moved from index.html)
        
        showStatus(`Loaded ${appState.currentData.totalEntries} entries. Click "Next Batch" to start translation.`, 'success');
    } catch (error) {
        console.error('Error:', error);
        showStatus('Error: ' + error.message, 'error');
    }
}

// Handle next batch button click
async function handleNextBatch() {
    try {
        // Process next batch of translations
        // ... (to be moved from index.html)
    } catch (error) {
        console.error('Error processing batch:', error);
        showStatus('Error processing batch: ' + error.message, 'error');
    }
}

// Handle save translations button click
async function handleSaveTranslations() {
    try {
        // Prepare and save translations
        // ... (to be moved from index.html)
    } catch (error) {
        console.error('Error saving translations:', error);
        showStatus('Error saving translations: ' + error.message, 'error');
    }
}

// Setup project modal event handlers
function setupProjectModalHandlers() {
    const modal = document.getElementById('apiModal');
    const configureBtn = document.getElementById('configureBtn');
    const closeBtn = document.querySelector('.close-modal');
    const saveApiKeysBtn = document.getElementById('saveApiKeys');

    configureBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        // Load saved OpenAI key if exists
        const openaiKey = localStorage.getItem('openaiApiKey');
        const openaiInput = document.getElementById('openaiApiKey');
        
        if (openaiKey) {
            openaiInput.value = openaiKey;
            openaiInput.setAttribute('data-full-key', openaiKey);
            openaiInput.value = formatApiKeyDisplay(openaiKey);
        }
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    saveApiKeysBtn.addEventListener('click', () => {
        const openaiInput = document.getElementById('openaiApiKey');
        const openaiKey = openaiInput.getAttribute('data-full-key') || openaiInput.value;
        
        localStorage.setItem('openaiApiKey', openaiKey);
        modal.style.display = 'none';
        
        // Reinitialize OpenAI client with new key
        appState.openaiClient = new OpenAI({
            apiKey: openaiKey,
            dangerouslyAllowBrowser: true
        });
        
        showStatus('OpenAI API key saved successfully', 'success');
    });
}

// Format API key for display
function formatApiKeyDisplay(apiKey) {
    if (!apiKey) return '';
    if (apiKey.length < 7) return apiKey;
    return `${apiKey.slice(0, 3)}...${apiKey.slice(-4)}`;
} 