import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function checkUsage() {
  try {
    // Get current timestamp
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // List recent usage
    const usage = await openai.organizations.list();
    
    console.log('\nOpenAI API Usage Summary:');
    console.log('------------------------');
    console.log(`Period: ${startOfMonth.toLocaleDateString()} to ${endOfMonth.toLocaleDateString()}`);
    
    if (usage.data && usage.data.length > 0) {
      const org = usage.data[0];
      console.log(`Organization: ${org.name}`);
      console.log(`ID: ${org.id}`);
    }

    // Note about usage tracking
    console.log('\nNote: For detailed usage and costs, please visit:');
    console.log('https://platform.openai.com/account/usage');

  } catch (error) {
    if (error.status === 401) {
      console.error('Error: Invalid API key');
    } else if (error.status === 429) {
      console.error('Error: Rate limit exceeded');
    } else {
      console.error('Error checking usage:', error.message);
      console.log('\nTo check your usage manually, please visit:');
      console.log('https://platform.openai.com/account/usage');
    }
  }
}

checkUsage(); 