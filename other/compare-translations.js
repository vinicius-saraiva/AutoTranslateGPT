import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

async function selectTranslationFile() {
  try {
    const translationsDir = './translations';
    const files = await fs.readdir(translationsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
      console.error('No translation files found in ./translations directory');
      process.exit(1);
    }

    console.log('\nAvailable translation files:');
    jsonFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise(resolve => {
      rl.question('\nSelect file number to compare: ', resolve);
    });
    rl.close();

    const selectedFile = jsonFiles[parseInt(answer) - 1];
    if (!selectedFile) {
      throw new Error('Invalid file selection');
    }

    return path.join(translationsDir, selectedFile);
  } catch (error) {
    console.error('Error selecting file:', error);
    process.exit(1);
  }
}

async function compareTranslations() {
  try {
    // Load the original translations
    const originalData = JSON.parse(
      await fs.readFile('./src/data/latest.json', 'utf-8')
    );

    // Select and load the new translations
    const newFilePath = await selectTranslationFile();
    const newData = JSON.parse(
      await fs.readFile(newFilePath, 'utf-8')
    );

    // Get languages to compare
    const languages = Object.keys(newData).filter(lang => lang !== 'en');
    
    console.log('\nComparing translations for:', languages.join(', '));
    
    // Create comparison report
    const report = {};
    for (const lang of languages) {
      report[lang] = {
        changed: [],
        added: [],
        removed: []
      };

      // Get the original language data
      const originalLangData = originalData[lang] || {};
      const newLangData = newData[lang] || {};
      const englishSource = newData.en || {};  // Get English source from new translations

      // Compare entries
      for (const [key, newValue] of Object.entries(newLangData)) {
        const originalValue = originalLangData[key];
        const englishValue = englishSource[key];

        if (typeof newValue === 'object') {
          // Handle nested structures
          for (const [subKey, newSubValue] of Object.entries(newValue)) {
            const originalSubValue = originalValue?.[subKey];
            const englishSubValue = englishValue?.[subKey];
            const fullKey = `${key}.${subKey}`;

            if (!originalValue || !originalSubValue) {
              report[lang].added.push({
                key: fullKey,
                english: englishSubValue,
                value: newSubValue
              });
            } else if (originalSubValue !== newSubValue) {
              report[lang].changed.push({
                key: fullKey,
                english: englishSubValue,
                old: originalSubValue,
                new: newSubValue
              });
            }
          }
        } else {
          if (!originalValue) {
            report[lang].added.push({
              key,
              english: englishValue,
              value: newValue
            });
          } else if (originalValue !== newValue) {
            report[lang].changed.push({
              key,
              english: englishValue,
              old: originalValue,
              new: newValue
            });
          }
        }
      }
    }

    // Save comparison report
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, -1);
    
    const reportPath = path.join('./translations', `comparison_report_${timestamp}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Print summary
    console.log('\nComparison Summary:');
    for (const [lang, data] of Object.entries(report)) {
      console.log(`\n${lang}:`);
      console.log(`- Changed entries: ${data.changed.length}`);
      console.log(`- Added entries: ${data.added.length}`);
      
      if (data.changed.length > 0) {
        console.log('\nSample of changed entries:');
        data.changed.slice(0, 3).forEach(entry => {
          console.log(`\nKey: ${entry.key}`);
          console.log(`English: ${entry.english}`);
          console.log(`Old: ${entry.old}`);
          console.log(`New: ${entry.new}`);
        });
      }
    }

    console.log(`\nFull comparison report saved to: ${reportPath}`);

  } catch (error) {
    console.error('Error comparing translations:', error);
    process.exit(1);
  }
}

compareTranslations(); 