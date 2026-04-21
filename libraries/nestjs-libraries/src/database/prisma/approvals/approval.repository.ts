import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class ApprovalRepository {
  constructor(private _postApproval: PrismaRepository<'postApproval'>) {}

  createApproval(postId: string, requestedBy: string) {
    return this._postApproval.model.postApproval.create({
      data: { postId, requestedBy, status: 'PENDING' },
      include: { post: true },
    });
  }

  getPendingApprovals(orgId: string) {
    return this._postApproval.model.postApproval.findMany({
      where: {
        status: 'PENDING',
        post: { organizationId: orgId },
      },
      include: { post: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  getApprovalByPost(postId: string) {
    return this._postApproval.model.postApproval.findUnique({
      where: { postId },
    });
  }

  updateApprovalStatus(id: string, status: 'APPROVED' | 'REJECTED', approvedBy: string, reviewNote?: string) {
    return this._postApproval.model.postApproval.update({
      where: { id },
      data: { status, approvedBy, reviewNote },
    });
  }
}
