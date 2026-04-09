//======================================================================
//                     AI SYSTEM (GOOGLE GEMINI)
//======================================================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

let genAI = null;
let prompts = {};

// Load prompts from JSON file
function loadPrompts() {
  try {
    const propertiesPath = path.join(__dirname, 'aiconfig', 'prompt.json');
    const content = fs.readFileSync(propertiesPath, 'utf8');
    
    // Parse JSON file
    prompts = JSON.parse(content);
    
    console.log('✅ Prompts loaded from JSON file');
  } catch (error) {
    console.warn('⚠️  Could not load prompts from JSON file:', error.message);
  }
}

function setup(client, config) {
  loadPrompts();
  
  if (config.GOOGLE_API_KEY) {
    genAI = new GoogleGenerativeAI(config.GOOGLE_API_KEY);
    console.log('✅ AI system loaded (Google Gemini)');
  } else {
    console.warn('⚠️ AI system skipped (no GOOGLE_API_KEY in config)');
  }
}

async function generateResponse(prompt, systemInstruction, maxTokens = 2000) {
  if (!genAI) {
    throw new Error('AI system not initialized. Add GOOGLE_API_KEY to your .env file');
  }
  
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      systemInstruction
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    return text;
  } catch (error) {
    if (error.message && error.message.includes('503')) {
      throw new Error('**Server Full!** Google is busy. Try again in 10s.');
    }
    throw error;
  }
}

module.exports = {
  setup,
  generateResponse,
  getAI: () => genAI,
  getPrompts: () => prompts
};
