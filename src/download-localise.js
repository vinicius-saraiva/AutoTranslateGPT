import fs from 'fs/promises';
import readline from 'readline';
import path from 'path';

const LOCALISE_API_URL = 'https://localise.biz/api/export/all.json';

async function promptApiKey() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Please enter your Localise.biz API key: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function downloadTranslations(apiKey) {
  try {
    console.log('Downloading translations from Localise...');
    const response = await fetch(LOCALISE_API_URL, {
      headers: {
        'Authorization': `Loco ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const translations = await response.json();
    
    // Create data directory
    const dataDir = './data';
    await fs.mkdir(dataDir, { recursive: true });
    
    // Save with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `localise_export_${timestamp}.json`;
    const filepath = path.join(dataDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(translations, null, 2));
    
    // Also save as latest.json for easy reference
    const latestPath = path.join(dataDir, 'latest.json');
    await fs.writeFile(latestPath, JSON.stringify(translations, null, 2));

    console.log('\nTranslations saved to:');
    console.log(`- ${filepath}`);
    console.log(`- ${latestPath}`);

    // Print summary
    const languages = Object.keys(translations);
    const sampleLang = languages[0];
    const entryCount = Object.keys(translations[sampleLang]).length;
    
    console.log('\nSummary:');
    console.log(`- Languages: ${languages.join(', ')}`);
    console.log(`- Total entries: ${entryCount}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

async function main() {
  const apiKey = await promptApiKey();
  await downloadTranslations(apiKey);
}

main(); 