// Local storage and data persistence
import { appState } from './app.js';
import { showStatus } from './ui.js';

// Save user preferences
export function savePreferences() {
    try {
        const preferences = {
            sourceLang: appState.currentData.sourceLang,
            targetLang: appState.currentData.targetLang,
            batchSize: appState.currentData.batchSize,
            ignoreBlank: document.getElementById('ignoreBlank').checked,
            ignoreTranslated: document.getElementById('ignoreTranslated').checked,
            onlyEmpty: document.getElementById('onlyEmpty').checked
        };
        
        localStorage.setItem('preferences', JSON.stringify(preferences));
    } catch (error) {
        console.error('Error saving preferences:', error);
        showStatus('Error saving preferences: ' + error.message, 'error');
    }
}

// Load saved preferences
export function loadSavedPreferences() {
    try {
        const savedPreferences = localStorage.getItem('preferences');
        if (savedPreferences) {
            const preferences = JSON.parse(savedPreferences);
            
            // Apply preferences to app state
            appState.currentData.sourceLang = preferences.sourceLang;
            appState.currentData.targetLang = preferences.targetLang;
            appState.currentData.batchSize = preferences.batchSize;
            
            // Update UI elements
            document.getElementById('ignoreBlank').checked = preferences.ignoreBlank;
            document.getElementById('ignoreTranslated').checked = preferences.ignoreTranslated;
            document.getElementById('onlyEmpty').checked = preferences.onlyEmpty;
            document.getElementById('batchSize').value = preferences.batchSize;
            
            // Update language selections
            updateLanguageSelection('sourceLangGrid', preferences.sourceLang);
            updateLanguageSelection('targetLangGrid', preferences.targetLang);
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
        showStatus('Error loading preferences: ' + error.message, 'error');
    }
}

// Update language selection in UI
function updateLanguageSelection(gridId, lang) {
    const buttons = document.querySelectorAll(`#${gridId} .lang-button`);
    buttons.forEach(button => {
        if (button.getAttribute('data-lang') === lang) {
            button.classList.add('selected');
        } else {
            button.classList.remove('selected');
        }
    });
} 