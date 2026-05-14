import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { ErrorLogService } from '@gitroom/nestjs-libraries/database/prisma/error-log/error-log.service';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { Organization } from '@prisma/client';
import { Request } from 'express';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReportErrorDto {
  @IsIn(['frontend', 'orchestrator'])
  source: 'frontend' | 'orchestrator';

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  stack?: string;

  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  statusCode?: number;

  @IsOptional()
  @IsString()
  requestBody?: string;
}

@ApiTags('ErrorLog')
@Controller('/error-log')
export class ErrorLogController {
  constructor(private _errorLogService: ErrorLogService) {}

  @Get('/')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  getLogs(
    @Query('page') page = '0',
    @Query('source') source?: string,
    @Query('organizationId') organizationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    return this._errorLogService.getLogs(+page, {
      source,
      organizationId,
      from,
      to,
    });
  }

  @Get('/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  getLog(@Param('id') id: string) {
    return this._errorLogService.getLogById(id);
  }

  @Post('/report')
  reportError(
    @GetOrgFromRequest() org: Organization,
    @Req() req: Request,
    @Body() body: ReportErrorDto
  ) {
    return this._errorLogService.createLog({
      source: body.source,
      message: body.message,
      stack: body.stack,
      endpoint: body.endpoint,
      statusCode: body.statusCode,
      requestBody: body.requestBody,
      organizationId: org.id,
      userId: (req as any).user?.id,
    });
  }
}
