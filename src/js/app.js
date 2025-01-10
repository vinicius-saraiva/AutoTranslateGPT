// Initialize all global variables
let currentData = {
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

let openaiClient = null;

// Define all necessary functions
function savePreferences() {
    const preferences = {
        sourceLang: getSelectedLanguage('sourceLangGrid'),
        targetLang: getSelectedLanguage('targetLangGrid'),
        batchSize: document.getElementById('batchSize').value,
        ignoreBlank: document.getElementById('ignoreBlank').checked,
        ignoreTranslated: document.getElementById('ignoreTranslated').checked,
        onlyEmpty: document.getElementById('onlyEmpty').checked,
        locoApiKey: document.getElementById('locoApiKey').value
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
        document.getElementById('ignoreBlank').checked = savedPreferences.ignoreBlank !== false;
        
        updateTableHeaders();
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
}

// Define all necessary functions
const supportedLanguages = [
    'en-GB', 'de-DE', 'nl-NL', 'fr-FR', 'es-ES', 
    'it-IT', 'ro-RO', 'cs-CZ', 'bg-BG', 'el-GR', 
    'hu-HU', 'zh-CN'
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
    debugTranslationData(newLang);
    
    console.log('DEBUG - Switching to language:', newLang);
    console.log('DEBUG - Window translation data:', window.translationData);
    console.log('DEBUG - Current language data:', window.translationData?.[newLang]);
    
    // Update the target language selection in the grid
    document.querySelectorAll('#targetLangGrid .lang-button').forEach(btn => {
        btn.dataset.selected = btn.dataset.lang === newLang ? 'true' : 'false';
    });
    
    // Update currentData target language
    currentData.targetLang = newLang;
    
    // IMPORTANT: Get original translations from the correct source
    let originalTranslations = {};
    
    if (window.translationData && window.translationData[newLang]) {
        // Ensure we're getting the correct structure
        if (typeof window.translationData[newLang] === 'object') {
            originalTranslations = flattenObject(window.translationData[newLang]);
        }
    }
    
    console.log('DEBUG - Original translations after flattening:', originalTranslations);
    
    // Get checkbox states
    const ignoreTranslated = document.getElementById('ignoreTranslated').checked;
    const onlyEmpty = document.getElementById('onlyEmpty').checked;
    
    // Reset progress if needed
    if (!currentData.translationResults?.[newLang]) {
        currentData.processedKeys = new Set();
        currentData.currentBatchProgress = 0;
        updateProgressBar(0);
    }
    
    // Update table headers
    updateTableHeaders();
    
    let needsTranslationCount = 0;
    let totalEntries = 0;
    
    // Update table content
    const translationTable = document.getElementById('translationTable');
    const rows = Array.from(translationTable.getElementsByTagName('tr'));
    
    rows.forEach((row, index) => {
        if (!row.id) return; // Skip header row
        
        const key = row.id.replace('row-', '');
        totalEntries++;
        
        // Get all cells in the row
        const cells = row.getElementsByTagName('td');
        
        // Update original translation column (third column)
        if (cells.length >= 3) {
            const originalCell = cells[2];
            const originalTranslation = originalTranslations[key] || '';
            console.log(`DEBUG - Setting original translation for ${key}:`, originalTranslation);
            originalCell.textContent = originalTranslation;
        }
        
        // Update new translation column (fourth column)
        const translationCell = document.getElementById(`translation-${key}`);
        if (translationCell) {
            const newTranslation = currentData.translationResults?.[newLang]?.[key] || '';
            translationCell.textContent = newTranslation;
            
            // Determine row styling
            const hasOriginalTranslation = !!originalTranslations[key];
            const isEmpty = !hasOriginalTranslation && !newTranslation;
            
            if ((hasOriginalTranslation && ignoreTranslated) || (!isEmpty && onlyEmpty)) {
                row.style.backgroundColor = '#f5f5f5';
                row.style.color = '#999';
            } else {
                row.style.backgroundColor = '';
                row.style.color = '';
                needsTranslationCount++;
            }
        }
    });
    
    // Update counts and UI
    currentData.totalEntries = needsTranslationCount;
    
    // Update Next Batch button state
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.disabled = needsTranslationCount === 0;
    }
    
    // Update statistics
    updateStatistics(needsTranslationCount, totalEntries);
    
    // Save preferences
    savePreferences();
}

// Helper function to update progress bar
function updateProgressBar(percentage) {
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    if (progressFill && progressPercentage) {
        progressFill.style.width = `${percentage}%`;
        progressPercentage.textContent = `${Math.round(percentage)}%`;
    }
}

// Helper function to update statistics
function updateStatistics(needsTranslation, total) {
    const statsDisplay = document.getElementById('statsDisplay');
    if (statsDisplay) {
        statsDisplay.textContent = `Entries to translate: ${needsTranslation} / Total entries: ${total}`;
    }
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
            const locoApiKey = document.getElementById('locoApiKey').value;
            const openaiApiKey = localStorage.getItem('openaiApiKey');
            const targetLang = getSelectedLanguage('targetLangGrid');
            const sourceLang = getSelectedLanguage('sourceLangGrid');
            const batchSize = parseInt(document.getElementById('batchSize').value);
            const ignoreBlank = document.getElementById('ignoreBlank').checked;
            const ignoreTranslated = document.getElementById('ignoreTranslated').checked;
            const onlyEmpty = document.getElementById('onlyEmpty').checked;

            if (!locoApiKey || !openaiApiKey || !targetLang || !sourceLang) {
                showStatus('Please fill in all required fields and select both languages', 'error');
                return;
            }

            showStatus('Loading project data...', 'info');

            // Load translations
            const response = await fetch(`/api/translations?key=${encodeURIComponent(locoApiKey)}`);
            if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);
            
            const data = await response.json();
            
            // Prepare data
            let sourceData = flattenObject(data[sourceLang] || {});
            if (ignoreBlank) {
                sourceData = Object.fromEntries(
                    Object.entries(sourceData).filter(([_, value]) => 
                        value && typeof value === 'string' && value.trim() !== ''
                    )
                );
            }

            // Get original translations
            const originalTranslations = flattenObject(data[targetLang] || {});

            // Filter out already translated entries if needed
            let entriesToTranslate = { ...sourceData };
            let skippedCount = 0;

            entriesToTranslate = Object.fromEntries(
                Object.entries(sourceData).filter(([key, sourceText]) => {
                    const existingTranslation = originalTranslations[key];
                    
                    // Skip if entry has translation and we only want empty entries
                    if (onlyEmpty && existingTranslation && existingTranslation.trim() !== '') {
                        skippedCount++;
                        return false;
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
    document.getElementById('locoApiKey').addEventListener('change', savePreferences);
    document.getElementById('openaiApiKey').addEventListener('change', savePreferences);
    document.getElementById('batchSize').addEventListener('change', savePreferences);
    document.getElementById('ignoreBlank').addEventListener('change', savePreferences);

    // Add Next button handler
    const nextBtn = document.getElementById('nextBtn');
    nextBtn.addEventListener('click', () => {
        processBatch();
    });

    // Add Save button handler
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.addEventListener('click', async () => {
        try {
            showStatus('Preparing translations for download...', 'info');
            
            // Create an object with translations and unflatten it
            const exportData = {
                [currentData.targetLang]: unflattenObject(currentData.translations)
            };

            // Create a Blob with the JSON data
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            
            // Create a download link
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = `translations_${currentData.targetLang}_${new Date().toISOString().split('T')[0]}.json`;
            
            // Trigger the download
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            showStatus('Translations downloaded successfully!', 'success');

        } catch (error) {
            console.error('Error preparing download:', error);
            showStatus('Error preparing download: ' + error.message, 'error');
        }
    });

    const modal = document.getElementById('apiModal');
    const configureBtn = document.getElementById('configureBtn');
    const closeBtn = document.querySelector('.close-modal');
    const saveApiKeysBtn = document.getElementById('saveApiKeys');

    // Add this function to handle API key display
    function formatApiKeyDisplay(apiKey) {
        if (!apiKey) return '';
        if (apiKey.length < 7) return apiKey; // If key is too short, show as is
        return `${apiKey.slice(0, 3)}...${apiKey.slice(-4)}`;
    }

    // Update the modal open handler to show masked key
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

    // Add input handler to manage key display/edit
    document.getElementById('openaiApiKey').addEventListener('focus', function() {
        const fullKey = this.getAttribute('data-full-key');
        if (fullKey) {
            this.value = fullKey;
        }
    });

    document.getElementById('openaiApiKey').addEventListener('blur', function() {
        if (this.value.length > 0) {
            this.setAttribute('data-full-key', this.value);
            this.value = formatApiKeyDisplay(this.value);
        }
    });

    // Update save handler to use full key
    saveApiKeysBtn.addEventListener('click', () => {
        const openaiInput = document.getElementById('openaiApiKey');
        const openaiKey = openaiInput.getAttribute('data-full-key') || openaiInput.value;
        
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

            if (!locoApiKey) {
                showStatus('Please enter your Localise API key', 'error');
                return;
            }

            // Show loading status
            showStatus('Loading project data...', 'info');

            // Use GET request with query parameter as defined in server.js
            const response = await fetch(`/api/translations?key=${encodeURIComponent(locoApiKey)}`);

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Received data:', data);

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
        'hu-HU', 'zh-CN'
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
async function translateText(text, targetLang) {
    try {
        const completion = await openaiClient.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a translator for an FX web platform. Translate to ${targetLang}, keeping HTML tags, placeholders, and special characters intact. Respond with only the translation.`
                },
                {
                    role: "user",
                    content: text
                }
            ],
            model: "gpt-3.5-turbo",
        });

        return completion.choices[0].message.content.trim();
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
    'zh-CN': 'cmn'   // Chinese
};

// Add language detection function
function detectLanguage(text) {
    // Wait for franc to be available
    if (typeof window.franc === 'undefined') {
        console.error('Franc not loaded yet');
        return null;
    }
    
    if (!text || text.trim().length < 10) return null;
    
    try {
        const detectedLang = window.franc(text, {
            only: Object.values(SUPPORTED_LANGUAGES),
            minLength: 1
        });
        console.log('Detected language:', detectedLang);
        
        return Object.keys(SUPPORTED_LANGUAGES).find(
            locale => SUPPORTED_LANGUAGES[locale] === detectedLang
        );
    } catch (error) {
        console.error('Language detection error:', error);
        return null;
    }
}

// Update the translation process to skip already translated entries
function shouldTranslateEntry(sourceText, existingTranslation, targetLang) {
    // If no existing translation, always translate
    if (!existingTranslation) return true;
    
    // Detect language of existing translation
    const detectedLang = detectLanguage(existingTranslation);
    
    // If we can't detect the language (too short/ambiguous) or 
    // if detected language doesn't match target language, translate it
    if (!detectedLang || detectedLang !== targetLang) return true;
    
    // If ignore translated is checked and text is in target language, skip it
    return !document.getElementById('ignoreTranslated').checked;
}

// Update processBatch function
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
            // Initialize storage for all languages
            if (!currentData.translationResults) {
                currentData.translationResults = {};
            }

            // Get all target languages except source
            const targetLanguages = supportedLanguages.filter(lang => 
                lang !== currentData.sourceLang && 
                document.querySelector(`#targetLangGrid .lang-button[data-lang="${lang}"]`)
            );

            // Initialize storage for each language
            targetLanguages.forEach(lang => {
                if (!currentData.translationResults[lang]) {
                    currentData.translationResults[lang] = {};
                }
            });

            // Process each entry for all languages
            for (const [key, sourceText] of entries) {
                showStatus(`Translating entry ${currentData.processedKeys.size + 1}/${currentData.totalEntries} to all languages...`, 'info');
                
                for (const targetLang of targetLanguages) {
                    try {
                        const translation = await translateText(sourceText, targetLang);
                        
                        // Store in results
                        currentData.translationResults[targetLang][key] = translation;
                        
                        // Update UI if this is the current target language
                        if (targetLang === currentData.targetLang) {
                            const cell = document.getElementById(`translation-${key}`);
                            if (cell) cell.textContent = translation;
                        }
                        
                        // Update progress
                        currentData.processedLanguages.add(targetLang);
                        
                    } catch (error) {
                        console.error(`Error translating to ${targetLang}:`, error);
                        showStatus(`Error translating to ${targetLang}: ${error.message}`, 'error');
                    }
                }
                
                currentData.processedKeys.add(key);
                // Remove processed entry from queue
                currentData.translationQueue = currentData.translationQueue.filter(([k]) => k !== key);
                updateStatistics();
            }
        } else {
            // Single language translation
            if (!currentData.translationResults[currentData.targetLang]) {
                currentData.translationResults[currentData.targetLang] = {};
            }

            for (const [key, sourceText] of entries) {
                showStatus(`Translating entry ${currentData.processedKeys.size + 1}/${currentData.totalEntries}...`, 'info');
                const translation = await translateText(sourceText, currentData.targetLang);
                
                // Store translation
                currentData.translationResults[currentData.targetLang][key] = translation;
                
                // Update UI
                const cell = document.getElementById(`translation-${key}`);
                if (cell) cell.textContent = translation;
                
                currentData.processedKeys.add(key);
                // Remove processed entry from queue
                currentData.translationQueue = currentData.translationQueue.filter(([k]) => k !== key);
                updateStatistics();
            }
        }

        // Update UI state
        const saveBtn = document.getElementById('saveBtn');
        saveBtn.disabled = false;
        nextBtn.disabled = currentData.translationQueue.length === 0;
        
        if (currentData.translationQueue.length === 0) {
            showStatus('All translations completed!', 'success');
        }

        // Update progress bar
        const progress = ((currentData.totalEntries - currentData.translationQueue.length) / currentData.totalEntries) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressPercentage').textContent = `${Math.round(progress)}%`;

    } catch (error) {
        console.error('Batch processing error:', error);
        showStatus('Error processing batch: ' + error.message, 'error');
    } finally {
        nextBtn.classList.remove('loading');
        nextBtn.textContent = 'Next Batch';
    }
}

// Add statistics update function
function updateStatistics() {
    const totalEntries = Object.keys(currentData.englishSource || {}).length;
    const translatedEntries = currentData.processedKeys.size;
    const progressPercentage = totalEntries ? Math.round((translatedEntries / totalEntries) * 100) : 0;

    document.getElementById('totalEntries').textContent = totalEntries;
    document.getElementById('translatedEntries').textContent = translatedEntries;
    document.getElementById('progressPercentage').textContent = `${progressPercentage}%`;
    document.getElementById('progressFill').style.width = `${progressPercentage}%`;
}

// Add helper function to flatten nested objects
function flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, key) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(acc, flattenObject(obj[key], pre + key));
        } else {
            acc[pre + key] = obj[key];
        }
        return acc;
    }, {});
}

// Add helper function to unflatten object for export
function unflattenObject(obj) {
    const result = {};
    
    for (const key in obj) {
        const keys = key.split('.');
        let current = result;
        
        for (let i = 0; i < keys.length - 1; i++) {
            current[keys[i]] = current[keys[i]] || {};
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = obj[key];
    }
    
    return result;
}

function saveTranslations() {
    alert('Save function called!'); // Simple test
    console.log('SAVE TRANSLATIONS STARTED'); // Basic console test
    
    const translateAll = document.getElementById('translateAll').checked;
    console.log('Save translations initiated. Translate all:', translateAll);
    
    try {
        if (translateAll) {
            // Multi-language export logic...
        } else {
            // Single language export
            const currentLang = currentData.targetLang;
            console.log('Current language:', currentLang);
            
            const exportData = {
                [currentLang]: {}
            };
            
            // Debug current state
            console.log('Current Data State:', {
                targetLang: currentData.targetLang,
                translationResults: currentData.translationResults,
                currentData: currentData
            });
            
            // Get table and verify it exists
            const translationTable = document.getElementById('translationTable');
            if (!translationTable) {
                console.error('Translation table not found!');
                return;
            }
            
            const rows = Array.from(translationTable.getElementsByTagName('tr'));
            console.log('Found rows:', rows.length);
            
            // Process each row
            rows.forEach((row, index) => {
                if (!row.id) {
                    console.log(`Row ${index} has no ID, skipping`);
                    return;
                }
                
                const key = row.id.replace('row-', '');
                const translationCell = document.getElementById(`translation-${key}`);
                
                console.log(`Processing row ${index}:`, {
                    key,
                    cellFound: !!translationCell,
                    content: translationCell?.textContent
                });
                
                if (translationCell?.textContent?.trim()) {
                    exportData[currentLang][key] = translationCell.textContent.trim();
                    console.log(`Added translation for ${key}:`, translationCell.textContent.trim());
                }
            });
            
            console.log('Final export data:', exportData);
            
            // Only save if we have data
            if (Object.keys(exportData[currentLang]).length === 0) {
                alert('No translations found to save!');
                console.error('No translations to save');
                return;
            }
            
            // Create and trigger download
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().split('T')[0];
            a.download = `translations_${currentLang}_${timestamp}.json`;
            
            // Log before download
            console.log('Downloading file:', a.download);
            console.log('Content:', JSON.stringify(exportData, null, 2));
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (error) {
        console.error('Error in saveTranslations:', error);
        alert('Error saving translations: ' + error.message);
    }
}

// Add this after your existing code
document.getElementById('saveBtn').addEventListener('click', function(e) {
    console.log('Save button clicked');
    saveTranslations();
});

// Add this after loading the translation data
console.log('Initial translation data loaded:', window.translationData);
console.log('Initial currentData state:', currentData);