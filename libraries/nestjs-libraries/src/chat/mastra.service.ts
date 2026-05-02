import { Mastra } from '@mastra/core/mastra';
import { ConsoleLogger } from '@mastra/core/logger';
import { pStore } from '@gitroom/nestjs-libraries/chat/mastra.store';
import { Injectable } from '@nestjs/common';
import { LoadToolsService } from '@gitroom/nestjs-libraries/chat/load.tools.service';
import { OrganizationRepository } from '@gitroom/nestjs-libraries/database/prisma/organizations/organization.repository';

@Injectable()
export class MastraService {
  private cache = new Map<string, Mastra>();

  constructor(
    private _loadToolsService: LoadToolsService,
    private _orgRepository: OrganizationRepository
  ) {}

  async mastra(orgId?: string): Promise<Mastra> {
    const cacheKey = orgId || '__default__';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let orgConfig = {
      openaiApiKey: null as string | null,
      googleAiApiKey: null as string | null,
      aiProvider: null as string | null,
    };

    if (orgId) {
      const org = await this._orgRepository.getOrgById(orgId);
      orgConfig = {
        openaiApiKey: (org as any).openaiApiKey,
        googleAiApiKey: (org as any).googleAiApiKey,
        aiProvider: (org as any).aiProvider,
      };
    }

    const instance = new Mastra({
      storage: pStore,
      agents: {
        postiz: await this._loadToolsService.agent(orgConfig),
      },
      logger: new ConsoleLogger({
        level: 'info',
      }),
    });

    this.cache.set(cacheKey, instance);
    return instance;
  }
}
