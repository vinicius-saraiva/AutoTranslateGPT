import fs from 'fs/promises';
import readline from 'readline';

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

async function downloadAndAnalyzeJson(apiKey) {
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
    
    // Create output directory
    await fs.mkdir('./test-output', { recursive: true });
    
    // Save raw JSON
    await fs.writeFile(
      './test-output/localise_raw.json', 
      JSON.stringify(translations, null, 2)
    );

    // Analyze the structure
    console.log('\nAnalyzing JSON structure:');
    console.log('------------------------');
    
    // Get available languages from top-level keys
    const languages = Object.keys(translations);
    console.log('Available languages:', languages);
    
    // Analyze first language as sample
    const firstLang = languages[0];
    const langData = translations[firstLang];
    
    // Get message types (subject, title, body1, etc)
    const messageTypes = new Set();
    Object.keys(langData).forEach(key => {
      const type = key.split('_').pop();
      messageTypes.add(type);
    });
    
    console.log('\nMessage types:', Array.from(messageTypes));
    
    // Check for nested structures (like paymentExecutionBeneficiary2)
    const nestedEntries = Object.entries(langData).filter(([_, value]) => 
      typeof value === 'object' && value !== null
    );
    
    console.log('\nNested structures found:', nestedEntries.map(([key]) => key));
    
    // Check for special content
    console.log('\nChecking for special content:');
    const specialContent = {
      htmlTags: 0,
      variables: 0,
      links: 0,
      brTags: 0
    };
    
    Object.values(langData).forEach(value => {
      if (typeof value === 'string') {
        if (value.includes('<') || value.includes('>')) specialContent.htmlTags++;
        if (value.includes('<br')) specialContent.brTags++;
        if (value.includes('%') || value.includes('{{')) specialContent.variables++;
        if (value.includes('http://') || value.includes('https://')) specialContent.links++;
      }
    });
    
    console.log('Entries with HTML tags:', specialContent.htmlTags);
    console.log('Entries with <br> tags:', specialContent.brTags);
    console.log('Entries with variables:', specialContent.variables);
    console.log('Entries with links:', specialContent.links);

    // Save analysis report
    const report = {
      availableLanguages: languages,
      messageTypes: Array.from(messageTypes),
      nestedStructures: nestedEntries.map(([key]) => key),
      specialContent,
      sampleEntry: {
        language: firstLang,
        content: langData
      }
    };

    await fs.writeFile(
      './test-output/analysis_report.json',
      JSON.stringify(report, null, 2)
    );

    console.log('\nTest results saved to:');
    console.log('- ./test-output/localise_raw.json');
    console.log('- ./test-output/analysis_report.json');

  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  const apiKey = await promptApiKey();
  await downloadAndAnalyzeJson(apiKey);
}

main(); 