import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ErrorLogRepository {
  constructor(private _errorLog: PrismaRepository<'errorLog'>) {}

  createLog(data: {
    source: string;
    message: string;
    stack?: string;
    endpoint?: string;
    method?: string;
    requestBody?: string;
    statusCode?: number;
    userId?: string;
    organizationId?: string;
  }) {
    return this._errorLog.model.errorLog.create({ data });
  }

  async getLogs(
    page: number,
    filters: {
      source?: string;
      organizationId?: string;
      from?: string;
      to?: string;
    }
  ) {
    const pageSize = 50;
    const skip = page * pageSize;

    const where: any = {};
    if (filters.source) where.source = filters.source;
    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [total, logs] = await Promise.all([
      this._errorLog.model.errorLog.count({ where }),
      this._errorLog.model.errorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          organization: { select: { id: true, name: true } },
          user: { select: { id: true, email: true, name: true } },
        },
      }),
    ]);

    return { total, pages: Math.ceil(total / pageSize), logs };
  }

  getLogById(id: string) {
    return this._errorLog.model.errorLog.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    });
  }
}
