// Main application entry point
import { initializeApp } from './app.js';
import { setupEventListeners } from './events.js';
import { initializeUI } from './ui.js';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    initializeUI();
}); 