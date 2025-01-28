import { encoding_for_model } from '@dqbd/tiktoken';
import { config } from './config';
import { SYSTEM_PROMPT } from './openai';

interface TokenMetrics {
  totalTokens: number | null;
  totalCost: number | null;
  model: string;
  error?: string | null;
}

interface Message {
  type: 'user' | 'ai';
  content: string;
}

const COST_PER_1K_TOKENS = {
  'gpt-3.5-turbo': {
    input: 0.0005,
    output: 0.0015
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06
  },
  'gpt-4o-mini': {
    input: 0.00015,  // $0.000150 per 1K input tokens
    output: 0.0006   // $0.000600 per 1K output tokens
  }
};

export const calculateTokensAndCost = async (
  messages: Message[], 
  model: string = 'gpt-3.5-turbo'
): Promise<TokenMetrics> => {
  try {
    // Check if there are any user messages before making API call
    const hasUserMessages = messages.some(msg => msg.type === 'user');
    
    if (!hasUserMessages) {
      return {
        totalTokens: 0,
        totalCost: 0,
        model,
        error: null
      };
    }

    const response = await fetch('/api/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, model }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      totalTokens: data.totalTokens,
      totalCost: data.totalCost,
      model: data.model,
      error: data.error
    };
  } catch (error) {
    console.error('Error calculating tokens:', error);
    return {
      totalTokens: null,
      totalCost: null,
      model,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}; 