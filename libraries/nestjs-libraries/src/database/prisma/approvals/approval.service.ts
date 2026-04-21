import { Injectable } from '@nestjs/common';
import { ApprovalRepository } from './approval.repository';
import { PostsRepository } from '@gitroom/nestjs-libraries/database/prisma/posts/posts.repository';
import { State } from '@prisma/client';

@Injectable()
export class ApprovalService {
  constructor(
    private _approvalRepository: ApprovalRepository,
    private _postsRepository: PostsRepository
  ) {}

  createApproval(postId: string, requestedBy: string) {
    return this._approvalRepository.createApproval(postId, requestedBy);
  }

  getPendingApprovals(orgId: string) {
    return this._approvalRepository.getPendingApprovals(orgId);
  }

  async approvePost(id: string, approvedBy: string) {
    const approval = await this._approvalRepository.updateApprovalStatus(id, 'APPROVED', approvedBy);
    await this._postsRepository.changeState(approval.postId, State.DRAFT);
    return approval;
  }

  async rejectPost(id: string, approvedBy: string, reviewNote: string) {
    return this._approvalRepository.updateApprovalStatus(id, 'REJECTED', approvedBy, reviewNote);
  }
}
