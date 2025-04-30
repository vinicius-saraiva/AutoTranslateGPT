// UI handling and DOM manipulation
import { appState } from './app.js';
import { getNextLanguage, getPreviousLanguage } from './utils.js';

// Show status message to user
export function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
    }
}

// Initialize UI components
export function initializeUI() {
    // Initialize language buttons
    initLanguageButtons();
    
    // Setup navigation buttons
    setupNavigationButtons();
    
    // Update initial language display
    const initialLang = getSelectedLanguage('targetLangGrid');
    const initialLangButton = document.querySelector(`#targetLangGrid .lang-button[data-lang="${initialLang}"]`);
    if (initialLangButton) {
        document.getElementById('currentTargetLang').textContent = initialLangButton.getAttribute('title');
    }
}

// Initialize language buttons
function initLanguageButtons() {
    const supportedLanguages = [
        'en-GB', 'de-DE', 'nl-NL', 'fr-FR', 'es-ES', 
        'it-IT', 'ro-RO', 'cs-CZ', 'bg-BG', 'el-GR', 
        'hu-HU', 'zh-CN', 'pl-PL', 'pt-PT'
    ];
    const sourceGrid = document.getElementById('sourceLangGrid');
    const targetGrid = document.getElementById('targetLangGrid');
    if (!sourceGrid || !targetGrid) return;
    sourceGrid.innerHTML = '';
    targetGrid.innerHTML = '';
    supportedLanguages.forEach(lang => {
        // Source language button
        const srcBtn = document.createElement('button');
        srcBtn.className = 'lang-button';
        srcBtn.setAttribute('data-lang', lang);
        srcBtn.textContent = lang;
        srcBtn.onclick = () => {
            document.querySelectorAll('#sourceLangGrid .lang-button').forEach(b => b.classList.remove('selected'));
            srcBtn.classList.add('selected');
        };
        sourceGrid.appendChild(srcBtn);
        // Target language button
        const tgtBtn = document.createElement('button');
        tgtBtn.className = 'lang-button';
        tgtBtn.setAttribute('data-lang', lang);
        tgtBtn.textContent = lang;
        tgtBtn.onclick = () => {
            document.querySelectorAll('#targetLangGrid .lang-button').forEach(b => b.classList.remove('selected'));
            tgtBtn.classList.add('selected');
        };
        targetGrid.appendChild(tgtBtn);
    });
}

// Setup navigation buttons
function setupNavigationButtons() {
    // ... (to be moved from index.html)
}

// Get selected language
function getSelectedLanguage(gridId) {
    const selectedButton = document.querySelector(`#${gridId} .lang-button.selected`);
    return selectedButton ? selectedButton.getAttribute('data-lang') : '';
}

// Update progress bar
export function updateProgressBar(progress) {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

// Update translation table
export function updateTranslationTable(translations) {
    const tableBody = document.getElementById('translationTableBody');
    if (tableBody) {
        // ... (to be moved from index.html)
    }
} 