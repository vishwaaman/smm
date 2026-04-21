import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { CustomAgentsService } from '@gitroom/nestjs-libraries/agents/custom-agents.service';
import { AgentType } from '@gitroom/nestjs-libraries/database/prisma/agent-config/agent-config.repository';

@ApiTags('Agents')
@Controller('/agents')
export class AgentsController {
  constructor(private _agentsService: CustomAgentsService) {}

  @Get('/config')
  getAllConfigs(@GetOrgFromRequest() org: Organization) {
    return this._agentsService.getAllConfigs(org.id);
  }

  @Put('/config/:agentType')
  updateConfig(
    @GetOrgFromRequest() org: Organization,
    @Param('agentType') agentType: AgentType,
    @Body() body: { enabled?: boolean; systemPrompt?: string | null; settings?: string }
  ) {
    return this._agentsService.updateConfig(org.id, agentType, body);
  }

  @Post('/caption')
  generateCaption(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { topic: string; platform: string; tone?: string; language?: string }
  ) {
    return this._agentsService.generateCaption(org.id, body.topic, body.platform, { tone: body.tone, language: body.language });
  }

  @Post('/repurpose')
  repurposeContent(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { url: string; platforms: string[] }
  ) {
    return this._agentsService.repurposeContent(org.id, body.url, body.platforms);
  }

  @Post('/hashtags')
  suggestHashtags(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { text: string; platform: string }
  ) {
    return this._agentsService.suggestHashtags(org.id, body.text, body.platform);
  }

  @Post('/schedule-suggest')
  suggestSchedule(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { platforms: string[] }
  ) {
    return this._agentsService.suggestSchedule(org.id, body.platforms);
  }

  @Post('/image-gen')
  generateImage(
    @GetOrgFromRequest() org: Organization,
    @Body() body: { prompt: string }
  ) {
    return this._agentsService.generateImage(org.id, body.prompt);
  }
}
