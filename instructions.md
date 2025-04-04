# API Setup

Consider a user who is using the web app for the first time.

The user should perform the following steps:

## OpenAI API Key Configuration
1. Click on "openaiApiKey" button.
2. Popup opens up and user enters the api key.
3. User saves configuration and api key is saved in the local storage.

## Localise API Key Configuration and Project loading
4. User enters "Localise API Key"
5. User clicks on "Load Project" button and the project is loaded: The number of total entries is displayed.

### Project management implementation
#### Initial Setup
1. Create projects.json file structure:
'''
json
{
"projects": [
{
"name": "Project Name",
"readOnlyKey": "loco-read-only-key",
"writeKey": "loco-write-key",
"lastUsed": "2024-02-20T10:00:00Z"
}
]
}
'''

2. Add to .gitignore: projects.json


#### Server-side Implementation (server.js)
1. Add new endpoints:
   - GET `/api/projects` - Returns list of projects (names and read keys)
   - POST `/api/projects` - Adds new project
   - PUT `/api/projects/:name` - Updates project
   - DELETE `/api/projects/:name` - Removes project

2. Add file operations:
   - Check if projects.json exists on startup
   - Create it with empty projects array if missing
   - Read/Write functions for projects.json

#### UI Implementation (index.html)
1. Replace API key input with:
   - Project dropdown
   - "+" button to add new project
   - Project management modal

2. Add project management modal with:
   - Project Name input
   - Read-only API Key input
   - Write API Key input
   - Save/Cancel buttons

3. Update header controls:
'''
html
<div class="header-controls">
<div class="project-selector">
<select id="projectSelect">
<option value="">Select a project...</option>
</select>
<button class="icon-button" title="Add Project">
<span class="material-icons">add</span>
</button>
</div>
</div>
'''

#### User Flow
1. First Time Setup:
   - If no projects.json exists:
     - Show "Add Project" modal automatically
     - Guide user to enter first project

2. Normal Operation:
   - Load project list on page load
   - Populate dropdown with project names
   - Store selected project in localStorage
   - Auto-select last used project on load

3. Adding New Project:
   - Click "+" button
   - Fill project details
   - Save to projects.json
   - Update dropdown
   - Select new project

4. Project Selection:
   - Choose project from dropdown
   - Automatically use read-only key
   - Store selection in localStorage
   - Load project data

## Security Considerations
1. File Security:
   - Never commit projects.json
   - Provide projects.example.json
   - Document setup in README.md

2. Data Handling:
   - Store only on local machine
   - No external transmission of keys
   - Clear documentation of security practices

#### Error Handling
1. File Operations:
   - Handle missing projects.json
   - Validate file structure
   - Handle read/write errors

2. User Input:
   - Validate API keys format
   - Prevent duplicate project names
   - Show clear error messages

## Testing Steps
1. File Operations:
   - Create/read/update/delete projects
   - Handle invalid file data
   - Test file permissions

2. UI Operations:
   - Add/select/remove projects
   - Validate form inputs
   - Test error scenarios

This implementation maintains the local-first approach while providing a secure and user-friendly way to manage multiple Loco projects.

# User Journey for single target language translation

## Source Language Selection and Translation Options
6. User selects source language. By default, the source language selected is "English". Save the last selection in local storage. If a language is not available in the .json file as a source language, gray out the button and do not allow the user to select it.
7. User checks or unchecks the "ignore blank source entries" checkbox. If checked, the web app will not load the entries that are blank in the source language.


## Target Language Selection and Translation Options
8. User selects the target language. By default, the target language selected is "French". Save the last selection in local storage. If a target language is not available in the .json file downloaded, the user should still be able to select it since the web app will generate a new .json file with the target language.
9. User checks or unchecks the "ignore entries already translated in target language" checkbox. If checked, the web app will use franc to detect the language of the entries and ignore the ones that are already translated in the target language. Otherwise, the web app will translate all the entries.
10. User checks or unchecks the "only translate empty entries" checkbox. If checked, the web app will only translate the entries that are empty in the target language. Otherwise, the web app will translate all the entries.

## Batch Size and Translation Start
11. User defines the batch size. By default, the batch size is 10. Save the last selection in local storage.
12. User clicks on "Start Translation" button. The first batch is translated by calling OpenAI api. The translations are displayed in the table, and the progress bar is updated.
13. User clicks on "Next Batch" button. The next batch is translated by calling OpenAI api. The translations are displayed in the table, and the progress bar is updated.

## Translation Completion and Save
14. The user can click on "Save Translations" button and a .json file with the translation is downloaded.

# User journey for bulk target language translation
1. User selects source language.
2. User selects target language (which is the one he will first visualize in the table below) and checks the checkbox "translate to all target languages at once."
3. User clicks on "Start Translation" and we display in the table the entries and their translations in source and the currently selected target language.
4. User can click on the arrow and switch through different target languages.
5. When user clicks on "Next Batch", you start translating in all languages, entry by entry. The translation should start with the language that is currently selected (and displayed) to the client. The translations are displayed in the table and the progress bar is updated per language. I can switch between target languages and the translations that have already been done persist in the table.
6. Whenever the user whishes, he can click on "Save Translations" and a .json file with the translations in all languages is downloaded.