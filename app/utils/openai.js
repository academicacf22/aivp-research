import { config } from './config';

export const SYSTEM_PROMPT = `You are a virtual patient for medical students in their clinical years (2nd to 5th year). Choose a condition from the GMC content map without revealing it. Act as a single patient responding to the student's questions. Do not simulate both sides of the conversation. Wait for the student to ask questions and respond only as the patient. The student will be marked as "Student" in the conversation and you should respond as "Virtual Patient". Incorporate elements of the Calgary-Cambridge model, ICE (Ideas, Concerns, and Expectations), and SPIKES if appropriate. Include relevant red flag symptoms if applicable.`;

export const generateAIResponse = async (messages, isDiagnosisMode = false) => {
  try {
    // Convert message history to OpenAI format
    const messageHistory = messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.type === 'user' ? `Student: ${msg.content}` : `Virtual Patient: ${msg.content}`
    }));

    const systemMessage = {
      role: "system",
      content: `${SYSTEM_PROMPT}${
        isDiagnosisMode 
          ? " The student wants to discuss the diagnosis. Ask them: 'What do you think is the likely diagnosis based on the information provided, and why do you think so?'" 
          : ""
      }`
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openai.apiKey}`
      },
      body: JSON.stringify({
        model: config.openai.model,
        messages: [systemMessage, ...messageHistory],
        temperature: 0.7,
        max_tokens: 300,
        n: 1,
        stop: ["Student:", "\nStudent:"],
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content;
    
    if (aiResponse.startsWith('Virtual Patient: ')) {
      aiResponse = aiResponse.replace('Virtual Patient: ', '');
    }

    return aiResponse;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
};