import type { AIProvider } from './ai-provider.interface.ts';

import { AIError, publicAIError } from '../errors/ai-error.ts';

export type OpenAIResponsesClient = {
  responses: {
    create: (input: Record<string, unknown>) => Promise<{
      status: string;
      output_text: string;
      output: Array<{ type: string; content?: Array<{ type: string }> }>;
      model: string;
      id: string;
      usage?: { input_tokens: number; output_tokens: number; total_tokens: number } | null;
    }>;
  };
};

export class OpenAIProviderCore implements AIProvider {
  constructor(
    private readonly getClient: () => OpenAIResponsesClient,
    private readonly config: { model: string; maxOutputTokens: number }
  ) {}

  async generateStructuredOutput<TInput, TOutput>(params: {
    task: string;
    instructions: string;
    input: TInput;
    schemaName: string;
    jsonSchema: Record<string, unknown>;
  }) {
    try {
      const response = await this.getClient().responses.create({
        model: this.config.model,
        instructions: params.instructions,
        input: JSON.stringify({ task: params.task, data: params.input }),
        max_output_tokens: this.config.maxOutputTokens,
        store: false,
        text: {
          format: {
            type: 'json_schema',
            name: params.schemaName,
            strict: true,
            schema: params.jsonSchema,
          },
        },
      });

      if (response.status !== 'completed' || !response.output_text) {
        const refused = response.output.some(
          (item) => item.type === 'message' && item.content?.some((part) => part.type === 'refusal')
        );
        throw new AIError(refused ? 'AI_CONTENT_REJECTED' : 'AI_INVALID_OUTPUT');
      }

      let data: TOutput;
      try {
        data = JSON.parse(response.output_text) as TOutput;
      } catch (error) {
        throw new AIError('AI_INVALID_OUTPUT', { cause: error });
      }

      return {
        data,
        provider: 'openai',
        model: response.model,
        requestId: response.id,
        usage: {
          inputTokens: response.usage?.input_tokens,
          outputTokens: response.usage?.output_tokens,
          totalTokens: response.usage?.total_tokens,
        },
      };
    } catch (error) {
      throw publicAIError(error);
    }
  }
}
