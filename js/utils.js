// Utility functions and helpers
import { appState } from './app.js';

// Flatten nested object
export function flattenObject(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null) {
            Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
            acc[pre + k] = obj[k];
        }
        return acc;
    }, {});
}

// Unflatten object
export function unflattenObject(obj) {
    return Object.keys(obj).reduce((acc, k) => {
        const keys = k.split('.');
        let current = acc;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key]) {
                current[key] = {};
            }
            current = current[key];
        }
        current[keys[keys.length - 1]] = obj[k];
        return acc;
    }, {});
}

// Check if value is empty
export function isValueEmpty(value) {
    if (!value) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'string') return value.trim() === '';
    return false;
}

// Get next language in sequence
export function getNextLanguage(currentLang) {
    const supportedLanguages = [
        'en-GB', 'de-DE', 'nl-NL', 'fr-FR', 'es-ES', 
        'it-IT', 'ro-RO', 'cs-CZ', 'bg-BG', 'el-GR', 
        'hu-HU', 'zh-CN', 'pl-PL', 'pt-PT'
    ];
    const currentIndex = supportedLanguages.indexOf(currentLang);
    return supportedLanguages[(currentIndex + 1) % supportedLanguages.length];
}

// Get previous language in sequence
export function getPreviousLanguage(currentLang) {
    const supportedLanguages = [
        'en-GB', 'de-DE', 'nl-NL', 'fr-FR', 'es-ES', 
        'it-IT', 'ro-RO', 'cs-CZ', 'bg-BG', 'el-GR', 
        'hu-HU', 'zh-CN', 'pl-PL', 'pt-PT'
    ];
    const currentIndex = supportedLanguages.indexOf(currentLang);
    return supportedLanguages[(currentIndex - 1 + supportedLanguages.length) % supportedLanguages.length];
}

// Debug translation data
export function debugTranslationData(newLang) {
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
        currentDataState: appState.currentData,
        flattenedTranslations: window.translationData?.[newLang] ? 
            flattenObject(window.translationData[newLang]) : 'No data to flatten'
    });
} 