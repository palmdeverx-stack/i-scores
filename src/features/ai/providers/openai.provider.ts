import 'server-only';

import OpenAI from 'openai';

import { AIError } from '../errors/ai-error';
import { aiConfig } from '../config/ai.config';
import { OpenAIProviderCore, type OpenAIResponsesClient } from './openai-provider-core';

let client: OpenAI | null = null;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new AIError('AI_NOT_CONFIGURED');
  client ??= new OpenAI({ apiKey, timeout: aiConfig.timeoutMs, maxRetries: 0 });
  return client;
}

export class OpenAIProvider extends OpenAIProviderCore {
  constructor() {
    super(
      () => getOpenAIClient() as unknown as OpenAIResponsesClient,
      { model: aiConfig.templateModel, maxOutputTokens: aiConfig.templateMaxOutputTokens }
    );
  }
}

export const openAIProvider = new OpenAIProvider();
