import { NextResponse } from 'next/server';
import { encoding_for_model } from '@dqbd/tiktoken';
import { SYSTEM_PROMPT } from '@/app/utils/openai';

type OpenAIModel = 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo-preview' | string;

const COST_PER_1K_TOKENS: Record<OpenAIModel, { input: number; output: number }> = {
  'gpt-3.5-turbo': {
    input: 0.0015,
    output: 0.002
  },
  'gpt-4': {
    input: 0.03,
    output: 0.06
  }
};

export async function POST(request: Request) {
  try {
    const { messages, model } = await request.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages array' },
        { status: 400 }
      );
    }

    // Check if there are any user messages
    const hasUserMessages = messages.some(msg => msg.type === 'user');
    
    // If no user messages, return zero tokens/cost
    if (!hasUserMessages) {
      return NextResponse.json({
        totalTokens: 0,
        totalCost: 0,
        model,
        error: null
      });
    }

    const encoder = encoding_for_model(model || 'gpt-3.5-turbo');
    let totalTokens = 0;

    // Calculate tokens for each API call in the conversation
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].type === 'user') {
        // Get all messages up to this point for the API call
        const messagesUpToIndex = messages.slice(0, i + 1);
        
        // Format messages as they are sent to OpenAI
        const formattedMessages = messagesUpToIndex.map(msg => ({
          content: msg.type === 'user' ? 
            `Student: ${msg.content}` : 
            `Virtual Patient: ${msg.content}`
        }));
        
        // Calculate input tokens (system prompt + all messages)
        const inputText = [
          SYSTEM_PROMPT,
          ...formattedMessages.map(m => m.content)
        ].join('\n');
        
        const inputTokens = encoder.encode(inputText).length;
        
        // Add output tokens if there's an AI response
        if (i + 1 < messages.length && messages[i + 1].type === 'ai') {
          const outputTokens = encoder.encode(messages[i + 1].content).length;
          totalTokens += inputTokens + outputTokens;
        }
      }
    }
    
    encoder.free();
    
    // Calculate cost
    const costPer1k = COST_PER_1K_TOKENS[model] || COST_PER_1K_TOKENS['gpt-3.5-turbo'];
    const averageCostPer1k = (costPer1k.input + costPer1k.output) / 2;
    const totalCost = (totalTokens / 1000) * averageCostPer1k;

    return NextResponse.json({
      totalTokens,
      totalCost: Number(totalCost.toFixed(4)),
      model,
      error: null
    });

  } catch (error) {
    console.error('Token calculation error:', error);
    return NextResponse.json(
      { 
        totalTokens: null,
        totalCost: null,
        model: null,
        error: 'Error calculating tokens'
      },
      { status: 500 }
    );
  }
} 