import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

export type AgentType = 'caption' | 'repurpose' | 'hashtags' | 'schedule' | 'image-gen';

@Injectable()
export class AgentConfigRepository {
  constructor(private _agentConfig: PrismaRepository<'agentConfig'>) {}

  getAllConfigs(organizationId: string) {
    return this._agentConfig.model.agentConfig.findMany({
      where: { organizationId },
    });
  }

  getConfig(organizationId: string, agentType: AgentType) {
    return this._agentConfig.model.agentConfig.findUnique({
      where: { organizationId_agentType: { organizationId, agentType } },
    });
  }

  upsertConfig(
    organizationId: string,
    agentType: AgentType,
    data: { enabled?: boolean; systemPrompt?: string | null; settings?: string }
  ) {
    return this._agentConfig.model.agentConfig.upsert({
      where: { organizationId_agentType: { organizationId, agentType } },
      create: { organizationId, agentType, ...data },
      update: data,
    });
  }
}
