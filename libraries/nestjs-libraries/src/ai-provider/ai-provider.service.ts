import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';

type OrgAiConfig = {
  openaiApiKey?: string | null;
  anthropicApiKey?: string | null;
  googleAiApiKey?: string | null;
  aiProvider?: string | null;
};

@Injectable()
export class AiProviderService {
  constructor(private _orgRepository: OrganizationRepository) {}

  private async getOrgConfig(orgId: string): Promise<OrgAiConfig> {
    const org = await this._orgRepository.getOrgById(orgId);
    return {
      openaiApiKey: (org as any).openaiApiKey,
      anthropicApiKey: (org as any).anthropicApiKey,
      googleAiApiKey: (org as any).googleAiApiKey,
      aiProvider: (org as any).aiProvider,
    };
  }

  async generateText(orgId: string, systemPrompt: string, userPrompt: string): Promise<string> {
    const config = await this.getOrgConfig(orgId);
    const provider = config.aiProvider || 'openai';

    if (provider === 'anthropic' && config.anthropicApiKey) {
      const client = new Anthropic({ apiKey: config.anthropicApiKey });
      const msg = await client.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      return (msg.content[0] as any).text || '';
    }

    if (provider === 'google' && config.googleAiApiKey) {
      const genAI = new GoogleGenerativeAI(config.googleAiApiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
      return result.response.text();
    }

    const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY || 'sk-proj-';
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    return completion.choices[0].message.content || '';
  }

  async generateImage(orgId: string, prompt: string): Promise<string> {
    const config = await this.getOrgConfig(orgId);
    const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY || 'sk-proj-';
    const openai = new OpenAI({ apiKey });
    const result = await openai.images.generate({
      prompt,
      model: 'dall-e-3',
      response_format: 'url',
    });
    return result.data[0].url || '';
  }

  async testConnection(config: OrgAiConfig): Promise<{ provider: string; ok: boolean; error?: string }> {
    const provider = config.aiProvider || 'openai';
    try {
      if (provider === 'anthropic' && config.anthropicApiKey) {
        const client = new Anthropic({ apiKey: config.anthropicApiKey });
        await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'hi' }],
        });
        return { provider, ok: true };
      }
      if (provider === 'google' && config.googleAiApiKey) {
        const genAI = new GoogleGenerativeAI(config.googleAiApiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        await model.generateContent('hi');
        return { provider, ok: true };
      }
      const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY || 'sk-proj-';
      const openai = new OpenAI({ apiKey });
      await openai.models.list();
      return { provider, ok: true };
    } catch (e: any) {
      return { provider, ok: false, error: e.message };
    }
  }
}
