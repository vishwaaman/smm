import { Injectable } from '@nestjs/common';
import { AiProviderService } from '@gitroom/nestjs-libraries/ai-provider/ai-provider.service';
import { AgentConfigRepository, AgentType } from '@gitroom/nestjs-libraries/database/prisma/agent-config/agent-config.repository';

const DEFAULTS: Record<AgentType, { systemPrompt: string; settings: Record<string, unknown> }> = {
  caption: {
    systemPrompt:
      'You are a social media expert. Write engaging posts for the requested platform in the specified tone and language. Return only the post text.',
    settings: { tone: 'professional', language: 'English', maxLength: { twitter: 280, linkedin: 1300 } },
  },
  repurpose: {
    systemPrompt:
      'You are a content repurposing expert. Given scraped article content, produce platform-specific social media posts. Return a JSON object where each key is a platform name and the value is the post text.',
    settings: { platforms: ['twitter', 'linkedin'], includeUrl: true },
  },
  hashtags: {
    systemPrompt:
      'You are an SEO and hashtag expert. Given a social media post, return a JSON array of relevant hashtag strings (without #) for the specified platform.',
    settings: { maxHashtags: 10 },
  },
  schedule: {
    systemPrompt:
      'You are a social media scheduling expert. Given a list of platforms, suggest the best days and times to post based on general audience engagement data. Return a JSON array of objects with { platform, day, time, reason }.',
    settings: { timezone: 'UTC' },
  },
  'image-gen': {
    systemPrompt:
      'You are an image generation expert. Given a topic or prompt, produce a detailed DALL-E prompt for a high-quality, professional image. Return only the enhanced prompt.',
    settings: { style: 'photorealistic', requireApproval: true },
  },
};

const FIRECRAWL_URL = process.env.FIRECRAWL_URL || 'http://127.0.0.1:3002';
const FIRECRAWL_KEY = process.env.FIRECRAWL_API_KEY || '51720e0d497dbd3f54d385db443e3ac59d1c188b93972473';

@Injectable()
export class CustomAgentsService {
  constructor(
    private _aiProvider: AiProviderService,
    private _agentConfigRepo: AgentConfigRepository
  ) {}

  private async resolveConfig(orgId: string, agentType: AgentType) {
    const saved = await this._agentConfigRepo.getConfig(orgId, agentType);
    const defaults = DEFAULTS[agentType];
    return {
      enabled: saved?.enabled ?? true,
      systemPrompt: saved?.systemPrompt || defaults.systemPrompt,
      settings: saved?.settings ? { ...defaults.settings, ...JSON.parse(saved.settings) } : defaults.settings,
    };
  }

  async generateCaption(orgId: string, topic: string, platform: string, overrides?: { tone?: string; language?: string }) {
    const cfg = await this.resolveConfig(orgId, 'caption');
    if (!cfg.enabled) throw new Error('Caption agent is disabled for this organization');
    const tone = overrides?.tone || (cfg.settings as any).tone || 'professional';
    const language = overrides?.language || (cfg.settings as any).language || 'English';
    const text = await this._aiProvider.generateText(
      orgId,
      cfg.systemPrompt,
      `Platform: ${platform}\nTone: ${tone}\nLanguage: ${language}\nTopic: ${topic}`
    );
    return { platform, caption: text };
  }

  async repurposeContent(orgId: string, url: string, platforms: string[]) {
    const cfg = await this.resolveConfig(orgId, 'repurpose');
    if (!cfg.enabled) throw new Error('Repurpose agent is disabled for this organization');

    const scrapeRes = await fetch(`${FIRECRAWL_URL}/v1/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${FIRECRAWL_KEY}` },
      body: JSON.stringify({ url, formats: ['markdown'] }),
    });
    const scrapeData = await scrapeRes.json() as any;
    const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || '';

    const result = await this._aiProvider.generateText(
      orgId,
      cfg.systemPrompt,
      `Platforms: ${platforms.join(', ')}\nArticle content:\n${markdown}`
    );

    try {
      return JSON.parse(result);
    } catch {
      return { raw: result };
    }
  }

  async suggestHashtags(orgId: string, postText: string, platform: string) {
    const cfg = await this.resolveConfig(orgId, 'hashtags');
    if (!cfg.enabled) throw new Error('Hashtag agent is disabled for this organization');
    const max = (cfg.settings as any).maxHashtags || 10;
    const result = await this._aiProvider.generateText(
      orgId,
      cfg.systemPrompt,
      `Platform: ${platform}\nMax hashtags: ${max}\nPost:\n${postText}`
    );
    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return result.split(/[\s,]+/).filter((t: string) => t.length > 0);
    }
  }

  async suggestSchedule(orgId: string, platforms: string[]) {
    const cfg = await this.resolveConfig(orgId, 'schedule');
    if (!cfg.enabled) throw new Error('Scheduler agent is disabled for this organization');
    const tz = (cfg.settings as any).timezone || 'UTC';
    const result = await this._aiProvider.generateText(
      orgId,
      cfg.systemPrompt,
      `Timezone: ${tz}\nPlatforms: ${platforms.join(', ')}`
    );
    try {
      return JSON.parse(result);
    } catch {
      return { raw: result };
    }
  }

  async generateImage(orgId: string, prompt: string) {
    const cfg = await this.resolveConfig(orgId, 'image-gen');
    if (!cfg.enabled) throw new Error('Image generation agent is disabled for this organization');
    const style = (cfg.settings as any).style || 'photorealistic';
    const requireApproval = (cfg.settings as any).requireApproval ?? true;

    const enhancedPrompt = await this._aiProvider.generateText(
      orgId,
      cfg.systemPrompt,
      `Style: ${style}\nUser prompt: ${prompt}`
    );
    const imageUrl = await this._aiProvider.generateImage(orgId, enhancedPrompt || prompt);
    return { imageUrl, requireApproval };
  }

  getDefaultConfig(agentType: AgentType) {
    return DEFAULTS[agentType];
  }

  async getAllConfigs(orgId: string) {
    const saved = await this._agentConfigRepo.getAllConfigs(orgId);
    return (['caption', 'repurpose', 'hashtags', 'schedule', 'image-gen'] as AgentType[]).map((agentType) => {
      const existing = saved.find((s) => s.agentType === agentType);
      const defaults = DEFAULTS[agentType];
      return {
        agentType,
        enabled: existing?.enabled ?? true,
        systemPrompt: existing?.systemPrompt ?? defaults.systemPrompt,
        settings: existing?.settings ? JSON.parse(existing.settings) : defaults.settings,
      };
    });
  }

  updateConfig(orgId: string, agentType: AgentType, data: { enabled?: boolean; systemPrompt?: string | null; settings?: string }) {
    return this._agentConfigRepo.upsertConfig(orgId, agentType, data);
  }
}
