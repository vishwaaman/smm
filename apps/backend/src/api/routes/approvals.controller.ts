import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { GetUserFromRequest } from '@gitroom/nestjs-libraries/user/user.from.request';
import { Organization } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { ApprovalService } from '@gitroom/nestjs-libraries/database/prisma/approvals/approval.service';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import { AuthorizationActions, Sections } from '@gitroom/backend/services/auth/permissions/permission.exception.class';

@ApiTags('Approvals')
@Controller('/approvals')
export class ApprovalsController {
  constructor(private _approvalService: ApprovalService) {}

  @Get('/pending')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  getPendingApprovals(@GetOrgFromRequest() org: Organization) {
    return this._approvalService.getPendingApprovals(org.id);
  }

  @Put('/:id/approve')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  approvePost(
    @Param('id') id: string,
    @GetUserFromRequest() user: { id: string }
  ) {
    return this._approvalService.approvePost(id, user.id);
  }

  @Put('/:id/reject')
  @CheckPolicies([AuthorizationActions.Create, Sections.ADMIN])
  rejectPost(
    @Param('id') id: string,
    @GetUserFromRequest() user: { id: string },
    @Body() body: { reviewNote: string }
  ) {
    return this._approvalService.rejectPost(id, user.id, body.reviewNote);
  }
}
