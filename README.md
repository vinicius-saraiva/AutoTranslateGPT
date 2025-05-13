# INDY Translate

A powerful translation GUI tool that helps you translate content using OpenAI's GPT models. This tool is designed to make translation work more efficient and enjoyable, with features like batch translation, manual translation mode, and project management.

## 🌟 Features

- **Multi-language Support**: Translate between 15+ languages including English, German, French, Spanish, Italian, and more
- **Batch Translation**: Process multiple entries at once with customizable batch sizes
- **Manual Translation Mode**: Translate entries one by one with full control
- **Project Management**: Save and manage different translation projects
- **Glossary Support**: Maintain consistent terminology across translations
- **Fun Facts**: Learn interesting facts about languages while you work
- **Local Storage**: Saves your API keys and preferences for convenience
- **Modern UI**: Clean and intuitive interface with language flags and progress tracking

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (Latest LTS version recommended)
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- OpenAI API key
- (Optional) Localise API key for project management

### Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd [repository-name]
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   # or
   node server.js
   ```

4. Open your browser and navigate to `http://localhost:3000`

## 🎯 First-time Setup

1. Click the settings icon (⚙️) in the top-right corner
2. Enter your OpenAI API key
3. (Optional) Enter your Localise API key if you plan to use project management
4. Select your source and target languages
5. Configure your preferred batch size and other settings

## 💡 Usage Guide

### Basic Translation

1. **Select Languages**
   - Choose your source language (default: English)
   - Select your target language
   - You can change languages at any time

2. **Batch Translation**
   - Set your preferred batch size
   - Click "Start Translation" to begin
   - Monitor progress in the status bar
   - Review and edit translations as needed

3. **Manual Translation**
   - Click the "Manual Mode" button (translate icon)
   - Navigate through entries using arrow keys or buttons
   - Edit translations directly
   - Save changes automatically

### Project Management

1. **Create a Project**
   - Click the "+" button next to the project dropdown
   - Enter project name and API key
   - Save project settings

2. **Load a Project**
   - Select project from dropdown
   - Project settings and translations will load automatically

### Using the Glossary

1. Click the "Glossary" button (book icon)
2. View and search glossary entries
3. Glossary terms are automatically highlighted in translations

## ⚙️ Configuration Options

- **Translate All**: Translate to all target languages simultaneously
- **Batch Size**: Control how many entries are processed at once
- **Ignore Blank Source**: Skip empty source entries
- **Ignore Translated**: Skip already translated entries
- **Only Empty**: Only translate empty target entries

## 🔧 Troubleshooting

### Common Issues

1. **API Key Issues**
   - Ensure your OpenAI API key is valid
   - Check if you have sufficient credits
   - Verify API key is properly saved in settings

2. **Translation Errors**
   - Check your internet connection
   - Verify source text is valid
   - Try reducing batch size if errors persist

3. **Project Loading Issues**
   - Verify Localise API key is correct
   - Check project name exists
   - Ensure proper permissions for API key

4. **Browser Issues**
   - Clear browser cache
   - Try a different browser
   - Ensure JavaScript is enabled

## 🌐 Adding New Languages

To add a new language to the application, you need to update several files:

1. **Update Language Data Structures** in `script.js`:
   ```javascript
   // Add to supportedLanguages array
   window.supportedLanguages = [
       // ... existing languages ...
       'new-LANG'  // e.g., 'ja-JP' for Japanese
   ];

   // Add to SUPPORTED_LANGUAGES object
   const SUPPORTED_LANGUAGES = {
       // ... existing languages ...
       'new-LANG': 'lang',  // e.g., 'ja-JP': 'jpn'
   };
   ```

2. **Add Language Buttons** in `index.html`:
   ```html
   <button type="button" class="lang-button" data-lang="new-LANG" title="Language Name">
       <img src="https://flagcdn.com/w20/COUNTRY.png" alt="Language Name">
   </button>
   ```
   Add this button to:
   - Source language grid (`#sourceLangGrid`)
   - Target language grid (`#targetLangGrid`)
   - Manual mode source grid (`#manualSourceLangGrid`)
   - Manual mode target grid (`#manualTargetLangGrid`)

3. **Update Glossary Support** in `glossary.json`:
   ```json
   {
       "term": {
           // ... existing languages ...
           "new-LANG": "translation"
       }
   }
   ```

   Also update the glossary export functionality in `script.js`:
   ```javascript
   // Update the langMapping object in the getGlossaryPrompt function
   const langMapping = {
       // ... existing languages ...
       'new-LANG': 'new-LANG'  // e.g., 'ja-JP': 'ja-JP'
   };
   ```

   This ensures that:
   - New languages are properly included in glossary exports
   - Glossary terms are correctly mapped during translation
   - Language codes are consistent across the application

4. **Language Code Format**:
   - Use ISO 639-1 language code + ISO 3166-1 country code
   - Example: 'ja-JP' for Japanese (Japan)
   - Example: 'fr-FR' for French (France)

5. **Flag Images**:
   - Use flagcdn.com for flag images
   - Format: `https://flagcdn.com/w20/COUNTRY.png`
   - Example: `https://flagcdn.com/w20/jp.png` for Japanese flag

6. **Testing**:
   - Test language selection in both automatic and manual modes
   - Verify language detection works with new language
   - Test glossary functionality with new language
   - Check RTL support if adding RTL languages (e.g., Arabic)

Note: When adding RTL languages (like Arabic), additional CSS modifications may be required for proper text direction support.

## 📝 Notes

- All API keys are stored locally in your browser
- Translations are processed in batches to manage API usage
- Progress is automatically saved
- You can export translations at any time

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

[Your License Here]