export interface AIProvider {
  generateStructuredOutput<TInput, TOutput>(params: {
    task: string;
    instructions: string;
    input: TInput;
    schemaName: string;
    jsonSchema: Record<string, unknown>;
  }): Promise<{
    data: TOutput;
    provider: string;
    model: string;
    requestId?: string;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
  }>;
}
