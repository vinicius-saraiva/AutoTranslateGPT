import fs from 'fs/promises';
import readline from 'readline';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load and verify env
dotenv.config();
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Error: OPENAI_API_KEY not found in environment variables');
  process.exit(1);
}
console.log('API Key loaded:', apiKey.slice(0, 7) + '...' + apiKey.slice(-4));

const openai = new OpenAI({
  apiKey: apiKey
});

const AVAILABLE_LANGUAGES = {
  'fr-FR': 'French',
  'nl-NL': 'Dutch',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'hu-HU': 'Hungarian',
  'cs-CZ': 'Czech',
  'ro-RO': 'Romanian',
  'bg-BG': 'Bulgarian',
  'es-ES': 'Spanish',
  'zh-CN': 'Chinese',
  'el-GR': 'Greek'
};

async function promptTargetLanguages() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\nAvailable target languages:');
  Object.entries(AVAILABLE_LANGUAGES).forEach(([code, name]) => {
    console.log(`${code}: ${name}`);
  });

  const answer = await new Promise(resolve => {
    rl.question('\nEnter target language codes (comma-separated) or "all": ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() === 'all') {
    return Object.keys(AVAILABLE_LANGUAGES);
  }
  return answer.split(',').map(lang => lang.trim());
}

async function promptTestMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\nSelect mode:');
  console.log('1. Small test (3 entries)');
  console.log('2. Medium test (100 entries)');
  console.log('3. Full translation');

  const answer = await new Promise(resolve => {
    rl.question('\nEnter mode (1, 2, or 3): ', resolve);
  });
  rl.close();

  if (answer === '1') return { isTest: true, entryCount: 3 };
  if (answer === '2') return { isTest: true, entryCount: 100 };
  return { isTest: false, entryCount: Infinity };
}

async function translateText(text, targetLang) {
  if (!text || text.trim() === '') return '';

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a professional translator for an FX Platform and Crossborder Payment provider. 
          Translate the text to ${AVAILABLE_LANGUAGES[targetLang]} in a way that's easy for non-technical people to understand.
          Preserve any:
          - variables (like %cobrand%, %%action%%)
          - HTML tags (like <br>, <strong>)
          - HTML attributes
          - URLs`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.7
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Translation error for "${text}":`, error);
    return `[ERROR] ${text}`;
  }
}

async function processTranslations(targetLanguages, testMode) {
  try {
    // Load latest translations with correct path
    const sourceData = JSON.parse(
      await fs.readFile('./src/data/latest.json', 'utf-8')
    );

    // Get English entries
    const englishEntries = sourceData['en-GB'] || sourceData['en'];
    if (!englishEntries) {
      throw new Error('No English source translations found');
    }

    // Filter for non-empty English entries
    const nonEmptyEntries = {};
    for (const [key, value] of Object.entries(englishEntries)) {
      if (typeof value === 'object') {
        // Handle nested structures
        const nonEmptyNested = {};
        for (const [subKey, subValue] of Object.entries(value)) {
          if (subValue && typeof subValue === 'string' && subValue.trim() !== '') {
            nonEmptyNested[subKey] = subValue;
          }
        }
        if (Object.keys(nonEmptyNested).length > 0) {
          nonEmptyEntries[key] = nonEmptyNested;
        }
      } else if (value && typeof value === 'string' && value.trim() !== '') {
        nonEmptyEntries[key] = value;
      }
    }

    // Handle test mode with variable entry count
    let entriesToTranslate = nonEmptyEntries;
    if (testMode.isTest) {
      const sampleEntries = {};
      let count = 0;
      for (const [key, value] of Object.entries(nonEmptyEntries)) {
        if (typeof value === 'string') {  // Only take simple string entries for test
          sampleEntries[key] = value;
          count++;
          if (count >= testMode.entryCount) break;
        }
      }
      console.log(`\nTest mode: Using ${count} sample entries:`, Object.keys(sampleEntries));
      entriesToTranslate = sampleEntries;
    }

    console.log(`\nProcessing ${Object.keys(entriesToTranslate).length} entries`);

    // Prepare output structure with English as source
    const output = {
      'en': entriesToTranslate
    };

    // Calculate total translations needed
    const totalEntries = Object.keys(entriesToTranslate).length;
    const totalLanguages = targetLanguages.length;
    const totalTranslations = totalEntries * totalLanguages;
    let completedTranslations = 0;

    console.log(`\nStarting translations:`);
    console.log(`- Total entries: ${totalEntries}`);
    console.log(`- Target languages: ${totalLanguages}`);
    console.log(`- Total translations needed: ${totalTranslations}\n`);

    // Translate to target languages
    for (const lang of targetLanguages) {
      console.log(`\nTranslating to ${AVAILABLE_LANGUAGES[lang]}...`);
      output[lang] = {};
      let langProgress = 0;

      for (const [key, value] of Object.entries(entriesToTranslate)) {
        if (typeof value === 'object') {
          output[lang][key] = {};
          for (const [subKey, subValue] of Object.entries(value)) {
            output[lang][key][subKey] = await translateText(subValue, lang);
            completedTranslations++;
            langProgress++;
            const totalProgress = ((completedTranslations / totalTranslations) * 100).toFixed(1);
            const langProgressPercent = ((langProgress / totalEntries) * 100).toFixed(1);
            process.stdout.write(`\r${AVAILABLE_LANGUAGES[lang]}: ${langProgress}/${totalEntries} (${langProgressPercent}%) - Total Progress: ${totalProgress}%`);
          }
        } else {
          output[lang][key] = await translateText(value, lang);
          completedTranslations++;
          langProgress++;
          const totalProgress = ((completedTranslations / totalTranslations) * 100).toFixed(1);
          const langProgressPercent = ((langProgress / totalEntries) * 100).toFixed(1);
          process.stdout.write(`\r${AVAILABLE_LANGUAGES[lang]}: ${langProgress}/${totalEntries} (${langProgressPercent}%) - Total Progress: ${totalProgress}%`);
        }
      }
      console.log(); // New line after each language is complete
    }

    // Save translations with mode indicator and timestamp in filename
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')  // Replace colons and dots with hyphens
      .replace('T', '_')      // Replace T with underscore
      .slice(0, -1);          // Remove the trailing Z
      
    const outputDir = './translations';
    await fs.mkdir(outputDir, { recursive: true });

    const modeIndicator = testMode.isTest ? 'test' : 'full';
    const filename = `translations_${modeIndicator}_${targetLanguages.join('-')}_${timestamp}.json`;
    const filepath = path.join(outputDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(output, null, 2));
    console.log(`\nSaved translations to: ${filepath}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

async function main() {
  const testMode = await promptTestMode();
  const targetLanguages = await promptTargetLanguages();
  console.log(`\nTranslating to: ${targetLanguages.join(', ')}`);
  await processTranslations(targetLanguages, testMode);
}

main(); 