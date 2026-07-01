import { UnifiedMessage, AIProvider } from '@/types/ai';

export function normalizePayload(provider: AIProvider, modelId: string, messages: UnifiedMessage[], options: { searchGrounding?: boolean }) {
  switch (provider) {
    case 'google':
      return {
        contents: messages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        tools: options.searchGrounding ? [{ googleSearch: {} }] : [],
        generationConfig: {
          responseMimeType: "text/plain"
        }
      };

    case 'anthropic': {
      // Pull system prompt out if it exists, as Claude requires it as a top-level parameter
      const systemMessage = messages.find(m => m.role === 'system')?.content;
      const chatMessages = messages.filter(m => m.role !== 'system');
      
      return {
        model: modelId,
        max_tokens: 4096,
        system: systemMessage,
        messages: chatMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      };
    }

    case 'openai':
      return {
        model: modelId,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      };
      
    default:
      throw new Error(`Unsupported provider setup for: ${provider}`);
  }
}
