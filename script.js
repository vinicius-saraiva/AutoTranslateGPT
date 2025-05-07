// Import OpenAI first
import OpenAI from 'https://cdn.jsdelivr.net/npm/openai@4.28.0/+esm';
window.OpenAI = OpenAI;

// Import franc second
import { franc } from 'https://esm.sh/franc@6?bundle';
window.franc = franc;

// Initialize glossary loading state
window.glossaryLoaded = false;
window.glossary = null;

// Fun Facts functionality
let facts = [];
let currentFactIndex = 0;

async function loadFacts() {
    try {
        console.log('Loading facts...');
        const response = await fetch('language-facts.txt');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        console.log('Raw text loaded:', text.substring(0, 100) + '...'); // Log first 100 chars
        
        // Split by newlines and filter out empty lines
        facts = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
            
        // Shuffle the facts array using Fisher-Yates algorithm
        for (let i = facts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [facts[i], facts[j]] = [facts[j], facts[i]];
        }
        
        console.log('Number of facts loaded:', facts.length);
        console.log('First fact:', facts[0]);
        
        if (facts.length > 0) {
            displayNextFact();
        } else {
            console.error('No facts were loaded!');
            document.getElementById('funFact').textContent = 'No facts available';
        }
    } catch (error) {
        console.error('Error loading facts:', error);
        document.getElementById('funFact').textContent = 'Error loading facts';
    }
}

function displayNextFact() {
    const funFactElement = document.getElementById('funFact');
    if (!funFactElement) {
        console.error('Fun fact element not found!');
        return;
    }
    
    if (facts.length === 0) {
        console.error('No facts available to display');
        return;
    }

    console.log('Displaying fact:', currentFactIndex, facts[currentFactIndex]);
    
    // Fade out
    funFactElement.style.opacity = '0';
    
    setTimeout(() => {
        // Update fact
        funFactElement.textContent = facts[currentFactIndex];
        // Fade in
        funFactElement.style.opacity = '1';
        
        // Move to next fact
        currentFactIndex = (currentFactIndex + 1) % facts.length;
    }, 500);
}

// Change fact every 10 seconds
setInterval(displayNextFact, 10000);

// Load facts when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Loading facts...');
    loadFacts();
});

// Load glossary third
async function loadGlossary() {
    try {
        const response = await fetch('./glossary.json');
        if (!response.ok) {
            throw new Error(`Failed to load glossary: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        window.glossary = data;
        window.glossaryLoaded = true;
        console.log('Glossary loaded successfully:', {
            totalEntries: Object.keys(window.glossary).length,
            sampleEntries: Object.keys(window.glossary).slice(0, 3)
        });
        return true;
    } catch (error) {
        console.error('Error loading glossary:', error);
        window.glossaryLoaded = false;
        return false;
    }
}

// Load glossary immediately
loadGlossary();

// Global storage for all translations
window.globalTranslations = {
    translations: {},
    addTranslation: function(language, assetId, translation) {
        if (!this.translations[language]) {
            this.translations[language] = {};
        }
        this.translations[language][assetId] = translation;
    },
    getTranslations: function(language) {
        return this.translations[language] || {};
    },
    getAllTranslations: function() {
        return this.translations;
    }
};

// Initialize all global variables
window.currentData = {
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
    translationQueue: [], // Store entries that need translation
    translationResults: {} // Store completed translations for all languages
};

window.openaiClient = null;

window.supportedLanguages = [
    'en-GB', 'de-DE', 'nl-NL', 'fr-FR', 'es-ES', 
    'it-IT', 'ro-RO', 'cs-CZ', 'bg-BG', 'el-GR', 
    'hu-HU', 'zh-CN', 'pl-PL', 'pt-PT'
];

// Add this function to initialize OpenAI client
function initializeOpenAIClient() {
    const openaiApiKey = localStorage.getItem('openaiApiKey');
    if (!openaiApiKey) {
        throw new Error('OpenAI API key not found. Please configure it first.');
    }
    openaiClient = new OpenAI({
        apiKey: openaiApiKey,
        dangerouslyAllowBrowser: true
    });
}

// Add this flag at the top with other global variables
let isSaving = false;

// Define all necessary functions
function savePreferences() {
    const preferences = {
        sourceLang: getSelectedLanguage('sourceLangGrid'),
        targetLang: getSelectedLanguage('targetLangGrid'),
        batchSize: document.getElementById('batchSize').value,
        ignoreBlank: document.getElementById('ignoreBlankSource').checked,
        ignoreTranslated: document.getElementById('ignoreTranslated').checked,
        onlyEmpty: document.getElementById('onlyEmpty').checked,
        locoApiKey: document.getElementById('locoApiKey').value,
        filterCheckbox: document.getElementById('filterCheckbox').checked,
    };
    localStorage.setItem('translationPreferences', JSON.stringify(preferences));
}

function getSelectedLanguage(gridId) {
    const selectedButton = document.querySelector(`#${gridId} .lang-button[data-selected="true"]`);
    console.log('Getting selected language for', gridId, ':', selectedButton?.dataset.lang);
    return selectedButton ? selectedButton.dataset.lang : null;
}

function getSelectedLanguageName(gridId) {
    const selectedButton = document.querySelector(`#${gridId} .lang-button[data-selected="true"]`);
    console.log('Getting selected language name for', gridId, ':', selectedButton?.textContent.trim());
    return selectedButton ? selectedButton.textContent.trim() : null;
}

function updateTableHeaders() {
    const sourceLangButton = document.querySelector('#sourceLangGrid .lang-button[data-selected="true"]');
    const targetLangButton = document.querySelector('#targetLangGrid .lang-button[data-selected="true"]');
    
    if (sourceLangButton && targetLangButton) {
        const sourceLangName = sourceLangButton.getAttribute('title');
        const targetLangName = targetLangButton.getAttribute('title');
        
        document.getElementById('sourceHeader').textContent = `${sourceLangName} (Source)`;
        document.getElementById('targetHeader1').textContent = `${targetLangName} (Original Translation)`;
        document.getElementById('targetHeader2').textContent = `${targetLangName} (New Translation)`;
    }
}

function loadSavedPreferences() {
    try {
        const savedPreferences = JSON.parse(localStorage.getItem('translationPreferences')) || {};
        console.log('Loading saved preferences:', { ...savedPreferences, locoApiKey: '***', openaiApiKey: '***' });
        
        // Load API keys
        if (savedPreferences.locoApiKey) {
            document.getElementById('locoApiKey').value = savedPreferences.locoApiKey;
        }
        if (savedPreferences.openaiApiKey) {
            document.getElementById('openaiApiKey').value = savedPreferences.openaiApiKey;
        }
        
        // Load language selections
        if (savedPreferences.sourceLang) {
            const sourceButton = document.querySelector(`#sourceLangGrid .lang-button[data-lang="${savedPreferences.sourceLang}"]`);
            if (sourceButton) {
                document.querySelectorAll('#sourceLangGrid .lang-button').forEach(btn => {
                    btn.dataset.selected = 'false';
                });
                sourceButton.dataset.selected = 'true';
            }
        }
        
        if (savedPreferences.targetLang) {
            const targetButton = document.querySelector(`#targetLangGrid .lang-button[data-lang="${savedPreferences.targetLang}"]`);
            if (targetButton) {
                document.querySelectorAll('#targetLangGrid .lang-button').forEach(btn => {
                    btn.dataset.selected = 'false';
                });
                targetButton.dataset.selected = 'true';
            }
        }
        
        // Load other preferences
        document.getElementById('batchSize').value = savedPreferences.batchSize || 10;
        const ignoreBlankSourceCheckbox = document.getElementById('ignoreBlankSource');
        if (ignoreBlankSourceCheckbox) {
            ignoreBlankSourceCheckbox.checked = savedPreferences.ignoreBlank !== false;
        }
        updateTableHeaders();
        document.getElementById('filterCheckbox').checked = savedPreferences.filterCheckbox || false;
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

// Define all necessary functions
const supportedLanguages = [
    'en-GB', 'de-DE', 'nl-NL', 'fr-FR', 'es-ES', 
    'it-IT', 'ro-RO', 'cs-CZ', 'bg-BG', 'el-GR', 
    'hu-HU', 'zh-CN', 'pl-PL', 'pt-PT'
];

function getNextLanguage(currentLang) {
    const currentIndex = supportedLanguages.indexOf(currentLang);
    return supportedLanguages[(currentIndex + 1) % supportedLanguages.length];
}

function getPreviousLanguage(currentLang) {
    const currentIndex = supportedLanguages.indexOf(currentLang);
    return supportedLanguages[(currentIndex - 1 + supportedLanguages.length) % supportedLanguages.length];
}

function debugTranslationData(newLang) {
    console.log('=== Translation Debug Info ===');
    console.log('Target Language:', newLang);
    console.log('Window Translation Data:', window.translationData);
    console.log('Current Language Data:', window.translationData?.[newLang]);
    
    // Try to access a known key
    const testKey = 'Settings_Authentication_Title';
    console.log('Test key original translation:', window.translationData?.[newLang]?.[testKey]);
    
    // Log the full data structure
    console.log('Full data structure:', {
        windowTranslationData: window.translationData,
        currentLanguageData: window.translationData?.[newLang],
        currentDataState: currentData,
        flattenedTranslations: window.translationData?.[newLang] ? 
            flattenObject(window.translationData[newLang]) : 'No data to flatten'
    });
}

function updateTargetLanguage(newLang) {
    console.log('Updating target language to:', newLang);
    
    // Simulate clicking "Start Translation" with the new language
    const startTranslationProcess = async () => {
        try {
            const locoApiKey = document.getElementById('locoApiKey').value;
            const filterCheckbox = document.getElementById('filterCheckbox').checked;
            
            if (!locoApiKey) {
                showStatus('Please enter your Localise API key', 'error');
                return;
            }
            
            showStatus('Loading project data...', 'info');
            
            // Use existing window.translationData if available instead of fetching again
            if (!window.translationData) {
                let url = `/api/translations?key=${locoApiKey}`;
                if (filterCheckbox) {
                    url += '&filter=!sameassource';
                }
                
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                }
                
                window.translationData = await response.json();
            }
            
            // Update UI for new target language
            document.querySelectorAll('#targetLangGrid .lang-button').forEach(btn => {
                btn.dataset.selected = btn.dataset.lang === newLang ? 'true' : 'false';
            });
            
            // Update language display text
            const selectedButton = document.querySelector(`#targetLangGrid .lang-button[data-lang="${newLang}"]`);
            if (selectedButton) {
                const targetLangName = selectedButton.getAttribute('title');
                document.getElementById('currentTargetLang').textContent = targetLangName;
                
                // Update table headers
                document.getElementById('targetHeader1').textContent = `${targetLangName} (Original Translation)`;
                document.getElementById('targetHeader2').textContent = `${targetLangName} (New Translation)`;
            }
            
            // Get source and target data
            const sourceLang = getSelectedLanguage('sourceLangGrid');
            const sourceData = flattenObject(window.translationData[sourceLang] || {});
            const targetData = flattenObject(window.translationData[newLang] || {});
            
            // Get checkbox states
            const ignoreTranslated = document.getElementById('ignoreTranslated').checked;
            const onlyEmpty = document.getElementById('onlyEmpty').checked;
            
            // Filter entries based on checkbox states
            let entriesToTranslate = {};
            let skippedCount = 0;
            
            Object.entries(sourceData).forEach(([key, sourceText]) => {
                const existingTranslation = targetData[key];
                const isEmpty = !existingTranslation || 
                    (Array.isArray(existingTranslation) ? existingTranslation.length === 0 : 
                     (typeof existingTranslation === 'string' ? existingTranslation.trim() === '' : true));
                
                let shouldTranslate = true;
                
                if (onlyEmpty) {
                    shouldTranslate = isEmpty;
                } else if (ignoreTranslated) {
                    shouldTranslate = !existingTranslation;
                }
                
                if (shouldTranslate) {
                    entriesToTranslate[key] = sourceText;
                } else {
                    skippedCount++;
                }
            });
            
            // Reset currentData for new language
            currentData = {
                englishSource: sourceData,
                targetLang: newLang,
                translationQueue: Object.entries(entriesToTranslate),
                totalEntries: Object.keys(entriesToTranslate).length,
                processedKeys: new Set(),
                translationResults: currentData.translationResults || {},
                currentBatch: 0,
                batchSize: parseInt(document.getElementById('batchSize').value)
            };
            
            // Update UI
            document.getElementById('totalEntries').textContent = currentData.totalEntries;
            document.getElementById('translatedEntries').textContent = '0';
            
            // Reset progress bar
            const progressFill = document.getElementById('progressFill');
            const progressPercentage = document.getElementById('progressPercentage');
            progressFill.style.width = '0%';
            progressPercentage.textContent = '0%';
            
            // Update table content
            const translationTable = document.getElementById('translationTable');
            const rows = Array.from(translationTable.getElementsByTagName('tr'));
            
            rows.forEach(row => {
                if (!row.id) return; // Skip header row
                const key = row.id.replace('row-', '');
                
                // Update original translation column
                const originalCell = row.cells[2];
                if (originalCell) {
                    originalCell.textContent = targetData[key] || '';
                }
                
                // Clear new translation column
                const newTranslationCell = document.getElementById(`translation-${key}`);
                if (newTranslationCell) {
                    newTranslationCell.textContent = '';
                }
                
                // Update row styling
                const hasTranslation = !!targetData[key];
                const isEmpty = !hasTranslation;
                
                if ((hasTranslation && ignoreTranslated) || (!isEmpty && onlyEmpty)) {
                    row.style.backgroundColor = '#f5f5f5';
                    row.style.color = '#999';
                } else {
                    row.style.backgroundColor = '';
                    row.style.color = '';
                }
            });
            
            // Update Next Batch button state
            const nextBtn = document.getElementById('nextBtn');
            nextBtn.disabled = currentData.totalEntries === 0;
            
            // Show status message
            const skippedMessage = skippedCount > 0 ? 
                ` (${skippedCount} entries skipped as already translated)` : '';
            showStatus(`Loaded ${currentData.totalEntries} entries${skippedMessage}. Click "Next Batch" to start translation.`, 'success');
            
        } catch (error) {
            console.error('Error:', error);
            showStatus('Error updating target language: ' + error.message, 'error');
        }
    };
    
    // Execute the process
    startTranslationProcess();
}

// Add this function near the top with other utility functions
function updateTabTitle(progress = null) {
    if (progress !== null) {
        document.title = `(${Math.round(progress)}%) INDY.tradutor`;
    } else {
        document.title = 'INDY.tradutor';
    }
}

// Update the updateProgressBar function
function updateProgressBar(percentage) {
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    if (progressFill && progressPercentage) {
        progressFill.style.width = `${percentage}%`;
        progressPercentage.textContent = `${Math.round(percentage)}%`;
        // Update tab title with the same percentage
        updateTabTitle(percentage);
    }
}

// Update the processBatch function to handle title updates
async function processBatch() {
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.classList.add('loading');
    nextBtn.textContent = 'Translating...';
    
    try {
        const translateAll = document.getElementById('translateAll').checked;
        
        // Initialize translation queue if empty
        if (currentData.translationQueue.length === 0) {
            currentData.translationQueue = Object.entries(currentData.englishSource)
                .filter(([key]) => !currentData.processedKeys.has(key));
        }
        
        // Get next batch of entries
        const entries = currentData.translationQueue.slice(0, currentData.batchSize);

        if (translateAll) {
            // Get all target languages excluding the source language
            const targetLanguages = supportedLanguages.filter(lang => lang !== currentData.sourceLang);
            showStatus(`Translating entries to ${targetLanguages.length} languages...`, 'info');

            for (const [key, sourceText] of entries) {
                showStatus(`Translating entry ${currentData.processedKeys.size + 1}/${currentData.totalEntries} for all languages...`, 'info');
                
                // Translate for each target language
                for (const targetLang of targetLanguages) {
                    try {
                        // Check if we already have this translation
                        if (globalTranslations.getTranslations(targetLang)[key]) {
                            console.log(`Skipping already translated entry ${key} for language ${targetLang}`);
                            continue; // Skip if already translated for this language
                        }

                        const translation = await translateText(sourceText, targetLang, key);
                        
                        // Store in global translations
                        globalTranslations.addTranslation(targetLang, key, translation);
                        
                        // Also store in currentData for UI consistency
                        if (!currentData.translationResults[targetLang]) {
                            currentData.translationResults[targetLang] = {};
                        }
                        currentData.translationResults[targetLang][key] = translation;
                        
                        console.log(`Translated ${key} to ${targetLang}: ${translation}`);
                        
                        // Update UI if this is the current target language
                        if (targetLang === currentData.targetLang) {
                            const cell = document.getElementById(`translation-${key}`);
                            if (cell) cell.textContent = translation;
                        }
                    } catch (error) {
                        console.error(`Error translating ${key} to ${targetLang}:`, error);
                        showStatus(`Error translating to ${targetLang}: ${error.message}`, 'error');
                    }
                }
                
                // Mark as processed after translating to all languages
                currentData.processedKeys.add(key);
                // Remove from queue
                currentData.translationQueue = currentData.translationQueue.filter(([k]) => k !== key);
                
                // Update progress
                updateStatistics();
            }
        } else {
            // Single language translation
            if (!currentData.translationResults[currentData.targetLang]) {
                currentData.translationResults[currentData.targetLang] = {};
            }

            for (const [key, sourceText] of entries) {
                showStatus(`Translating entry ${currentData.processedKeys.size + 1}/${currentData.totalEntries}...`, 'info');
                const translation = await translateText(sourceText, currentData.targetLang, key);
                
                // Store translation in both places
                currentData.translationResults[currentData.targetLang][key] = translation;
                globalTranslations.addTranslation(currentData.targetLang, key, translation);
                
                // Update UI
                const cell = document.getElementById(`translation-${key}`);
                if (cell) cell.textContent = translation;
                
                currentData.processedKeys.add(key);
                // Remove processed entry from queue
                currentData.translationQueue = currentData.translationQueue.filter(([k]) => k !== key);
                
                // Update statistics and progress after each translation
                updateStatistics();
            }
        }

        // Update UI state
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = false;
        nextBtn.disabled = currentData.translationQueue.length === 0;
        
        if (currentData.translationQueue.length === 0) {
            showStatus('All translations completed!', 'success');
            updateTabTitle();
        }

    } catch (error) {
        console.error('Batch processing error:', error);
        showStatus('Error processing batch: ' + error.message, 'error');
        updateTabTitle();
    } finally {
        nextBtn.classList.remove('loading');
        nextBtn.textContent = 'Next Batch';
    }
}

// Add title reset when starting new translation
document.getElementById('startBtn').addEventListener('click', async () => {
    try {
        // Reset the title at the start
        updateTabTitle();
        // ... rest of the existing start button code ...
    } catch (error) {
        console.error('Error:', error);
        showStatus('Error: ' + error.message, 'error');
        updateTabTitle();
        startBtn.disabled = false;
    }
});

// Initialize title when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    updateTabTitle();
    // ... rest of your existing DOMContentLoaded code ...
});

// Add statistics update function
function updateStatistics() {
    const totalEntries = Object.keys(currentData.englishSource || {}).length;
    const translatedEntries = currentData.processedKeys.size;
    const progressPercentage = totalEntries ? Math.round((translatedEntries / totalEntries) * 100) : 0;

    // Update all UI elements
    document.getElementById('totalEntries').textContent = totalEntries;
    document.getElementById('translatedEntries').textContent = translatedEntries;
    document.getElementById('progressPercentage').textContent = `${progressPercentage}%`;
    document.getElementById('progressFill').style.width = `${progressPercentage}%`;
    
    // Update tab title with the same percentage
    updateTabTitle(progressPercentage);
}

function setupNavigationButtons() {
    console.log('Setting up navigation buttons...');
    
    const prevBtn = document.getElementById('prevLang');
    const nextBtn = document.getElementById('nextLang');
    
    if (!prevBtn || !nextBtn) {
        console.error('Navigation buttons not found in DOM');
        return;
    }
    
    console.log('Found navigation buttons:', { prevBtn, nextBtn });

    prevBtn.onclick = () => {
        console.log('Previous button clicked');
        const currentLang = getSelectedLanguage('targetLangGrid');
        console.log('Current language:', currentLang);
        const prevLang = getPreviousLanguage(currentLang);
        console.log('Switching to previous language:', prevLang);
        updateTargetLanguage(prevLang);
    };
    
    nextBtn.onclick = () => {
        console.log('Next button clicked');
        const currentLang = getSelectedLanguage('targetLangGrid');
        console.log('Current language:', currentLang);
        const nextLang = getNextLanguage(currentLang);
        console.log('Switching to next language:', nextLang);
        updateTargetLanguage(nextLang);
    };
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize language buttons
    initLanguageButtons();
    
    // Load saved preferences
    loadSavedPreferences();
    
    // Setup navigation buttons
    setupNavigationButtons();
    
    // Update initial language display
    const initialLang = getSelectedLanguage('targetLangGrid');
    const initialLangButton = document.querySelector(`#targetLangGrid .lang-button[data-lang="${initialLang}"]`);
    if (initialLangButton) {
        document.getElementById('currentTargetLang').textContent = initialLangButton.getAttribute('title');
    }

    // Add start button handler
    const startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', async () => {
        try {
            // Initialize OpenAI client first
            initializeOpenAIClient();
            
            // Always use the current value from the input field
            const locoApiKey = document.getElementById('locoApiKey').value.trim();
            const openaiApiKey = localStorage.getItem('openaiApiKey');
            const targetLang = getSelectedLanguage('targetLangGrid');
            const sourceLang = getSelectedLanguage('sourceLangGrid');
            const batchSize = parseInt(document.getElementById('batchSize').value);
            const ignoreBlank = document.getElementById('ignoreBlankSource').checked;
            const ignoreTranslated = document.getElementById('ignoreTranslated').checked;
            const onlyEmpty = document.getElementById('onlyEmpty').checked;
            const filterCheckbox = document.getElementById('filterCheckbox').checked;

            if (!locoApiKey || !openaiApiKey || !targetLang || !sourceLang) {
                showStatus('Please fill in all required fields and select both languages', 'error');
                return;
            }

            showStatus('Loading project data...', 'info');

            // Load translations with filter if checkbox is checked
            let url = `/api/translations?key=${locoApiKey}`;
            if (filterCheckbox) {
                url += '&filter=!sameassource';
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);
            
            const data = await response.json();
            
            // Helper function to check if a value is empty
            function isValueEmpty(value) {
                if (!value) return true;
                if (Array.isArray(value)) return value.length === 0;
                if (typeof value === 'string') return value.trim() === '';
                return false;
            }

            // Prepare data
            let sourceData = flattenObject(data[sourceLang] || {});
            
            // Always filter out empty source strings, regardless of ignoreBlank setting
            sourceData = Object.fromEntries(
                Object.entries(sourceData).filter(([_, value]) => !isValueEmpty(value))
            );

            // Get original translations
            const originalTranslations = flattenObject(data[targetLang] || {});

            // Filter out already translated entries if needed
            let entriesToTranslate = { ...sourceData };
            let skippedCount = 0;

            entriesToTranslate = Object.fromEntries(
                Object.entries(sourceData).filter(([key, sourceText]) => {
                    // Skip empty source strings
                    if (isValueEmpty(sourceText)) {
                        skippedCount++;
                        return false;
                    }

                    const existingTranslation = originalTranslations[key];
                    
                    // Skip if entry has translation and we only want empty entries
                    if (onlyEmpty && existingTranslation) {
                        if (Array.isArray(existingTranslation)) {
                            if (existingTranslation.length > 0) {
                                skippedCount++;
                                return false;
                            }
                        } else if (typeof existingTranslation === 'string' && existingTranslation.trim() !== '') {
                            skippedCount++;
                            return false;
                        }
                    }
                    
                    // Skip if entry has translation in target language and ignoreTranslated is checked
                    if (ignoreTranslated && existingTranslation) {
                        const shouldTranslate = shouldTranslateEntry(sourceText, existingTranslation, targetLang);
                        if (!shouldTranslate) {
                            skippedCount++;
                            return false;
                        }
                    }
                    
                    return true;
                })
            );

            // Initialize OpenAI client
            openaiClient = new OpenAI({
                apiKey: openaiApiKey,
                dangerouslyAllowBrowser: true
            });

            // Set up current data
            currentData = {
                englishSource: entriesToTranslate,
                originalTranslations: originalTranslations,
                translations: {},
                totalEntries: Object.keys(entriesToTranslate).length,
                currentBatch: 0,
                batchSize: batchSize,
                targetLang: targetLang,
                sourceLang: sourceLang,
                processedKeys: new Set(),
                multiLanguageTranslations: {},
                processedLanguages: new Set(),
                currentBatchProgress: 0,
                translationQueue: [], // Store entries that need translation
                translationResults: {} // Store completed translations for all languages
            };

            // Clear and set up table
            const translationTable = document.getElementById('translationTable');
            translationTable.innerHTML = '';
            
            // Add headers
            updateTableHeaders();
            
            // Sort entries: entries to translate first (white), then skipped entries (gray)
            const allEntries = Object.entries(sourceData);
            const sortedEntries = allEntries.sort((a, b) => {
                const aNeeds = entriesToTranslate.hasOwnProperty(a[0]) ? 0 : 1;
                const bNeeds = entriesToTranslate.hasOwnProperty(b[0]) ? 0 : 1;
                return aNeeds - bNeeds;
            });

            // Show all source entries and their translations (if they exist)
            sortedEntries.forEach(([key, sourceText]) => {
                const row = translationTable.insertRow();
                row.id = `row-${key}`;
                
                // Key column
                const keyCell = row.insertCell();
                keyCell.textContent = key;
                
                // Source text column
                const sourceCell = row.insertCell();
                sourceCell.textContent = sourceText;
                
                // Original translation column
                const originalCell = row.insertCell();
                originalCell.textContent = originalTranslations[key] || '';
                
                // New translation column (empty for now)
                const newCell = row.insertCell();
                newCell.id = `translation-${key}`;
                newCell.textContent = '';
                
                // If this entry is not in entriesToTranslate, gray out the row
                if (!entriesToTranslate[key]) {
                    row.style.backgroundColor = '#f5f5f5';
                    row.style.color = '#999';
                }
            });

            // Update UI state
            startBtn.disabled = true;
            const nextBtn = document.getElementById('nextBtn');
            const saveBtn = document.getElementById('saveBtn');
            nextBtn.disabled = currentData.totalEntries === 0;
            saveBtn.disabled = false;

            // Update statistics
            updateStatistics();

            const skippedMessage = skippedCount > 0 ? 
                ` (${skippedCount} entries skipped as already translated)` : '';
            showStatus(`Loaded ${currentData.totalEntries} entries${skippedMessage}. Click "Next Batch" to start translation.`, 'success');

        } catch (error) {
            console.error('Error:', error);
            showStatus('Error: ' + error.message, 'error');
            startBtn.disabled = false;
        }
    });

    // Add change handlers for API key inputs
    const locoApiKeyInput = document.getElementById('locoApiKey');
    if (locoApiKeyInput) locoApiKeyInput.addEventListener('change', savePreferences);
    const openaiApiKeyInput = document.getElementById('openaiApiKey');
    if (openaiApiKeyInput) openaiApiKeyInput.addEventListener('change', savePreferences);
    const batchSizeInput = document.getElementById('batchSize');
    if (batchSizeInput) batchSizeInput.addEventListener('change', savePreferences);
    const ignoreBlankSourceCheckbox = document.getElementById('ignoreBlankSource');
    if (ignoreBlankSourceCheckbox) ignoreBlankSourceCheckbox.addEventListener('change', savePreferences);

    // Add Next button handler
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.addEventListener('click', () => {
        processBatch();
    });

    // Single save button handler
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        if (saveBtn.dataset.saving === 'true') return;
        saveBtn.dataset.saving = 'true';
        
        try {
            showStatus('Preparing translations for download...', 'info');
            
            // Get all translations for current language
            const translations = {};
            const rows = Array.from(document.getElementById('translationTable').getElementsByTagName('tr'));
            
            rows.forEach(row => {
                if (!row.id) return; // Skip header row
                const key = row.id.replace('row-', '');
                const translationCell = document.getElementById(`translation-${key}`);
                if (translationCell && translationCell.textContent.trim()) {
                    translations[key] = translationCell.textContent.trim();
                }
            });
            
            // For single language export, we don't wrap in language code
            const exportData = unflattenObject(translations);

            console.log('Final export data:', exportData);

            // Create a Blob with the JSON data
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            
            // Create a download link
            const downloadLink = document.createElement('a');
            const url = URL.createObjectURL(blob);
            downloadLink.href = url;
            downloadLink.download = `translations_${currentData.targetLang}_${new Date().toISOString().split('T')[0]}.json`;
            
            // Trigger the download
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            // Cleanup
            setTimeout(() => {
                URL.revokeObjectURL(url);
                document.body.removeChild(downloadLink);
                saveBtn.dataset.saving = 'false';
            }, 1000);
            
            showStatus('Translations downloaded successfully!', 'success');

        } catch (error) {
            console.error('Error preparing download:', error);
            showStatus('Error preparing download: ' + error.message, 'error');
            saveBtn.dataset.saving = 'false';
        }
    });

    const modal = document.getElementById('apiModal');
    console.log('DEBUG: configureBtn found:', !!modal);
    const configureBtn = document.getElementById('configureBtn');
    const closeBtn = document.querySelector('.close-modal');
    const saveApiKeysBtn = document.getElementById('saveApiKeys');

    // Update the modal open handler to always show the real key
    configureBtn.addEventListener('click', () => {
        console.log('Configure button clicked');
        const openaiInput = document.getElementById('openaiApiKey');
        const savedKey = localStorage.getItem('openaiApiKey');
        
        if (savedKey) {
            openaiInput.value = savedKey;
        } else {
            openaiInput.value = '';
        }
        
        modal.classList.add('show');
    });

    // Remove input masking logic for focus/blur
    document.getElementById('openaiApiKey').removeEventListener('focus', function() {});
    document.getElementById('openaiApiKey').removeEventListener('blur', function() {});

    // Update save handler to use full key
    saveApiKeysBtn.addEventListener('click', () => {
        const openaiInput = document.getElementById('openaiApiKey');
        const openaiKey = openaiInput.value;
        
        localStorage.setItem('openaiApiKey', openaiKey);
        modal.style.display = 'none';
        
        // Reinitialize OpenAI client with new key
        openaiClient = new OpenAI({
            apiKey: openaiKey,
            dangerouslyAllowBrowser: true
        });
        
        showStatus('OpenAI API key saved successfully', 'success');
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    const loadProjectBtn = document.getElementById('loadProjectBtn');
    loadProjectBtn.addEventListener('click', async () => {
        try {
            const locoApiKey = document.getElementById('locoApiKey').value;
            const filterCheckbox = document.getElementById('filterCheckbox').checked;

            if (!locoApiKey) {
                showStatus('Please enter your Localise API key', 'error');
                return;
            }

            // Show loading status
            showStatus('Loading project data...', 'info');

            // Simple URL construction without any encoding
            let url = `/api/translations?key=${locoApiKey}`;
            if (filterCheckbox) {
                url += '&filter=!sameassource';
            }

            console.log('DEBUG - Client request URL:', url);

            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('DEBUG - Received data keys:', Object.keys(data).slice(0, 5));
            // ... rest of the code

            // Update statistics
            const totalEntries = Object.keys(data['en-GB'] || {}).length;
            document.getElementById('totalEntries').textContent = totalEntries;
            document.getElementById('translatedEntries').textContent = '0';
            document.getElementById('progressPercentage').textContent = '0%';
            document.getElementById('progressFill').style.width = '0%';

            // Store the data for later use
            window.translationData = data;

            showStatus('Project loaded successfully!', 'success');

        } catch (error) {
            console.error('Error:', error);
            showStatus('Error loading project: ' + error.message, 'error');
        }
    });

    // Add these functions before setupNavigationButtons
    const supportedLanguages = [
        'en-GB', 'de-DE', 'nl-NL', 'fr-FR', 'es-ES', 
        'it-IT', 'ro-RO', 'cs-CZ', 'bg-BG', 'el-GR', 
        'hu-HU', 'zh-CN', 'pl-PL', 'pt-PT'
    ];

    function getNextLanguage(currentLang) {
        const currentIndex = supportedLanguages.indexOf(currentLang);
        return supportedLanguages[(currentIndex + 1) % supportedLanguages.length];
    }

    function getPreviousLanguage(currentLang) {
        const currentIndex = supportedLanguages.indexOf(currentLang);
        return supportedLanguages[(currentIndex - 1 + supportedLanguages.length) % supportedLanguages.length];
    }

    function updateTargetLanguage(newLang) {
        // Update the target language selection in the grid
        document.querySelectorAll('#targetLangGrid .lang-button').forEach(btn => {
            btn.dataset.selected = btn.dataset.lang === newLang ? 'true' : 'false';
        });
        
        // Update currentData target language
        currentData.targetLang = newLang;
        
        // Get original translations from Localise API
        const originalTranslations = window.translationData && window.translationData[newLang] ? 
            flattenObject(window.translationData[newLang]) : {};
        console.log('Flattened original translations:', originalTranslations);
        
        // Get our new translations
        const newTranslations = currentData.translationResults?.[newLang] || {};
        console.log('New translations for this language:', newTranslations);
        
        // Get checkbox states
        const ignoreTranslated = document.getElementById('ignoreTranslated').checked;
        const onlyEmpty = document.getElementById('onlyEmpty').checked;
        
        // Show translations for the new language
        const translationTable = document.getElementById('translationTable');
        const rows = translationTable.getElementsByTagName('tr');
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row.id) continue; // Skip header row
            
            const key = row.id.replace('row-', '');
            
            // Update original translation column from Localise API
            const cells = row.getElementsByTagName('td');
            if (cells.length >= 3) {
                const originalCell = cells[2];
                const originalTranslation = originalTranslations[key] || '';
                console.log(`Setting original translation for ${key}:`, originalTranslation);
                originalCell.textContent = originalTranslation;
            }
            
            // Update new translation column from our translations
            const translationCell = document.getElementById(`translation-${key}`);
            if (translationCell) {
                const newTranslation = newTranslations[key] || '';
                console.log(`Setting new translation for ${key}:`, newTranslation);
                translationCell.textContent = newTranslation;
                
                // Determine if this row should be grayed out based on checkbox states
                const hasOriginalTranslation = !!originalTranslations[key];
                const isEmpty = !originalTranslations[key] && !newTranslation;
                
                if (hasOriginalTranslation && ignoreTranslated) {
                    // Gray out if we're ignoring already translated entries
                    row.style.backgroundColor = '#f5f5f5';
                    row.style.color = '#999';
                } else if (!isEmpty && onlyEmpty) {
                    // Gray out if we're only translating empty entries and this one isn't empty
                    row.style.backgroundColor = '#f5f5f5';
                    row.style.color = '#999';
                } else {
                    // Reset styling for entries that need translation
                    row.style.backgroundColor = '';
                    row.style.color = '';
                }
            }
        }
        
        // Update currentData with new counts
        currentData.totalEntries = Object.keys(newTranslations).length;
        
        // Enable/disable Next Batch button based on remaining translations
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.disabled = Object.keys(newTranslations).length === 0;
        }
        
        // Update statistics display
        const statsDisplay = document.getElementById('statsDisplay');
        if (statsDisplay) {
            statsDisplay.textContent = `Entries to translate: ${Object.keys(newTranslations).length} / Total entries: ${Object.keys(newTranslations).length}`;
        }
        
        // Save preferences
        savePreferences();
    }

    // Add event listeners in your DOMContentLoaded handler
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize language buttons
        initLanguageButtons();
        
        // Load saved preferences
        loadSavedPreferences();

        // Add navigation button handlers with console logs
        const prevBtn = document.getElementById('prevLang');
        const nextBtn = document.getElementById('nextLang');
        
        console.log('Navigation buttons:', { prevBtn, nextBtn });

        prevBtn.addEventListener('click', () => {
            console.log('Previous button clicked');
            const currentLang = getSelectedLanguage('targetLangGrid');
            console.log('Current language:', currentLang);
            const prevLang = getPreviousLanguage(currentLang);
            console.log('Switching to previous language:', prevLang);
            updateTargetLanguage(prevLang);
        });
        
        nextBtn.addEventListener('click', () => {
            console.log('Next button clicked');
            const currentLang = getSelectedLanguage('targetLangGrid');
            console.log('Current language:', currentLang);
            const nextLang = getNextLanguage(currentLang);
            console.log('Switching to next language:', nextLang);
            updateTargetLanguage(nextLang);
        });
        
        // Update initial language display
        const initialLang = getSelectedLanguage('targetLangGrid');
        const initialLangButton = document.querySelector(`#targetLangGrid .lang-button[data-lang="${initialLang}"]`);
        if (initialLangButton) {
            document.getElementById('currentTargetLang').textContent = initialLangButton.getAttribute('title');
        }
    });
});

function initLanguageButtons() {
    // Source language buttons
    document.querySelectorAll('#sourceLangGrid .lang-button').forEach(button => {
        button.addEventListener('click', () => {
            // Update visual state
            document.querySelectorAll('#sourceLangGrid .lang-button').forEach(btn => {
                btn.dataset.selected = 'false';
            });
            button.dataset.selected = 'true';
            
            // Update data and UI
            currentData.sourceLang = button.dataset.lang;
            updateTableHeaders();
            savePreferences();
        });
    });

    // Target language buttons
    document.querySelectorAll('#targetLangGrid .lang-button').forEach(button => {
        button.addEventListener('click', () => {
            // Use our existing updateTargetLanguage function
            updateTargetLanguage(button.dataset.lang);
        });
    });
}

// Add status display function
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) {
        console.error('Status element not found');
        return;
    }
    
    statusDiv.textContent = message;
    statusDiv.className = 'status-message ' + type;
    
    // Optionally auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}

// Add translateText function
function getGlossaryPrompt(text, targetLang) {
    if (!window.glossaryLoaded || !window.glossary) {
        console.error('Glossary not loaded yet');
        return '';
    }

    console.log('Checking glossary for:', text);
    console.log('Target language:', targetLang);
    console.log('Available glossary:', window.glossary);

    const normalizedText = text.toLowerCase();
    console.log('Normalized text:', normalizedText);

    // Convert language codes
    const langMapping = {
        'en-GB': 'en-GB',
        'fr-FR': 'fr-FR',
        'de-DE': 'de-DE',
        'nl-NL': 'nl-NL',
        'it-IT': 'it-IT',
        'hu-HU': 'hu-HU',
        'cs-CZ': 'cs-CZ',
        'ro-RO': 'ro-RO',
        'bg-BG': 'bg-BG',
        'es-ES': 'es-ES',
        'zh-CN': 'zh-CN',
        'pl-PL': 'pl-PL',
        'el-GR': 'el-GR',
        'pt-PT': 'pt-PT'
    };

    const langCode = langMapping[targetLang];
    console.log('Mapped language code:', langCode);
    
    if (!langCode || !window.glossary) {
        console.log('Missing langCode or glossary:', { langCode, hasGlossary: !!window.glossary });
        return '';
    }

    // Find matching glossary terms
    const matches = Object.entries(window.glossary).filter(([key]) => {
        const term = key.toLowerCase();
        const textLower = text.toLowerCase();
        
        // Check for various forms of the term
        const isMatch = 
            textLower.includes(term) || // exact match
            textLower.includes(term + 's') || // plural form
            textLower.includes(term + "'s") || // possessive form
            textLower.includes(term + 'es') || // alternative plural form
            textLower.includes(term + 'ies') || // alternative plural form
            (term === 'you' && textLower.includes('your')); // special case for 'you'
            
        console.log(`Checking term "${term}" against "${textLower}":`, isMatch);
        return isMatch;
    });

    console.log('Found matches:', matches);

    if (matches.length === 0) return '';

    // Build prompt addition
    const translations = matches.map(([key, translations]) => {
        const translation = translations[langCode];
        // Check if translation is empty or undefined
        if (!translation) {
            console.log(`Ignoring empty or undefined translation for ${key}`);
            return null; // Return null to filter out
        }
        console.log(`Getting translation for ${key}:`, translation);
        return `"${key}": "${translation}"`;
    }).filter(Boolean); // Filter out null values

    // Only include the glossary prompt if there are valid translations
    const prompt = translations.length > 0 
        ? `Please keep in mind the following glossary: ${translations.join(', ')}. ` 
        : ''; // Empty prompt if no valid translations

    console.log('Final glossary prompt:', prompt);
    return prompt;
}

// Single source of truth for the prompt template
const PROMPT_TEMPLATE = `You are a professional translator for a B2B foreign exchange and cross-border payments platform. Translate to ${'${targetLang}'}.

These translations are being imported from a translation management platform (Localise.biz) where each asset has a unique ID.
The asset ID provides context about the UI element type (Button/CTA, Title, Label, Error, etc).

Important rules:
1. ${'${glossaryPrompt}'}
2. Adapt the case, gender, number, and declination of any glossary terms for grammatical correctness
3. CRITICAL: Variables must be preserved EXACTLY as they appear, including the underscores:
- __variable__ → Keep as __variable__ (e.g., "__total__" should stay as "__total__")
- %variable% → Keep as %variable%
- %%variable%% → Keep as %%variable%%
- {{variable}} → Keep as {{variable}}
4. ONLY include HTML tags that exist in the original text - DO NOT add new ones
5. Keep existing HTML tags (<br>, <p>, etc.) exactly as they appear
6. You must keep at all costs the "/n" and "/t" as they are in the original text like the following example "add a beneficiary in the platform. \n \n If you did not initiate this action"
7. DO NOT translate: HTML tags, URLs, date formats like DD/MM/YYYY HH:mm or similar
8. Use terminology and phrasing that is the most commonly used by fintechs and banks in ${'${targetLang}'}, prioritizing clarity and naturalness for business clients. When multiple correct translations exist, prefer the one most frequently used in the financial and FX industry.  
9. Prefer terminology commonly used by leading fintech and FX providers such as **Wise, Revolut, and iBanFirst** to ensure industry consistency.  
10. NEVER include the asset ID in your translation. Only return the translated text itself.
Context: The platform handles currency conversion, international payments, and financial operations for business clients.

Asset ID: ${'${key}'}
Text to translate: ${'${text}'}
`;

// Function to fill in the template with real values
function generateTranslationPrompt(text, targetLang, key) {
    const glossaryPrompt = getGlossaryPrompt(text, targetLang);
    return PROMPT_TEMPLATE
        .replace(/\$\{text\}/g, text)
        .replace(/\$\{targetLang\}/g, targetLang)
        .replace(/\$\{key\}/g, key)
        .replace(/\$\{glossaryPrompt\}/g, glossaryPrompt);
}

// Show the raw prompt template in the modal
document.addEventListener('DOMContentLoaded', () => {
    const configureBtn = document.getElementById('configureBtn');
    const promptContent = document.getElementById('promptContent');
    if (configureBtn && promptContent) {
        configureBtn.addEventListener('click', () => {
            promptContent.textContent = PROMPT_TEMPLATE;
        });
    }
});

// Update the translateText function to use the new prompt generation
async function translateText(text, targetLang, key) {
    try {
        // Ensure glossary is loaded
        if (!window.glossaryLoaded) {
            const loaded = await loadGlossary();
            if (!loaded) {
                throw new Error('Failed to load glossary');
            }
        }

        // Ensure OpenAI client is initialized
        if (!openaiClient) {
            initializeOpenAIClient();
        }
        
        const prompt = generateTranslationPrompt(text, targetLang, key);
        
        // Update the prompt display if the modal is open
        const promptContent = document.getElementById('promptContent');
        if (promptContent) {
            promptContent.textContent = prompt;
        }
        
        const completion = await openaiClient.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: prompt
                }
            ],
            model: "gpt-4o",
            temperature: 0.2,
        });

        let translatedText = completion.choices[0].message.content.trim();
        translatedText = translatedText.replace(/^The text to translate is:\s*/i, '');
        return translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        throw new Error(`Translation failed: ${error.message}`);
    }
}

// Add this to your global variables
const SUPPORTED_LANGUAGES = {
    'en-GB': 'eng',  // English
    'de-DE': 'deu',  // German
    'nl-NL': 'nld',  // Dutch
    'fr-FR': 'fra',  // French
    'es-ES': 'spa',  // Spanish
    'it-IT': 'ita',  // Italian
    'ro-RO': 'ron',  // Romanian
    'cs-CZ': 'ces',  // Czech
    'bg-BG': 'bul',  // Bulgarian
    'el-GR': 'ell',  // Greek
    'hu-HU': 'hun',  // Hungarian
    'zh-CN': 'cmn',   // Chinese
    'pl-PL': 'pol',   // Polish
    'pt-PT': 'por'    // Portuguese
};

// Add language detection function
function detectLanguage(text) {
    // Wait for franc to be available
    if (typeof window.franc === 'undefined') {
        console.error('Franc not loaded yet');
        return null;
    }
    
    if (!text || text.trim().length < 10) {
        console.log('Text too short for detection:', text);
        return null;
    }
    
    try {
        const detectedLang = window.franc(text, {
            only: Object.values(SUPPORTED_LANGUAGES),
            minLength: 1
        });
        
        // Simpler debug output without franc.all
        console.log('Language Detection Debug:', {
            text: text,
            detectedCode: detectedLang,
            textLength: text.length,
            supportedLanguages: Object.values(SUPPORTED_LANGUAGES)
        });
        
        const detectedLocale = Object.keys(SUPPORTED_LANGUAGES).find(
            locale => SUPPORTED_LANGUAGES[locale] === detectedLang
        );
        
        console.log('Detected locale:', detectedLocale);
        return detectedLocale;
    } catch (error) {
        console.error('Language detection error:', error);
        return null;
    }
}

// Update the translation process to skip already translated entries
function shouldTranslateEntry(sourceText, existingTranslation, targetLang) {
    // If no existing translation, always translate
    if (!existingTranslation) return true;
    
    // If it's an array, we'll translate it
    if (Array.isArray(existingTranslation)) return true;
    
    // For strings, detect language
    const detectedLang = detectLanguage(existingTranslation);
    
    // If we can't detect the language (too short/ambiguous) or 
    // if detected language doesn't match target language, translate it
    if (!detectedLang || detectedLang !== targetLang) return true;
    
    // If ignore translated is checked and text is in target language, skip it
    return !document.getElementById('ignoreTranslated').checked;
}

// Update the filter for empty entries
function filterEmptyEntries(entries) {
    return Object.entries(entries).filter(([_, value]) => {
        if (Array.isArray(value)) {
            return value.length > 0;
        }
        if (typeof value === 'string') {
            return value.trim() !== '';
        }
        return !!value;
    });
}

// Project management
const projectModal = document.getElementById('projectModal');
const projectForm = document.getElementById('projectForm');
const projectSelect = document.getElementById('projectSelect');
const addProjectBtn = document.getElementById('addProjectBtn');

// Load projects on page load
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        
        // Clear existing options except the placeholder
        projectSelect.innerHTML = '<option value="">Select a project...</option>';
        
        // Add projects to select
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.readOnlyKey;
            option.textContent = project.name;
            projectSelect.appendChild(option);
        });

        // Select last used project if any
        const lastProject = localStorage.getItem('lastProject');
        if (lastProject) {
            projectSelect.value = lastProject;
            if (projectSelect.value) { // If project exists
                loadProject(projectSelect.value);
            }
        }
    } catch (error) {
        showStatus('Error loading projects: ' + error.message, 'error');
    }
}

// Show modal to add new project
addProjectBtn.addEventListener('click', () => {
    console.log('Add Project button clicked');
    projectModal.classList.add('show');
    projectForm.reset();
});

// Add this to your existing JavaScript section
const closeProjectModalBtn = projectModal.querySelector('.close-modal');

// Close modal when clicking the X button
closeProjectModalBtn.addEventListener('click', () => {
    projectModal.classList.remove('show');
});

// Optional: Close modal when clicking outside
projectModal.addEventListener('click', (e) => {
    if (e.target === projectModal) {
        projectModal.classList.remove('show');
    }
});

// Handle project form submission
projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const projectData = {
        name: document.getElementById('projectName').value,
        readOnlyKey: document.getElementById('readOnlyKey').value
    };
    console.log('DEBUG: Sending projectData:', projectData);

    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
        });

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }

        // Reload projects and close modal
        await loadProjects();
        projectModal.classList.remove('show');
        projectForm.reset();
        
        // Select the new project
        projectSelect.value = projectData.readOnlyKey;
        loadProject(projectData.readOnlyKey);
        
        showStatus('Project added successfully', 'success');
    } catch (error) {
        showStatus('Error adding project: ' + error.message, 'error');
    }
});

// Handle project selection
projectSelect.addEventListener('change', (e) => {
    const apiKey = e.target.value;
    if (apiKey) {
        localStorage.setItem('lastProject', apiKey);
        loadProject(apiKey);
    }
});

// Load projects on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadProjects();
        
        // Only try to load a project if one is selected
        const selectedProject = projectSelect.value;
        if (selectedProject) {
            await loadProject(selectedProject);
        }
    } catch (error) {
        console.error('Error during initial load:', error);
        showStatus('Error loading projects: ' + error.message, 'error');
    }
});

// Add loadProject function
async function loadProject(readOnlyKey) {
    try {
        // Get the project details
        const response = await fetch('/api/projects');
        if (!response.ok) {
            throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        console.log('Received projects data:', data); // Debug log

        // Handle both possible response formats
        const projects = data.projects || data;
        
        if (!projects || !Array.isArray(projects)) {
            console.error('Invalid projects data structure:', projects);
            throw new Error('Invalid projects data structure');
        }

        const project = projects.find(p => p.readOnlyKey === readOnlyKey);
        
        if (!project) {
            throw new Error('Project not found');
        }

        // Update the API key input field
        document.getElementById('locoApiKey').value = project.readOnlyKey;
        
        // Ensure a target language is selected
        const targetLangSelected = document.querySelector('#targetLangGrid .lang-button[data-selected="true"]');
        if (!targetLangSelected) {
            const firstTargetBtn = document.querySelector('#targetLangGrid .lang-button');
            if (firstTargetBtn) {
                document.querySelectorAll('#targetLangGrid .lang-button').forEach(btn => btn.dataset.selected = 'false');
                firstTargetBtn.dataset.selected = 'true';
            }
        }
        
        // Show success message
        showStatus(`Project "${project.name}" loaded successfully`, 'success');
        
        // Enable the start button if we have all required fields
        const startBtn = document.getElementById('startBtn');
        const openaiApiKey = localStorage.getItem('openaiApiKey');
        const targetLang = getSelectedLanguage('targetLangGrid');
        const sourceLang = getSelectedLanguage('sourceLangGrid');
        
        startBtn.disabled = !(openaiApiKey && targetLang && sourceLang);
        
    } catch (error) {
        console.error('Error loading project:', error);
        showStatus('Error loading project: ' + error.message, 'error');
    }
}

// Update project selection handler
projectSelect.addEventListener('change', async (e) => {
    const readOnlyKey = e.target.value;
    if (readOnlyKey) {
        await loadProject(readOnlyKey);
    } else {
        // Clear the API key field if no project is selected
        document.getElementById('locoApiKey').value = '';
        showStatus('No project selected', 'info');
    }
});

// Add readProjects and writeProjects functions
async function readProjects() {
    try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
            throw new Error('Failed to fetch projects');
        }
        return await response.json();
    } catch (error) {
        console.error('Error reading projects:', error);
        throw error;
    }
}

async function writeProjects(projects) {
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projects)
        });
        if (!response.ok) {
            throw new Error('Failed to save projects');
        }
    } catch (error) {
        console.error('Error writing projects:', error);
        throw error;
    }
}

// Add download all button handler - keeping language codes
const downloadAllBtn = document.getElementById('downloadAllBtn');
downloadAllBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    if (downloadAllBtn.dataset.downloading === 'true') return;
    downloadAllBtn.dataset.downloading = 'true';
    
    try {
        showStatus('Preparing all translations for download...', 'info');
        
        // Get all translations from global storage
        const allTranslations = globalTranslations.getAllTranslations();
        
        // Create export data with language code structure preserved
        const exportData = {};
        Object.entries(allTranslations).forEach(([lang, translations]) => {
            // Unflatten the translations for this language
            exportData[lang] = unflattenObject(translations);
        });

        console.log('Final export data for all languages:', exportData);
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translations_all_languages_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatus('All translations downloaded successfully!', 'success');
    } catch (error) {
        console.error('Error downloading translations:', error);
        showStatus('Error downloading translations: ' + error.message, 'error');
    } finally {
        downloadAllBtn.dataset.downloading = 'false';
    }
});

// Add event listeners for logo and title refresh
document.querySelector('.logo-img').addEventListener('click', () => {
    window.location.reload();
});

document.querySelector('.logo-text').addEventListener('click', () => {
    window.location.reload();
});

// Add helper function to flatten nested objects
function flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, key) => {
        const pre = prefix.length ? prefix + '.' : '';
        const baseKey = pre + key;
        
        if (Array.isArray(obj[key])) {
            // Handle arrays: first item uses base key, subsequent use index
            obj[key].forEach((item, index) => {
                const currentKey = index === 0 ? baseKey : `${baseKey}.${index}`;
                acc[currentKey] = item;
            });
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            Object.assign(acc, flattenObject(obj[key], baseKey));
        } else {
            acc[baseKey] = obj[key];
        }
        return acc;
    }, {});
}

// Helper function to check if a key represents an array item
function isArrayKey(key) {
    return key.match(/\.\d+$/);
}

// Helper function to get base key without array index
function getBaseKey(key) {
    return key.replace(/\.\d+$/, '');
}

// Helper function to handle our special array format
function unflattenObject(obj) {
    const result = {};
    const arrayKeys = new Set();
    
    // First pass: identify all array keys
    Object.keys(obj).forEach(key => {
        if (isArrayKey(key)) {
            arrayKeys.add(getBaseKey(key));
        }
    });
    
    // Second pass: build the object
    Object.entries(obj).forEach(([key, value]) => {
        const keys = key.split('.');
        let current = result;
        
        for (let i = 0; i < keys.length; i++) {
            const currentKey = keys[i];
            const nextKey = keys[i + 1];
            const fullKeyUpToHere = keys.slice(0, i + 1).join('.');
            
            // Check if this is part of an array
            if (arrayKeys.has(fullKeyUpToHere) || arrayKeys.has(getBaseKey(fullKeyUpToHere))) {
                // Initialize array if needed
                if (!current[currentKey]) {
                    current[currentKey] = [];
                }
                
                if (isArrayKey(fullKeyUpToHere)) {
                    // This is an indexed item
                    const index = parseInt(keys[i].match(/\d+$/)[0]);
                    // Ensure array has enough space
                    while (current.length <= index) {
                        current.push("");
                    }
                    current[index] = value;
                    break;
                } else if (i === keys.length - 1) {
                    // This is the base array item (index 0)
                    current[currentKey][0] = value;
                    break;
                }
                
                current = current[currentKey];
            } else if (i === keys.length - 1) {
                // Regular property
                current[currentKey] = value;
            } else {
                current[currentKey] = current[currentKey] || {};
                current = current[currentKey];
            }
        }
    });
    
    return result;
}

// ... rest of your existing code ...

// Load projects on page load
document.addEventListener('DOMContentLoaded', loadProjects);

// Add prompt display controls
document.addEventListener('DOMContentLoaded', () => {
    const togglePromptBtn = document.getElementById('togglePrompt');
    const copyPromptBtn = document.getElementById('copyPrompt');
    const promptDisplay = document.getElementById('promptDisplay');
    
    togglePromptBtn.addEventListener('click', () => {
        const isVisible = promptDisplay.style.display !== 'none';
        promptDisplay.style.display = isVisible ? 'none' : 'block';
        togglePromptBtn.querySelector('.material-icons').textContent = 
            isVisible ? 'visibility' : 'visibility_off';
    });
    
    copyPromptBtn.addEventListener('click', () => {
        const promptContent = document.getElementById('promptContent');
        navigator.clipboard.writeText(promptContent.textContent)
            .then(() => {
                showStatus('Prompt copied to clipboard', 'success');
            })
            .catch(err => {
                console.error('Failed to copy prompt:', err);
                showStatus('Failed to copy prompt', 'error');
            });
    });
}); 